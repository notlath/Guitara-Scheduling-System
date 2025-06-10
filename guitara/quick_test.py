#!/usr/bin/env python3
"""
Quick test to verify our confirmation flow changes work.
"""

import os
import sys
import django

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from scheduling.models import Appointment


def test_status_choices():
    """Test that our new status choices are available"""
    print("Testing status choices...")

    status_choices = dict(Appointment.STATUS_CHOICES)
    print(f"Available statuses: {list(status_choices.keys())}")

    # Check if our new status is available
    if "driver_confirmed" in status_choices:
        print("✓ 'driver_confirmed' status is available")
        print(f"✓ Display name: {status_choices['driver_confirmed']}")
    else:
        print("✗ 'driver_confirmed' status is missing!")
        return False

    return True


def test_model_fields():
    """Test that our new model fields exist"""
    print("\nTesting model fields...")

    # Check if started_at field exists
    if hasattr(Appointment, "started_at"):
        print("✓ 'started_at' field exists on Appointment model")
    else:
        print("✗ 'started_at' field is missing!")
        return False

    return True


def main():
    print("🧪 Quick Test: Confirmation Flow Changes")
    print("=" * 50)

    try:
        status_ok = test_status_choices()
        fields_ok = test_model_fields()

        if status_ok and fields_ok:
            print("\n✅ All tests passed! Changes are working correctly.")
            return True
        else:
            print("\n❌ Some tests failed!")
            return False

    except Exception as e:
        print(f"\n💥 Error during testing: {e}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
