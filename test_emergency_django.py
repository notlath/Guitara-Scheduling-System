#!/usr/bin/env python3
"""
Simple test to check if emergency Django setup works
"""

import os
import sys
from pathlib import Path

# Add guitara directory to path
guitara_path = Path(__file__).parent / "guitara"
sys.path.insert(0, str(guitara_path))

# Set emergency Django settings
os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_emergency"

print("🆘 TESTING EMERGENCY DJANGO SETUP")
print(f"Django settings: {os.environ['DJANGO_SETTINGS_MODULE']}")

try:
    # Test 1: Import and setup Django
    print("\n1️⃣ Testing Django setup...")
    import django

    django.setup()
    print("✅ Django setup successful")

    # Test 2: Test URL configuration
    print("\n2️⃣ Testing URL configuration...")
    from django.conf import settings
    from django.urls import get_resolver

    resolver = get_resolver(settings.ROOT_URLCONF)
    print(f"✅ URL resolver loaded: {settings.ROOT_URLCONF}")

    # Test 3: Test ASGI application
    print("\n3️⃣ Testing ASGI application...")
    from guitara.asgi_emergency import application

    print(f"✅ ASGI application loaded: {type(application)}")

    # Test 4: Test health check endpoints
    print("\n4️⃣ Testing health check endpoints...")
    from django.test import Client

    client = Client()

    # Test health endpoint
    response = client.get("/health/")
    print(
        f"Health endpoint: {response.status_code} - {response.content[:100].decode()}"
    )

    # Test root endpoint
    response = client.get("/")
    print(f"Root endpoint: {response.status_code} - {response.content[:100].decode()}")

    print("\n✅ Emergency Django setup test PASSED!")
    print("🚀 Ready for Railway deployment!")

except Exception as e:
    print(f"❌ Emergency Django setup FAILED: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)
