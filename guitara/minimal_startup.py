#!/usr/bin/env python3
"""
Minimal mode Railway startup script with database connectivity
"""

import os
import sys
import subprocess
import time
import json
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

print("🚀 MINIMAL MODE RAILWAY STARTUP")
print(f"PORT: {os.environ.get('PORT', '8000')}")
print(f"Python version: {sys.version}")
print(f"Working directory: {os.getcwd()}")

# Set to minimal settings (NOT emergency)
os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_railway_minimal"
print(f"🔧 Using minimal Django settings: {os.environ['DJANGO_SETTINGS_MODULE']}")

# Print database environment variables for debugging
print("\n📊 DATABASE CONFIGURATION:")
print(f"  SUPABASE_DB_HOST: {os.environ.get('SUPABASE_DB_HOST', 'NOT SET')}")
print(f"  SUPABASE_DB_NAME: {os.environ.get('SUPABASE_DB_NAME', 'NOT SET')}")
print(f"  SUPABASE_DB_USER: {os.environ.get('SUPABASE_DB_USER', 'NOT SET')}")
print(f"  SUPABASE_DB_PASSWORD: {'SET' if os.environ.get('SUPABASE_DB_PASSWORD') else 'NOT SET'}")


def test_database_connection():
    """Test database connectivity before starting the server"""
    try:
        print("\n🔍 Testing database connection...")
        import django
        django.setup()
        
        from django.db import connection
        from django.db.utils import OperationalError
        
        # Test the connection with a timeout
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            if result and result[0] == 1:
                print("✅ Database connection successful!")
                return True
            else:
                print("❌ Database connection failed: Invalid response")
                return False
                
    except OperationalError as e:
        print(f"❌ Database connection failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Database setup failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def try_migrations():
    """Try to run migrations"""
    try:
        print("\n🔄 Running migrations...")
        from django.core.management import execute_from_command_line
        execute_from_command_line(["manage.py", "migrate", "--noinput"])
        print("✅ Migrations completed successfully")
        return True
    except Exception as e:
        print(f"❌ Migrations failed: {e}")
        return False


def try_collectstatic():
    """Try to collect static files"""
    try:
        print("\n📁 Collecting static files...")
        from django.core.management import execute_from_command_line
        execute_from_command_line(["manage.py", "collectstatic", "--noinput"])
        print("✅ Static files collected successfully")
        return True
    except Exception as e:
        print(f"⚠️ Collectstatic failed (continuing anyway): {e}")
        return False


def start_daphne_minimal():
    """Start Daphne server with minimal ASGI app"""
    port = os.environ.get("PORT", "8000")
    print(f"\n🌟 Starting Daphne server on port {port} (minimal mode)")

    try:
        # Use minimal ASGI app
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

        print(f"Executing: {' '.join(cmd)}")
        subprocess.run(cmd, check=True)
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Daphne server failed: {e}")
        raise


def fallback_to_emergency():
    """Fallback to emergency mode if minimal mode fails"""
    print("\n⚠️ FALLING BACK TO EMERGENCY MODE")
    os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_emergency"
    
    port = os.environ.get("PORT", "8000")
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
    
    print(f"Emergency fallback command: {' '.join(cmd)}")
    subprocess.run(cmd, check=True)


def main():
    """Main startup sequence"""
    print("\n" + "="*60)
    print("MINIMAL MODE STARTUP SEQUENCE")
    print("="*60)
    
    # Step 1: Test database connection
    if not test_database_connection():
        print("\n❌ Database connection failed. Falling back to emergency mode...")
        fallback_to_emergency()
        return
    
    # Step 2: Run migrations
    if not try_migrations():
        print("\n⚠️ Migrations failed, but continuing with existing database state...")
    
    # Step 3: Collect static files (optional)
    try_collectstatic()
    
    # Step 4: Start the server
    print("\n🚀 All checks passed! Starting minimal mode server...")
    start_daphne_minimal()


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\n💥 Critical startup failure: {e}")
        import traceback
        traceback.print_exc()
        print("\n🆘 Attempting emergency fallback...")
        try:
            fallback_to_emergency()
        except Exception as fallback_error:
            print(f"💀 Emergency fallback also failed: {fallback_error}")
            sys.exit(1)
