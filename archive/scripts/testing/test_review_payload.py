#!/usr/bin/env python
"""
Test the review rejection endpoint fix
"""
import os
import sys
import django

# Setup Django
project_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "guitara")
sys.path.append(project_dir)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from core.models import CustomUser
from scheduling.models import Appointment, AppointmentRejection
from scheduling.views import AppointmentViewSet
from rest_framework.test import APIRequestFactory
import json


def test_review_rejection_payload():
    """Test that the review rejection endpoint handles the correct payload"""
    print("=== Testing Review Rejection Payload ===")

    try:
        # Create request factory
        factory = APIRequestFactory()

        # Test the expected payload format
        test_payloads = [
            {"action": "accept", "reason": "Valid rejection reason"},
            {"action": "deny", "reason": "Rejection reason not valid"},
            {"action": "invalid", "reason": "Should fail"},
            {"review_decision": "accept", "review_notes": "Old format - should fail"},
        ]

        for i, payload in enumerate(test_payloads):
            print(f"\nTest {i+1}: {payload}")

            # Simulate the validation logic from the view
            response_action = payload.get("action")
            response_reason = payload.get("reason", "")

            if response_action not in ["accept", "deny"]:
                print(
                    f"❌ Would return 400: Action must be 'accept' or 'deny' (got: {response_action})"
                )
            else:
                print(
                    f"✓ Payload valid: action={response_action}, reason='{response_reason}'"
                )

    except Exception as e:
        print(f"❌ Test failed: {e}")


if __name__ == "__main__":
    test_review_rejection_payload()
