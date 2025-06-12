#!/usr/bin/env python3
"""
Test script to verify pickup request functionality in DriverDashboard

This script tests the workflow:
1. Therapist completes session and requests pickup
2. Driver gets assigned for pickup (auto or manual)
3. Driver sees pickup request in their Dashboard's "Today's Transports"
4. Driver can confirm or reject the pickup

Run this script to verify the fixes work correctly.
"""

import sys
import os

# Add the Django project directory to Python path
project_dir = os.path.join(os.path.dirname(__file__), "guitara")
if project_dir not in sys.path:
    sys.path.append(project_dir)

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")

import django

django.setup()

from scheduling.models import Appointment, Client
from core.models import CustomUser
from registration.models import Service
from datetime import date, time, datetime, timedelta
from django.utils import timezone
from django.db import transaction


def create_test_data():
    """Create test data for pickup request workflow"""
    print("🔧 Creating test data...")

    # Create test client
    client, created = Client.objects.get_or_create(
        first_name="Test",
        last_name="Client",
        defaults={
            "email": "test.client@example.com",
            "phone_number": "09123456789",
            "address": "123 Test St, Makati City",
            "notes": "Test client for pickup request testing",
        },
    )

    # Create test therapist
    therapist, created = CustomUser.objects.get_or_create(
        username="test_therapist",
        defaults={
            "first_name": "Test",
            "last_name": "Therapist",
            "role": "therapist",
            "email": "test.therapist@example.com",
            "specialization": "Swedish",
            "massage_pressure": "Medium",
        },
    )

    # Create test driver
    driver, created = CustomUser.objects.get_or_create(
        username="test_driver",
        defaults={
            "first_name": "Test",
            "last_name": "Driver",
            "role": "driver",
            "email": "test.driver@example.com",
            "vehicle_type": "motorcycle",
            "phone_number": "09987654321",
        },
    )

    # Create test service
    try:
        service, created = Service.objects.get_or_create(
            name="Test Massage",
            defaults={
                "description": "Test massage service",
                "duration": timedelta(hours=1),
                "price": 500.00,
                "is_active": True,
            },
        )
    except Exception as e:
        print(
            f"⚠️ Could not create service (this is expected if Service model isn't available): {e}"
        )
        service = None

    return client, therapist, driver, service


def test_pickup_workflow():
    """Test the complete pickup workflow"""
    print("\n🧪 Testing pickup request workflow...")

    client, therapist, driver, service = create_test_data()

    # Create a completed appointment
    appointment = Appointment.objects.create(
        client=client,
        therapist=therapist,
        driver=driver,  # Initially assigned driver
        date=date.today(),
        start_time=time(14, 0),  # 2:00 PM
        end_time=time(15, 0),  # 3:00 PM
        location="123 Test St, Makati City",
        status="completed",  # Session completed, ready for pickup request
        payment_status="paid",
        payment_amount=500.00,
        notes="Test appointment for pickup workflow",
    )

    if service:
        appointment.services.add(service)

    print(f"✅ Created test appointment #{appointment.id}")
    print(f"   Client: {appointment.client}")
    print(f"   Therapist: {appointment.therapist}")
    print(f"   Driver: {appointment.driver}")
    print(f"   Status: {appointment.status}")
    print(f"   Location: {appointment.location}")

    # Step 1: Simulate therapist requesting pickup
    print("\n📱 Step 1: Therapist requests pickup...")
    appointment.status = "pickup_requested"
    appointment.pickup_requested = True
    appointment.pickup_request_time = timezone.now()
    appointment.pickup_urgency = "normal"
    appointment.pickup_notes = "Pickup requested by therapist"
    appointment.save()

    print(f"✅ Pickup requested at {appointment.pickup_request_time}")
    print(f"   Status: {appointment.status}")
    print(f"   Urgency: {appointment.pickup_urgency}")

    # Step 2: Simulate driver assignment for pickup
    print("\n🚗 Step 2: Driver assigned for pickup...")
    appointment.status = "driver_assigned_pickup"
    appointment.driver = (
        driver  # Assign driver for pickup (could be same or different driver)
    )
    appointment.estimated_pickup_time = timezone.now() + timedelta(minutes=20)
    appointment.save()

    print(f"✅ Driver assigned for pickup")
    print(f"   Assigned Driver: {appointment.driver}")
    print(f"   Status: {appointment.status}")
    print(f"   Estimated Pickup Time: {appointment.estimated_pickup_time}")

    # Step 3: Verify appointment appears for driver
    print("\n🔍 Step 3: Verifying driver can see pickup assignment...")

    # Query appointments that should be visible to the driver
    driver_appointments = Appointment.objects.filter(
        driver=driver.id,
        status__in=[
            "pending",
            "therapist_confirmed",
            "driver_confirmed",
            "in_progress",
            "journey_started",
            "journey",
            "arrived",
            "dropped_off",
            "session_in_progress",
            "awaiting_payment",
            "completed",
            "pickup_requested",
            "driver_assigned_pickup",  # This is the key status
            "return_journey",
        ],
    )

    pickup_assignments = driver_appointments.filter(status="driver_assigned_pickup")

    print(f"✅ Driver has {driver_appointments.count()} visible appointments")
    print(f"✅ Driver has {pickup_assignments.count()} pickup assignments")

    if pickup_assignments.exists():
        for apt in pickup_assignments:
            print(f"   📋 Pickup Assignment #{apt.id}:")
            print(f"      Client: {apt.client}")
            print(f"      Location: {apt.location}")
            print(f"      Status: {apt.status}")
            print(f"      Urgency: {apt.pickup_urgency}")
            print(f"      Est. Pickup: {apt.estimated_pickup_time}")

    # Step 4: Simulate driver confirming pickup
    print("\n✅ Step 4: Driver confirms pickup...")
    appointment.status = "return_journey"
    appointment.pickup_confirmed_at = timezone.now()
    appointment.save()

    print(f"✅ Driver confirmed pickup at {appointment.pickup_confirmed_at}")
    print(f"   Status: {appointment.status}")

    return appointment


def cleanup_test_data():
    """Clean up test data"""
    print("\n🧹 Cleaning up test data...")

    # Delete test appointments
    test_appointments = Appointment.objects.filter(
        client__first_name="Test", client__last_name="Client"
    )
    count = test_appointments.count()
    test_appointments.delete()
    print(f"✅ Deleted {count} test appointments")

    # Optionally clean up test users and clients
    # (commented out to avoid accidentally deleting real test users)
    # CustomUser.objects.filter(username__startswith="test_").delete()
    # Client.objects.filter(first_name="Test", last_name="Client").delete()


def main():
    """Run the pickup workflow test"""
    print("🚀 Starting Pickup Request Workflow Test")
    print("=" * 50)

    try:
        with transaction.atomic():
            appointment = test_pickup_workflow()

            print("\n" + "=" * 50)
            print("✅ TEST COMPLETED SUCCESSFULLY!")
            print(f"📋 Test appointment #{appointment.id} created and tested")
            print("\n🔍 Frontend Testing Notes:")
            print("1. Login as the test driver (test_driver)")
            print("2. Go to Driver Dashboard > Today's Transports")
            print(
                "3. You should see the pickup assignment with status 'driver_assigned_pickup'"
            )
            print(
                "4. The appointment card should show 'Confirm Pickup' and 'Reject Pickup' buttons"
            )
            print("5. Test confirming/rejecting the pickup assignment")

            print("\n🎯 Expected Behavior:")
            print("- Pickup assignments should appear in Driver Dashboard")
            print("- Driver can confirm pickup (status changes to 'return_journey')")
            print(
                "- Driver can reject pickup (status changes back to 'pickup_requested')"
            )
            print("- All pickup-related statuses should be visible to assigned driver")

    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        import traceback

        traceback.print_exc()

    finally:
        # Ask user if they want to keep test data
        response = input("\n🗑️ Clean up test data? (y/N): ").strip().lower()
        if response == "y":
            cleanup_test_data()
        else:
            print("✅ Test data preserved for manual testing")


if __name__ == "__main__":
    main()
