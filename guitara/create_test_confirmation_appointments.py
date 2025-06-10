#!/usr/bin/env python3
"""
Create test appointments in different statuses to verify frontend buttons work.
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from scheduling.models import Appointment, Client
from core.models import CustomUser
from django.utils import timezone


def create_test_appointments():
    """Create test appointments in different statuses to test frontend buttons"""
    print("🧪 Creating Test Appointments for Confirmation Flow Testing")
    print("=" * 60)

    try:
        # Get or create test users
        therapist = CustomUser.objects.filter(role="therapist").first()
        driver = CustomUser.objects.filter(role="driver").first()

        if not therapist:
            therapist = CustomUser.objects.create_user(
                username="test_therapist_conf",
                email="therapist_conf@test.com",
                role="therapist",
                first_name="Test",
                last_name="Therapist",
            )

        if not driver:
            driver = CustomUser.objects.create_user(
                username="test_driver_conf",
                email="driver_conf@test.com",
                role="driver",
                first_name="Test",
                last_name="Driver",
            )

        # Get or create test client
        client = Client.objects.filter(name="Test Client Confirmation").first()
        if not client:
            client = Client.objects.create(
                name="Test Client Confirmation",
                phone="123-456-7890",
                address="123 Test Confirmation St",
            )

        # Create appointments in different statuses
        test_appointments = [
            {
                "status": "confirmed",
                "description": 'Ready for THERAPIST confirmation - should show "Confirm Ready" button',
            },
            {
                "status": "therapist_confirmed",
                "description": 'Ready for DRIVER confirmation - should show "Confirm Ready to Drive" button',
            },
            {
                "status": "driver_confirmed",
                "description": 'Ready for OPERATOR to start - should show "Start Appointment" button',
            },
        ]

        created_appointments = []

        for i, apt_data in enumerate(test_appointments):
            appointment = Appointment.objects.create(
                client=client,
                therapist=therapist,
                driver=driver,
                date=timezone.now().date() + timedelta(days=1),
                start_time=f"{10 + i}:00:00",
                end_time=f"{11 + i}:00:00",
                location=f"Test Location {i+1}",
                status=apt_data["status"],
                group_size=1,
                requires_car=True,
                both_parties_accepted=True,
            )

            created_appointments.append(appointment)
            print(f"✅ Created appointment #{appointment.id}")
            print(f"   Status: {appointment.status}")
            print(f"   Purpose: {apt_data['description']}")
            print(f"   Therapist: {therapist.first_name} {therapist.last_name}")
            print(f"   Driver: {driver.first_name} {driver.last_name}")
            print()

        print("🎯 Testing Instructions:")
        print("1. Start the frontend development server")
        print("2. Login as the therapist to see 'Confirm Ready' button")
        print("3. Login as the driver to see 'Confirm Ready to Drive' button")
        print("4. Login as an operator to see 'Start Appointment' button")
        print()
        print("📋 Expected Button Behavior:")
        print(
            "• Therapist Dashboard: Shows 'Confirm Ready' for 'confirmed' status appointments"
        )
        print(
            "• Driver Dashboard: Shows 'Confirm Ready to Drive' for 'therapist_confirmed' status"
        )
        print(
            "• Operator Dashboard: Shows 'Start Appointment' for 'driver_confirmed' status"
        )

        return created_appointments

    except Exception as e:
        print(f"❌ Error creating test appointments: {e}")
        import traceback

        traceback.print_exc()
        return []


if __name__ == "__main__":
    appointments = create_test_appointments()
    if appointments:
        print(f"\\n✅ Successfully created {len(appointments)} test appointments!")
    else:
        print("\\n❌ Failed to create test appointments")
