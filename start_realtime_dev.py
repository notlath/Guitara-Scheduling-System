#!/usr/bin/env python3
"""
Development server startup script for Django + Channels + Redis
Starts Redis, Django, and the frontend in development mode
"""
import os
import sys
import subprocess
import time
import signal
from pathlib import Path


# Colors for terminal output
class Colors:
    RED = "\033[91m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN = "\033[96m"
    WHITE = "\033[97m"
    ENDC = "\033[0m"
    BOLD = "\033[1m"


def print_colored(message, color=Colors.WHITE):
    print(f"{color}{message}{Colors.ENDC}")


def print_header(message):
    print_colored(f"\n{'='*60}", Colors.CYAN)
    print_colored(f"{message.center(60)}", Colors.CYAN + Colors.BOLD)
    print_colored(f"{'='*60}", Colors.CYAN)


def check_redis():
    """Check if Redis is running"""
    try:
        import redis

        r = redis.Redis(host="localhost", port=6379, db=0)
        r.ping()
        print_colored("✅ Redis is running", Colors.GREEN)
        return True
    except:
        print_colored("❌ Redis is not running", Colors.RED)
        return False


def start_redis():
    """Start Redis server"""
    print_colored("🚀 Starting Redis server...", Colors.YELLOW)
    try:
        if os.name == "nt":  # Windows
            subprocess.Popen(["redis-server"], shell=True)
        else:  # Unix/Linux/Mac
            subprocess.Popen(["redis-server"])
        time.sleep(2)
        if check_redis():
            print_colored("✅ Redis started successfully", Colors.GREEN)
        else:
            print_colored("❌ Failed to start Redis", Colors.RED)
            return False
    except Exception as e:
        print_colored(f"❌ Error starting Redis: {e}", Colors.RED)
        return False
    return True


def run_django_migrations():
    """Run Django migrations"""
    print_colored("🔄 Running Django migrations...", Colors.YELLOW)
    try:
        os.chdir("guitara")
        result = subprocess.run(
            [sys.executable, "manage.py", "migrate"], capture_output=True, text=True
        )
        if result.returncode == 0:
            print_colored("✅ Migrations completed", Colors.GREEN)
        else:
            print_colored(f"❌ Migration failed: {result.stderr}", Colors.RED)
            return False
    except Exception as e:
        print_colored(f"❌ Error running migrations: {e}", Colors.RED)
        return False
    return True


def start_django():
    """Start Django with Channels (ASGI)"""
    print_colored("🚀 Starting Django ASGI server...", Colors.YELLOW)
    try:
        # Use daphne for ASGI serving with WebSocket support
        cmd = [sys.executable, "manage.py", "runserver", "127.0.0.1:8000"]
        django_process = subprocess.Popen(cmd, cwd="guitara")
        print_colored(
            "✅ Django ASGI server started on http://127.0.0.1:8000", Colors.GREEN
        )
        print_colored(
            "📡 WebSocket endpoint: ws://127.0.0.1:8000/ws/scheduling/appointments/",
            Colors.CYAN,
        )
        return django_process
    except Exception as e:
        print_colored(f"❌ Error starting Django: {e}", Colors.RED)
        return None


def start_frontend():
    """Start React frontend"""
    print_colored("🚀 Starting React frontend...", Colors.YELLOW)
    try:
        frontend_path = Path("royal-care-frontend")
        if not frontend_path.exists():
            print_colored("❌ Frontend directory not found", Colors.RED)
            return None

        # Check if node_modules exists
        if not (frontend_path / "node_modules").exists():
            print_colored("📦 Installing frontend dependencies...", Colors.YELLOW)
            npm_install = subprocess.run(["npm", "install"], cwd=frontend_path)
            if npm_install.returncode != 0:
                print_colored("❌ Failed to install frontend dependencies", Colors.RED)
                return None

        cmd = ["npm", "run", "dev"]
        frontend_process = subprocess.Popen(cmd, cwd=frontend_path)
        print_colored(
            "✅ React frontend started on http://localhost:5173", Colors.GREEN
        )
        return frontend_process
    except Exception as e:
        print_colored(f"❌ Error starting frontend: {e}", Colors.RED)
        return None


def main():
    print_header("🏥 Royal Care Real-Time Development Server")

    processes = []

    def signal_handler(sig, frame):
        print_colored("\n🛑 Shutting down all services...", Colors.YELLOW)
        for process in processes:
            if process and process.poll() is None:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
        print_colored("✅ All services stopped", Colors.GREEN)
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)

    # Step 1: Check/Start Redis
    print_header("Step 1: Redis Setup")
    if not check_redis():
        if not start_redis():
            print_colored("❌ Cannot continue without Redis", Colors.RED)
            return

    # Step 2: Run migrations
    print_header("Step 2: Database Setup")
    if not run_django_migrations():
        print_colored("❌ Cannot continue without migrations", Colors.RED)
        return

    # Step 3: Start Django
    print_header("Step 3: Backend Server")
    django_process = start_django()
    if django_process:
        processes.append(django_process)
        time.sleep(3)  # Give Django time to start
    else:
        print_colored("❌ Cannot continue without Django", Colors.RED)
        return

    # Step 4: Start Frontend
    print_header("Step 4: Frontend Server")
    frontend_process = start_frontend()
    if frontend_process:
        processes.append(frontend_process)

    # Summary
    print_header("🎉 All Services Running!")
    print_colored("🌐 Frontend: http://localhost:5173", Colors.GREEN + Colors.BOLD)
    print_colored(
        "🔧 Backend API: http://127.0.0.1:8000/api/", Colors.GREEN + Colors.BOLD
    )
    print_colored(
        "📡 WebSocket: ws://127.0.0.1:8000/ws/scheduling/appointments/",
        Colors.GREEN + Colors.BOLD,
    )
    print_colored("🔴 Redis: localhost:6379", Colors.GREEN + Colors.BOLD)
    print_colored("\n💡 Tips:", Colors.CYAN + Colors.BOLD)
    print_colored("   • Press Ctrl+C to stop all services", Colors.CYAN)
    print_colored(
        "   • Check the browser console for WebSocket connection status", Colors.CYAN
    )
    print_colored(
        "   • Real-time updates should work across multiple tabs/devices", Colors.CYAN
    )

    # Keep the script running
    try:
        while True:
            time.sleep(1)
            # Check if any process died
            for i, process in enumerate(processes):
                if process and process.poll() is not None:
                    print_colored(f"⚠️  Process {i} has died", Colors.YELLOW)
    except KeyboardInterrupt:
        signal_handler(signal.SIGINT, None)


if __name__ == "__main__":
    main()
