#!/bin/bash

# Railway start script for FlowDesk
echo "🚀 Starting FlowDesk Backend..."

# Navigate to backend directory
cd backend

# Install dependencies
echo "📦 Installing Python dependencies..."
pip install --no-cache-dir -r requirements.txt

# Run database migrations (if needed)
# alembic upgrade head

# Start the FastAPI server
echo "🎫 Starting FlowDesk API server..."
uvicorn main:app --host 0.0.0.0 --port $PORT