#!/usr/bin/env python3
"""
Test CORS configuration for production deployment
"""
import os
import sys
from pathlib import Path

# Add the guitara directory to the path
guitara_dir = Path(__file__).parent / "guitara"
sys.path.insert(0, str(guitara_dir))
os.chdir(guitara_dir)

# Set production environment
os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_production"
os.environ["ALLOWED_HOSTS"] = (
    "charismatic-appreciation-production.up.railway.app,localhost,127.0.0.1"
)
os.environ["DEBUG"] = "False"

# Test Django import and settings
import django
from django.conf import settings

print("🧪 TESTING PRODUCTION CORS CONFIGURATION")
print("=" * 50)

try:
    django.setup()
    print("✅ Django setup successful")

    # Test CORS settings
    print(f"\n📊 CORS Configuration:")
    print(
        f"CORS_ALLOWED_ORIGINS: {getattr(settings, 'CORS_ALLOWED_ORIGINS', 'NOT SET')}"
    )
    print(
        f"CORS_ALLOW_ALL_ORIGINS: {getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', 'NOT SET')}"
    )
    print(
        f"CORS_ALLOW_CREDENTIALS: {getattr(settings, 'CORS_ALLOW_CREDENTIALS', 'NOT SET')}"
    )
    print(f"CORS_ALLOW_HEADERS: {getattr(settings, 'CORS_ALLOW_HEADERS', 'NOT SET')}")

    # Check if the problem Vercel domain is included
    allowed_origins = getattr(settings, "CORS_ALLOWED_ORIGINS", [])
    problem_domain = (
        "https://guitara-scheduling-system-git-main-lathrells-projects.vercel.app"
    )

    if problem_domain in allowed_origins:
        print(f"✅ Problem domain '{problem_domain}' is in CORS_ALLOWED_ORIGINS")
    else:
        print(f"❌ Problem domain '{problem_domain}' is NOT in CORS_ALLOWED_ORIGINS")
        print(f"   This is likely causing the CORS error!")

    # Check middleware
    middleware = getattr(settings, "MIDDLEWARE", [])
    cors_middleware = "corsheaders.middleware.CorsMiddleware"

    if cors_middleware in middleware:
        position = middleware.index(cors_middleware)
        print(f"✅ CORS middleware found at position {position}")
        if position == 0:
            print("✅ CORS middleware is at the top of the stack (correct)")
        else:
            print("⚠️  CORS middleware should be at the top of the middleware stack")
    else:
        print("❌ CORS middleware not found in MIDDLEWARE setting")

    # Check installed apps
    installed_apps = getattr(settings, "INSTALLED_APPS", [])
    if "corsheaders" in installed_apps:
        print("✅ corsheaders app is installed")
    else:
        print("❌ corsheaders app is not in INSTALLED_APPS")

    print(f"\n🔧 Django Settings Module: {settings.SETTINGS_MODULE}")
    print(f"🔧 Debug Mode: {settings.DEBUG}")
    print(f"🔧 Allowed Hosts: {settings.ALLOWED_HOSTS}")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback

    traceback.print_exc()

print("\n" + "=" * 50)
print("🔍 Test complete. Deploy to Railway and check if CORS error is resolved.")
