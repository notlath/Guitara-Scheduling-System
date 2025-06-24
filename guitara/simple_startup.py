#!/usr/bin/env python3
"""
Ultra-simple Railway startup script that prioritizes getting *something* running
"""

import os
import sys
import subprocess
import time
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

print("🚀 ULTRA-SIMPLE RAILWAY STARTUP")
print(f"PORT: {os.environ.get('PORT', '8000')}")
print(f"Python version: {sys.version}")
print(f"Working directory: {os.getcwd()}")

# Set minimal environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings_railway_minimal")

def try_django_setup():
    """Try to set up Django"""
    try:
        print("🧪 Trying Django setup...")
        import django
        django.setup()
        print("✅ Django setup successful")
        return True
    except Exception as e:
        print(f"❌ Django setup failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def try_migrations():
    """Try to run migrations"""
    try:
        print("🧪 Trying migrations...")
        from django.core.management import execute_from_command_line
        execute_from_command_line(['manage.py', 'migrate', '--noinput'])
        print("✅ Migrations successful")
        return True
    except Exception as e:
        print(f"⚠️ Migrations failed (continuing anyway): {e}")
        return False

def try_collectstatic():
    """Try to collect static files"""
    try:
        print("🧪 Trying collectstatic...")
        from django.core.management import execute_from_command_line
        execute_from_command_line(['manage.py', 'collectstatic', '--noinput'])
        print("✅ Collectstatic successful")
        return True
    except Exception as e:
        print(f"⚠️ Collectstatic failed (continuing anyway): {e}")
        return False

def start_daphne():
    """Start Daphne server"""
    port = os.environ.get('PORT', '8000')
    print(f"🌟 Starting Daphne on port {port}")
    
    try:
        # Use subprocess to avoid Python import issues
        cmd = [
            sys.executable, '-m', 'daphne',
            '-b', '0.0.0.0',
            '-p', port,
            'guitara.asgi:application'
        ]
        
        print(f"Executing: {' '.join(cmd)}")
        subprocess.run(cmd, check=True)
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Daphne failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def start_emergency_server():
    """Start emergency Python HTTP server"""
    port = int(os.environ.get('PORT', '8000'))
    print(f"🚨 Starting emergency HTTP server on port {port}")
    
    from http.server import HTTPServer, BaseHTTPRequestHandler
    import json
    
    class EmergencyHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path in ['/health/', '/health', '/ping/', '/ping', '/']:
                response = {
                    "status": "emergency_mode",
                    "service": "guitara-scheduling-system",
                    "timestamp": int(time.time()),
                    "message": "Emergency mode - Django startup failed"
                }
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response).encode())
            else:
                self.send_response(404)
                self.end_headers()
        
        def log_message(self, format, *args):
            print(f"[EMERGENCY] {format % args}")
    
    try:
        server = HTTPServer(('0.0.0.0', port), EmergencyHandler)
        print(f"✅ Emergency server started on http://0.0.0.0:{port}")
        server.serve_forever()
    except Exception as e:
        print(f"❌ Emergency server failed: {e}")

def main():
    """Main startup sequence"""
    
    # Step 1: Try Django setup
    django_ok = try_django_setup()
    
    if not django_ok:
        print("❌ Django setup failed, starting emergency server")
        start_emergency_server()
        return
    
    # Step 2: Try migrations (optional)
    try_migrations()
    
    # Step 3: Try static files (optional)
    try_collectstatic()
    
    # Step 4: Try to start Daphne
    try:
        start_daphne()
    except Exception as e:
        print(f"❌ Daphne startup failed: {e}")
        print("🚨 Starting emergency server instead")
        start_emergency_server()

if __name__ == "__main__":
    main()
