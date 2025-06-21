#!/usr/bin/env python
"""
Test Appointments API Endpoints
Quick test to verify appointments endpoints are working correctly
"""
import os
import sys
import django
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).resolve().parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / "guitara"))

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token


def test_appointments_endpoints():
    """Test the appointments endpoints that frontend is calling"""

    print("🔍 Testing Appointments API Endpoints")
    print("=" * 50)

    client = Client()
    User = get_user_model()

    # Create a test user if needed
    try:
        user = User.objects.filter(email="test@example.com").first()
        if not user:
            print("📝 Creating test user...")
            user = User.objects.create_user(
                email="test@example.com",
                password="testpass123",
                first_name="Test",
                last_name="User",
            )

        # Get or create token
        token, created = Token.objects.get_or_create(user=user)
        print(f"🔑 Using token: {token.key[:10]}...")

    except Exception as e:
        print(f"❌ Failed to create test user: {e}")
        return

    # Test endpoints that frontend is calling
    endpoints_to_test = [
        "/api/scheduling/appointments/",
        "/api/scheduling/appointments/operator_dashboard/",
        "/api/scheduling/appointments/dashboard_stats/",
        "/api/scheduling/appointments/today/",
        "/api/scheduling/appointments/upcoming/",
    ]

    headers = {"HTTP_AUTHORIZATION": f"Token {token.key}"}

    for endpoint in endpoints_to_test:
        try:
            print(f"\n🔗 Testing: {endpoint}")
            response = client.get(endpoint, **headers)

            print(f"   Status: {response.status_code}")

            if response.status_code == 200:
                try:
                    data = response.json()
                    if isinstance(data, list):
                        print(f"   Response: Array with {len(data)} items")
                        if len(data) > 0:
                            print(
                                f"   First item keys: {list(data[0].keys()) if data[0] else 'Empty'}"
                            )
                    elif isinstance(data, dict):
                        print(f"   Response: Object with keys: {list(data.keys())}")
                    else:
                        print(f"   Response: {type(data)} - {str(data)[:100]}...")
                except Exception as parse_error:
                    print(f"   Response: {response.content[:200]}...")
                    print(f"   Parse error: {parse_error}")

                print("   ✅ SUCCESS")
            else:
                print(f"   ❌ FAILED - Status: {response.status_code}")
                print(f"   Error: {response.content[:200]}...")

        except Exception as e:
            print(f"   ❌ EXCEPTION: {e}")

    # Test database counts
    try:
        from scheduling.models import Appointment

        total_appointments = Appointment.objects.count()
        print(f"\n📊 Database Stats:")
        print(f"   Total appointments in DB: {total_appointments}")

        if total_appointments > 0:
            recent = Appointment.objects.first()
            print(f"   Latest appointment ID: {recent.id}")
            print(f"   Latest appointment status: {recent.status}")
            print(f"   Latest appointment date: {recent.date}")

    except Exception as e:
        print(f"❌ Database query failed: {e}")

    print("\n" + "=" * 50)
    print("🏁 Test Complete")


if __name__ == "__main__":
    test_appointments_endpoints()
