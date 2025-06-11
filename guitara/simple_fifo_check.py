#!/usr/bin/env python3
"""
Simple test to check Django setup and FIFO implementation
"""

import os
import sys

# Setup Django environment
sys.path.append("/home/notlath/Downloads/Guitara-Scheduling-System/guitara")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")

import django
from django.conf import settings

django.setup()

print("✅ Django setup successful")
print(f"   Settings module: {settings.SETTINGS_MODULE}")

from core.models import CustomUser

print("✅ CustomUser model imported")

# Check if last_available_at field exists
try:
    user = CustomUser.objects.first()
    if user:
        print(f"✅ Found user: {user.username}")
        print(f"✅ last_available_at field: {hasattr(user, 'last_available_at')}")
        print(f"   Current value: {user.last_available_at}")
    else:
        print("ℹ️  No users found in database")
except Exception as e:
    print(f"❌ Error accessing users: {e}")

# Check if the FIFO methods exist
try:
    from scheduling.views import AppointmentViewSet

    viewset = AppointmentViewSet()

    has_fifo_method = hasattr(viewset, "_get_next_available_driver_fifo")
    has_update_method = hasattr(viewset, "update_driver_availability")
    has_position_method = hasattr(viewset, "_get_driver_fifo_position")

    print(f"✅ _get_next_available_driver_fifo method: {has_fifo_method}")
    print(f"✅ update_driver_availability method: {has_update_method}")
    print(f"✅ _get_driver_fifo_position method: {has_position_method}")

except Exception as e:
    print(f"❌ Error checking methods: {e}")

print("\n🎯 Basic FIFO system check completed!")
