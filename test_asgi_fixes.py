#!/usr/bin/env python3
"""
Test the ASGI application startup locally to verify fixes
"""

import os
import sys
from pathlib import Path

# Add the guitara directory to the path
sys.path.insert(0, str(Path(__file__).parent / "guitara"))

# Set environment variables for testing
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings_production")
os.environ["SUPABASE_DB_NAME"] = "test_db"
os.environ["SUPABASE_DB_USER"] = "test_user"
os.environ["SUPABASE_DB_PASSWORD"] = "test_pass"
os.environ["SUPABASE_DB_HOST"] = "localhost"
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["ALLOWED_HOSTS"] = "localhost,127.0.0.1,testserver"


def test_asgi_application():
    """Test that the ASGI application can be imported without errors"""
    print("=== Testing ASGI Application Import ===")

    try:
        # Import Django setup
        import django

        django.setup()

        print("✅ Django setup completed")

        # Import the ASGI application
        from guitara.asgi import application

        print(f"✅ ASGI application imported successfully")
        print(f"   Application type: {type(application)}")

        # Check if it has the expected protocol mapping
        if hasattr(application, "application_mapping"):
            protocols = list(application.application_mapping.keys())
            print(f"   Available protocols: {protocols}")

            if "http" in protocols:
                print("✅ HTTP protocol configured")
            if "websocket" in protocols:
                print("✅ WebSocket protocol configured")

        return True

    except Exception as e:
        print(f"❌ ASGI application import failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_middleware_import():
    """Test that middleware can be imported without errors"""
    print("\n=== Testing Middleware Import ===")

    try:
        from scheduling.middleware import TokenAuthMiddleware

        print("✅ TokenAuthMiddleware imported successfully")

        from scheduling import routing

        print("✅ Scheduling routing imported successfully")

        return True

    except Exception as e:
        print(f"❌ Middleware import failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_consumers_import():
    """Test that consumers can be imported without errors"""
    print("\n=== Testing Consumers Import ===")

    try:
        from scheduling.consumers import AppointmentConsumer

        print("✅ AppointmentConsumer imported successfully")

        return True

    except Exception as e:
        print(f"❌ Consumers import failed: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_health_check():
    """Test the health check endpoint"""
    print("\n=== Testing Health Check ===")

    try:
        import django

        django.setup()

        from django.test import Client

        client = Client()

        # Test main health check
        response = client.get("/health-check/")
        print(f"Health check status: {response.status_code}")

        if response.status_code == 200:
            print("✅ Health check endpoint works")
            return True
        else:
            print(f"❌ Health check failed with status {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ Health check test failed: {e}")
        return False


if __name__ == "__main__":
    print("🚀 Testing ASGI Application Fixes\n")

    success = True
    success &= test_middleware_import()
    success &= test_consumers_import()
    success &= test_asgi_application()
    success &= test_health_check()

    if success:
        print("\n🎉 All tests passed! Your ASGI application should work on Railway.")
        print("\n📋 Next steps:")
        print("   1. Deploy these changes to Railway")
        print("   2. Test these endpoints:")
        print("      - https://charismatic-appreciation-production.up.railway.app/")
        print(
            "      - https://charismatic-appreciation-production.up.railway.app/health-check/"
        )
        print(
            "      - https://charismatic-appreciation-production.up.railway.app/api/scheduling/health/"
        )
        print(
            "      - https://charismatic-appreciation-production.up.railway.app/api/scheduling/ping/"
        )
        sys.exit(0)
    else:
        print("\n💥 Some tests failed - check the errors above")
        sys.exit(1)
