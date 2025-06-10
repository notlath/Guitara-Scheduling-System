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
import urllib.request
from pathlib import Path
import signal
import re


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


def kill_existing_cmd_windows(window_title):
    """Kill all cmd.exe windows whose title contains the given string (Windows only)"""
    if not is_windows():
        return
    try:
        import subprocess
        result = subprocess.check_output(
            'tasklist /v /fi "IMAGENAME eq cmd.exe"',
            shell=True,
            encoding="utf-8",
            errors="ignore",
        )
        lines = result.splitlines()
        for line in lines:
            if window_title.lower() in line.lower() and "cmd.exe" in line.lower():
                # Split by 2 or more spaces to get columns
                columns = re.split(r"\s{2,}", line.strip())
                if len(columns) > 2 and columns[1].isdigit():
                    pid = int(columns[1])
                    subprocess.run(f'taskkill /PID {pid} /F', shell=True)
    except Exception as e:
        print(f"⚠️ Could not close existing '{window_title}' windows: {e}")


def kill_by_command_snippet(snippet):
    """Kill all processes whose command line contains the given snippet (Windows only)"""
    if not is_windows():
        return
    try:
        import subprocess
        # Use wmic to find processes with the command line containing the snippet
        result = subprocess.check_output(
            f'wmic process where "CommandLine like \'%{snippet}%\'" get ProcessId,CommandLine /FORMAT:LIST',
            shell=True,
            encoding="utf-8",
            errors="ignore",
        )
        for line in result.splitlines():
            if line.startswith("ProcessId="):
                pid = line.split("=")[-1].strip()
                if pid.isdigit():
                    subprocess.run(f'taskkill /PID {pid} /F', shell=True)
    except Exception as e:
        print(f"⚠️ Could not close processes with command snippet '{snippet}': {e}")


def start_backend():
    """Start Django backend server in new terminal"""
    print("� Starting Django backend...")

    if is_windows():
        kill_by_command_snippet("manage.py runserver")
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
        # Try to kill all possible frontend dev processes
        kill_by_command_snippet("npm run dev")
        kill_by_command_snippet("vite")
        kill_by_command_snippet("node dev")
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


def wait_for_server(url, timeout=60, interval=1):
    """Wait until the server at the given URL is up or timeout is reached."""
    print(f"⏳ Waiting for {url} to be available...")
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            with urllib.request.urlopen(url) as response:
                if response.status == 200:
                    print(f"✅ {url} is up!")
                    return True
        except Exception:
            pass
        time.sleep(interval)
    print(f"❌ Timeout waiting for {url}")
    return False


def is_process_running(snippet):
    """Return True if any process with the given command line snippet is running (Windows only)"""
    if not is_windows():
        return False
    try:
        import subprocess
        result = subprocess.check_output(
            f'wmic process where "CommandLine like \'%{snippet}%\'" get ProcessId,CommandLine /FORMAT:LIST',
            shell=True,
            encoding="utf-8",
            errors="ignore",
        )
        found = False
        for line in result.splitlines():
            if line.startswith("ProcessId="):
                pid = line.split("=")[-1].strip()
                if pid.isdigit() and int(pid) != 0:
                    # Exclude our own process
                    if int(pid) != os.getpid():
                        print(f"[DEBUG is_process_running] Found process with PID {pid} for snippet '{snippet}'")
                        found = True
        return found
    except Exception as e:
        print(f"[DEBUG is_process_running] Exception: {e}")
        pass
    return False


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

    # Start servers (kill old ones inside start_backend/start_frontend)
    backend_ok = start_backend()
    if backend_ok:
        backend_ready = wait_for_server("http://127.0.0.1:8000/", timeout=60)
        if not backend_ready:
            print("\n⚠️ Backend did not start in time")
            return
        time.sleep(2)
        frontend_ok = start_frontend()

        if frontend_ok:
            frontend_ready = wait_for_server("http://localhost:5173/", timeout=60)
            if frontend_ready:
                # Now check if servers are running (after kill/start)
                backend_running = is_process_running("manage.py runserver")
                frontend_running = (
                    is_process_running("npm run dev") or is_process_running("vite") or is_process_running("node dev")
                )
                print(f"[DEBUG] (post-start) backend_running: {backend_running}, frontend_running: {frontend_running}")
                if backend_running or frontend_running:
                    print("[DEBUG] Opening browser...")
                    open_browser()
                else:
                    print("[DEBUG] Not opening browser (servers not running)")
                print("\n🎉 Both servers started!")
                print("📋 Running on:")
                print("   🖥️  Django Backend: http://127.0.0.1:8000/")
                print("   💻 React Frontend: http://localhost:5173/")
                print("\n✨ Press Ctrl+C in each terminal to stop servers")
            else:
                print("\n⚠️ Frontend did not start in time")
        else:
            print("\n⚠️ Frontend failed to start")
    else:
        print("\n⚠️ Backend failed to start")

    if not is_windows():
        print("\nPress Enter to exit...")
        input()


if __name__ == "__main__":
    main()
