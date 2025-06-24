#!/usr/bin/env python3
"""
Emergency Railway startup script - NO database dependency
For use when database connectivity is causing 502 errors
"""

import os
import sys
import subprocess
import time
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

print("🆘 EMERGENCY RAILWAY STARTUP (NO DATABASE)")
print(f"PORT: {os.environ.get('PORT', '8000')}")
print(f"Python version: {sys.version}")

# Force emergency settings (no database dependency)
os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_emergency"
print(f"🔧 Using emergency Django settings: {os.environ['DJANGO_SETTINGS_MODULE']}")


def create_emergency_settings():
    """Create emergency Django settings if they don't exist"""
    settings_path = Path(__file__).parent / "guitara" / "settings_emergency.py"

    if settings_path.exists():
        print("✅ Emergency settings already exist")
        return

    print("🔧 Creating emergency settings...")
    print(f"Path: {settings_path}")

    settings_content = '''"""
Emergency Django settings for Railway deployment
NO DATABASE DEPENDENCY - only for health checks
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("SECRET_KEY", "emergency-railway-key-no-security")
DEBUG = True  # Force debug mode for emergency

# Allow all hosts for emergency mode
ALLOWED_HOSTS = ['*']

# Minimal apps - no database-dependent apps
INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.staticfiles',
    'corsheaders',
]

# Minimal middleware
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.security.SecurityMiddleware',
]

ROOT_URLCONF = 'guitara.urls_emergency'

# NO DATABASE - use dummy backend
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.dummy',
    }
}

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = '/app/staticfiles'

# CORS - allow all for emergency
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Minimal logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
}

print("[EMERGENCY SETTINGS] ✅ Emergency Django settings loaded - NO DATABASE")
print(f"[EMERGENCY SETTINGS] ALLOWED_HOSTS: {ALLOWED_HOSTS}")
print(f"[EMERGENCY SETTINGS] CORS_ALLOW_ALL_ORIGINS: {CORS_ALLOW_ALL_ORIGINS}")
'''

    # Ensure directory exists
    settings_path.parent.mkdir(parents=True, exist_ok=True)
    settings_path.write_text(settings_content)
    print(f"✅ Created emergency settings: {settings_path}")


def create_emergency_urls():
    """Create emergency URL configuration"""
    urls_path = Path(__file__).parent / "guitara" / "urls_emergency.py"

    if urls_path.exists():
        print("✅ Emergency URLs already exist")
        return

    print("🔧 Creating emergency URLs...")
    print(f"Path: {urls_path}")

    urls_content = '''"""
Emergency URLs for Railway deployment
Only health check endpoints - no database dependency
"""

import time
from django.http import JsonResponse
from django.urls import path


def emergency_health(request):
    """Emergency health check - no database"""
    return JsonResponse({
        "status": "emergency_healthy",
        "service": "guitara-scheduling-system",
        "timestamp": int(time.time()),
        "mode": "emergency_no_database",
        "message": "Emergency mode - health check only"
    }, status=200)


def emergency_root(request):
    """Emergency root endpoint"""
    return JsonResponse({
        "message": "Guitara Scheduling System - Emergency Mode",
        "status": "emergency_running",
        "mode": "no_database",
        "timestamp": int(time.time()),
        "available_endpoints": ["/health/", "/healthcheck/", "/ping/"]
    }, status=200)


urlpatterns = [
    path('', emergency_root, name='emergency_root'),
    path('health/', emergency_health, name='emergency_health'),
    path('healthcheck/', emergency_health, name='emergency_healthcheck'),
    path('ping/', emergency_health, name='emergency_ping'),
]
'''

    # Ensure directory exists
    urls_path.parent.mkdir(parents=True, exist_ok=True)
    urls_path.write_text(urls_content)
    print(f"✅ Created emergency URLs: {urls_path}")


def create_emergency_asgi():
    """Create emergency ASGI application"""
    asgi_path = Path(__file__).parent / "guitara" / "asgi_emergency.py"

    if asgi_path.exists():
        print("✅ Emergency ASGI already exists")
        return

    print("🔧 Creating emergency ASGI...")
    print(f"Path: {asgi_path}")

    asgi_content = '''"""
Emergency ASGI application for Railway deployment
NO DATABASE DEPENDENCY
"""

import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings_emergency')

try:
    from django.core.asgi import get_asgi_application
    application = get_asgi_application()
    print("[EMERGENCY ASGI] ✅ Emergency ASGI application loaded")
except Exception as e:
    print(f"[EMERGENCY ASGI] ❌ Error: {e}")
    
    # Ultimate fallback
    async def emergency_asgi_app(scope, receive, send):
        if scope["type"] == "http":
            await send({
                "type": "http.response.start",
                "status": 200,
                "headers": [[b"content-type", b"application/json"]],
            })
            await send({
                "type": "http.response.body",
                "body": b'{"status": "emergency_asgi_fallback", "service": "guitara"}',
            })
        else:
            await send({"type": "websocket.close"})
    
    application = emergency_asgi_app
    print("[EMERGENCY ASGI] ⚠️ Using ultimate fallback ASGI")
'''

    # Ensure directory exists
    asgi_path.parent.mkdir(parents=True, exist_ok=True)
    asgi_path.write_text(asgi_content)
    print(f"✅ Created emergency ASGI: {asgi_path}")


def start_emergency_server():
    """Start emergency server with no database dependency"""
    port = os.environ.get("PORT", "8000")

    print(f"\n🚨 Starting emergency server on port {port}")
    print("⚠️ This is emergency mode - no database, no full API")
    print("✅ Only health check endpoints are available")

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

    print(f"Command: {' '.join(cmd)}")
    subprocess.run(cmd, check=True)


def main():
    """Emergency startup sequence"""
    print("\n" + "=" * 60)
    print("🆘 EMERGENCY RAILWAY STARTUP - NO DATABASE")
    print("=" * 60)

    # Create emergency configuration files
    create_emergency_settings()
    create_emergency_urls()
    create_emergency_asgi()

    # Start emergency server immediately
    print("\n🚨 Starting emergency server (bypassing all database checks)...")
    start_emergency_server()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n🛑 Emergency server stopped by user")
    except Exception as e:
        print(f"\n💀 Emergency startup failed: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
