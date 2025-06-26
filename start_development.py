#!/usr/bin/env python3
"""
Enhanced Development Server Starter for Guitara Scheduling System
Starts Django backend and React frontend in separate terminals with improved
cross-platform support, better error handling, and enhanced monitoring.
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
import json
import logging
import socket
from datetime import datetime
from typing import Optional, Dict, List, Tuple

# Configuration
CONFIG = {
    "backend_url": "http://127.0.0.1:8000/",
    "frontend_url": "http://localhost:5173/",
    "backend_port": 8000,
    "frontend_port": 5173,
    "startup_timeout": 60,
    "health_check_interval": 1,
    "verbose_logging": False,
    "auto_browser": True,
    "kill_existing": True,  # Always kill existing processes - this is the original behavior
    "force_restart": True,  # Force restart even if servers are already running
}


# Setup logging
def setup_logging():
    """Setup enhanced logging for better debugging"""
    log_level = logging.DEBUG if CONFIG["verbose_logging"] else logging.INFO
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler("dev_server.log", mode="a"),
        ],
    )
    return logging.getLogger(__name__)


logger = setup_logging()


def is_windows() -> bool:
    """Check if running on Windows"""
    return platform.system().lower() == "windows"


def is_port_available(port: int) -> bool:
    """Check if a port is available"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(1)
            result = sock.connect_ex(("localhost", port))
            return result != 0
    except Exception as e:
        logger.warning(f"Error checking port {port}: {e}")
        return False


def get_system_info() -> Dict[str, str]:
    """Get system information for debugging"""
    return {
        "platform": platform.platform(),
        "python_version": platform.python_version(),
        "architecture": platform.architecture()[0],
        "processor": platform.processor(),
        "working_directory": str(Path.cwd()),
        "script_location": str(Path(__file__).parent),
    }


def print_system_info():
    """Print system information"""
    info = get_system_info()
    print("🔧 System Information:")
    for key, value in info.items():
        print(f"   {key}: {value}")
    print()


def is_server_healthy(url: str, timeout: int = 5) -> bool:
    """Quick health check for a server"""
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return response.status == 200
    except Exception:
        return False


def is_browser_already_open(url: str) -> bool:
    """Check if a browser is already open with the specified URL or our frontend"""
    try:
        if is_windows():
            # Enhanced detection for Windows
            browsers = [
                "chrome.exe",
                "msedge.exe",
                "firefox.exe",
                "opera.exe",
                "brave.exe",
            ]

            # Method 1: Check for direct URL references in window titles or command lines
            for browser in browsers:
                try:
                    result = subprocess.run(
                        f'tasklist /v /fi "IMAGENAME eq {browser}"',
                        shell=True,
                        capture_output=True,
                        text=True,
                    )
                    for line in result.stdout.splitlines():
                        if "localhost:5173" in line or "127.0.0.1:5173" in line:
                            logger.debug(
                                f"Found browser {browser} with frontend URL in process info"
                            )
                            return True
                except Exception:
                    continue

            # Method 2: Check for frontend-related window titles that might indicate our app is open
            frontend_indicators = [
                "Royal Care",
                "Guitara",
                "Scheduling System",
                "localhost",
                "127.0.0.1",
                "5173",
                "React App",
                "Vite",
                "Development",
            ]

            for browser in browsers:
                try:
                    result = subprocess.run(
                        f'tasklist /v /fi "IMAGENAME eq {browser}"',
                        shell=True,
                        capture_output=True,
                        text=True,
                    )
                    for line in result.stdout.splitlines():
                        line_lower = line.lower()
                        # Look for our app-specific terms in window titles
                        if any(
                            indicator.lower() in line_lower
                            for indicator in frontend_indicators[:4]
                        ):  # Check main app names
                            logger.debug(
                                f"Found browser {browser} with potential frontend window: {line.strip()}"
                            )
                            return True
                except:
                    continue

            # Method 3: Check for WMIC command line references
            try:
                result = subprocess.run(
                    "wmic process where \"CommandLine like '%localhost:5173%' or CommandLine like '%127.0.0.1:5173%'\" get ProcessId,Name /FORMAT:LIST",
                    shell=True,
                    capture_output=True,
                    text=True,
                )
                for line in result.stdout.splitlines():
                    if line.startswith("Name=") and any(
                        browser in line.lower()
                        for browser in ["chrome", "edge", "firefox", "opera", "brave"]
                    ):
                        logger.debug(
                            "Found browser process with frontend URL in command line"
                        )
                        return True
            except:
                pass

            # Method 4: Check if frontend server is accessible and seems to be in use
            # This is a heuristic - if the server is running and accessible,
            # there's a good chance a browser is already connected
            try:
                if is_server_healthy(url, timeout=2):
                    # Server is running, let's be more conservative about opening new browsers
                    # Check if there are any browser processes at all
                    for browser in browsers:
                        try:
                            result = subprocess.run(
                                f'tasklist /fi "IMAGENAME eq {browser}"',
                                shell=True,
                                capture_output=True,
                                text=True,
                            )
                            if browser.lower() in result.stdout.lower():
                                logger.debug(
                                    f"Frontend server is running and {browser} is active - assuming browser already open"
                                )
                                return True
                        except:
                            continue
            except:
                pass

        else:
            # Linux/macOS: Enhanced detection
            try:
                result = subprocess.run(
                    ["ps", "aux"], capture_output=True, text=True, check=True
                )
                for line in result.stdout.splitlines():
                    if ("localhost:5173" in line or "127.0.0.1:5173" in line) and any(
                        browser in line.lower()
                        for browser in ["chrome", "firefox", "safari", "opera", "brave"]
                    ):
                        logger.debug("Found browser process with frontend URL")
                        return True

                # Also check for frontend-related processes
                frontend_indicators = [
                    "guitara",
                    "royal",
                    "scheduling",
                    "localhost",
                    "5173",
                ]
                for line in result.stdout.splitlines():
                    line_lower = line.lower()
                    if any(
                        browser in line_lower
                        for browser in ["chrome", "firefox", "safari", "opera", "brave"]
                    ):
                        if any(
                            indicator in line_lower for indicator in frontend_indicators
                        ):
                            logger.debug(
                                "Found browser process with potential frontend content"
                            )
                            return True
            except:
                pass

    except Exception as e:
        logger.debug(f"Error checking for existing browser: {e}")

    return False


def open_browser():
    """Open the React app in the default browser with enhanced error handling"""
    if not CONFIG["auto_browser"]:
        logger.info("Auto-browser disabled in config")
        return False

    frontend_url = CONFIG["frontend_url"]

    # Check if browser is already open with the frontend URL
    if is_browser_already_open(frontend_url):
        print("🌐 Browser already open with frontend URL - skipping")
        logger.info("Browser already open, not opening new instance")
        return True

    print("🌐 Opening browser...")

    # Wait for frontend to be ready
    wait_time = 5
    for i in range(wait_time):
        if is_server_healthy(frontend_url):
            break
        print(f"⏳ Waiting for frontend... ({i+1}/{wait_time})")
        time.sleep(1)

    try:
        webbrowser.open(frontend_url)
        print(f"✅ Browser opened successfully: {frontend_url}")
        logger.info(f"Browser opened for {frontend_url}")
        return True
    except Exception as e:
        print(f"⚠️ Could not open browser automatically: {e}")
        print(f"Please manually open: {frontend_url}")
        logger.error(f"Browser open failed: {e}")
        return False


def kill_processes_by_port(port: int) -> bool:
    """Kill processes running on a specific port (cross-platform)"""
    killed = False
    try:
        if is_windows():
            # Windows: use netstat and taskkill
            result = subprocess.run(
                f'netstat -ano | findstr ":{port}"',
                shell=True,
                capture_output=True,
                text=True,
            )
            for line in result.stdout.splitlines():
                if f":{port}" in line and "LISTENING" in line:
                    parts = line.split()
                    if parts:
                        pid = parts[-1]
                        if pid.isdigit():
                            subprocess.run(f"taskkill /PID {pid} /F", shell=True)
                            print(f"🔪 Killed process {pid} on port {port}")
                            killed = True
        else:
            # Linux/macOS: use lsof and kill
            result = subprocess.run(
                f"lsof -ti:{port}", shell=True, capture_output=True, text=True
            )
            for pid in result.stdout.strip().split():
                if pid.isdigit():
                    subprocess.run(f"kill -9 {pid}", shell=True)
                    print(f"🔪 Killed process {pid} on port {port}")
                    killed = True
    except Exception as e:
        logger.warning(f"Error killing processes on port {port}: {e}")

    return killed


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
                    subprocess.run(f"taskkill /PID {pid} /F", shell=True)
    except Exception as e:
        print(f"⚠️ Could not close existing '{window_title}' windows: {e}")


def kill_by_command_snippet(snippet: str) -> int:
    """Kill all processes whose command line contains the given snippet (cross-platform)"""
    killed_count = 0

    try:
        if is_windows():
            # Windows: use wmic with proper escaping
            snippet_escaped = snippet.replace("\\", "\\\\")
            result = subprocess.check_output(
                f"wmic process where \"CommandLine like '%{snippet_escaped}%'\" get ProcessId,CommandLine /FORMAT:LIST",
                shell=True,
                encoding="utf-8",
                errors="ignore",
            )
            for line in result.splitlines():
                if line.startswith("ProcessId="):
                    pid = line.split("=")[-1].strip()
                    if pid.isdigit() and int(pid) != os.getpid():
                        try:
                            result = subprocess.run(
                                f"taskkill /PID {pid} /F",
                                shell=True,
                                capture_output=True,
                                text=True,
                            )
                            if result.returncode == 0:
                                print(f"🔪 Killed process {pid} (snippet: {snippet})")
                                killed_count += 1
                            else:
                                logger.debug(
                                    f"Process {pid} was already terminated or not found"
                                )
                        except subprocess.CalledProcessError:
                            logger.debug(f"Failed to kill process {pid}")
        else:
            # Linux/macOS: use ps and grep
            try:
                result = subprocess.run(
                    ["ps", "aux"], capture_output=True, text=True, check=True
                )
                for line in result.stdout.splitlines():
                    if snippet in line and str(os.getpid()) not in line:
                        parts = line.split()
                        if len(parts) > 1 and parts[1].isdigit():
                            pid = parts[1]
                            try:
                                result = subprocess.run(
                                    ["kill", "-9", pid], capture_output=True, text=True
                                )
                                if result.returncode == 0:
                                    print(
                                        f"🔪 Killed process {pid} (snippet: {snippet})"
                                    )
                                    killed_count += 1
                                else:
                                    logger.debug(
                                        f"Process {pid} was already terminated"
                                    )
                            except subprocess.CalledProcessError:
                                logger.debug(f"Failed to kill process {pid}")
            except subprocess.CalledProcessError:
                logger.debug("Failed to list processes on Unix system")

    except Exception as e:
        logger.debug(f"Error killing processes with snippet '{snippet}': {e}")

    if killed_count > 0:
        time.sleep(1)  # Give processes time to terminate

    return killed_count


def get_available_terminals() -> List[List[str]]:
    """Get list of available terminal emulators for Unix systems"""
    terminals = [
        # GNOME Terminal
        ["gnome-terminal", "--title={title}", "--", "bash", "-c", "{cmd}; exec bash"],
        # KDE Konsole
        ["konsole", "--title", "{title}", "-e", "bash", "-c", "{cmd}; exec bash"],
        # XFCE Terminal
        ["xfce4-terminal", "--title={title}", "-e", "bash -c '{cmd}; exec bash'"],
        # XTerm
        ["xterm", "-title", "{title}", "-e", "bash", "-c", "{cmd}; exec bash"],
        # Terminator
        ["terminator", "--title={title}", "-e", "bash -c '{cmd}; exec bash'"],
        # MATE Terminal
        ["mate-terminal", "--title={title}", "-e", "bash -c '{cmd}; exec bash'"],
        # Tilix
        ["tilix", "--title={title}", "-e", "bash -c '{cmd}; exec bash'"],
    ]

    available = []
    for terminal in terminals:
        try:
            subprocess.run(["which", terminal[0]], capture_output=True, check=True)
            available.append(terminal)
        except (subprocess.CalledProcessError, FileNotFoundError):
            continue

    return available


def start_backend() -> bool:
    """Start Django backend server in new terminal with enhanced error handling"""
    print("🖥️ Starting Django backend...")
    logger.info("Starting Django backend server")

    backend_port = CONFIG["backend_port"]
    project_root = Path(__file__).parent

    if is_windows():
        # Windows: use cmd instead of PowerShell for better compatibility
        venv_activate = project_root / "venv" / "Scripts" / "activate.bat"
        if not venv_activate.exists():
            print("❌ Virtual environment activation script not found")
            return False

        # Use cmd instead of PowerShell for better reliability
        cmd = f'start cmd /k "title Django Backend && cd /d \\"{project_root}\\" && venv\\Scripts\\activate && cd guitara && python manage.py runserver {backend_port}"'

        try:
            result = subprocess.run(cmd, shell=True, cwd=project_root)
            if result.returncode != 0:
                print(f"❌ Failed to start backend (return code: {result.returncode})")
                return False
        except Exception as e:
            print(f"❌ Error starting backend: {e}")
            logger.error(f"Backend startup error: {e}")
            return False
    else:
        # Linux/macOS: enhanced terminal detection
        venv_activate = project_root / "venv" / "bin" / "activate"
        if not venv_activate.exists():
            print("❌ Virtual environment activation script not found")
            return False

        cmd = f"source venv/bin/activate && cd guitara && python manage.py runserver {backend_port}"
        terminals = get_available_terminals()

        if not terminals:
            print("❌ No suitable terminal emulator found")
            print(
                "   Please install one of: gnome-terminal, konsole, xfce4-terminal, xterm"
            )
            return False

        # Try terminals in order of preference
        for terminal_cmd in terminals:
            try:
                # Format the command template
                formatted_cmd = []
                for part in terminal_cmd:
                    if "{title}" in part:
                        formatted_cmd.append(part.format(title="Django Backend"))
                    elif "{cmd}" in part:
                        formatted_cmd.append(part.format(cmd=cmd))
                    else:
                        formatted_cmd.append(part)

                subprocess.Popen(formatted_cmd, cwd=project_root)
                print(f"✅ Started backend using {terminal_cmd[0]}")
                logger.info(f"Backend started with {terminal_cmd[0]}")
                break
            except (FileNotFoundError, subprocess.SubprocessError) as e:
                logger.debug(f"Failed to start with {terminal_cmd[0]}: {e}")
                continue
        else:
            print("❌ Could not start backend with any available terminal")
            return False

    print("✅ Django backend startup initiated")
    return True


def start_frontend() -> bool:
    """Start React frontend server in new terminal with enhanced error handling"""
    print("💻 Starting React frontend...")
    logger.info("Starting React frontend server")

    frontend_port = CONFIG["frontend_port"]
    project_root = Path(__file__).parent
    frontend_dir = project_root / "royal-care-frontend"

    # Check if package.json exists
    package_json = frontend_dir / "package.json"
    if not package_json.exists():
        print("❌ package.json not found in frontend directory")
        return False

    if is_windows():
        # Windows: use cmd with npm.cmd for better compatibility
        cmd = f'start cmd /k "title React Frontend && cd /d \\"{frontend_dir}\\" && npm.cmd run dev"'

        try:
            result = subprocess.run(cmd, shell=True, cwd=project_root)
            if result.returncode != 0:
                print(f"❌ Failed to start frontend (return code: {result.returncode})")
                return False
        except Exception as e:
            print(f"❌ Error starting frontend: {e}")
            logger.error(f"Frontend startup error: {e}")
            return False
    else:
        # Linux/macOS: enhanced terminal detection
        cmd = f"cd royal-care-frontend && npm run dev"
        terminals = get_available_terminals()

        if not terminals:
            print("❌ No suitable terminal emulator found")
            print(
                "   Please install one of: gnome-terminal, konsole, xfce4-terminal, xterm"
            )
            return False

        # Try terminals in order of preference
        for terminal_cmd in terminals:
            try:
                # Format the command template
                formatted_cmd = []
                for part in terminal_cmd:
                    if "{title}" in part:
                        formatted_cmd.append(part.format(title="React Frontend"))
                    elif "{cmd}" in part:
                        formatted_cmd.append(part.format(cmd=cmd))
                    else:
                        formatted_cmd.append(part)

                subprocess.Popen(formatted_cmd, cwd=project_root)
                print(f"✅ Started frontend using {terminal_cmd[0]}")
                logger.info(f"Frontend started with {terminal_cmd[0]}")
                break
            except (FileNotFoundError, subprocess.SubprocessError) as e:
                logger.debug(f"Failed to start with {terminal_cmd[0]}: {e}")
                continue
        else:
            print("❌ Could not start frontend with any available terminal")
            return False

    print("✅ React frontend startup initiated")
    return True


def check_requirements() -> bool:
    """Enhanced requirements check with detailed diagnostics"""
    print("🔍 Checking requirements...")
    project_root = Path(__file__).parent
    all_good = True

    # Check Python version
    python_version = sys.version_info
    print(
        f"   Python version: {python_version.major}.{python_version.minor}.{python_version.micro}"
    )
    if python_version < (3, 8):
        print("   ❌ Python 3.8+ required")
        all_good = False
    else:
        print("   ✅ Python version OK")

    # Check virtual environment
    venv_path = project_root / "venv"
    if not venv_path.exists():
        print("   ❌ Virtual environment not found")
        print("      Create with: python -m venv venv")
        if is_windows():
            print("      Activate with: venv\\Scripts\\activate")
        else:
            print("      Activate with: source venv/bin/activate")
        all_good = False
    else:
        print("   ✅ Virtual environment found")

        # Check if venv has Django
        if is_windows():
            django_check = venv_path / "Scripts" / "django-admin.exe"
        else:
            django_check = venv_path / "bin" / "django-admin"

        if django_check.exists():
            print("   ✅ Django found in virtual environment")
        else:
            print("   ⚠️ Django not found in virtual environment")
            print("      Install with: pip install -r requirements.txt")

    # Check backend directory and files
    guitara_dir = project_root / "guitara"
    if not guitara_dir.exists():
        print("   ❌ Backend directory 'guitara' not found")
        all_good = False
    else:
        print("   ✅ Backend directory found")

        # Check manage.py
        manage_py = guitara_dir / "manage.py"
        if not manage_py.exists():
            print("   ❌ manage.py not found in guitara directory")
            all_good = False
        else:
            print("   ✅ manage.py found")

        # Check settings.py
        settings_py = guitara_dir / "guitara" / "settings.py"
        if settings_py.exists():
            print("   ✅ Django settings found")
        else:
            print("   ⚠️ Django settings.py not found")

    # Check frontend directory and files
    frontend_dir = project_root / "royal-care-frontend"
    if not frontend_dir.exists():
        print("   ❌ Frontend directory 'royal-care-frontend' not found")
        all_good = False
    else:
        print("   ✅ Frontend directory found")

        # Check package.json
        package_json = frontend_dir / "package.json"
        if not package_json.exists():
            print("   ❌ package.json not found")
            all_good = False
        else:
            print("   ✅ package.json found")

            # Check node_modules
            node_modules = frontend_dir / "node_modules"
            if not node_modules.exists():
                print("   ⚠️ node_modules not found")
                print("      Install with: cd royal-care-frontend && npm install")
            else:
                print("   ✅ node_modules found")

    # Check Node.js and npm
    try:
        node_result = subprocess.run(
            ["node", "--version"],
            capture_output=True,
            text=True,
            check=True,
            timeout=10,
        )
        print(f"   ✅ Node.js version: {node_result.stdout.strip()}")
    except (
        subprocess.CalledProcessError,
        FileNotFoundError,
        subprocess.TimeoutExpired,
    ):
        print("   ❌ Node.js not found")
        print("      Install from: https://nodejs.org/")
        all_good = False

    try:
        npm_result = subprocess.run(
            ["npm", "--version"], capture_output=True, text=True, check=True, timeout=10
        )
        print(f"   ✅ npm version: {npm_result.stdout.strip()}")
    except (
        subprocess.CalledProcessError,
        FileNotFoundError,
        subprocess.TimeoutExpired,
    ):
        # Try alternative npm paths (Windows)
        npm_found = False
        if is_windows():
            possible_npm_paths = [
                "npm.cmd",
                r"C:\Program Files\nodejs\npm.cmd",
                r"C:\Program Files (x86)\nodejs\npm.cmd",
            ]
            for npm_path in possible_npm_paths:
                try:
                    npm_result = subprocess.run(
                        [npm_path, "--version"],
                        capture_output=True,
                        text=True,
                        check=True,
                        timeout=10,
                    )
                    print(
                        f"   ✅ npm version: {npm_result.stdout.strip()} (found at {npm_path})"
                    )
                    npm_found = True
                    break
                except:
                    continue

        if not npm_found:
            print("   ⚠️ npm not found in PATH")
            print("      npm should come with Node.js installation")
            print("      Try restarting your terminal or adding Node.js to PATH")
            # Don't fail requirements check for npm issue

    # Check port availability
    backend_port = CONFIG["backend_port"]
    frontend_port = CONFIG["frontend_port"]

    if is_port_available(backend_port):
        print(f"   ✅ Backend port {backend_port} available")
    else:
        print(f"   ⚠️ Backend port {backend_port} in use")

    if is_port_available(frontend_port):
        print(f"   ✅ Frontend port {frontend_port} available")
    else:
        print(f"   ⚠️ Frontend port {frontend_port} in use")

    return all_good


def wait_for_server(url: str, timeout: int = None, interval: int = None) -> bool:
    """Wait until the server at the given URL is up or timeout is reached with enhanced feedback"""
    if timeout is None:
        timeout = CONFIG["startup_timeout"]
    if interval is None:
        interval = CONFIG["health_check_interval"]

    print(f"⏳ Waiting for {url} to be available (timeout: {timeout}s)...")
    logger.info(f"Waiting for server at {url}")

    start_time = time.time()
    attempts = 0

    while time.time() - start_time < timeout:
        attempts += 1
        try:
            with urllib.request.urlopen(url, timeout=5) as response:
                if response.status == 200:
                    elapsed = time.time() - start_time
                    print(f"✅ {url} is up! (took {elapsed:.1f}s, {attempts} attempts)")
                    logger.info(f"Server {url} ready after {elapsed:.1f}s")
                    return True
        except urllib.error.HTTPError as e:
            if e.code != 502:  # 502 is common during startup
                logger.debug(f"HTTP error {e.code} for {url}")
        except Exception as e:
            logger.debug(f"Connection attempt {attempts} failed: {e}")

        # Show progress dots
        if attempts % 5 == 0:
            elapsed = time.time() - start_time
            print(f"   Still waiting... ({elapsed:.0f}s elapsed)")

        time.sleep(interval)

    elapsed = time.time() - start_time
    print(f"❌ Timeout waiting for {url} after {elapsed:.1f}s ({attempts} attempts)")
    logger.warning(f"Server {url} failed to start within {timeout}s")
    return False


def monitor_servers() -> Dict[str, bool]:
    """Monitor the health of both servers"""
    backend_url = CONFIG["backend_url"]
    frontend_url = CONFIG["frontend_url"]

    backend_healthy = is_server_healthy(backend_url, timeout=3)
    frontend_healthy = is_server_healthy(frontend_url, timeout=3)

    return {"backend": backend_healthy, "frontend": frontend_healthy}


def is_development_process_running(snippet: str) -> bool:
    """Check if development process is running (more specific than generic process check)"""
    try:
        if is_windows():
            result = subprocess.check_output(
                f"wmic process where \"CommandLine like '%{snippet}%'\" get ProcessId,CommandLine /FORMAT:LIST",
                shell=True,
                encoding="utf-8",
                errors="ignore",
            )
            for line in result.splitlines():
                if line.startswith("ProcessId="):
                    pid = line.split("=")[-1].strip()
                    if pid.isdigit() and int(pid) != 0 and int(pid) != os.getpid():
                        # Get the command line for this PID
                        try:
                            cmd_result = subprocess.check_output(
                                f'wmic process where "ProcessId={pid}" get CommandLine /FORMAT:LIST',
                                shell=True,
                                encoding="utf-8",
                                errors="ignore",
                            )
                            for cmd_line in cmd_result.splitlines():
                                if cmd_line.startswith("CommandLine="):
                                    command = cmd_line.replace(
                                        "CommandLine=", ""
                                    ).strip()
                                    # Only consider it a development process if it's in our project directory
                                    # or contains specific development keywords
                                    if (
                                        "Guitara-Scheduling-System" in command
                                        or "royal-care-frontend" in command
                                        or "manage.py runserver" in command
                                        or ("npm" in command and "dev" in command)
                                        or ("vite" in command and "Guitara" in command)
                                    ):
                                        logger.debug(
                                            f"Found development process with PID {pid}: {command}"
                                        )
                                        return True
                        except:
                            pass
        else:
            result = subprocess.run(
                ["ps", "aux"], capture_output=True, text=True, check=True
            )
            for line in result.stdout.splitlines():
                if snippet in line and str(os.getpid()) not in line:
                    # Check if it's in our project directory
                    if (
                        "Guitara-Scheduling-System" in line
                        or "royal-care-frontend" in line
                        or "manage.py runserver" in line
                    ):
                        logger.debug(f"Found development process: {line}")
                        return True
    except Exception as e:
        logger.debug(f"Error checking development process for snippet '{snippet}': {e}")

    return False


def load_config() -> None:
    """Load configuration from file if it exists"""
    config_file = Path(__file__).parent / "dev_config.json"
    if config_file.exists():
        try:
            with open(config_file, "r") as f:
                user_config = json.load(f)
                CONFIG.update(user_config)
                print(f"📄 Loaded configuration from {config_file}")
        except Exception as e:
            logger.warning(f"Failed to load config file: {e}")


def save_default_config() -> None:
    """Save default configuration to file"""
    config_file = Path(__file__).parent / "dev_config.json"
    try:
        with open(config_file, "w") as f:
            json.dump(CONFIG, f, indent=2)
        print(f"💾 Saved default configuration to {config_file}")
    except Exception as e:
        logger.warning(f"Failed to save config file: {e}")


def print_startup_summary(
    backend_ok: bool, frontend_ok: bool, backend_ready: bool, frontend_ready: bool
) -> None:
    """Print a comprehensive startup summary"""
    print("\n" + "=" * 50)
    print("🎯 GUITARA DEVELOPMENT SERVER STATUS")
    print("=" * 50)

    # Server status
    print("📊 Server Status:")
    print(
        f"   🖥️  Backend:  {'✅ Started' if backend_ok else '❌ Failed'} | {'🟢 Ready' if backend_ready else '🔴 Not Ready'}"
    )
    print(
        f"   💻 Frontend: {'✅ Started' if frontend_ok else '❌ Failed'} | {'🟢 Ready' if frontend_ready else '🔴 Not Ready'}"
    )

    if backend_ready and frontend_ready:
        print("\n🌟 Both servers are running successfully!")
        print("📋 Access URLs:")
        print(f"   🖥️  Django Backend:  {CONFIG['backend_url']}")
        print(f"   💻 React Frontend:   {CONFIG['frontend_url']}")
        print("\n🎮 Available endpoints:")
        print("   📋 Admin Panel:      http://127.0.0.1:8000/admin/")
        print("   🔗 API Docs:         http://127.0.0.1:8000/api/")
        print("   📊 Health Check:     http://127.0.0.1:8000/health/")

    print(f"\n⏰ Startup completed at: {datetime.now().strftime('%H:%M:%S')}")
    print("🛑 Press Ctrl+C in each terminal to stop servers")
    print("=" * 50)


# Note: kill_frontend_processes() has been replaced by kill_frontend_processes_robust()
# The old function is kept for reference but is no longer used.


def kill_frontend_processes_robust() -> int:
    """Kill all frontend development processes using multiple approaches"""
    killed_count = 0

    if is_windows():
        print("   🔍 Searching for frontend processes (robust method)...")

        # Method 1: Search by exact path components
        try:
            result = subprocess.check_output(
                "wmic process get ProcessId,CommandLine /FORMAT:LIST",
                shell=True,
                encoding="utf-8",
                errors="ignore",
            )

            lines = result.splitlines()
            current_pid = None
            current_cmd = None

            for line in lines:
                line = line.strip()
                if line.startswith("CommandLine="):
                    current_cmd = line[12:]  # Remove "CommandLine="
                elif line.startswith("ProcessId="):
                    current_pid = line[10:]  # Remove "ProcessId="

                    # Check if this is a frontend process
                    if current_cmd and current_pid and current_pid.isdigit():
                        pid = int(current_pid)
                        if pid != os.getpid() and pid > 0:  # Don't kill ourselves
                            cmd_lower = current_cmd.lower()

                            # Check for various frontend patterns
                            is_frontend = (
                                "royal-care-frontend" in cmd_lower
                                or ("npm" in cmd_lower and "run dev" in cmd_lower)
                                or ("vite.js" in cmd_lower)
                                or (
                                    "esbuild.exe" in cmd_lower
                                    and "royal-care" in cmd_lower
                                )
                                or ("react frontend" in cmd_lower)
                                or (
                                    "cmd" in cmd_lower
                                    and "npm.cmd run dev" in cmd_lower
                                )
                            )

                            if is_frontend:
                                try:
                                    result = subprocess.run(
                                        f"taskkill /PID {pid} /F",
                                        shell=True,
                                        capture_output=True,
                                        text=True,
                                    )
                                    if result.returncode == 0:
                                        print(
                                            f"🔪 Killed frontend process {pid}: {current_cmd[:60]}..."
                                        )
                                        killed_count += 1
                                except:
                                    pass

                    # Reset for next process
                    current_cmd = None
                    current_pid = None

        except Exception as e:
            logger.debug(f"Robust frontend killing failed: {e}")

        # Method 2: Kill by port (fallback)
        if killed_count == 0:
            print("   🔍 Trying port-based killing as fallback...")
            port_killed = kill_processes_by_port(CONFIG["frontend_port"])
            killed_count += port_killed

    else:
        # Linux/macOS: Use ps with grep
        try:
            result = subprocess.run(
                ["ps", "aux"], capture_output=True, text=True, check=True
            )
            for line in result.stdout.splitlines():
                if (
                    "royal-care-frontend" in line
                    or ("npm" in line and "run dev" in line)
                    or "vite" in line
                ) and str(os.getpid()) not in line:
                    parts = line.split()
                    if len(parts) > 1 and parts[1].isdigit():
                        pid = parts[1]
                        try:
                            result = subprocess.run(
                                ["kill", "-9", pid], capture_output=True, text=True
                            )
                            if result.returncode == 0:
                                print(f"🔪 Killed frontend process {pid}")
                                killed_count += 1
                        except:
                            pass
        except:
            pass

    if killed_count > 0:
        print(f"   ✅ Killed {killed_count} frontend process(es)")
        time.sleep(3)  # Give processes time to clean up
    else:
        print("   ✅ No frontend processes found")

    return killed_count


def cleanup_existing_servers():
    """Kill any existing development servers before starting new ones"""
    print("🧹 Cleaning up any existing development servers...")

    # Only kill processes that are actually running
    total_killed = 0

    # Kill Django processes
    print("   Checking for Django processes...")
    django_killed = kill_by_command_snippet("manage.py runserver")
    total_killed += django_killed

    # Kill frontend processes with comprehensive method
    print("   Checking for frontend processes...")
    frontend_killed = kill_frontend_processes_robust()
    total_killed += frontend_killed

    # Kill by ports as additional cleanup
    if total_killed > 0:
        print("   Freeing ports...")
        backend_port_killed = kill_processes_by_port(CONFIG["backend_port"])
        frontend_port_killed = kill_processes_by_port(CONFIG["frontend_port"])
        time.sleep(2)  # Give time for cleanup
        print(f"✅ Cleaned up {total_killed} existing processes")
    else:
        print("✅ No existing processes found")

    return total_killed


def main():
    """Enhanced main function with better error handling and monitoring"""
    print("🚀 Guitara Enhanced Development Server Starter")
    print("=" * 50)

    # Load configuration
    load_config()

    # Print system info if verbose
    if CONFIG["verbose_logging"]:
        print_system_info()

    # Clean up any existing servers first (original behavior)
    cleanup_existing_servers()

    # Basic checks
    print("🔍 Performing system checks...")
    if not check_requirements():
        print("\n❌ Requirements check failed")
        print("💡 Please fix the issues above and try again")
        save_default_config()
        if not is_windows():
            print("\nPress Enter to exit...")
            input()
        return 1

    print("\n✅ All requirements satisfied")

    # Start servers
    print("\n🚀 Starting development servers...")

    backend_ok = start_backend()
    backend_ready = False
    frontend_ok = False
    frontend_ready = False

    if backend_ok:
        backend_ready = wait_for_server(CONFIG["backend_url"])
        if backend_ready:
            print("✅ Backend is ready, starting frontend...")
            time.sleep(1)  # Brief pause between starts
            frontend_ok = start_frontend()

            if frontend_ok:
                frontend_ready = wait_for_server(CONFIG["frontend_url"])

                if frontend_ready:
                    # Final health check
                    print("\n🔍 Performing final health checks...")
                    health_status = monitor_servers()

                    if health_status["backend"] and health_status["frontend"]:
                        # Check if processes are actually running
                        backend_running = is_development_process_running(
                            "manage.py runserver"
                        )
                        frontend_running = (
                            is_development_process_running("npm run dev")
                            or is_development_process_running("vite")
                            or is_development_process_running("node dev")
                        )

                        logger.info(
                            f"Process check - Backend: {backend_running}, Frontend: {frontend_running}"
                        )

                        if CONFIG["auto_browser"] and (
                            backend_running or frontend_running
                        ):
                            open_browser()
                    else:
                        print("⚠️ Health check failed for some servers")
                else:
                    print("\n⚠️ Frontend did not become ready in time")
            else:
                print("\n⚠️ Frontend failed to start")
        else:
            print("\n⚠️ Backend did not become ready in time")
    else:
        print("\n⚠️ Backend failed to start")

    # Print summary
    print_startup_summary(backend_ok, frontend_ok, backend_ready, frontend_ready)

    # Save configuration for next time
    save_default_config()

    if not is_windows():
        print("\nPress Enter to exit...")
        input()

    return 0 if (backend_ready and frontend_ready) else 1


def cleanup_on_exit():
    """Cleanup function to be called on script exit"""
    print("\n🧹 Cleaning up...")
    logger.info("Script cleanup initiated")


def signal_handler(signum, frame):
    """Handle interrupt signals gracefully"""
    print(f"\n🛑 Received signal {signum}")
    cleanup_on_exit()
    sys.exit(0)


if __name__ == "__main__":
    # Register signal handlers for graceful shutdown
    if hasattr(signal, "SIGINT"):
        signal.signal(signal.SIGINT, signal_handler)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, signal_handler)

    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n🛑 Interrupted by user")
        cleanup_on_exit()
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        logger.error(f"Unexpected error: {e}", exc_info=True)
        cleanup_on_exit()
        sys.exit(1)
