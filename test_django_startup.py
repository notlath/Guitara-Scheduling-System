#!/usr/bin/env python3
"""
Test Django startup locally to debug Railway issues
"""

import os
import sys
from pathlib import Path

# Add guitara directory to path
guitara_path = Path(__file__).parent / "guitara"
sys.path.insert(0, str(guitara_path))

# Set the Django settings module
os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_railway_minimal"

print("🧪 TESTING DJANGO STARTUP LOCALLY")
print(f"Python path: {sys.path[:3]}")
print(f"Working directory: {os.getcwd()}")
print(f"Guitara path: {guitara_path}")
print(f"Django settings: {os.environ['DJANGO_SETTINGS_MODULE']}")

# Test 1: Import Django and setup
try:
    print("\n1️⃣ Testing Django import and setup...")
    import django

    django.setup()
    print("✅ Django setup successful")
except Exception as e:
    print(f"❌ Django setup failed: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)

# Test 2: Test database connection
try:
    print("\n2️⃣ Testing database connection...")
    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        if result and result[0] == 1:
            print("✅ Database connection successful")
        else:
            print("❌ Database connection failed: Invalid response")
except Exception as e:
    print(f"⚠️ Database connection failed: {e}")
    # Continue anyway

# Test 3: Test URL configuration
try:
    print("\n3️⃣ Testing URL configuration...")
    from django.conf import settings
    from django.urls import get_resolver

    resolver = get_resolver(settings.ROOT_URLCONF)
    print(f"✅ URL resolver loaded: {settings.ROOT_URLCONF}")
    print(f"Available URL patterns: {len(resolver.url_patterns)}")
except Exception as e:
    print(f"❌ URL configuration failed: {e}")
    import traceback

    traceback.print_exc()

# Test 4: Test ASGI application
try:
    print("\n4️⃣ Testing ASGI application...")
    from guitara.asgi_minimal import application

    print(f"✅ ASGI application loaded: {type(application)}")
except Exception as e:
    print(f"❌ ASGI application failed: {e}")
    import traceback

    traceback.print_exc()

# Test 5: Test health check endpoints
try:
    print("\n5️⃣ Testing health check endpoints...")
    from django.test import Client

    client = Client()

    # Test health endpoint
    response = client.get("/health/")
    print(
        f"Health endpoint: {response.status_code} - {response.content[:100].decode()}"
    )

    # Test minimal health
    response = client.get("/health/minimal/")
    print(
        f"Minimal health endpoint: {response.status_code} - {response.content[:100].decode()}"
    )

    # Test CORS debug
    response = client.get("/debug/cors/")
    print(
        f"CORS debug endpoint: {response.status_code} - {response.content[:100].decode()}"
    )

except Exception as e:
    print(f"❌ Health check endpoints failed: {e}")
    import traceback

    traceback.print_exc()

print("\n✅ Django startup test completed!")
