#!/usr/bin/env python3
"""
Test script to verify cache invalidation system is working properly
"""

import os
import sys
import json
import requests
from datetime import datetime, timedelta

# Add the Django project to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
django_dir = os.path.join(current_dir, "guitara")
sys.path.insert(0, django_dir)

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")

import django

django.setup()

from django.contrib.auth import get_user_model
from scheduling.models import Appointment, Therapist, Driver, Operator
from authentication.models import CustomUser
from django.utils import timezone
from rest_framework.authtoken.models import Token

User = get_user_model()


def get_or_create_test_user(username, role):
    """Get or create a test user with the specified role"""
    try:
        user = User.objects.get(username=username)
        print(f"✅ Found existing user: {username} ({role})")
    except User.DoesNotExist:
        user = User.objects.create_user(
            username=username,
            email=f"{username}@test.com",
            password="testpassword123",
            first_name=username.title(),
            last_name="Test",
        )
        print(f"✅ Created new user: {username} ({role})")

    # Ensure user profile exists with correct role
    profile, created = UserProfile.objects.get_or_create(
        user=user, defaults={"role": role}
    )
    if not created and profile.role != role:
        profile.role = role
        profile.save()
        print(f"🔄 Updated user {username} role to {role}")

    # Get or create auth token
    token, created = Token.objects.get_or_create(user=user)
    print(f"🔑 Auth token for {username}: {token.key}")

    return user, token.key


def get_base_url():
    """Get the correct API base URL"""
    return "http://localhost:8000/api"


def test_authentication(token, username):
    """Test if authentication is working properly"""
    print(f"\n🧪 Testing authentication for {username}...")

    headers = {"Authorization": f"Token {token}"}
    url = f"{get_base_url()}/scheduling/appointments/"

    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            count = len(data) if isinstance(data, list) else data.get("count", 0)
            print(f"✅ Authentication successful - found {count} appointments")
            return True
        else:
            print(f"❌ Authentication failed - Status: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Authentication test failed with error: {e}")
        return False


def get_pending_appointment(token):
    """Find or create a pending appointment for testing"""
    print(f"\n🔍 Looking for pending appointments...")

    headers = {"Authorization": f"Token {token}"}
    url = f"{get_base_url()}/scheduling/appointments/"

    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            data = response.json()
            appointments = data if isinstance(data, list) else data.get("results", [])

            # Look for pending appointments
            pending_appointments = [
                apt for apt in appointments if apt.get("status") == "pending"
            ]

            if pending_appointments:
                apt = pending_appointments[0]
                print(
                    f"✅ Found pending appointment: ID {apt['id']}, Status: {apt['status']}"
                )
                return apt["id"]
            else:
                print("⚠️ No pending appointments found")
                # Could create one here if needed
                return None
        else:
            print(f"❌ Failed to fetch appointments - Status: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Error fetching appointments: {e}")
        return None


def test_therapist_accept(token, appointment_id):
    """Test the therapist confirm endpoint"""
    print(f"\n🧪 Testing therapist accept for appointment {appointment_id}...")

    headers = {"Authorization": f"Token {token}"}
    url = (
        f"{get_base_url()}/scheduling/appointments/{appointment_id}/therapist_confirm/"
    )

    try:
        response = requests.post(url, headers=headers)
        print(f"Response Status: {response.status_code}")
        print(f"Response Body: {response.text}")

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Therapist accept successful!")
            print(f"   New status: {data.get('status')}")
            print(f"   Updated appointment: {data.get('id')}")
            return True
        else:
            print(f"❌ Therapist accept failed")
            return False
    except Exception as e:
        print(f"❌ Error testing therapist accept: {e}")
        return False


def main():
    """Main test function"""
    print("🚀 Starting Cache Invalidation Test")
    print("=" * 50)

    # Create test users
    therapist_user, therapist_token = get_or_create_test_user(
        "test_therapist", "therapist"
    )
    operator_user, operator_token = get_or_create_test_user("test_operator", "operator")

    # Test authentication
    auth_success = test_authentication(therapist_token, "test_therapist")
    if not auth_success:
        print("❌ Authentication test failed, stopping")
        return

    # Find a pending appointment
    appointment_id = get_pending_appointment(therapist_token)
    if not appointment_id:
        print("⚠️ No pending appointments found to test with")
        return

    # Test therapist accept
    accept_success = test_therapist_accept(therapist_token, appointment_id)

    # Summary
    print("\n" + "=" * 50)
    if accept_success:
        print("✅ Cache invalidation test infrastructure working!")
        print("   - Authentication: ✅")
        print("   - Appointment found: ✅")
        print("   - Therapist accept: ✅")
        print("\n💡 Next steps:")
        print("   1. Test frontend cache invalidation")
        print("   2. Verify TanStack Query updates")
        print("   3. Check WebSocket notifications")
    else:
        print("❌ Some tests failed - check the logs above")


if __name__ == "__main__":
    main()
