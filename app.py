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
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
import pytesseract
from PIL import Image

load_dotenv()

app = Flask(__name__, static_folder='dist', static_url_path='/')
CORS(app)

# --- Configuration ---
app.config['SECRET_KEY'] = os.getenv('JWT_SECRET', 'secret')
MONGODB_URI = os.getenv('MONGODB_URI')

# --- MongoDB Setup ---
client = MongoClient(MONGODB_URI)
try:
    db = client.get_default_database()
    if db is None: db = client['masterpdf']
except:
    db = client['masterpdf']
fs = gridfs.GridFS(db)

# Temp folder for processing
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# --- Auth Middleware ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token: return jsonify({'error': 'Token missing'}), 401
        try:
            token = token.split(" ")[1]
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = db.users.find_one({"_id": ObjectId(data['userId'])})
        except: return jsonify({'error': 'Invalid token'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

# --- Auth Routes ---
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    if db.users.find_one({"$or": [{"email": data['email']}, {"username": data['username']}]}):
        return jsonify({"error": "User already exists"}), 400
    hashed = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
    db.users.insert_one({"email": data['email'], "username": data['username'], "password": hashed})
    return jsonify({"message": "User created"}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    user = db.users.find_one({"$or": [{"email": data['identifier']}, {"username": data['identifier']}]})
    if user and bcrypt.checkpw(data['password'].encode('utf-8'), user['password']):
        token = jwt.encode({'userId': str(user['_id']), 'username': user['username'], 
                           'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)}, 
                          app.config['SECRET_KEY'])
        return jsonify({"token": token, "user": {"username": user['username'], "email": user['email']}})
    return jsonify({"error": "Invalid credentials"}), 401

# --- Conversion Route ---
@app.route('/api/convert', methods=['POST'])
@token_required
def convert(current_user):
    try:
        files = request.files.getlist('files')
        use_ocr = request.form.get('useOCR') == 'true'
        if not files: return jsonify({"error": "No files"}), 400

        output_buffer = io.BytesIO()
        mime = files[0].content_type
        detected_type = 'merge' if 'pdf' in mime else ('image' if 'image' in mime else 'text')

        if detected_type == 'merge':
            merger = PdfWriter()
            for f in files: merger.append(f)
            merger.write(output_buffer)
        else:
            c = canvas.Canvas(output_buffer, pagesize=letter)
            for f in files:
                if detected_type == 'image':
                    img = Image.open(f).convert('RGB')
                    temp_path = os.path.join(UPLOAD_FOLDER, f"temp_{f.filename}")
                    img.save(temp_path)
                    if use_ocr:
                        text = pytesseract.image_to_string(img)
                        to = c.beginText(50, 750)
                        to.setFont("Helvetica", 10)
                        for line in text.split('\n'): to.textLine(line)
                        c.drawText(to)
                    else:
                        c.drawImage(temp_path, 50, 250, width=500, preserveAspectRatio=True)
                    c.showPage()
                    if os.path.exists(temp_path): os.remove(temp_path)
                else:
                    text_content = f.read().decode('utf-8')
                    to = c.beginText(50, 750)
                    to.setFont("Helvetica", 10)
                    for line in text_content.split('\n'): to.textLine(line)
                    c.drawText(to)
                    c.showPage()
            c.save()

        # Save to GridFS
        filename = f"conv_{int(datetime.datetime.now().timestamp())}.pdf"
        output_buffer.seek(0)
        file_id = fs.put(output_buffer.getvalue(), filename=filename)

        # Log History
        db.conversions.insert_one({
            "userId": current_user['_id'], "fileName": filename, "fileType": detected_type,
            "numFiles": len(files), "status": "success", "convertTime": datetime.datetime.utcnow(),
            "downloadCount": 0, "fileUrl": f"/api/download/{filename}", "fileId": file_id,
            "originalFileNames": [f.filename for f in files], "downloadTime": None
        })
        return jsonify({"message": "Success"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/history', methods=['GET'])
@token_required
def get_history(current_user):
    data = list(db.conversions.find({"userId": current_user['_id']}).sort("convertTime", -1))
    for item in data:
        item['_id'] = str(item['_id'])
        item['userId'] = str(item['userId'])
    return jsonify(data)

@app.route('/api/stats', methods=['GET'])
@token_required
def get_stats(current_user):
    pipe = [{"$match": {"userId": current_user['_id']}}, {"$group": {"_id": None, "total": {"$sum": 1}, 
            "success": {"$sum": 1}, "failed": {"$sum": 0}}}]
    res = list(db.conversions.aggregate(pipe))
    return jsonify(res[0] if res else {"total": 0, "success": 0, "failed": 0})

@app.route('/api/download/<filename>')
def download(filename):
    conv = db.conversions.find_one({"fileName": filename})
    if not conv: return "Not Found", 404
    db.conversions.update_one({"_id": conv['_id']}, {"$inc": {"downloadCount": 1}, "$set": {"downloadTime": datetime.datetime.utcnow()}})
    return send_file(io.BytesIO(fs.get(conv['fileId']).read()), mimetype='application/pdf', as_attachment=True, download_name=filename)

@app.route('/api/report', methods=['GET'])
@token_required
def report(current_user):
    items = list(db.conversions.find({"userId": current_user['_id']}).sort("convertTime", -1))
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = [Paragraph(f"MasterPDF Activity Report: {current_user['username']}", styles['Title']), Spacer(1, 12)]
    
    data = [["File (ID)", "Type", "Original Files", "Converted At", "DLs"]]
    for i in items:
        data.append([i['fileName'], i['fileType'], "\n".join(i.get('originalFileNames', [])[:2]), 
                    i['convertTime'].strftime('%Y-%m-%d'), str(i['downloadCount'])])
    
    t = Table(data, colWidths=[100, 50, 200, 80, 40])
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.black), ('TEXTCOLOR',(0,0),(-1,0),colors.whitesmoke),
                           ('GRID',(0,0),(-1,-1),0.5,colors.grey), ('FONTSIZE',(0,0),(-1,-1),7), ('VALIGN',(0,0),(-1,-1),'TOP')]))
    elements.append(t)
    doc.build(elements)
    buffer.seek(0)
    return send_file(buffer, mimetype='application/pdf', as_attachment=True, download_name="Report.pdf")

# --- Frontend ---
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get("PORT", 3000)))
