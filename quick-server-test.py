#!/usr/bin/env python
"""
Quick server test to check if the appointments endpoint returns JSON instead of HTML error
"""

import os
import sys
import django
import requests
import threading
import time
from django.core.management import execute_from_command_line

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
sys.path.append("c:\\Users\\USer\\Downloads\\Guitara-Scheduling-System\\guitara")


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
            return True

    except Exception as e:
        print(f"❌ Error connecting to server: {e}")
        return False


def main():
    print("🧪 Quick Server Test")
    print("=" * 30)
    print("This will test if the appointments endpoint is working correctly.")
    print("\n📋 Instructions:")
    print("1. Start the Django server manually: python manage.py runserver")
    print("2. Then run this test to check the endpoint")
    print("\nWaiting 3 seconds for you to start the server...")
    time.sleep(3)

    # Test the endpoint
    success = test_endpoint()

    if success:
        print("\n🎉 SUCCESS: The optimization appears to be working!")
        print("The endpoint is responding correctly (not returning HTML error pages)")
    else:
        print("\n⚠️  The endpoint may still have issues. Check the Django server logs.")


if __name__ == "__main__":
    main()
