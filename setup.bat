@echo off
echo 🧪 Potion Rack - Setup Wizard
echo ==============================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python 3.8+
    exit /b 1
)

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 16+
    exit /b 1
)

REM Install backend dependencies
echo 📦 Installing Python dependencies...
cd backend
pip install -r requirements.txt
cd ..

REM Install frontend dependencies
echo 📦 Installing Node.js dependencies...
call npm install

REM Build TypeScript
echo 🔨 Building TypeScript...
call npm run build

echo.
echo ✅ Setup complete!
echo.
echo To start the application:
echo 1. Start backend: cd backend ^&^& python app.py
echo 2. Start frontend: npm start
echo.
echo Or use the launcher: python launcher.py
pause