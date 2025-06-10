#!/usr/bin/env python3
"""
Quick debug script to check appointment 14 permissions
"""
import os
import sys
import django

# Add the parent directory to Python path
sys.path.append("/home/notlath/Downloads/Guitara-Scheduling-System/guitara")

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from scheduling.models import Appointment
from core.models import CustomUser


def main():
    try:
        # Get appointment 14
        appointment = Appointment.objects.get(id=14)
        print(f"=== Appointment {appointment.id} Debug ===")
        print(f"Status: {appointment.status}")
        print(f"Single therapist: {appointment.therapist}")
        print(
            f"Single therapist ID: {appointment.therapist.id if appointment.therapist else None}"
        )
        print(f"Multi therapists: {list(appointment.therapists.all())}")
        print(f"Multi therapist IDs: {[t.id for t in appointment.therapists.all()]}")
        print(f"Driver: {appointment.driver}")
        print(f"Driver ID: {appointment.driver.id if appointment.driver else None}")
        print(f"Operator: {appointment.operator}")
        print(f"Group size: {appointment.group_size}")
        print(f"Requires car: {appointment.requires_car}")

        # Check current user from session
        print(f"\n=== Available Users ===")
        therapists = CustomUser.objects.filter(role="therapist")
        for t in therapists:
            print(f"Therapist: {t.username} (ID: {t.id})")

        print(f"\n=== Permission Check ===")
        # Check if this is a multi-therapist appointment
        if appointment.therapists.exists():
            print("This is a MULTI-THERAPIST appointment")
            print(
                "The 'complete' endpoint only checks appointment.therapist (single), not appointment.therapists (multi)"
            )
        else:
            print("This is a SINGLE-THERAPIST appointment")

    except Appointment.DoesNotExist:
        print("Appointment 14 does not exist")
    except Exception as e:
        print(f"Error: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
