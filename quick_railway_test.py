#!/usr/bin/env python3
"""
Quick Railway health check test
"""
import os
import sys
import django
from pathlib import Path

# Add the guitara directory to the path
guitara_dir = Path(__file__).parent / "guitara"
sys.path.insert(0, str(guitara_dir))
os.chdir(guitara_dir)

# Set your Railway environment variables
os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_production"
os.environ["ALLOWED_HOSTS"] = (
    "charismatic-appreciation-production.up.railway.app,localhost,127.0.0.1,testserver"
)
os.environ["DEBUG"] = "False"
os.environ["SECRET_KEY"] = "b6w)6m-7+!4$"
os.environ["SUPABASE_DB_NAME"] = "postgres"
os.environ["SUPABASE_DB_USER"] = "postgres.cpxwkxtbjzgmjgxpheiw"
os.environ["SUPABASE_DB_PASSWORD"] = "bakitkosasabihin01@"
os.environ["SUPABASE_DB_HOST"] = "aws-0-us-east-1.pooler.supabase.com"
os.environ["RAILWAY_ENVIRONMENT"] = "production"

# Setup Django
django.setup()

from django.test import Client


def quick_test():
    print("🧪 QUICK RAILWAY HEALTH CHECK TEST")
    print("=" * 50)

    client = Client()

    endpoints = [
        ("/health/", "Primary Health Check"),
        ("/healthcheck/", "Alternative Health Check"),
        ("/ping/", "Ping"),
    ]

    results = []

    for endpoint, name in endpoints:
        try:
            response = client.get(endpoint)
            status = (
                "✅ PASS"
                if response.status_code == 200
                else f"❌ FAIL ({response.status_code})"
            )
            results.append((name, status))
            print(f"{name}: {status}")

            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"  Status: {data.get('status', 'unknown')}")
                except:
                    print(f"  Content: {response.content.decode()[:50]}...")
            else:
                print(f"  Error: {response.content.decode()[:100]}...")

        except Exception as e:
            results.append((name, f"❌ ERROR: {e}"))
            print(f"{name}: ❌ ERROR: {e}")

    print("\n" + "=" * 50)
    print("SUMMARY:")
    for name, status in results:
        print(f"  {name}: {status}")

    # Check if all passed
    all_passed = all("✅ PASS" in status for _, status in results)
    if all_passed:
        print("\n🚀 ALL HEALTH CHECKS PASSED!")
        print("✅ Railway deployment should work correctly!")
    else:
        print("\n⚠️  Some health checks failed")
        print("❌ Railway deployment may have issues")

    return all_passed


if __name__ == "__main__":
    quick_test()
