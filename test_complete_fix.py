#!/usr/bin/env python3
"""
Test the complete endpoint fix for appointment 14
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
from rest_framework.test import APIClient
from rest_framework.authtoken.models import Token


def main():
    try:
        # Get appointment 14
        appointment = Appointment.objects.get(id=14)
        print(f"=== Appointment {appointment.id} ===")
        print(f"Status: {appointment.status}")
        print(f"Single therapist: {appointment.therapist}")
        print(f"Multi therapists: {[t.username for t in appointment.therapists.all()]}")

        # Get a therapist assigned to this appointment
        assigned_therapists = appointment.therapists.all()
        if assigned_therapists:
            test_therapist = assigned_therapists[0]
            print(
                f"\nTesting with therapist: {test_therapist.username} (ID: {test_therapist.id})"
            )

            # Create API client and authenticate
            client = APIClient()
            client.force_authenticate(user=test_therapist)

            # Test the complete endpoint
            print(f"Testing complete endpoint...")
            response = client.post(
                f"/api/scheduling/appointments/{appointment.id}/complete/"
            )
            print(f"Response status: {response.status_code}")
            print(f"Response data: {response.data}")

            if response.status_code == 200:
                print("✅ SUCCESS: Multi-therapist permission fixed!")
                # Refresh appointment to see new status
                appointment.refresh_from_db()
                print(f"New status: {appointment.status}")
            else:
                print("❌ FAILED: Still permission issues")
        else:
            print("No assigned therapists found for this appointment")

    except Appointment.DoesNotExist:
        print("Appointment 14 does not exist")
    except Exception as e:
        print(f"Error: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
