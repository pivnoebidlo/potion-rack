#!/usr/bin/env python3
"""
Potion Rack Launcher
Запускает одновременно бэкенд и Electron приложение
"""

import subprocess
import sys
import os
import time
import signal
import atexit

# Глобальные переменные для процессов
backend_process = None
electron_process = None

def cleanup():
    """Очистка процессов при выходе"""
    print("\n🧹 Shutting down...")
    if backend_process:
        backend_process.terminate()
        backend_process.wait(timeout=3)
    if electron_process:
        electron_process.terminate()
        electron_process.wait(timeout=3)

def main():
    global backend_process, electron_process
    
    print("🎨 Potion Rack - Paint Manager for Miniatures")
    print("=" * 50)
    
    # Регистрируем очистку при выходе
    atexit.register(cleanup)
    signal.signal(signal.SIGINT, lambda sig, frame: sys.exit(0))
    
    # Запускаем бэкенд
    print("📡 Starting backend server...")
    backend_path = os.path.join(os.path.dirname(__file__), "backend", "app.py")
    
    if not os.path.exists(backend_path):
        print(f"❌ Backend not found at {backend_path}")
        print("Please run setup first: python setup.py")
        sys.exit(1)
    
    backend_process = subprocess.Popen(
        [sys.executable, backend_path],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1
    )
    
    # Ждём запуска бэкенда
    time.sleep(2)
    
    # Проверяем, запустился ли бэкенд
    if backend_process.poll() is not None:
        print("❌ Backend failed to start. Check if port 8765 is available.")
        sys.exit(1)
    
    print("✅ Backend started on http://127.0.0.1:8765")
    
    # Запускаем Electron
    print("🚀 Starting Electron app...")
    electron_process = subprocess.Popen(
        ["npm", "start"],
        cwd=os.path.dirname(__file__),
        shell=True
    )
    
    print("✅ Potion Rack is running!")
    print("Press Ctrl+C to stop both servers.\n")
    
    # Ждём завершения процессов
    try:
        electron_process.wait()
    except KeyboardInterrupt:
        pass
    finally:
        cleanup()

if __name__ == "__main__":
    main()