#!/usr/bin/env python
"""
Quick test to verify the appointments endpoint is working after syntax fixes
"""
import os
import sys
import django
import requests
import json

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
sys.path.append("c:\\Users\\USer\\Downloads\\Guitara-Scheduling-System\\guitara")

django.setup()


def test_endpoint():
    """Test the appointments endpoint directly"""
    print("Testing /api/scheduling/appointments/ endpoint...")

    # Test without authentication first (should get auth error, not 500)
    try:
        response = requests.get("http://localhost:8000/api/scheduling/appointments/")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text[:200]}...")

        if response.status_code == 401:
            print(
                "✅ SUCCESS: Endpoint is working (401 = auth required, not 500 server error)"
            )
            return True
        elif response.status_code == 500:
            print("❌ FAILED: Still getting 500 Internal Server Error")
            return False
        else:
            print(f"⚠️  UNEXPECTED: Got status code {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ CONNECTION ERROR: {e}")
        return False


def test_django_import():
    """Test if Django modules can be imported without errors"""
    print("\nTesting Django module imports...")

    try:
        from scheduling.models import Appointment
        from scheduling.serializers import AppointmentSerializer
        from scheduling.views import AppointmentViewSet

        print("✅ SUCCESS: All Django modules imported successfully")
        return True
    except Exception as e:
        print(f"❌ IMPORT ERROR: {e}")
        return False


if __name__ == "__main__":
    print("Quick Syntax Fix Verification")
    print("=" * 40)

    # Test imports first
    imports_ok = test_django_import()

    if imports_ok:
        # Test endpoint
        endpoint_ok = test_endpoint()

        if endpoint_ok:
            print("\n🎉 SUCCESS: Syntax errors are fixed!")
            print("The frontend should now be able to connect to the backend.")
        else:
            print("\n❌ Still having issues with the endpoint")
    else:
        print("\n❌ Import errors still exist")
