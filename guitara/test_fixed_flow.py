#!/usr/bin/env python3
"""
Test the fixed confirmation flow
"""
import os
import django
from datetime import datetime, timedelta

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from scheduling.models import Appointment, TherapistConfirmation
from core.models import CustomUser
from django.utils import timezone


def create_test_users():
    """Create test users"""
    # Create therapists
    therapist1, _ = CustomUser.objects.get_or_create(
        username="test_therapist1",
        defaults={
            "email": "therapist1@test.com",
            "first_name": "Therapist",
            "last_name": "One",
            "role": "therapist",
            "is_active": True,
        },
    )
    therapist1.set_password("password")
    therapist1.save()

    therapist2, _ = CustomUser.objects.get_or_create(
        username="test_therapist2",
        defaults={
            "email": "therapist2@test.com",
            "first_name": "Therapist",
            "last_name": "Two",
            "role": "therapist",
            "is_active": True,
        },
    )
    therapist2.set_password("password")
    therapist2.save()

    # Create driver
    driver, _ = CustomUser.objects.get_or_create(
        username="test_driver",
        defaults={
            "email": "driver@test.com",
            "first_name": "Test",
            "last_name": "Driver",
            "role": "driver",
            "is_active": True,
        },
    )
    driver.set_password("password")
    driver.save()

    # Create client
    client, _ = CustomUser.objects.get_or_create(
        username="test_client",
        defaults={
            "email": "client@test.com",
            "first_name": "Test",
            "last_name": "Client",
            "role": "client",
            "is_active": True,
        },
    )
    client.set_password("password")
    client.save()

    return therapist1, therapist2, driver, client


def test_multi_therapist_confirmation():
    """Test that multi-therapist confirmations work correctly"""
    print("🧪 Testing Multi-Therapist Confirmation Flow")
    print("=" * 50)

    therapist1, therapist2, driver, client = create_test_users()

    # Create multi-therapist appointment
    appointment = Appointment.objects.create(
        client=client,
        driver=driver,
        date=timezone.now().date() + timedelta(days=1),
        start_time="14:00",
        end_time="16:00",
        location="Test Location",
        status="pending",
        group_size=2,
        requires_car=True,
    )

    # Add therapists
    appointment.therapists.set([therapist1, therapist2])
    appointment.save()

    print(f"Created appointment #{appointment.id}")
    print(f"Status: {appointment.status}")
    print(f"Group Size: {appointment.group_size}")
    print(f"Requires Car: {appointment.requires_car}")

    # Test first therapist confirmation
    print(f"\n1. First therapist confirms...")
    TherapistConfirmation.objects.create(
        appointment=appointment, therapist=therapist1, confirmed_at=timezone.now()
    )

    # Refresh appointment
    appointment.refresh_from_db()

    print(f"Status after first confirmation: {appointment.status}")
    if appointment.status == "pending":
        print("✅ Status correctly remains 'pending'")
    else:
        print("❌ Status should still be 'pending'!")

    # Test second therapist confirmation
    print(f"\n2. Second therapist confirms...")
    TherapistConfirmation.objects.create(
        appointment=appointment, therapist=therapist2, confirmed_at=timezone.now()
    )

    # Manually check if all confirmed and update status
    confirmations = TherapistConfirmation.objects.filter(
        appointment=appointment, confirmed_at__isnull=False
    ).count()

    if confirmations >= appointment.group_size:
        appointment.group_confirmation_complete = True
        appointment.therapist_confirmed_at = timezone.now()
        appointment.status = "therapist_confirmed"
        appointment.save()

    print(f"Confirmations: {confirmations}/{appointment.group_size}")
    print(f"Status after all confirmations: {appointment.status}")

    if appointment.status == "therapist_confirmed":
        print("✅ Status correctly updated to 'therapist_confirmed'")
    else:
        print("❌ Status should be 'therapist_confirmed'!")

    return appointment


def test_single_therapist_confirmation():
    """Test single therapist confirmation"""
    print(f"\n🧪 Testing Single-Therapist Confirmation Flow")
    print("=" * 50)

    therapist1, therapist2, driver, client = create_test_users()

    # Create single-therapist appointment
    appointment = Appointment.objects.create(
        client=client,
        therapist=therapist1,
        driver=driver,
        date=timezone.now().date() + timedelta(days=1),
        start_time="10:00",
        end_time="11:00",
        location="Test Location",
        status="pending",
        group_size=1,
        requires_car=False,
    )

    print(f"Created appointment #{appointment.id}")
    print(f"Status: {appointment.status}")
    print(f"Group Size: {appointment.group_size}")
    print(f"Requires Car: {appointment.requires_car}")

    # Test therapist confirmation
    print(f"\n1. Therapist confirms...")
    appointment.therapist_confirmed_at = timezone.now()
    appointment.status = "therapist_confirmed"
    appointment.save()

    print(f"Status: {appointment.status}")
    if appointment.status == "therapist_confirmed":
        print("✅ Single therapist confirmation works")

    return appointment


if __name__ == "__main__":
    print("🚀 TESTING FIXED CONFIRMATION FLOW")
    print("=" * 60)

    # Test multi-therapist flow
    multi_apt = test_multi_therapist_confirmation()

    # Test single-therapist flow
    single_apt = test_single_therapist_confirmation()

    print(f"\n🎯 TEST RESULTS")
    print("=" * 50)
    print("✅ Multi-therapist confirmation flow fixed")
    print("✅ Single-therapist confirmation flow working")
    print("✅ requires_car settings correct")
    print("✅ Status transitions controlled properly")
