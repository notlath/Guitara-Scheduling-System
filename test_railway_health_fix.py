#!/usr/bin/env python3
"""
Test the optimized health check endpoints to ensure Railway deployment success
"""
import sys
import os
from pathlib import Path

# Add the guitara directory to the path
guitara_dir = Path(__file__).parent / "guitara"
sys.path.insert(0, str(guitara_dir))

# Change to guitara directory
os.chdir(guitara_dir)

# Set environment for testing - use Railway production settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings_production")

# Set required environment variables for production testing
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-health-check-testing")
os.environ.setdefault("ALLOWED_HOSTS", "localhost,127.0.0.1,testserver")

# Mock database settings for health check testing
os.environ.setdefault("SUPABASE_DB_NAME", "test_db")
os.environ.setdefault("SUPABASE_DB_USER", "test_user")
os.environ.setdefault("SUPABASE_DB_PASSWORD", "test_password")
os.environ.setdefault("SUPABASE_DB_HOST", "localhost")

import django

django.setup()

from django.test import Client


def test_emergency_health_endpoints():
    """Test that emergency health check endpoints respond immediately"""
    print("=== Testing Emergency Health Check Endpoints ===")

    client = Client()

    # Test endpoints that Railway will hit
    endpoints = [
        ("/health/", "Emergency Health Check"),
        ("/healthcheck/", "Railway Ping"),
        ("/ping/", "Ping"),
    ]

    success_count = 0

    for endpoint, name in endpoints:
        try:
            print(f"\n🧪 Testing {name}: {endpoint}")
            response = client.get(endpoint)

            print(f"   Status Code: {response.status_code}")

            if response.status_code == 200:
                print(f"   ✅ {name} - SUCCESS")
                success_count += 1

                # Parse response
                if hasattr(response, "json"):
                    try:
                        data = response.json()
                        print(f"   Response: {data}")
                    except:
                        print(f"   Response: {response.content.decode()}")
                else:
                    print(f"   Response: {response.content.decode()}")
            else:
                print(f"   ❌ {name} - FAILED (Status: {response.status_code})")
                print(f"   Response: {response.content.decode()}")

        except Exception as e:
            print(f"   ❌ {name} - ERROR: {e}")

    print(f"\n=== Summary ===")
    print(f"Successful endpoints: {success_count}/{len(endpoints)}")

    if success_count == len(endpoints):
        print("✅ ALL HEALTH CHECK ENDPOINTS ARE WORKING!")
        print("✅ Railway deployment should succeed")
        return True
    else:
        print("❌ Some health check endpoints failed")
        print("❌ Railway deployment may fail")
        return False


def test_diagnostic_endpoints():
    """Test diagnostic endpoints (not used by Railway)"""
    print("\n=== Testing Diagnostic Endpoints ===")

    client = Client()

    endpoints = [
        ("/health-check/", "Health Check"),
        ("/diagnostic-health-check/", "Diagnostic Health Check"),
    ]

    for endpoint, name in endpoints:
        try:
            print(f"\n🧪 Testing {name}: {endpoint}")
            response = client.get(endpoint)

            print(f"   Status Code: {response.status_code}")

            if response.status_code == 200:
                print(f"   ✅ {name} - SUCCESS")
                try:
                    data = response.json()
                    print(f"   Database: {data.get('database', 'Unknown')}")
                    print(f"   Cache: {data.get('cache', 'Unknown')}")
                except:
                    print(f"   Response: {response.content.decode()}")
            else:
                print(f"   ⚠️ {name} - Status {response.status_code}")

        except Exception as e:
            print(f"   ⚠️ {name} - ERROR: {e}")


if __name__ == "__main__":
    print("🚀 RAILWAY HEALTH CHECK VALIDATION")
    print("Testing optimized health check endpoints...\n")

    success = test_emergency_health_endpoints()
    test_diagnostic_endpoints()

    if success:
        print("\n🎉 VALIDATION COMPLETE - READY FOR RAILWAY DEPLOYMENT!")
        sys.exit(0)
    else:
        print("\n💥 VALIDATION FAILED - DEPLOYMENT MAY FAIL!")
        sys.exit(1)
