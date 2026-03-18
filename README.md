# 🛰️ MasterPDF: Professional Cloud PDF Engine

MasterPDF is a high-performance, full-stack SaaS application designed for seamless PDF management. It automatically detects file types to perform PDF merging, Image-to-PDF conversion (with optional OCR), or Text-to-PDF conversion. Featuring a "Pro SaaS" dark-mode dashboard, it provides detailed activity logs, analytics, and downloadable history reports.

![License](https://img.shields.io/badge/license-MIT-green)
![Python](https://img.shields.io/badge/python-3.11-blue)
![React](https://img.shields.io/badge/react-19-61dafb)
![Tailwind](https://img.shields.io/badge/tailwind-v4-38bdf8)

---

## ✨ Key Features

-   **🤖 Intelligent Auto-Detection:** No need to select conversion types. Upload PDFs to merge them, or upload Images/Text to convert them to PDF automatically.
-   **👁️ OCR Integration:** Powered by Tesseract OCR to extract text from images and embed it directly into the generated PDF.
-   **🗄️ Permanent GridFS Storage:** Files are stored within MongoDB GridFS, ensuring they are accessible long-term even if the server restarts.
-   **📊 Professional Analytics:** Track total jobs, success rates, and failure logs via a glowing, glassmorphic dashboard.
-   **📜 Activity Reporting:** Generate a professional PDF summary of all your conversion history, including clickable download links.
-   **🔐 Secure Auth:** Robust JWT-based authentication with bcrypt password hashing.

---

## 🛠️ Tech Stack

### **Frontend**
- **React 19** & **Vite 6**
- **Tailwind CSS v4** (High-performance styling)
- **Framer Motion** (Pro micro-interactions)
- **Lucide React** (Professional iconography)

### **Backend**
- **Python 3.11** & **Flask**
- **MongoDB** (Database & GridFS Storage)
- **PyPDF** (PDF Merging)
- **ReportLab** (PDF Generation)
- **Tesseract OCR** (Image-to-Text processing)

---

## 🚀 Local Development

### Prerequisites
- Python 3.11+
- Node.js 20+
- MongoDB instance (Atlas or Local)
- **Tesseract OCR Engine** (Installed on your OS)

### 1. Backend Setup
```bash
# Install dependencies
pip install -r requirements.txt

# Configure .env
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_random_secret
```

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### 3. Running the App
The backend runs on `http://localhost:3000`. Vite proxies requests automatically.
```bash
python app.py
```

---

## ☁️ Deployment on Render

This project **must** be deployed using **Docker** on Render because the Tesseract OCR engine requires system-level libraries that are not available in standard Python buildpacks.

### Environment Variables
Set these in the Render Dashboard:
| Key | Value |
| :--- | :--- |
| `MONGODB_URI` | `mongodb+srv://.../masterpdf?appName=SK` |
| `JWT_SECRET` | `your_secret_string` |
| `PORT` | `3000` |

### Deployment Steps
1. Create a **New Web Service** on Render.
2. Connect your GitHub repository.
3. Select **Docker** as the Runtime.
4. Render will automatically detect the `Dockerfile` in the root directory.
5. Add the Environment Variables listed above.
6. Click **Deploy**.

---

## 📂 Project Structure

```text
├── app.py              # Flask Backend (Auth, Logic, OCR, PDF)
├── Dashboard.tsx       # React Pro Dashboard UI
├── Dockerfile          # Multi-stage build (Node + Python + Tesseract)
├── requirements.txt    # Python dependencies
├── package.json        # Node dependencies & scripts
├── vite.config.ts      # Vite configuration & Proxy setup
└── tailwind.config.js  # Tailwind v4 theme configuration
```

---

## ⚖️ License
Distributed under the MIT License. See `LICENSE` for more information.

---

## 📬 Support
For support or feature requests, please open an issue in the repository or contact the administrator.
