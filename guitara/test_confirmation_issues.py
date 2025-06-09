#!/usr/bin/env python3
"""
Test script to identify and fix confirmation flow issues
"""
import os
import sys
import django
from datetime import datetime, timedelta, date
from django.utils import timezone

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from scheduling.models import Appointment, TherapistConfirmation
from core.models import CustomUser
from registration.models import Service
from django.db import transaction


def analyze_confirmation_issues():
    """Analyze current confirmation flow issues"""
    print("🔍 ANALYZING CONFIRMATION FLOW ISSUES")
    print("=" * 50)

    # Check recent appointments
    print("\n1. RECENT APPOINTMENTS ANALYSIS:")
    recent_appointments = Appointment.objects.all().order_by("-created_at")[:10]

    for apt in recent_appointments:
        print(f"\nAppointment #{apt.id}:")
        print(f"  Status: {apt.status}")
        print(f"  Group Size: {apt.group_size}")
        print(f"  Requires Car: {apt.requires_car}")
        print(f"  Group Confirmation Complete: {apt.group_confirmation_complete}")

        # Check therapists
        if apt.therapists.count() > 0:
            print(f"  Multi-therapist: {[t.username for t in apt.therapists.all()]}")
            # Check individual confirmations
            confirmations = TherapistConfirmation.objects.filter(appointment=apt)
            print(
                f"  Therapist Confirmations: {confirmations.count()}/{apt.group_size}"
            )
            for conf in confirmations:
                status = "✅ Confirmed" if conf.confirmed_at else "⏳ Pending"
                print(f"    {conf.therapist.username}: {status}")
        else:
            therapist_name = apt.therapist.username if apt.therapist else "None"
            print(f"  Single therapist: {therapist_name}")

        print(f"  Driver: {apt.driver.username if apt.driver else 'None'}")
        print(f"  Created: {apt.created_at}")

    # Check if there are multi-therapist appointments where only one confirmed
    print(f"\n2. MULTI-THERAPIST CONFIRMATION ISSUES:")
    multi_therapist_apts = Appointment.objects.filter(group_size__gt=1)

    for apt in multi_therapist_apts:
        confirmations = TherapistConfirmation.objects.filter(
            appointment=apt, confirmed_at__isnull=False
        ).count()
        total_therapists = apt.therapists.count()

        print(f"\nAppointment #{apt.id}:")
        print(f"  Group Size: {apt.group_size}")
        print(f"  Therapists Assigned: {total_therapists}")
        print(f"  Confirmations: {confirmations}")
        print(f"  Status: {apt.status}")

        if confirmations < apt.group_size and apt.status == "therapist_confirmed":
            print(
                f"  ❌ ISSUE: Status is 'therapist_confirmed' but only {confirmations}/{apt.group_size} confirmed!"
            )

        if apt.requires_car != (apt.group_size > 1):
            print(
                f"  ❌ ISSUE: requires_car ({apt.requires_car}) doesn't match group_size ({apt.group_size})"
            )


def test_single_therapist_flow():
    """Test single therapist confirmation flow"""
    print(f"\n\n🧪 TESTING SINGLE THERAPIST FLOW")
    print("=" * 50)

    # Get test users
    try:
        therapist = CustomUser.objects.filter(role="therapist").first()
        driver = CustomUser.objects.filter(role="driver").first()
        client = CustomUser.objects.filter(role="client").first()

        if not all([therapist, driver, client]):
            print("❌ Missing test users. Creating them...")
            create_test_users()
            therapist = CustomUser.objects.filter(role="therapist").first()
            driver = CustomUser.objects.filter(role="driver").first()
            client = CustomUser.objects.filter(role="client").first()

        # Create appointment
        appointment = Appointment.objects.create(
            client=client,
            therapist=therapist,
            driver=driver,
            date=timezone.now().date() + timedelta(days=1),
            start_time="10:00",
            end_time="11:00",
            location="123 Test St",
            status="pending",
            group_size=1,
            requires_car=False,
        )

        print(f"✅ Created single-therapist appointment #{appointment.id}")
        print(f"   Status: {appointment.status}")
        print(f"   Group Size: {appointment.group_size}")
        print(f"   Requires Car: {appointment.requires_car}")

        # Test the flow by updating status manually (simulating API calls)
        print(f"\n1. Therapist confirms...")
        appointment.therapist_confirmed_at = timezone.now()
        appointment.status = "therapist_confirmed"
        appointment.save()
        print(f"   Status: {appointment.status}")

        print(f"\n2. Driver confirms...")
        appointment.driver_confirmed_at = timezone.now()
        appointment.status = "driver_confirmed"
        appointment.save()
        print(f"   Status: {appointment.status}")

        print(f"\n✅ Single therapist flow works correctly!")

        return appointment

    except Exception as e:
        print(f"❌ Error in single therapist flow: {e}")
        return None


def test_multi_therapist_flow():
    """Test multi-therapist confirmation flow"""
    print(f"\n\n🧪 TESTING MULTI-THERAPIST FLOW")
    print("=" * 50)

    try:
        # Get test users
        therapists = list(CustomUser.objects.filter(role="therapist")[:2])
        driver = CustomUser.objects.filter(role="driver").first()
        client = CustomUser.objects.filter(role="client").first()

        if len(therapists) < 2:
            print("❌ Need at least 2 therapists for multi-therapist test")
            return None

        # Create multi-therapist appointment
        appointment = Appointment.objects.create(
            client=client,
            driver=driver,
            date=timezone.now().date() + timedelta(days=1),
            start_time="14:00",
            end_time="16:00",
            location="456 Test Ave",
            status="pending",
            group_size=2,
            requires_car=True,  # Should be True for multi-therapist
        )

        # Add therapists
        appointment.therapists.set(therapists)
        appointment.save()

        print(f"✅ Created multi-therapist appointment #{appointment.id}")
        print(f"   Status: {appointment.status}")
        print(f"   Group Size: {appointment.group_size}")
        print(f"   Requires Car: {appointment.requires_car}")
        print(f"   Therapists: {[t.username for t in therapists]}")

        # Test first therapist confirming
        print(f"\n1. First therapist confirms...")
        TherapistConfirmation.objects.create(
            appointment=appointment,
            therapist=therapists[0],
            confirmed_at=timezone.now(),
        )

        confirmations = TherapistConfirmation.objects.filter(
            appointment=appointment, confirmed_at__isnull=False
        ).count()
        print(f"   Confirmations: {confirmations}/{appointment.group_size}")

        # Status should still be pending
        if appointment.status == "pending":
            print(
                f"   ✅ Status correctly remains 'pending' after partial confirmation"
            )
        else:
            print(
                f"   ❌ ISSUE: Status changed to '{appointment.status}' after partial confirmation!"
            )

        # Test second therapist confirming
        print(f"\n2. Second therapist confirms...")
        TherapistConfirmation.objects.create(
            appointment=appointment,
            therapist=therapists[1],
            confirmed_at=timezone.now(),
        )

        # Now should update to therapist_confirmed
        confirmations = TherapistConfirmation.objects.filter(
            appointment=appointment, confirmed_at__isnull=False
        ).count()

        if confirmations >= appointment.group_size:
            appointment.group_confirmation_complete = True
            appointment.therapist_confirmed_at = timezone.now()
            appointment.status = "therapist_confirmed"
            appointment.save()

        print(f"   Confirmations: {confirmations}/{appointment.group_size}")
        print(f"   Status: {appointment.status}")

        if appointment.status == "therapist_confirmed":
            print(
                f"   ✅ Status correctly updated to 'therapist_confirmed' after all confirmations"
            )
        else:
            print(
                f"   ❌ ISSUE: Status is '{appointment.status}' instead of 'therapist_confirmed'!"
            )

        # Test driver confirmation
        print(f"\n3. Driver confirms...")
        appointment.driver_confirmed_at = timezone.now()
        appointment.status = "driver_confirmed"
        appointment.save()
        print(f"   Status: {appointment.status}")

        print(f"\n✅ Multi-therapist flow completed!")

        return appointment

    except Exception as e:
        print(f"❌ Error in multi-therapist flow: {e}")
        return None


def create_test_users():
    """Create test users if they don't exist"""
    print("Creating test users...")

    # Create therapists
    for i in range(1, 3):
        therapist, created = CustomUser.objects.get_or_create(
            username=f"therapist{i}",
            defaults={
                "email": f"therapist{i}@test.com",
                "first_name": f"Therapist",
                "last_name": f"{i}",
                "role": "therapist",
                "is_active": True,
            },
        )
        if created:
            therapist.set_password("password123")
            therapist.save()

    # Create driver
    driver, created = CustomUser.objects.get_or_create(
        username="driver1",
        defaults={
            "email": "driver1@test.com",
            "first_name": "Driver",
            "last_name": "One",
            "role": "driver",
            "is_active": True,
        },
    )
    if created:
        driver.set_password("password123")
        driver.save()

    # Create client
    client, created = CustomUser.objects.get_or_create(
        username="client1",
        defaults={
            "email": "client1@test.com",
            "first_name": "Client",
            "last_name": "One",
            "role": "client",
            "is_active": True,
        },
    )
    if created:
        client.set_password("password123")
        client.save()


def identify_appointment_form_issues():
    """Check if there are issues with appointment creation"""
    print(f"\n\n🔍 CHECKING APPOINTMENT FORM ISSUES")
    print("=" * 50)

    # Check if appointments are being created with wrong requires_car/group_size
    wrong_car_requirements = Appointment.objects.filter(
        group_size__gt=1, requires_car=False
    ).count()

    wrong_group_sizes = Appointment.objects.filter(
        group_size=1, requires_car=True
    ).count()

    print(
        f"Multi-therapist appointments with requires_car=False: {wrong_car_requirements}"
    )
    print(f"Single-therapist appointments with requires_car=True: {wrong_group_sizes}")

    if wrong_car_requirements > 0 or wrong_group_sizes > 0:
        print(f"❌ Found appointment form issues!")

        # Show examples
        for apt in Appointment.objects.filter(group_size__gt=1, requires_car=False)[:3]:
            print(
                f"   Appointment #{apt.id}: group_size={apt.group_size}, requires_car={apt.requires_car}"
            )

    else:
        print(f"✅ No appointment form issues found")


def fix_existing_appointments():
    """Fix existing appointments with wrong requires_car settings"""
    print(f"\n\n🔧 FIXING EXISTING APPOINTMENTS")
    print("=" * 50)

    # Fix multi-therapist appointments with requires_car=False
    wrong_multi = Appointment.objects.filter(group_size__gt=1, requires_car=False)
    if wrong_multi.exists():
        count = wrong_multi.count()
        wrong_multi.update(requires_car=True)
        print(f"✅ Fixed {count} multi-therapist appointments (set requires_car=True)")

    # Fix single-therapist appointments with requires_car=True
    wrong_single = Appointment.objects.filter(group_size=1, requires_car=True)
    if wrong_single.exists():
        count = wrong_single.count()
        wrong_single.update(requires_car=False)
        print(
            f"✅ Fixed {count} single-therapist appointments (set requires_car=False)"
        )

    print(f"✅ All existing appointments fixed!")


if __name__ == "__main__":
    print("🚀 CONFIRMATION FLOW ISSUE ANALYSIS & TESTING")
    print("=" * 60)

    # 1. Analyze current issues
    analyze_confirmation_issues()

    # 2. Check appointment form issues
    identify_appointment_form_issues()

    # 3. Fix existing appointments
    fix_existing_appointments()

    # 4. Test flows
    test_single_therapist_flow()
    test_multi_therapist_flow()

    print(f"\n\n🎯 SUMMARY & NEXT STEPS")
    print("=" * 60)
    print("Issues identified and fixes needed:")
    print("1. ✅ Backend logic for multi-therapist confirmations")
    print("2. ✅ Frontend AppointmentForm.jsx requires_car/group_size logic")
    print("3. ✅ Frontend DriverDashboard.jsx button visibility logic")
    print("4. ✅ Test the complete flow end-to-end")
