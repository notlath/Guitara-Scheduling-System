#!/usr/bin/env python3
"""
Quick integration test for confirmation flow
"""
import os
import django
from datetime import datetime, timedelta

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from scheduling.models import Appointment, TherapistConfirmation, Client
from core.models import CustomUser
from django.utils import timezone


def test_confirmation_logic():
    """Test the core confirmation logic without views"""
    print("🧪 TESTING CONFIRMATION LOGIC")
    print("=" * 40)

    # Create test data
    client, _ = Client.objects.get_or_create(
        first_name="Test",
        last_name="Client",
        defaults={"phone_number": "123", "address": "Test"},
    )

    therapist1, _ = CustomUser.objects.get_or_create(
        username="t1", defaults={"role": "therapist", "first_name": "T1"}
    )
    therapist2, _ = CustomUser.objects.get_or_create(
        username="t2", defaults={"role": "therapist", "first_name": "T2"}
    )
    driver, _ = CustomUser.objects.get_or_create(
        username="d1", defaults={"role": "driver", "first_name": "D1"}
    )

    # Test 1: Single therapist appointment
    print("\n1️⃣ Single Therapist Test")
    apt1 = Appointment.objects.create(
        client=client,
        therapist=therapist1,
        driver=driver,
        date=timezone.now().date() + timedelta(days=1),
        start_time="14:00",
        end_time="16:00",
        location="Test",
        status="pending",
        group_size=1,
        requires_car=True,
    )
    print(f"   Created: {apt1.id} - Status: {apt1.status}")

    # Simulate therapist confirmation
    confirmation1 = TherapistConfirmation.objects.create(
        appointment=apt1, therapist=therapist1, confirmed=True
    )

    # Check if all therapists confirmed
    total_therapists = 1  # single therapist
    confirmed_therapists = TherapistConfirmation.objects.filter(
        appointment=apt1, confirmed=True
    ).count()

    print(f"   Confirmed: {confirmed_therapists}/{total_therapists}")

    if confirmed_therapists == total_therapists:
        apt1.status = "therapist_confirmed"
        apt1.save()
        print(f"   ✅ Updated to: {apt1.status}")

    # Test 2: Multi-therapist appointment
    print("\n2️⃣ Multi-Therapist Test")
    apt2 = Appointment.objects.create(
        client=client,
        driver=driver,
        date=timezone.now().date() + timedelta(days=1),
        start_time="16:00",
        end_time="18:00",
        location="Test Multi",
        status="pending",
        group_size=2,
        requires_car=True,
    )
    apt2.therapists.set([therapist1, therapist2])
    print(f"   Created: {apt2.id} - Status: {apt2.status}")
    print(f"   Therapists: {apt2.therapists.count()}")

    # First therapist confirms
    confirmation2a = TherapistConfirmation.objects.create(
        appointment=apt2, therapist=therapist1, confirmed=True
    )
    confirmed_count = TherapistConfirmation.objects.filter(
        appointment=apt2, confirmed=True
    ).count()
    print(f"   After T1: {confirmed_count}/{apt2.therapists.count()}")

    # Check status (should still be pending)
    if confirmed_count < apt2.therapists.count():
        print(f"   ✅ Still pending - need more confirmations")

    # Second therapist confirms
    confirmation2b = TherapistConfirmation.objects.create(
        appointment=apt2, therapist=therapist2, confirmed=True
    )
    confirmed_count = TherapistConfirmation.objects.filter(
        appointment=apt2, confirmed=True
    ).count()
    print(f"   After T2: {confirmed_count}/{apt2.therapists.count()}")

    # Now all confirmed
    if confirmed_count == apt2.therapists.count():
        apt2.status = "therapist_confirmed"
        apt2.save()
        print(f"   ✅ All confirmed - Status: {apt2.status}")

    # Test 3: Check driver confirmation logic
    print("\n3️⃣ Driver Confirmation Test")

    # For single therapist (already therapist_confirmed)
    if apt1.status == "therapist_confirmed":
        print(f"   Single apt ready for driver: ✅")
        apt1.status = "driver_confirmed"
        apt1.save()
        print(f"   Driver confirmed - Status: {apt1.status}")

    # For multi-therapist (already therapist_confirmed)
    if apt2.status == "therapist_confirmed":
        print(f"   Multi apt ready for driver: ✅")
        apt2.status = "driver_confirmed"
        apt2.save()
        print(f"   Driver confirmed - Status: {apt2.status}")

    print("\n🎯 SUMMARY")
    print(f"Single appointment: {apt1.status}")
    print(f"Multi appointment: {apt2.status}")
    print("✅ Logic test complete!")


if __name__ == "__main__":
    test_confirmation_logic()
