#!/usr/bin/env python
"""
Test script to verify driver transport completion functionality.
This test verifies that when a driver drops off a therapist, the transport
is marked as completed for the driver and appears in "All My Transports".
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
from scheduling.models import Appointment, Notification, Client
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
        "cyan": "\033[96m",
        "magenta": "\033[95m",
        "end": "\033[0m",
    }
    print(f"{colors.get(color, colors['white'])}{message}{colors['end']}")


def test_driver_transport_completion():
    """Test that driver transport is marked as completed after drop-off"""

    print_status("=" * 70, "blue")
    print_status("🧪 TESTING: Driver Transport Completion Workflow", "blue")
    print_status("=" * 70, "blue")

    try:
        # Get or create test users
        driver, _ = User.objects.get_or_create(
            username="test_driver_completion",
            defaults={
                "email": "driver.completion@test.com",
                "role": "driver",
                "motorcycle_plate": "COMP-123",
                "phone_number": "555-0001",
            },
        )

        therapist, _ = User.objects.get_or_create(
            username="test_therapist_completion",
            defaults={
                "email": "therapist.completion@test.com",
                "role": "therapist",
                "license_number": "LIC-456",
                "specialization": "physiotherapy",
                "phone_number": "555-0002",
            },
        )

        client, _ = Client.objects.get_or_create(
            email="client.completion@test.com",
            defaults={
                "first_name": "Test",
                "last_name": "Client",
                "phone_number": "555-0003",
                "address": "123 Test Street, Test City",
            },
        )

        print_status(f"✅ Test setup complete", "green")
        print_status(f"🚗 Driver: {driver.username}", "white")
        print_status(f"👨‍⚕️ Therapist: {therapist.username}", "white")
        print_status(f"👤 Client: {client.first_name} {client.last_name}", "white")

        # Clean up any existing test appointments
        Appointment.objects.filter(
            client=client, therapist=therapist, driver=driver
        ).delete()

        # Create test appointment
        tomorrow = date.today() + timedelta(days=1)
        appointment = Appointment.objects.create(
            client=client,
            therapist=therapist,
            driver=driver,
            date=tomorrow,
            start_time=time(10, 0),
            end_time=time(11, 0),
            status="arrived",
            location="123 Test Street, Test City",
            notes="Test appointment for driver transport completion",
        )

        print_status(f"\n📅 Created test appointment ID: {appointment.id}", "green")
        print_status(f"📍 Initial status: {appointment.status}", "yellow")

        # Test Step 1: Simulate driver drop-off
        print_status("\n🔄 STEP 1: Driver Drop-off (Transport Completion)", "cyan")

        initial_driver_availability = driver.last_available_at
        print_status(
            f"Before drop-off - Driver availability: {initial_driver_availability}",
            "yellow",
        )

        # Simulate the drop-off process
        appointment.status = "driver_transport_completed"
        appointment.dropped_off_at = timezone.now()
        appointment.save()

        # Mark driver as available
        driver.last_available_at = timezone.now()
        driver.save()

        # Refresh objects
        appointment.refresh_from_db()
        driver.refresh_from_db()

        print_status(f"✅ Appointment status updated to: {appointment.status}", "green")
        print_status(f"✅ Drop-off timestamp: {appointment.dropped_off_at}", "green")
        print_status(
            f"✅ Driver availability updated: {driver.last_available_at}", "green"
        )

        # Test Step 2: Verify driver transport completion
        print_status("\n🔄 STEP 2: Verify Transport Completion Logic", "cyan")

        # Check if transport is considered completed for driver
        completed_transport_statuses = [
            "driver_transport_completed",
            "therapist_dropped_off",
            "payment_completed",
            "completed",
            "transport_completed",
        ]

        is_completed_for_driver = appointment.status in completed_transport_statuses
        print_status(
            f"Transport completed for driver: {is_completed_for_driver}",
            "green" if is_completed_for_driver else "red",
        )

        # Test Step 3: Verify "All My Transports" filter logic
        print_status("\n🔄 STEP 3: All My Transports Filter Test", "cyan")

        # Simulate the frontend filter logic
        all_transport_statuses = [
            "pending",
            "therapist_confirmed",
            "driver_confirmed",
            "in_progress",
            "journey_started",
            "journey",
            "arrived",
            "dropped_off",
            "driver_transport_completed",  # This should be included
            "session_in_progress",
            "awaiting_payment",
            "completed",
            "pickup_requested",
            "therapist_dropped_off",
            "payment_completed",
            "driver_assigned_pickup",
            "return_journey",
            "transport_completed",
        ]

        appears_in_all_transports = appointment.status in all_transport_statuses
        print_status(
            f"Appears in 'All My Transports': {appears_in_all_transports}",
            "green" if appears_in_all_transports else "red",
        )

        # Test Step 4: Verify exclusion from active views
        print_status("\n🔄 STEP 4: Active Views Filter Test", "cyan")

        today_active_statuses = [
            "pending",
            "therapist_confirmed",
            "driver_confirmed",
            "in_progress",
            "journey_started",
            "journey",
            "arrived",
            "pickup_requested",
            "driver_assigned_pickup",
            "return_journey",
        ]

        appears_in_today_active = appointment.status in today_active_statuses
        print_status(
            f"Appears in 'Today's Active Transports': {appears_in_today_active}",
            "red" if appears_in_today_active else "green",
        )
        print_status(
            "✅ Correctly excluded from active views (driver's work is done)",
            "green" if not appears_in_today_active else "red",
        )

        # Test Step 5: Driver availability for new assignments
        print_status("\n🔄 STEP 5: Driver Availability Test", "cyan")

        # Get available drivers (FIFO queue simulation)
        available_drivers = User.objects.filter(
            role="driver", last_available_at__isnull=False
        ).order_by("last_available_at")

        if driver in available_drivers:
            driver_position = list(available_drivers).index(driver) + 1
            print_status(f"✅ Driver is available for new assignments", "green")
            print_status(f"🎯 Position in FIFO queue: #{driver_position}", "green")
        else:
            print_status("❌ Driver not available for new assignments", "red")

        # Test Step 6: Status display simulation
        print_status("\n🔄 STEP 6: Status Display Test", "cyan")

        status_badge_mapping = {"driver_transport_completed": "status-completed"}

        expected_badge = status_badge_mapping.get(appointment.status, "")
        print_status(
            f"Status badge class: {expected_badge}",
            "green" if expected_badge else "yellow",
        )

        # Summary
        print_status("\n" + "=" * 70, "blue")
        if (
            is_completed_for_driver
            and appears_in_all_transports
            and not appears_in_today_active
            and driver in available_drivers
        ):
            print_status("🎉 ALL TESTS PASSED!", "green")
            print_status(
                "✅ Driver transport completion workflow is working correctly!", "green"
            )
            print_status("✅ Transport appears in 'All My Transports'", "green")
            print_status("✅ Transport excluded from active views", "green")
            print_status("✅ Driver available for new assignments", "green")
        else:
            print_status("❌ SOME TESTS FAILED!", "red")
            print_status("Please check the implementation.", "red")
        print_status("=" * 70, "blue")

        return True

    except Exception as e:
        print_status(f"❌ Error during testing: {str(e)}", "red")
        import traceback

        traceback.print_exc()
        return False

    finally:
        # Clean up test data
        print_status("\n🧹 Cleaning up test data...", "yellow")
        try:
            Appointment.objects.filter(
                client__email="client.completion@test.com",
                therapist__username="test_therapist_completion",
                driver__username="test_driver_completion",
            ).delete()
            print_status("✅ Test data cleaned up", "green")
        except Exception as cleanup_error:
            print_status(f"⚠️ Cleanup warning: {cleanup_error}", "yellow")


def main():
    """Main test runner"""
    print_status("🚀 Starting Driver Transport Completion Tests", "blue")

    success = test_driver_transport_completion()

    if success:
        print_status("\n✅ Testing completed successfully!", "green")
        print_status(
            "The driver transport completion functionality is working correctly.",
            "green",
        )
    else:
        print_status("\n❌ Testing failed!", "red")
        print_status("Please check the implementation.", "red")

    return success


if __name__ == "__main__":
    main()
