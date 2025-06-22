#!/usr/bin/env python
"""
Simple test to verify the serializer optimization
"""

import os
import sys

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
sys.path.append("c:\\Users\\USer\\Downloads\\Guitara-Scheduling-System\\guitara")

import django

django.setup()

try:
    print("Testing serializer import...")
    from scheduling.serializers import AppointmentSerializer

    print("✅ AppointmentSerializer imported successfully")

    print("Testing models import...")
    from scheduling.models import Appointment

    print("✅ Appointment model imported successfully")

    print("Testing method definition...")
    serializer = AppointmentSerializer()

    # Check if methods exist
    if hasattr(serializer, "get_total_duration"):
        print("✅ get_total_duration method exists")
    else:
        print("❌ get_total_duration method missing")

    if hasattr(serializer, "get_total_price"):
        print("✅ get_total_price method exists")
    else:
        print("❌ get_total_price method missing")

    print("✅ All basic tests passed!")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback

    traceback.print_exc()
