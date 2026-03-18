# MasterPDF Converter

A professional PDF conversion suite built with React and Express (Node.js).

## Features
- **Secure Auth**: JWT-based authentication with username/email.
- **Auto-Detection**: Automatically identifies file types (images, text, or PDFs) for processing.
- **PDF Merging**: Combine multiple PDF files into a single document seamlessly.
- **OCR (Optical Character Recognition)**: Extract text from images and convert them into searchable PDFs.
- **Enhanced UX**: Drag-and-drop file uploads, live image previews, and real-time progress tracking.
- **History & Logs**: Track every conversion with detailed logs (success/fail, time, file count).
- **Usage Reports**: Dashboard stats and downloadable PDF history reports with direct download links.
- **Persistent Storage**: History saved in MongoDB for long-term access.
- **Clean UI**: Modern dashboard interface.

## Tech Stack
- **Frontend**: React, Tailwind CSS, Lucide Icons, Framer Motion.
- **Backend**: Node.js, Express, PDFKit, PDF-Lib, Tesseract.js, Multer.
- **Database**: MongoDB (Mongoose).
- **Deployment**: Vercel (Frontend), Render (Backend).



## Local Setup
1. Clone the repo.
2. Run `npm install`.
3. Create a `.env` file based on `.env.example`.
4. Run `npm run dev`.
