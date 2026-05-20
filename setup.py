#!/usr/bin/env python3
"""
Potion Rack - Installation Script
"""

import subprocess
import sys
import os
import platform

def run_command(cmd, cwd=None):
    """Run command and print output"""
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error: {result.stderr}")
        return False
    print(result.stdout)
    return True

def main():
    print("🧪 Potion Rack - Installation")
    print("=" * 50)
    
    system = platform.system()
    
    # Check Python
    print("\n📌 Checking Python...")
    python_cmd = "python3" if system == "Darwin" else "python"
    result = subprocess.run([python_cmd, "--version"], capture_output=True, text=True)
    if result.returncode != 0:
        print("❌ Python not found. Please install Python 3.8+")
        sys.exit(1)
    print(f"✅ {result.stdout.strip()}")
    
    # Check Node.js
    print("\n📌 Checking Node.js...")
    result = subprocess.run(["node", "--version"], capture_output=True, text=True)
    if result.returncode != 0:
        print("❌ Node.js not found. Please install Node.js 16+")
        sys.exit(1)
    print(f"✅ {result.stdout.strip()}")
    
    # Install backend dependencies
    print("\n📦 Installing backend dependencies...")
    if not run_command(f"{python_cmd} -m pip install -r backend/requirements.txt"):
        print("❌ Failed to install backend dependencies")
        sys.exit(1)
    
    # Install frontend dependencies
    print("\n📦 Installing frontend dependencies...")
    if not run_command("npm install"):
        print("❌ Failed to install frontend dependencies")
        sys.exit(1)
    
    # Build TypeScript
    print("\n🔨 Building TypeScript...")
    if not run_command("npm run build"):
        print("❌ Failed to build TypeScript")
        sys.exit(1)
    
    print("\n" + "=" * 50)
    print("✅ Installation complete!")
    print("\nTo start Potion Rack:")
    print("  python launcher.py")
    print("\nOr manually:")
    print("  1. Start backend: cd backend && python app.py")
    print("  2. Start frontend: npm start")
    print("=" * 50)

if __name__ == "__main__":
    main()