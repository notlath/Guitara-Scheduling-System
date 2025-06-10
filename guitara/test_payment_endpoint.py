#!/usr/bin/env python
"""Test script to verify payment request endpoint exists"""

import os
import sys
import django

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from django.urls import reverse
from scheduling.models import Appointment, CustomUser
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model


def test_payment_endpoint():
    print("🧪 Testing Payment Endpoint Availability")
    print("=" * 50)

    try:
        # Check if we have any appointments
        appointments = Appointment.objects.all()[:1]
        print(f"Found {Appointment.objects.count()} appointments in database")

        if appointments:
            appointment = appointments[0]
            print(f"Testing with appointment ID: {appointment.id}")
            print(f"Current status: {appointment.status}")

            # Try to construct the URL
            try:
                url = reverse(
                    "appointment-mark-awaiting-payment", kwargs={"pk": appointment.id}
                )
                print(f"✅ URL can be constructed: {url}")
            except Exception as e:
                print(f"❌ URL construction failed: {e}")

                # Let's list all available appointment URLs
                print("Available appointment URLs:")
                from django.urls import get_resolver

                resolver = get_resolver()

                for pattern in resolver.url_patterns:
                    if hasattr(pattern, "url_patterns"):
                        for subpattern in pattern.url_patterns:
                            if hasattr(subpattern, "url_patterns"):
                                for subsubpattern in subpattern.url_patterns:
                                    if "appointment" in str(subsubpattern.pattern):
                                        print(f"  - {subsubpattern.pattern}")

        else:
            print("❌ No appointments found in database")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    test_payment_endpoint()
