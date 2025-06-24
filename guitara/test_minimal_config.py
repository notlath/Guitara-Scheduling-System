#!/usr/bin/env python3
"""
Test script to validate minimal Django configuration
Run this locally to identify potential issues before Railway deployment
"""

import os
import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Set minimal settings
os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_railway_minimal"


def test_settings_import():
    """Test if settings can be imported without errors"""
    print("🔧 Testing settings import...")
    try:
        import django
        from django.conf import settings

        django.setup()
        print(f"✅ Settings imported successfully")
        print(f"   - INSTALLED_APPS count: {len(settings.INSTALLED_APPS)}")
        print(f"   - MIDDLEWARE count: {len(settings.MIDDLEWARE)}")
        print(f"   - ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
        return True
    except Exception as e:
        print(f"❌ Settings import failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_url_config():
    """Test if URL configuration can be loaded"""
    print("\n🔗 Testing URL configuration...")
    try:
        from django.urls import get_resolver
        from django.conf import settings

        resolver = get_resolver()
        print(f"✅ URL patterns loaded successfully")
        print(f"   - Root URLconf: {settings.ROOT_URLCONF}")

        # Try to resolve some key URLs
        test_urls = ["/health/", "/ping/", "/healthcheck/", "/api/", "/"]
        for url in test_urls:
            try:
                match = resolver.resolve(url)
                print(f"   - {url}: ✅ resolves to {match.view_name}")
            except Exception as e:
                print(f"   - {url}: ❌ {e}")

        return True
    except Exception as e:
        print(f"❌ URL configuration failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_apps_ready():
    """Test if all Django apps are ready"""
    print("\n📱 Testing Django apps...")
    try:
        from django.apps import apps

        for app_config in apps.get_app_configs():
            print(f"   - {app_config.name}: ✅ ready")

        return True
    except Exception as e:
        print(f"❌ Apps check failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_database_config():
    """Test database configuration (without connecting)"""
    print("\n🗄️ Testing database configuration...")
    try:
        from django.conf import settings

        db_config = settings.DATABASES["default"]
        print(f"✅ Database configuration loaded")
        print(f"   - Engine: {db_config['ENGINE']}")
        print(f"   - Host: {db_config['HOST']}")
        print(f"   - Name: {db_config['NAME']}")
        print(f"   - Port: {db_config['PORT']}")
        print(
            f"   - SSL Mode: {db_config.get('OPTIONS', {}).get('sslmode', 'not set')}"
        )

        return True
    except Exception as e:
        print(f"❌ Database configuration failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_asgi_config():
    """Test ASGI configuration"""
    print("\n🌐 Testing ASGI configuration...")
    try:
        from guitara.asgi_minimal import application

        print(f"✅ ASGI application loaded: {type(application)}")
        return True
    except Exception as e:
        print(f"❌ ASGI configuration failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("MINIMAL DJANGO CONFIGURATION TEST")
    print("=" * 60)

    tests = [
        ("Settings Import", test_settings_import),
        ("URL Configuration", test_url_config),
        ("Apps Ready", test_apps_ready),
        ("Database Config", test_database_config),
        ("ASGI Config", test_asgi_config),
    ]

    results = []
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"💥 Test {test_name} crashed: {e}")
            results.append((test_name, False))

    print("\n" + "=" * 60)
    print("TEST RESULTS SUMMARY")
    print("=" * 60)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:.<30} {status}")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    print(f"\nOverall: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed! Configuration should work on Railway.")
    else:
        print("⚠️ Some tests failed. Fix these issues before deploying to Railway.")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
