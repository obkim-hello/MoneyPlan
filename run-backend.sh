#!/bin/bash

# Install backend dependencies if needed
if [ ! -d "backend/venv" ]; then
    echo "Creating virtual environment..."
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt -q
    cd ..
fi

# Start backend with hot reload
cd backend
source venv/bin/activate
echo "Starting backend on http://localhost:8000"
python -m uvicorn src.main:app --reload --port 8000 --log-level debug
