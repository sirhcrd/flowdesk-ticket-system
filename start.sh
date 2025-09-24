#!/bin/bash

# Railway start script for FlowDesk
echo "🚀 Starting FlowDesk Backend..."

# Set default port if not provided
PORT=${PORT:-8000}

# Debug information
echo "Current directory: $(pwd)"
echo "Contents: $(ls -la)"
echo "PORT variable: $PORT"
echo "DATABASE_URL exists: ${DATABASE_URL:+YES}"
echo "PYTHONPATH: $PYTHONPATH"

# Check if we're in the right directory
if [ -d "backend" ]; then
    echo "Found backend directory, navigating..."
    cd backend
elif [ -f "main.py" ]; then
    echo "Already in backend directory"
else
    echo "ERROR: Cannot find backend directory or main.py"
    exit 1
fi

echo "Backend directory contents: $(ls -la)"

# Check if main.py exists
if [ ! -f "main.py" ]; then
    echo "ERROR: main.py not found!"
    exit 1
fi

# Set Python path for imports
export PYTHONPATH="/app/backend:$PYTHONPATH"

# Start the FastAPI server
echo "🎫 Starting FlowDesk API server on port $PORT..."
exec python -m uvicorn main:app --host 0.0.0.0 --port $PORT --log-level info