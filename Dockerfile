# Step 1: Build the React Frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Step 2: Build the Python Backend
FROM python:3.11-slim
WORKDIR /app

# Install Tesseract OCR and system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the built frontend from Step 1
COPY --from=frontend-builder /app/dist ./dist

# Copy the rest of the backend code
COPY . .

# Expose port
EXPOSE 3000

# Start the application using Gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:3000", "app:app"]