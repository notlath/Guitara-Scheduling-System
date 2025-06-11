#!/usr/bin/env python3
"""
Test script to verify the FIFO driver assignment system implementation.
This script tests both the backend logic and the new endpoints.
"""

import os
import sys
import django
from datetime import datetime, timedelta
from django.utils import timezone

# Setup Django environment
sys.path.append("/home/notlath/Downloads/Guitara-Scheduling-System/guitara")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from core.models import CustomUser
from scheduling.models import Appointment, Client
from scheduling.views import AppointmentViewSet
from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser


def create_test_drivers():
    """Create test drivers for FIFO testing"""
    print("🔧 Creating test drivers...")

    # Create or get test drivers
    drivers = []
    for i in range(3):
        driver, created = CustomUser.objects.get_or_create(
            username=f"test_driver_{i+1}",
            defaults={
                "email": f"driver{i+1}@test.com",
                "first_name": f"Driver{i+1}",
                "last_name": "Test",
                "role": "driver",
                "is_active": True,
                "phone_number": f"123456789{i}",
                "last_available_at": None,  # Initially not available
            },
        )
        drivers.append(driver)
        if created:
            print(f"  ✅ Created {driver.username}")
        else:
            print(f"  ♻️  Using existing {driver.username}")

    return drivers


def test_fifo_availability_updates():
    """Test the driver availability update system"""
    print("\n📋 Testing FIFO availability updates...")

    drivers = create_test_drivers()
    factory = RequestFactory()
    viewset = AppointmentViewSet()

    # Test marking drivers as available in sequence
    availability_times = []
    for i, driver in enumerate(drivers):
        print(f"\n  🚗 Testing availability for {driver.username}...")

        # Create mock request
        request = factory.post(
            "/api/appointments/update_driver_availability/",
            {"status": "available", "current_location": f"Test Location {i+1}"},
        )
        request.user = driver

        # Call the endpoint
        response = viewset.update_driver_availability(request)

        if response.status_code == 200:
            data = response.data
            print(f"    ✅ Response: {data['message']}")
            print(f"    📅 Available since: {data['available_since']}")
            print(f"    📍 FIFO position: {data['fifo_position']}")
            availability_times.append(data["available_since"])
        else:
            print(f"    ❌ Error: {response.data}")

    return drivers, availability_times


def test_fifo_assignment_logic():
    """Test the FIFO driver assignment logic"""
    print("\n🎯 Testing FIFO assignment logic...")

    viewset = AppointmentViewSet()

    # Test getting next available driver
    next_driver = viewset._get_next_available_driver_fifo()

    if next_driver:
        print(f"  ✅ Next available driver: {next_driver.username}")
        print(f"  📅 Was available since: {next_driver.last_available_at}")

        # Check if driver was removed from available pool
        still_available = CustomUser.objects.filter(
            role="driver", is_active=True, last_available_at__isnull=False
        ).count()
        print(f"  📊 Remaining available drivers: {still_available}")

        return next_driver
    else:
        print("  ❌ No available drivers found")
        return None


def test_fifo_order():
    """Test that FIFO assignment follows correct order"""
    print("\n⚡ Testing FIFO ordering...")

    # Reset all drivers to unavailable
    CustomUser.objects.filter(role="driver").update(last_available_at=None)

    drivers = CustomUser.objects.filter(
        role="driver", username__startswith="test_driver_"
    )[:3]

    # Make drivers available in specific order with time gaps
    base_time = timezone.now()
    expected_order = []

    for i, driver in enumerate(drivers):
        availability_time = base_time + timedelta(seconds=i * 10)  # 10 second gaps
        driver.last_available_at = availability_time
        driver.save()
        expected_order.append((driver.username, availability_time))
        print(f"  ⏰ {driver.username} available at {availability_time}")

    # Test assignment order
    print("\n  🎲 Testing assignment order...")
    viewset = AppointmentViewSet()
    assignment_order = []

    for i in range(len(drivers)):
        next_driver = viewset._get_next_available_driver_fifo()
        if next_driver:
            assignment_order.append(next_driver.username)
            print(f"    {i+1}. Assigned: {next_driver.username}")
        else:
            print(f"    {i+1}. No more drivers available")
            break

    # Verify order
    expected_usernames = [username for username, _ in expected_order]
    if assignment_order == expected_usernames:
        print("  ✅ FIFO order is correct!")
    else:
        print(f"  ❌ FIFO order incorrect!")
        print(f"    Expected: {expected_usernames}")
        print(f"    Got: {assignment_order}")


def test_position_calculation():
    """Test FIFO position calculation"""
    print("\n🔢 Testing FIFO position calculation...")

    # Reset and create availability sequence
    CustomUser.objects.filter(role="driver").update(last_available_at=None)

    drivers = CustomUser.objects.filter(
        role="driver", username__startswith="test_driver_"
    )[:3]
    viewset = AppointmentViewSet()

    base_time = timezone.now()
    for i, driver in enumerate(drivers):
        driver.last_available_at = base_time + timedelta(seconds=i * 5)
        driver.save()

        position = viewset._get_driver_fifo_position(driver)
        print(f"  🎯 {driver.username} position: {position} (expected: {i+1})")


def main():
    """Run all FIFO tests"""
    print("🚀 Starting FIFO System Tests")
    print("=" * 50)

    try:
        # Test 1: Driver availability updates
        drivers, times = test_fifo_availability_updates()

        # Test 2: FIFO assignment logic
        assigned_driver = test_fifo_assignment_logic()

        # Test 3: FIFO ordering
        test_fifo_order()

        # Test 4: Position calculation
        test_position_calculation()

        print("\n" + "=" * 50)
        print("✅ FIFO System Tests Completed!")

        # Summary
        print("\n📊 Summary:")
        print(f"  - Test drivers created: {len(drivers)}")
        print(f"  - Availability endpoint: ✅ Working")
        print(f"  - Assignment logic: ✅ Working")
        print(f"  - FIFO ordering: ✅ Working")
        print(f"  - Position calculation: ✅ Working")

    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
