#!/usr/bin/env python3
"""
Robust Railway startup script with database fallback
Will try minimal mode first, then fallback to emergency mode
"""

import os
import sys
import subprocess
import time
import signal
from pathlib import Path
from multiprocessing import Process, Queue

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

print("🚀 ROBUST RAILWAY STARTUP")
print(f"PORT: {os.environ.get('PORT', '8000')}")
print(f"Python version: {sys.version}")

# Set default Django settings
if not os.environ.get("DJANGO_SETTINGS_MODULE"):
    os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_railway_minimal"
    print(f"🔧 Using minimal Django settings: {os.environ['DJANGO_SETTINGS_MODULE']}")


def test_database_with_timeout(timeout_seconds=15):
    """Test database connection with a timeout"""

    def db_test_worker(result_queue):
        """Worker function to test database connection"""
        try:
            import django

            django.setup()

            from django.db import connection
            from django.db.utils import OperationalError

            # Test connection with a simple query
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                if result and result[0] == 1:
                    result_queue.put(("success", "Database connection successful"))
                    return

            result_queue.put(("error", "Invalid database response"))

        except OperationalError as e:
            result_queue.put(("error", f"Database connection failed: {str(e)[:200]}"))
        except Exception as e:
            result_queue.put(("error", f"Database setup failed: {str(e)[:200]}"))

    print(f"\n🔍 Testing database connection (timeout: {timeout_seconds}s)...")

    # Create a queue to get results from worker process
    result_queue = Queue()

    # Start worker process
    worker = Process(target=db_test_worker, args=(result_queue,))
    worker.start()

    # Wait for result with timeout
    worker.join(timeout=timeout_seconds)

    if worker.is_alive():
        # Process is still running - timeout occurred
        print(f"⏰ Database connection test timed out after {timeout_seconds}s")
        worker.terminate()
        worker.join(timeout=2)
        if worker.is_alive():
            worker.kill()
        return False, "Database connection timeout"

    # Get result from queue
    if not result_queue.empty():
        status, message = result_queue.get()
        if status == "success":
            print(f"✅ {message}")
            return True, message
        else:
            print(f"❌ {message}")
            return False, message
    else:
        print("❌ Database test worker failed to report result")
        return False, "No result from database test"


def start_minimal_server():
    """Start server with minimal settings"""
    port = os.environ.get("PORT", "8000")
    print(f"\n🌟 Starting minimal server on port {port}")

    cmd = [
        sys.executable,
        "-m",
        "daphne",
        "-b",
        "0.0.0.0",
        "-p",
        port,
        "guitara.asgi_minimal:application",
    ]

    print(f"Command: {' '.join(cmd)}")
    return subprocess.run(cmd, check=True)


def start_emergency_server():
    """Start server with emergency settings (no database)"""
    port = os.environ.get("PORT", "8000")
    print(f"\n🆘 Starting emergency server on port {port} (NO DATABASE)")

    # Switch to emergency settings
    os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_emergency"

    cmd = [
        sys.executable,
        "-m",
        "daphne",
        "-b",
        "0.0.0.0",
        "-p",
        port,
        "guitara.asgi_emergency:application",
    ]

    print(f"Emergency command: {' '.join(cmd)}")
    return subprocess.run(cmd, check=True)


def handle_signal(signum, frame):
    """Handle shutdown signals gracefully"""
    print(f"\n🛑 Received signal {signum}, shutting down gracefully...")
    sys.exit(0)


def main():
    """Main startup sequence with fallback strategy"""
    # Set up signal handlers
    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    print("\n" + "=" * 60)
    print("🚀 ROBUST RAILWAY STARTUP SEQUENCE")
    print("=" * 60)

    # Step 1: Quick database connectivity test
    db_success, db_message = test_database_with_timeout(timeout_seconds=10)

    if db_success:
        print("\n✅ Database is available - proceeding with minimal mode")

        # Try to run migrations quickly
        try:
            print("\n🔄 Running migrations (with timeout)...")

            # Use a shorter timeout for migrations
            migration_cmd = [sys.executable, "manage.py", "migrate", "--noinput"]

            result = subprocess.run(
                migration_cmd,
                cwd=str(Path(__file__).parent),
                timeout=30,  # 30 second timeout
                capture_output=True,
                text=True,
            )

            if result.returncode == 0:
                print("✅ Migrations completed successfully")
            else:
                print(f"⚠️ Migrations failed: {result.stderr[:200]}")
                print("🔄 Continuing with existing database state...")

        except subprocess.TimeoutExpired:
            print(
                "⏰ Migrations timed out - continuing with existing database state..."
            )
        except Exception as e:
            print(f"⚠️ Migration error: {e}")
            print("🔄 Continuing with existing database state...")

        # Try to start minimal server
        try:
            print("\n🚀 Starting minimal server with database support...")
            start_minimal_server()
        except Exception as e:
            print(f"❌ Minimal server failed: {e}")
            print("🆘 Falling back to emergency mode...")
            start_emergency_server()

    else:
        print(f"\n❌ Database not available: {db_message}")
        print("🆘 Starting in emergency mode (no database dependency)")
        start_emergency_server()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Startup interrupted by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n💥 Critical startup failure: {e}")
        import traceback

        traceback.print_exc()

        print("\n🆘 Final fallback: attempting emergency server...")
        try:
            start_emergency_server()
        except Exception as fallback_error:
            print(f"💀 Emergency fallback also failed: {fallback_error}")
            sys.exit(1)
