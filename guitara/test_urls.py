#!/usr/bin/env python
"""Test script to verify what URLs are available for appointments"""

import os
import sys
import django

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from django.urls import reverse, NoReverseMatch
from scheduling.models import Appointment


def test_appointment_urls():
    print("🧪 Testing Appointment URLs")
    print("=" * 50)

    try:
        # Get an appointment to test with
        appointments = Appointment.objects.all()[:1]
        print(f"Found {Appointment.objects.count()} appointments total")

        if appointments:
            appointment = appointments[0]
            print(f"Testing with appointment ID: {appointment.id}")

            # List of action names to test
            actions = [
                "mark_awaiting_payment",
                "mark-awaiting-payment",
                "request_payment",
                "request-payment",
                "therapist_confirm",
                "therapist-confirm",
            ]

            print("\n🔍 Testing URL reverse lookups:")
            for action in actions:
                try:
                    url_name = f"appointment-{action}"
                    url = reverse(url_name, kwargs={"pk": appointment.id})
                    print(f"✅ {action}: {url}")
                except NoReverseMatch as e:
                    print(f"❌ {action}: URL pattern not found")

        else:
            print("❌ No appointments found in database")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    test_appointment_urls()
