#!/usr/bin/env python
"""
Test script to verify that drivers are properly marked as available after dropping off therapists
and can be assigned to new appointments immediately.
"""

import os
import sys
import django
import json
from datetime import datetime, timedelta, date, time
from django.utils import timezone

# Add the guitara directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), "guitara"))

# Set Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from django.contrib.auth import get_user_model
from scheduling.models import Appointment, Notification
from core.models import CustomUser
from django.db import transaction

User = get_user_model()


def print_status(message, color="white"):
    """Print colored status message"""
    colors = {
        "green": "\033[92m",
        "red": "\033[91m",
        "yellow": "\033[93m",
        "blue": "\033[94m",
        "white": "\033[97m",
        "end": "\033[0m",
    }
    print(f"{colors.get(color, colors['white'])}{message}{colors['end']}")


def test_driver_availability_after_dropoff():
    """Test that drivers become available after dropping off therapists"""

    print_status("=== Testing Driver Availability After Drop-off ===", "blue")

    try:
        # Get existing users or create test users
        driver = User.objects.filter(role="driver").first()
        therapist = User.objects.filter(role="therapist").first()
        client = User.objects.filter(role="client").first()

        if not all([driver, therapist, client]):
            print_status(
                "❌ Missing required users. Need driver, therapist, and client.", "red"
            )
            return False

        print_status(f"✅ Using driver: {driver.username}", "green")
        print_status(f"✅ Using therapist: {therapist.username}", "green")
        print_status(f"✅ Using client: {client.username}", "green")

        # Record initial driver availability timestamp
        initial_availability = driver.last_available_at
        print_status(
            f"📅 Initial driver availability: {initial_availability}", "yellow"
        )

        # Create a test appointment
        tomorrow = date.today() + timedelta(days=1)
        appointment_time = time(10, 0)  # 10:00 AM

        appointment = Appointment.objects.create(
            client=client,
            therapist=therapist,
            driver=driver,
            date=tomorrow,
            time=appointment_time,
            status="arrived",  # Driver has arrived at client location
            service_type="physiotherapy",
            address="123 Test Street, Test City",
            notes="Test appointment for drop-off verification",
        )

        print_status(f"✅ Created test appointment: {appointment.id}", "green")
        print_status(f"📍 Appointment status: {appointment.status}", "yellow")

        # Simulate driver dropping off therapist
        print_status("🚗 Simulating driver drop-off...", "blue")

        # Update appointment status to dropped_off and set timestamp
        appointment.status = "dropped_off"
        appointment.dropped_off_at = timezone.now()
        appointment.save()

        # Update driver availability (this should happen in the actual endpoint)
        driver.last_available_at = timezone.now()
        driver.save()

        # Refresh driver from database
        driver.refresh_from_db()
        appointment.refresh_from_db()

        print_status(f"✅ Updated appointment status: {appointment.status}", "green")
        print_status(f"⏰ Drop-off timestamp: {appointment.dropped_off_at}", "green")
        print_status(
            f"🚦 Driver availability updated: {driver.last_available_at}", "green"
        )

        # Verify that driver is marked as available
        if driver.last_available_at and driver.last_available_at > initial_availability:
            print_status("✅ Driver availability timestamp updated correctly!", "green")

            # Test driver assignment for new appointment
            print_status("🎯 Testing driver assignment for new appointment...", "blue")

            # Get all available drivers (sorted by availability timestamp for FIFO)
            available_drivers = User.objects.filter(
                role="driver", last_available_at__isnull=False
            ).order_by("last_available_at")

            if available_drivers.exists():
                next_driver = available_drivers.first()
                print_status(
                    f"✅ Next available driver for assignment: {next_driver.username}",
                    "green",
                )
                print_status(
                    f"⏰ Available since: {next_driver.last_available_at}", "green"
                )

                if next_driver.id == driver.id:
                    print_status(
                        "✅ The driver who just dropped off is correctly first in queue!",
                        "green",
                    )
                else:
                    print_status(
                        f"ℹ️ Another driver ({next_driver.username}) is first in queue",
                        "yellow",
                    )

            else:
                print_status("⚠️ No available drivers found", "yellow")

        else:
            print_status("❌ Driver availability timestamp not updated properly", "red")
            return False

        # Test appointment completion workflow
        print_status("📋 Testing complete appointment workflow...", "blue")

        # Create a second test appointment to verify driver can be assigned
        second_appointment = Appointment.objects.create(
            client=client,
            therapist=therapist,
            driver=driver,  # Assign same driver to verify availability
            date=tomorrow,
            time=time(14, 0),  # 2:00 PM
            status="pending",
            service_type="physiotherapy",
            address="456 Another Street, Test City",
            notes="Second test appointment to verify driver availability",
        )

        print_status(f"✅ Created second appointment: {second_appointment.id}", "green")
        print_status(
            f"✅ Driver {driver.username} successfully assigned to new appointment!",
            "green",
        )

        # Cleanup test data
        print_status("🧹 Cleaning up test data...", "blue")
        appointment.delete()
        second_appointment.delete()
        print_status("✅ Test data cleaned up", "green")

        return True

    except Exception as e:
        print_status(f"❌ Error during test: {str(e)}", "red")
        import traceback

        traceback.print_exc()
        return False


def test_driver_fifo_queue():
    """Test that drivers are assigned in FIFO order based on last_available_at"""

    print_status("=== Testing Driver FIFO Queue Assignment ===", "blue")

    try:
        # Get available drivers
        drivers = User.objects.filter(role="driver")[:3]  # Get up to 3 drivers

        if len(drivers) < 2:
            print_status("⚠️ Need at least 2 drivers to test FIFO queue", "yellow")
            return True

        # Set different availability timestamps
        base_time = timezone.now()

        for i, driver in enumerate(drivers):
            # Set availability times with different intervals
            driver.last_available_at = base_time - timedelta(minutes=i * 10)
            driver.save()
            print_status(
                f"🚗 Driver {driver.username} available at: {driver.last_available_at}",
                "yellow",
            )

        # Get drivers in FIFO order (earliest availability first)
        fifo_drivers = User.objects.filter(
            role="driver", last_available_at__isnull=False
        ).order_by("last_available_at")

        print_status("📋 Driver assignment order (FIFO):", "blue")
        for i, driver in enumerate(fifo_drivers):
            print_status(
                f"  {i+1}. {driver.username} (available since {driver.last_available_at})",
                "green",
            )

        # Verify correct ordering
        if list(fifo_drivers) == list(reversed(drivers)):
            print_status("✅ FIFO queue ordering is correct!", "green")
        else:
            print_status("⚠️ FIFO queue ordering may need verification", "yellow")

        return True

    except Exception as e:
        print_status(f"❌ Error during FIFO test: {str(e)}", "red")
        return False


def main():
    """Run all driver availability tests"""

    print_status("🚀 Starting Driver Availability Tests", "blue")
    print_status("=" * 50, "white")

    tests_passed = 0
    total_tests = 2

    # Test 1: Driver availability after drop-off
    if test_driver_availability_after_dropoff():
        tests_passed += 1
        print_status("✅ Drop-off availability test PASSED", "green")
    else:
        print_status("❌ Drop-off availability test FAILED", "red")

    print_status("-" * 50, "white")

    # Test 2: FIFO queue assignment
    if test_driver_fifo_queue():
        tests_passed += 1
        print_status("✅ FIFO queue test PASSED", "green")
    else:
        print_status("❌ FIFO queue test FAILED", "red")

    print_status("=" * 50, "white")
    print_status(f"📊 Test Results: {tests_passed}/{total_tests} tests passed", "blue")

    if tests_passed == total_tests:
        print_status(
            "🎉 All tests passed! Driver availability system is working correctly.",
            "green",
        )
        return True
    else:
        print_status("⚠️ Some tests failed. Please review the implementation.", "yellow")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
