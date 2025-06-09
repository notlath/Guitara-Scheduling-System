#!/usr/bin/env python3
"""
Test script to verify the API endpoints for the confirmation flow.
"""

import os
import sys
import django
import json

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from scheduling.models import Appointment, Client as ClientModel
from django.utils import timezone
from datetime import timedelta


def setup_test_data():
    """Create test users and appointment"""
    User = get_user_model()

    # Create test users
    therapist = User.objects.create_user(
        username="test_therapist",
        email="therapist@test.com",
        role="therapist",
        first_name="Test",
        last_name="Therapist",
    )

    driver = User.objects.create_user(
        username="test_driver",
        email="driver@test.com",
        role="driver",
        first_name="Test",
        last_name="Driver",
    )

    operator = User.objects.create_user(
        username="test_operator",
        email="operator@test.com",
        role="operator",
        first_name="Test",
        last_name="Operator",
    )

    # Create test client
    client_obj = ClientModel.objects.create(
        name="Test Client", phone="123-456-7890", address="123 Test St"
    )

    # Create test appointment
    appointment = Appointment.objects.create(
        client=client_obj,
        therapist=therapist,
        driver=driver,
        date=timezone.now().date() + timedelta(days=1),
        start_time="10:00:00",
        end_time="11:00:00",
        location="123 Test St",
        status="driver_confirm",
        group_size=1,
    )

    return therapist, driver, operator, appointment


def test_endpoints():
    """Test our API endpoints"""
    print("🧪 Testing API Endpoints")
    print("=" * 50)

    try:
        # Set up test data
        therapist, driver, operator, appointment = setup_test_data()
        print(
            f"✓ Created test appointment #{appointment.id} with status: {appointment.status}"
        )

        # Create Django test client
        client = Client()

        # Test driver_confirm endpoint
        print("\\n1. Testing driver_confirm endpoint...")
        response = client.post(f"/api/appointments/{appointment.id}/driver_confirm/")
        print(f"   Response status: {response.status_code}")

        if response.status_code == 200:
            # Refresh appointment from database
            appointment.refresh_from_db()
            print(f"   ✓ Appointment status after driver confirm: {appointment.status}")
            if appointment.status == "driver_confirmed":
                print("   ✅ Driver confirm endpoint working correctly!")
            else:
                print(f"   ❌ Expected 'driver_confirmed', got '{appointment.status}'")
        else:
            print(f"   ❌ Driver confirm failed with status {response.status_code}")
            if response.content:
                print(f"   Error: {response.content.decode()}")

        # Test start_appointment endpoint
        print("\\n2. Testing start_appointment endpoint...")
        response = client.post(f"/api/appointments/{appointment.id}/start_appointment/")
        print(f"   Response status: {response.status_code}")

        if response.status_code == 200:
            # Refresh appointment from database
            appointment.refresh_from_db()
            print(f"   ✓ Appointment status after start: {appointment.status}")
            print(f"   ✓ Started at: {appointment.started_at}")
            if appointment.status == "in_progress":
                print("   ✅ Start appointment endpoint working correctly!")
            else:
                print(f"   ❌ Expected 'in_progress', got '{appointment.status}'")
        else:
            print(f"   ❌ Start appointment failed with status {response.status_code}")
            if response.content:
                print(f"   Error: {response.content.decode()}")

        print("\\n✅ Endpoint testing completed!")
        return True

    except Exception as e:
        print(f"\\n💥 Error during endpoint testing: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_endpoints()
    sys.exit(0 if success else 1)
