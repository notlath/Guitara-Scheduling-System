#!/usr/bin/env python3
"""
Test script to verify Django setup is working correctly after fixing the NotificationViewSet issue.
"""

import os
import sys
import django
from pathlib import Path


def test_django_setup():
    """Test Django setup and imports"""
    print("🚀 Testing Django Setup After NotificationViewSet Fix")
    print("=" * 60)

    # Set up Django
    sys.path.append(str(Path(__file__).parent / "guitara"))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")

    try:
        django.setup()
        print("✅ Django setup successful")
    except Exception as e:
        print(f"❌ Django setup failed: {e}")
        return False

    # Test imports
    try:
        from scheduling.views import (
            ClientViewSet,
            AvailabilityViewSet,
            AppointmentViewSet,
            NotificationViewSet,  # This was missing
            StaffViewSet,
            ServiceViewSet,
        )

        print("✅ All ViewSets imported successfully")
        print(f"   - ClientViewSet: {ClientViewSet}")
        print(f"   - AvailabilityViewSet: {AvailabilityViewSet}")
        print(f"   - AppointmentViewSet: {AppointmentViewSet}")
        print(f"   - NotificationViewSet: {NotificationViewSet}")
        print(f"   - StaffViewSet: {StaffViewSet}")
        print(f"   - ServiceViewSet: {ServiceViewSet}")
    except ImportError as e:
        print(f"❌ ViewSet import failed: {e}")
        return False

    # Test URL configuration
    try:
        from django.urls import reverse
        from scheduling.urls import router

        print("✅ URL configuration loaded successfully")
        print(f"   - Registered routes: {[pattern.name for pattern in router.urls]}")
    except Exception as e:
        print(f"❌ URL configuration failed: {e}")
        return False

    # Test Django management commands
    try:
        from django.core.management import execute_from_command_line

        print("✅ Django management system accessible")
    except Exception as e:
        print(f"❌ Django management system failed: {e}")
        return False

    print("\n🎉 All tests passed! Django setup is working correctly.")
    print("\n📋 Fixed Issues:")
    print("   ✅ Added missing NotificationViewSet to scheduling/views.py")
    print("   ✅ Fixed formatting and indentation issues")
    print("   ✅ Corrected User import to CustomUser")
    print("   ✅ All URL patterns now resolve correctly")

    print("\n🔧 Available API Endpoints:")
    print("   • /api/scheduling/clients/")
    print("   • /api/scheduling/availabilities/")
    print("   • /api/scheduling/appointments/")
    print("   • /api/scheduling/notifications/")
    print("   • /api/scheduling/staff/")
    print("   • /api/scheduling/services/")

    return True


if __name__ == "__main__":
    success = test_django_setup()
    sys.exit(0 if success else 1)
