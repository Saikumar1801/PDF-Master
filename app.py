import os
import jwt
import datetime
import bcrypt
import io
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from pymongo import MongoClient
import gridfs
from bson import ObjectId
from dotenv import load_dotenv
from functools import wraps
from pypdf import PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import pytesseract
from PIL import Image

load_dotenv()

app = Flask(__name__, static_folder='dist', static_url_path='/')
CORS(app)

# Configuration
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET', 'secret')
MONGODB_URI = os.getenv('MONGODB_URI')

# MongoDB Setup
client = MongoClient(MONGODB_URI)
db = client.get_default_database()
fs = gridfs.GridFS(db)

# Ensure temp directory exists for OCR/Local processing
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# --- Auth Middleware ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing!'}), 401
        try:
            token = token.split(" ")[1]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = db.users.find_one({"_id": ObjectId(data['userId'])})
            if not current_user: raise Exception()
        except:
            return jsonify({'error': 'Token is invalid!'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

# --- Auth Routes ---
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    if db.users.find_one({"$or": [{"email": data['email']}, {"username": data['username']}]}):
        return jsonify({"error": "User already exists"}), 400
    
    hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
    db.users.insert_one({
        "email": data['email'],
        "username": data['username'],
        "password": hashed_password
    })
    return jsonify({"message": "User created"}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    user = db.users.find_one({
        "$or": [{"email": data['identifier']}, {"username": data['identifier']}]
    })
    
    if user and bcrypt.checkpw(data['password'].encode('utf-8'), user['password']):
        token = jwt.encode({
            'userId': str(user['_id']),
            'username': user['username'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'])
        return jsonify({
            "token": token, 
            "user": {"username": user['username'], "email": user['email']}
        })
    return jsonify({"error": "Invalid credentials"}), 401

# --- Conversion Logic ---
@app.route('/api/convert', methods=['POST'])
@token_required
def convert(current_user):
    try:
        files = request.files.getlist('files')
        use_ocr = request.form.get('useOCR') == 'true'
        if not files: return jsonify({"error": "No files"}), 400

        output_buffer = io.BytesIO()
        first_file = files[0]
        mime = first_file.content_type
        
        detected_type = 'text'
        if 'pdf' in mime: detected_type = 'merge'
        elif 'image' in mime: detected_type = 'image'

        if detected_type == 'merge':
            merger = PdfWriter()
            for f in files: merger.append(f)
            merger.write(output_buffer)
        else:
            c = canvas.Canvas(output_buffer, pagesize=letter)
            for f in files:
                if detected_type == 'image':
                    img = Image.open(f)
                    if use_ocr:
                        text = pytesseract.image_to_string(img)
                        c.setFont("Helvetica", 10)
                        c.drawString(50, 750, text[:1000]) # Basic text placement
                    else:
                        c.drawImage(Image.open(f).filename, 50, 200, width=500, preserveAspectRatio=True)
                else:
                    text_content = f.read().decode('utf-8')
                    c.drawString(50, 750, text_content)
                c.showPage()
            c.save()

        # Save to GridFS
        filename = f"converted_{int(datetime.datetime.now().timestamp())}.pdf"
        output_buffer.seek(0)
        file_id = fs.put(output_buffer.getvalue(), filename=filename)

        # Log to History
        db.conversions.insert_one({
            "userId": current_user['_id'],
            "fileName": filename,
            "fileType": detected_type,
            "numFiles": len(files),
            "status": "success",
            "convertTime": datetime.datetime.utcnow(),
            "downloadCount": 0,
            "fileUrl": f"/api/download/{filename}",
            "isOCRProcessed": use_ocr,
            "fileId": file_id,
            "originalFileNames": [f.filename for f in files]
        })
        return jsonify({"message": "Success", "fileName": filename})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history', methods=['GET'])
@token_required
def history(current_user):
    data = list(db.conversions.find({"userId": current_user['_id']}).sort("convertTime", -1))
    for item in data:
        item['_id'] = str(item['_id'])
        item['userId'] = str(item['userId'])
    return jsonify(data)

@app.route('/api/stats', methods=['GET'])
@token_required
def stats(current_user):
    pipeline = [
        {"$match": {"userId": current_user['_id']}},
        {"$group": {
            "_id": None,
            "total": {"$sum": 1},
            "success": {"$sum": {"$cond": [{"$eq": ["$status", "success"]}, 1, 0]}},
            "failed": {"$sum": {"$cond": [{"$eq": ["$status", "failed"]}, 1, 0]}}
        }}
    ]
    res = list(db.conversions.aggregate(pipeline))
    return jsonify(res[0] if res else {"total": 0, "success": 0, "failed": 0})

@app.route('/api/download/<filename>')
def download(filename):
    conv = db.conversions.find_one({"fileName": filename})
    if not conv: return "Not found", 404
    db.conversions.update_one({"_id": conv['_id']}, {"$inc": {"downloadCount": 1}})
    file_data = fs.get(conv['fileId'])
    return send_file(io.BytesIO(file_data.read()), mimetype='application/pdf', as_attachment=True, download_name=filename)

@app.route('/api/report', methods=['GET'])
@token_required
def generate_report(current_user):
    history_items = list(db.conversions.find({"userId": current_user['_id']}).sort("convertTime", -1))
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=letter)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 750, f"MasterPDF Report: {current_user['username']}")
    c.setFont("Helvetica", 10)
    y = 720
    for item in history_items:
        if y < 100: 
            c.showPage()
            y = 750
        c.drawString(50, y, f"- {item['fileName']} ({item['fileType']}) - Date: {item['convertTime'].strftime('%Y-%m-%d')}")
        y -= 20
    c.save()
    buffer.seek(0)
    return send_file(buffer, mimetype='application/pdf', as_attachment=True, download_name="report.pdf")

# --- Frontend Serving ---
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 3000))
    app.run(host='0.0.0.0', port=port)