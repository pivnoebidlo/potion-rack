#!/usr/bin/env python3
"""
Build Potion Rack executables for distribution
"""

import subprocess
import os
import platform
import shutil

def clean():
    """Clean build directories"""
    dirs_to_clean = ['dist', 'build', 'release']
    for dir_name in dirs_to_clean:
        if os.path.exists(dir_name):
            shutil.rmtree(dir_name)
            print(f"🧹 Cleaned {dir_name}")

def build_backend():
    """Build backend with PyInstaller"""
    print("📦 Building backend executable...")
    
    system = platform.system()
    if system == "Windows":
        cmd = "pyinstaller --onefile --name potion-rack-backend --console backend/app.py"
    else:
        cmd = "pyinstaller --onefile --name potion-rack-backend backend/app.py"
    
    subprocess.run(cmd, shell=True, check=True)
    print("✅ Backend executable created")

def build_frontend():
    """Build Electron app"""
    print("📦 Building Electron app...")
    
    # Install electron-builder if not present
    subprocess.run("npm install --save-dev electron-builder", shell=True, check=True)
    
    # Build the app
    system = platform.system()
    if system == "Windows":
        cmd = "npm run dist -- --win --x64"
    elif system == "Darwin":
        cmd = "npm run dist -- --mac --universal"
    else:
        cmd = "npm run dist -- --linux --x64"
    
    subprocess.run(cmd, shell=True, check=True)
    print("✅ Frontend executable created")

def package():
    """Package everything together"""
    print("🎁 Packaging Potion Rack...")
    
    system = platform.system()
    release_dir = f"release/potion-rack-{system.lower()}"
    os.makedirs(release_dir, exist_ok=True)
    
    # Copy backend
    shutil.copy("dist/potion-rack-backend", release_dir)
    
    # Copy frontend
    # This depends on electron-builder output structure
    if system == "Windows":
        shutil.copytree("dist/win-unpacked", f"{release_dir}/Potion Rack")
    elif system == "Darwin":
        shutil.copytree("dist/mac/Potion Rack.app", f"{release_dir}/Potion Rack.app")
    else:
        shutil.copytree("dist/linux-unpacked", f"{release_dir}/Potion Rack")
    
    print(f"✅ Package created in {release_dir}")

if __name__ == "__main__":
    clean()
    build_backend()
    build_frontend()
    package()