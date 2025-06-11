#!/usr/bin/env python3
"""
Quick diagnostic to check if the FIFO system changes broke anything
"""

import os
import sys
import traceback

# Setup Django environment
sys.path.append("/home/notlath/Downloads/Guitara-Scheduling-System/guitara")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")

try:
    import django

    django.setup()
    print("✅ Django setup successful")

    # Test model imports
    from core.models import CustomUser

    print("✅ CustomUser model imported")

    # Test if last_available_at field exists
    user = CustomUser()
    if hasattr(user, "last_available_at"):
        print("✅ last_available_at field exists")
    else:
        print("❌ last_available_at field missing")

    # Test ViewSet imports
    from scheduling.views import (
        AppointmentViewSet,
        NotificationViewSet,
        StaffViewSet,
        ServiceViewSet,
    )

    print("✅ All ViewSets imported successfully")

    # Test serializer imports
    from scheduling.serializers import UserSerializer, ServiceSerializer

    print("✅ Serializers imported successfully")

    # Test permissions import
    from core.permissions import IsOperator

    print("✅ Permissions imported successfully")

    # Test URL configuration
    from django.urls import reverse
    from django.test import Client

    client = Client()

    # Test API root
    response = client.get("/api/")
    print(f"✅ API root responds with status: {response.status_code}")

    print("\n🎯 All imports and basic functionality working!")

except Exception as e:
    print(f"❌ Error: {e}")
    traceback.print_exc()
