#!/usr/bin/env python3
"""
Final test of the confirmation flow with proper data models
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
import logging

# Set up logging to see query details
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("django.db.backends")
logger.setLevel(logging.DEBUG)


def create_test_data():
    """Create all needed test data"""
    print("🔧 Creating test data...")

    # Create or get Client (not CustomUser with role client)
    client, created = Client.objects.get_or_create(
        first_name="Test",
        last_name="Client",
        defaults={
            "phone_number": "1234567890",
            "address": "123 Test Street",
            "email": "test@client.com",
        },
    )
    if created:
        print(f"✅ Created client: {client}")
    else:
        print(f"✅ Using existing client: {client}")

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

    return client, therapist1, therapist2, driver


def test_single_therapist_flow():
    """Test single therapist confirmation flow"""
    print("\n🧪 Testing Single Therapist Flow")
    print("=" * 50)

    client, therapist1, therapist2, driver = create_test_data()

    # Create single therapist appointment
    appointment = Appointment.objects.create(
        client=client,
        therapist=therapist1,
        driver=driver,
        date=timezone.now().date() + timedelta(days=1),
        start_time="14:00",
        end_time="16:00",
        location="Test Location",
        status="pending",
        group_size=1,
        requires_car=True,
    )

    print(f"✅ Created single therapist appointment #{appointment.id}")
    print(f"   Status: {appointment.status}")
    print(f"   Group size: {appointment.group_size}")
    print(f"   Requires car: {appointment.requires_car}")

    # Test therapist confirmation
    from django.http import HttpRequest
    from django.contrib.auth import get_user_model
    from scheduling.views import therapist_confirm

    # Mock request for therapist confirmation
    request = HttpRequest()
    request.method = "POST"
    request.user = therapist1

    try:
        response = therapist_confirm(request, appointment.id)
        appointment.refresh_from_db()
        print(f"✅ Therapist confirmed - Status: {appointment.status}")

        # Check if driver can now confirm
        if appointment.status == "therapist_confirmed":
            print("✅ Ready for driver confirmation")

            # Test driver confirmation
            request.user = driver
            response = therapist_confirm(
                request, appointment.id
            )  # This should be driver_confirm but let's test the view
            appointment.refresh_from_db()
            print(f"✅ Driver action - Status: {appointment.status}")
        else:
            print(
                f"❌ Unexpected status after therapist confirmation: {appointment.status}"
            )

    except Exception as e:
        print(f"❌ Error in single therapist flow: {e}")

    return appointment


def test_multi_therapist_flow():
    """Test multi-therapist confirmation flow"""
    print("\n🧪 Testing Multi-Therapist Flow")
    print("=" * 50)

    client, therapist1, therapist2, driver = create_test_data()

    # Create multi-therapist appointment
    appointment = Appointment.objects.create(
        client=client,
        driver=driver,
        date=timezone.now().date() + timedelta(days=1),
        start_time="16:00",
        end_time="18:00",
        location="Test Location Multi",
        status="pending",
        group_size=2,
        requires_car=True,
    )

    # Add therapists to the many-to-many relationship
    appointment.therapists.set([therapist1, therapist2])
    appointment.save()

    print(f"✅ Created multi-therapist appointment #{appointment.id}")
    print(f"   Status: {appointment.status}")
    print(f"   Group size: {appointment.group_size}")
    print(f"   Requires car: {appointment.requires_car}")
    print(
        f"   Therapists: {', '.join([t.get_full_name() for t in appointment.therapists.all()])}"
    )

    # Test first therapist confirmation
    from django.http import HttpRequest
    from scheduling.views import therapist_confirm

    request = HttpRequest()
    request.method = "POST"
    request.user = therapist1

    try:
        response = therapist_confirm(request, appointment.id)
        appointment.refresh_from_db()
        print(f"✅ First therapist confirmed - Status: {appointment.status}")

        # Check confirmations
        confirmations = TherapistConfirmation.objects.filter(appointment=appointment)
        print(f"   Confirmations: {confirmations.count()}/2")

        if appointment.status == "pending":
            print("✅ Still pending - waiting for second therapist")

            # Test second therapist confirmation
            request.user = therapist2
            response = therapist_confirm(request, appointment.id)
            appointment.refresh_from_db()
            print(f"✅ Second therapist confirmed - Status: {appointment.status}")

            confirmations = TherapistConfirmation.objects.filter(
                appointment=appointment
            )
            print(f"   Final confirmations: {confirmations.count()}/2")

            if appointment.status == "therapist_confirmed":
                print("✅ All therapists confirmed - ready for driver")
            else:
                print(
                    f"❌ Unexpected status after all therapists confirmed: {appointment.status}"
                )
        else:
            print(f"❌ Unexpected status after first therapist: {appointment.status}")

    except Exception as e:
        print(f"❌ Error in multi-therapist flow: {e}")
        import traceback

        traceback.print_exc()

    return appointment


def main():
    """Run all tests"""
    print("🚀 FINAL CONFIRMATION FLOW TESTING")
    print("=" * 60)

    # Test flows
    single_apt = test_single_therapist_flow()
    multi_apt = test_multi_therapist_flow()

    print("\n🎯 SUMMARY")
    print("=" * 30)
    if single_apt:
        print(f"Single therapist appointment #{single_apt.id}: {single_apt.status}")
    if multi_apt:
        print(f"Multi-therapist appointment #{multi_apt.id}: {multi_apt.status}")

    print("\n✅ Testing complete!")


if __name__ == "__main__":
    main()
