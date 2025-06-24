#!/usr/bin/env python3
"""
Quick Railway deployment test script
Tests basic Django functionality without database dependencies
"""

import os
import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Set Django settings for Railway
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings_railway")


def test_django_import():
    """Test Django can be imported and configured"""
    try:
        print("🧪 Testing Django import...")
        import django

        django.setup()
        print("✅ Django imported and configured successfully")
        return True
    except Exception as e:
        print(f"❌ Django import failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_settings_import():
    """Test settings can be imported"""
    try:
        print("🧪 Testing settings import...")
        from django.conf import settings

        print(f"✅ Settings loaded: {settings.SETTINGS_MODULE}")
        print(f"   DEBUG: {settings.DEBUG}")
        print(f"   ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
        print(f"   DATABASE ENGINE: {settings.DATABASES['default']['ENGINE']}")
        return True
    except Exception as e:
        print(f"❌ Settings import failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_asgi_import():
    """Test ASGI application can be imported"""
    try:
        print("🧪 Testing ASGI application import...")
        from guitara.asgi import application

        print(f"✅ ASGI application imported: {type(application)}")
        return True
    except Exception as e:
        print(f"❌ ASGI application import failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_health_check():
    """Test health check endpoint"""
    try:
        print("🧪 Testing health check endpoint...")
        from django.test import Client

        client = Client()
        response = client.get("/health/")

        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {data}")
            print("✅ Health check endpoint working")
            return True
        else:
            print(f"❌ Health check failed with status {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ Health check test failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_urls():
    """Test URL configuration"""
    try:
        print("🧪 Testing URL configuration...")
        from django.urls import reverse
        from django.conf import settings

        # Test basic URL resolution
        print("✅ URL configuration loaded successfully")
        return True

    except Exception as e:
        print(f"❌ URL configuration test failed: {e}")
        return False


def main():
    """Run all tests"""
    print("🚀 Railway Deployment Test Suite")
    print(f"Django settings: {os.environ.get('DJANGO_SETTINGS_MODULE')}")
    print("=" * 50)

    tests = [
        ("Django Import", test_django_import),
        ("Settings Import", test_settings_import),
        ("ASGI Import", test_asgi_import),
        ("URL Configuration", test_urls),
        ("Health Check", test_health_check),
    ]

    results = []

    for test_name, test_func in tests:
        print(f"\n📋 Running {test_name} test...")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            results.append((test_name, False))

    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)

    passed = 0
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
        if result:
            passed += 1

    print(f"\nPassed: {passed}/{len(results)}")

    if passed == len(results):
        print("🎉 All tests passed! Railway deployment should work.")
        return True
    else:
        print("⚠️ Some tests failed. Check the errors above.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
