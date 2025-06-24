#!/usr/bin/env python3
"""
Test Railway health endpoints with your actual environment variables
"""
import os
import sys
import time
import django
from pathlib import Path

# Add the guitara directory to the path
guitara_dir = Path(__file__).parent / "guitara"
sys.path.insert(0, str(guitara_dir))
os.chdir(guitara_dir)

# Set your actual Railway environment variables
os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_production"
os.environ["ALLOWED_HOSTS"] = (
    "charismatic-appreciation-production.up.railway.app,localhost,127.0.0.1"
)
os.environ["DEBUG"] = "False"
os.environ["SECRET_KEY"] = "b6w)6m-7+!4$"
os.environ["SUPABASE_DB_NAME"] = "postgres"
os.environ["SUPABASE_DB_USER"] = "postgres.cpxwkxtbjzgmjgxpheiw"
os.environ["SUPABASE_DB_PASSWORD"] = "bakitkosasabihin01@"
os.environ["SUPABASE_DB_HOST"] = "aws-0-us-east-1.pooler.supabase.com"
os.environ["REDIS_URL"] = (
    "redis://default:OZAurZgciODtPejgVDYSJHQtODNQDTBj@trolley.proxy.rlwy.net:12062"
)
os.environ["RAILWAY_ENVIRONMENT"] = "production"
os.environ["SUPABASE_URL"] = "https://cpxwkxtbjzgmjgxpheiw.supabase.co"


def test_railway_health_endpoints():
    """Test Railway health check endpoints with your environment"""
    print("🚀 TESTING RAILWAY HEALTH ENDPOINTS")
    print("=" * 60)
    print(f"Railway Domain: charismatic-appreciation-production.up.railway.app")
    print(f"Database Host: {os.environ.get('SUPABASE_DB_HOST')}")
    print(f"Redis URL: {os.environ.get('REDIS_URL')[:50]}...")
    print("=" * 60)

    try:
        # Setup Django with timeout protection
        print("🔧 Setting up Django...")
        start_time = time.time()
        django.setup()
        setup_time = time.time() - start_time

        print(f"✅ Django setup completed in {setup_time:.3f}s")

        # Import settings to verify configuration
        from django.conf import settings

        print(f"✅ Settings module: {settings.SETTINGS_MODULE}")
        print(f"✅ Debug mode: {settings.DEBUG}")
        print(f"✅ Allowed hosts: {settings.ALLOWED_HOSTS}")

        # Test the health check endpoints that Railway uses
        from django.test import Client

        client = Client()

        # Test Railway primary endpoints (based on railway.json)
        railway_endpoints = [
            ("/health/", "Railway Primary Health Check"),
            ("/healthcheck/", "Railway Alternative Health Check"),
            ("/ping/", "Railway Ping"),
            ("/health-check/", "Diagnostic Health Check"),
        ]

        success_count = 0
        total_endpoints = len(railway_endpoints)

        for endpoint, name in railway_endpoints:
            try:
                print(f"\n🧪 Testing {name}: {endpoint}")

                # Time the request
                start_time = time.time()
                response = client.get(endpoint)
                response_time = time.time() - start_time

                print(f"   ⏱️  Response time: {response_time:.3f}s")
                print(f"   📊 Status code: {response.status_code}")

                if response.status_code == 200:
                    print(f"   ✅ SUCCESS - {name}")
                    success_count += 1

                    # Try to parse JSON response
                    try:
                        data = response.json()
                        print(f"   📄 Response: {data.get('status', 'unknown')}")
                        if "timestamp" in data:
                            print(f"   🕒 Timestamp: {data['timestamp']}")
                    except Exception:
                        print(f"   📄 Response: {response.content.decode()[:100]}...")

                else:
                    print(f"   ❌ FAILED - Status {response.status_code}")
                    print(f"   📄 Error: {response.content.decode()[:200]}...")

            except Exception as e:
                print(f"   ❌ EXCEPTION: {e}")
                import traceback

                traceback.print_exc()

        print(f"\n{'='*60}")
        print(f"🎯 HEALTH CHECK RESULTS")
        print(f"{'='*60}")
        print(f"✅ Successful endpoints: {success_count}/{total_endpoints}")
        print(
            f"❌ Failed endpoints: {total_endpoints - success_count}/{total_endpoints}"
        )

        if success_count == total_endpoints:
            print("🚀 ALL HEALTH CHECKS PASSED - Railway deployment should work!")
            return True
        elif success_count > 0:
            print("⚠️  PARTIAL SUCCESS - Some endpoints working")
            return False
        else:
            print("💥 ALL HEALTH CHECKS FAILED - Railway deployment will fail")
            return False

    except Exception as e:
        print(f"💥 CRITICAL ERROR: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_database_connection():
    """Test database connection separately"""
    print(f"\n🗄️  TESTING DATABASE CONNECTION")
    print("=" * 60)

    try:
        from django.db import connection

        print("🔌 Attempting database connection...")
        start_time = time.time()

        with connection.cursor() as cursor:
            cursor.execute("SELECT version()")
            result = cursor.fetchone()

        connection_time = time.time() - start_time
        print(f"✅ Database connected in {connection_time:.3f}s")
        print(f"📊 PostgreSQL version: {result[0][:50]}...")
        return True

    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


def test_redis_connection():
    """Test Redis connection separately"""
    print(f"\n🔴 TESTING REDIS CONNECTION")
    print("=" * 60)

    try:
        from django.core.cache import cache

        print("🔌 Attempting Redis connection...")
        start_time = time.time()

        # Test Redis with a simple key-value operation
        test_key = "railway_health_test"
        test_value = f"test_{int(time.time())}"

        cache.set(test_key, test_value, 30)
        retrieved_value = cache.get(test_key)

        connection_time = time.time() - start_time

        if retrieved_value == test_value:
            print(f"✅ Redis connected in {connection_time:.3f}s")
            print(f"📊 Test key/value operation successful")
            cache.delete(test_key)  # Cleanup
            return True
        else:
            print(f"❌ Redis test failed - value mismatch")
            return False

    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        return False


if __name__ == "__main__":
    print("🧪 RAILWAY ENVIRONMENT HEALTH CHECK TEST")
    print("=" * 60)
    print("Testing with your actual Railway environment variables...")
    print("=" * 60)

    # Run all tests
    health_ok = test_railway_health_endpoints()
    db_ok = test_database_connection()
    redis_ok = test_redis_connection()

    print(f"\n{'='*60}")
    print("🎯 FINAL TEST RESULTS")
    print(f"{'='*60}")
    print(f"Health Endpoints: {'✅ PASS' if health_ok else '❌ FAIL'}")
    print(f"Database Connection: {'✅ PASS' if db_ok else '❌ FAIL'}")
    print(f"Redis Connection: {'✅ PASS' if redis_ok else '❌ FAIL'}")

    if health_ok and db_ok and redis_ok:
        print("\n🚀 ALL SYSTEMS GO - Railway deployment should be successful!")
        sys.exit(0)
    elif health_ok:
        print("\n⚠️  Health checks pass but connectivity issues exist")
        print("   Railway deployment might work but with limited functionality")
        sys.exit(1)
    else:
        print("\n💥 CRITICAL ISSUES DETECTED - Railway deployment will likely fail")
        print("   Fix health check endpoints before deploying")
        sys.exit(1)
