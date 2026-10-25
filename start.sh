#!/bin/bash

# Code Review Coach - Startup Script

echo "========================================"
echo "Code Review Coach - Starting Application"
echo "========================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "   Please install Node.js 24+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 24 ]; then
    echo "⚠️  Node.js version $NODE_VERSION detected."
    echo "   This app requires Node.js 24 or higher."
    echo "   Please upgrade from https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js $(node --version) detected"

# Check Bob Shell
if ! command -v bob &> /dev/null; then
    echo "⚠️  IBM Bob Shell not found on PATH."
    echo "   The app will run, but code review features won't work."
    echo "   Install Bob Shell from https://bob.ibm.com/"
else
    echo "✓ IBM Bob Shell detected"
fi

# Check backend dependencies
if [ ! -d "backend/node_modules" ]; then
    echo ""
    echo "Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    echo "✓ Dependencies installed"
fi

# Check .env file
if [ ! -f "backend/.env" ]; then
    echo ""
    echo "⚠️  backend/.env not found. Creating from template..."
    cp backend/.env.example backend/.env
    echo "✓ Created backend/.env"
    echo ""
    echo "⚠️  IMPORTANT: Edit backend/.env and add your BOB_API_KEY"
    echo "   Get your key from https://bob.ibm.com/admin/apikeys"
    echo ""
fi

# Start backend
echo ""
echo "Starting backend server on http://localhost:3001..."
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start frontend
echo "Starting frontend server on http://localhost:5500..."
cd frontend
python3 -m http.server 5500 &
FRONTEND_PID=$!
cd ..

echo ""
echo "========================================"
echo "✓ Application is running!"
echo "========================================"
echo ""
echo "Frontend: http://localhost:5500"
echo "Backend:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for Ctrl+C
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
