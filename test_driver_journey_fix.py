#!/usr/bin/env python3
"""
Test script to verify the Driver Journey Authorization Fix

This script tests that drivers can only start journeys AFTER operator approval,
preventing the previous issue where drivers could bypass operator authorization.
"""

import os
import sys
import django
from django.test import TestCase
from django.contrib.auth import get_user_model
from datetime import date, time, timedelta
from django.utils import timezone

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from guitara.scheduling.models import Appointment, Service

User = get_user_model()


def test_driver_journey_authorization_flow():
    """
    Test the complete authorization flow:
    1. Therapist accepts → status: therapist_confirmed
    2. Driver accepts → status: driver_confirmed
    3. Driver tries to start journey → SHOULD FAIL ❌
    4. Operator starts appointment → status: in_progress
    5. Driver starts journey → SHOULD SUCCEED ✅
    """

    print("🔍 Testing Driver Journey Authorization Fix...")
    print("=" * 60)

    # Create test users
    try:
        client = User.objects.create_user(
            username="test_client",
            email="client@test.com",
            role="client",
            first_name="Test",
            last_name="Client",
        )

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
            is_staff=True,
        )

        # Create test service
        service = Service.objects.create(
            name="Test Massage", price=1000.00, duration=60, description="Test service"
        )

        # Create test appointment
        appointment = Appointment.objects.create(
            client=client,
            therapist=therapist,
            driver=driver,
            date=date.today() + timedelta(days=1),
            start_time=time(14, 0),
            end_time=time(15, 0),
            location="123 Test St, Test City",
            status="pending",
        )
        appointment.services.add(service)

        print(f"✅ Created test appointment {appointment.id}")
        print(f"   Initial status: {appointment.status}")

        # Step 1: Therapist accepts
        appointment.therapist_accepted = True
        appointment.status = "therapist_confirmed"
        appointment.save()
        print(f"✅ Therapist accepted → Status: {appointment.status}")

        # Step 2: Driver accepts
        appointment.driver_accepted = True
        appointment.status = "driver_confirmed"
        appointment.save()
        print(f"✅ Driver accepted → Status: {appointment.status}")

        # Step 3: Test can_start_journey() - should be FALSE
        can_start = appointment.can_start_journey()
        print(f"🔍 Can driver start journey after both accepted? {can_start}")

        if can_start:
            print(
                "❌ FAILED: Driver should NOT be able to start journey without operator approval!"
            )
            return False
        else:
            print("✅ CORRECT: Driver cannot start journey without operator approval")

        # Step 4: Operator starts appointment
        appointment.status = "in_progress"
        appointment.started_at = timezone.now()
        appointment.save()
        print(f"✅ Operator started appointment → Status: {appointment.status}")

        # Step 5: Test can_start_journey() - should be TRUE now
        can_start_after_approval = appointment.can_start_journey()
        print(
            f"🔍 Can driver start journey after operator approval? {can_start_after_approval}"
        )

        if can_start_after_approval:
            print("✅ CORRECT: Driver can now start journey after operator approval")
        else:
            print(
                "❌ FAILED: Driver should be able to start journey after operator approval!"
            )
            return False

        # Step 6: Driver starts journey
        appointment.status = "journey"
        appointment.journey_started_at = timezone.now()
        appointment.save()
        print(f"✅ Driver started journey → Status: {appointment.status}")

        print("\n" + "=" * 60)
        print(
            "🎉 ALL TESTS PASSED! Driver journey authorization fix is working correctly."
        )
        print("\nWorkflow Summary:")
        print("1. ✅ Therapist accepts → therapist_confirmed")
        print("2. ✅ Driver accepts → driver_confirmed (CANNOT start journey yet)")
        print("3. ✅ Operator starts → in_progress (Driver can NOW start journey)")
        print("4. ✅ Driver starts journey → journey")
        print("\n🔐 Operator authorization is now properly enforced!")

        return True

    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback

        traceback.print_exc()
        return False

    finally:
        # Cleanup
        try:
            Appointment.objects.filter(client__username="test_client").delete()
            User.objects.filter(username__startswith="test_").delete()
            Service.objects.filter(name="Test Massage").delete()
            print("🧹 Cleanup completed")
        except:
            pass


if __name__ == "__main__":
    success = test_driver_journey_authorization_flow()
    sys.exit(0 if success else 1)
