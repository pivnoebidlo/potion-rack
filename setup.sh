#!/bin/bash

echo "🧪 Potion Rack - Setup Wizard"
echo "=============================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+"
    exit 1
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+"
    exit 1
fi

# Install backend dependencies
echo "📦 Installing Python dependencies..."
cd backend
pip3 install -r requirements.txt
cd ..

# Install frontend dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start the application:"
echo "1. Start backend: cd backend && python3 app.py"
echo "2. Start frontend: npm start"
echo ""
echo "Or use the launcher: python3 launcher.py"