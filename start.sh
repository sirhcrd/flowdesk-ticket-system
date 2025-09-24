#!/bin/bash

# Railway start script for FlowDesk
echo "🚀 Starting FlowDesk Backend..."

# Debug information
echo "Current directory: $(pwd)"
echo "Contents: $(ls -la)"
echo "PORT variable: $PORT"
echo "DATABASE_URL: ${DATABASE_URL:0:30}..." # Show first 30 chars only
echo "PYTHONPATH: $PYTHONPATH"

# Navigate to backend directory
cd backend
echo "Backend directory contents: $(ls -la)"

# Start the FastAPI server (dependencies already installed by Railway)
echo "🎫 Starting FlowDesk API server on port $PORT..."
python -m uvicorn main:app --host 0.0.0.0 --port $PORT --log-level info