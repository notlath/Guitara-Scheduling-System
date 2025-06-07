#!/usr/bin/env python3
"""
Simple Development Server Starter for Guitara Scheduling System
Starts Django backend and React frontend in separate terminals
"""

import os
import sys
import subprocess
import platform
import time
import webbrowser
from pathlib import Path


def is_windows():
    return platform.system().lower() == "windows"


def open_browser():
    """Open the React app in the default browser"""
    print("🌐 Opening browser...")
    time.sleep(3)  # Wait for frontend server to start
    try:
        webbrowser.open("http://localhost:5173/")
        print("✅ Browser opened successfully")
        return True
    except Exception as e:
        print(f"⚠️ Could not open browser automatically: {e}")
        print("Please manually open: http://localhost:5173/")
        return False


def start_backend():
    """Start Django backend server in new terminal"""
    print("� Starting Django backend...")

    if is_windows():
        # Windows: activate venv, cd to guitara, run server
        cmd = 'start cmd /k "title Django Backend && venv\\Scripts\\activate && cd guitara && python manage.py runserver"'
        subprocess.run(cmd, shell=True, cwd=Path(__file__).parent)
    else:
        # Linux/macOS: activate venv, cd to guitara, run server
        cmd = "source venv/bin/activate && cd guitara && python manage.py runserver"

        # Try different terminal emulators
        terminals = [
            [
                "gnome-terminal",
                "--title=Django Backend",
                "--",
                "bash",
                "-c",
                f"{cmd}; exec bash",
            ],
            [
                "xterm",
                "-title",
                "Django Backend",
                "-e",
                "bash",
                "-c",
                f"{cmd}; exec bash",
            ],
            [
                "konsole",
                "--title",
                "Django Backend",
                "-e",
                "bash",
                "-c",
                f"{cmd}; exec bash",
            ],
        ]

        for terminal in terminals:
            try:
                subprocess.Popen(terminal, cwd=Path(__file__).parent)
                break
            except FileNotFoundError:
                continue
        else:
            print(
                "❌ Could not find terminal emulator. Install gnome-terminal, xterm, or konsole"
            )
            return False

    print("✅ Django backend started")
    return True


def start_frontend():
    """Start React frontend server in new terminal"""
    print("🌐 Starting React frontend...")

    if is_windows():
        # Windows: cd to frontend, run dev server
        cmd = 'start cmd /k "title React Frontend && cd royal-care-frontend && npm run dev"'
        subprocess.run(cmd, shell=True, cwd=Path(__file__).parent)
    else:
        # Linux/macOS: cd to frontend, run dev server
        cmd = "cd royal-care-frontend && npm run dev"

        # Try different terminal emulators
        terminals = [
            [
                "gnome-terminal",
                "--title=React Frontend",
                "--",
                "bash",
                "-c",
                f"{cmd}; exec bash",
            ],
            [
                "xterm",
                "-title",
                "React Frontend",
                "-e",
                "bash",
                "-c",
                f"{cmd}; exec bash",
            ],
            [
                "konsole",
                "--title",
                "React Frontend",
                "-e",
                "bash",
                "-c",
                f"{cmd}; exec bash",
            ],
        ]

        for terminal in terminals:
            try:
                subprocess.Popen(terminal, cwd=Path(__file__).parent)
                break
            except FileNotFoundError:
                continue
        else:
            print(
                "❌ Could not find terminal emulator. Install gnome-terminal, xterm, or konsole"
            )
            return False

    print("✅ React frontend started")
    return True


def check_requirements():
    """Quick check for basic requirements"""
    project_root = Path(__file__).parent

    # Check if venv exists
    venv_path = project_root / "venv"
    if not venv_path.exists():
        print(
            "❌ Virtual environment not found. Please create one with: python -m venv venv"
        )
        return False

    # Check if guitara directory exists
    if not (project_root / "guitara").exists():
        print("❌ Backend directory 'guitara' not found")
        return False

    # Check if frontend directory exists
    if not (project_root / "royal-care-frontend").exists():
        print("❌ Frontend directory 'royal-care-frontend' not found")
        return False

    return True


def main():
    print("🎯 Guitara Development Server Starter")
    print("=" * 40)

    # Basic checks
    if not check_requirements():
        print("\n❌ Requirements check failed")
        if not is_windows():
            print("Press Enter to exit...")
            input()
        return

    # Start servers
    backend_ok = start_backend()
    if backend_ok:
        time.sleep(2)  # Wait a bit before starting frontend
        frontend_ok = start_frontend()

        if frontend_ok:
            # Open browser automatically
            open_browser()

            print("\n🎉 Both servers started!")
            print("📋 Running on:")
            print("   🖥️  Django Backend: http://127.0.0.1:8000/")
            print("   💻 React Frontend: http://localhost:5173/")
            print("\n✨ Press Ctrl+C in each terminal to stop servers")
        else:
            print("\n⚠️ Frontend failed to start")
    else:
        print("\n⚠️ Backend failed to start")

    if not is_windows():
        print("\nPress Enter to exit...")
        input()


if __name__ == "__main__":
    main()
