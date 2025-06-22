#!/usr/bin/env python
import os
import django
import sys

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
sys.path.append("c:\\Users\\USer\\Downloads\\Guitara-Scheduling-System\\guitara")
django.setup()

from scheduling.models import Appointment
from core.models import CustomUser

print("Testing basic models...")
print(f"Appointment count: {Appointment.objects.count()}")
print(f"User count: {CustomUser.objects.count()}")
print(f'Operator count: {CustomUser.objects.filter(role="operator").count()}')

# Test the AppointmentViewSet directly
try:
    from scheduling.views import AppointmentViewSet

    viewset = AppointmentViewSet()
    print("✅ AppointmentViewSet created successfully")

    # Test creating a request mock
    from django.test import RequestFactory

    factory = RequestFactory()
    request = factory.get("/api/scheduling/appointments/")

    # Get a user
    operator = CustomUser.objects.filter(role="operator").first()
    if operator:
        request.user = operator

        # Test get_queryset
        viewset.request = request
        queryset = viewset.get_queryset()
        print(f"✅ Queryset created successfully with {queryset.count()} items")

        # Test serialization
        from scheduling.serializers import AppointmentSerializer

        serializer = AppointmentSerializer(queryset[:1], many=True)
        data = serializer.data
        print(f"✅ Serialization successful, got {len(data)} items")

    else:
        print("❌ No operator user found")

except Exception as e:
    print(f"❌ Error with AppointmentViewSet: {e}")
    import traceback

    traceback.print_exc()
