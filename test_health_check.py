#!/usr/bin/env python3
"""
Test script to verify health check endpoint
"""

import os
import sys
import django
from pathlib import Path

# Add the guitara directory to the path
sys.path.insert(0, str(Path(__file__).parent / "guitara"))

# Set Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings_railway")

# Configure Django
django.setup()

from django.test import Client
from django.urls import reverse


def test_health_check():
    """Test the health check endpoint"""
    print("=== Testing Health Check Endpoint ===")

    client = Client()

    try:
        # Test the health check endpoint
        response = client.get("/health-check/")

        print(f"Status Code: {response.status_code}")
        print(f"Content Type: {response.get('Content-Type', 'Not set')}")

        if response.status_code == 200:
            import json

            data = response.json()
            print("✅ Health check passed!")
            print(f"Response: {json.dumps(data, indent=2)}")
            return True
        else:
            print(f"❌ Health check failed with status {response.status_code}")
            print(f"Response content: {response.content.decode()}")
            return False

    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False


def test_root_endpoint():
    """Test the root endpoint"""
    print("\n=== Testing Root Endpoint ===")

    client = Client()

    try:
        response = client.get("/")

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            print("✅ Root endpoint works!")
            return True
        else:
            print(f"❌ Root endpoint failed with status {response.status_code}")
            return False

    except Exception as e:
        print(f"❌ Root endpoint error: {e}")
        return False


if __name__ == "__main__":
    # Set some test environment variables
    os.environ["SUPABASE_DB_NAME"] = "test_db"
    os.environ["SUPABASE_DB_USER"] = "test_user"
    os.environ["SUPABASE_DB_PASSWORD"] = "test_pass"
    os.environ["SUPABASE_DB_HOST"] = "localhost"
    os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
    os.environ["ALLOWED_HOSTS"] = "localhost,127.0.0.1,testserver"

    print("Testing with Railway settings...")

    success = True
    success &= test_root_endpoint()
    success &= test_health_check()

    if success:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed!")
        sys.exit(1)
