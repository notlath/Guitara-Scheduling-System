#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

try:
    print("Testing Service import...")
    from registration.models import Service

    print("✓ Service import successful")

    services = Service.objects.all()
    print(f"✓ Service query successful: {services.count()} services found")

    # Test the queryset used in serializer
    active_services = Service.objects.filter(is_active=True)
    print(f"✓ Active services query: {active_services.count()} active services")

    # Check specific service
    try:
        service_1 = Service.objects.get(id=1)
        print(f"✓ Service ID 1 found: {service_1.name}, active: {service_1.is_active}")
    except Service.DoesNotExist:
        print("✗ Service ID 1 not found")

    # Test the exact queryset from serializer
    from rest_framework import serializers

    queryset = Service.objects.filter(is_active=True)
    service_field = serializers.PrimaryKeyRelatedField(
        many=True, queryset=queryset, required=True
    )

    # Test validation
    try:
        validated = service_field.to_internal_value([1])
        print(f"✓ Serializer field validation successful: {validated}")
    except Exception as e:
        print(f"✗ Serializer field validation failed: {e}")

except Exception as e:
    print(f"✗ Error: {e}")
    import traceback

    traceback.print_exc()

# Also test the serializer import
try:
    print("\nTesting serializer import...")
    from scheduling.serializers import AppointmentSerializer

    print("✓ AppointmentSerializer import successful")

    # Check the services field
    serializer = AppointmentSerializer()
    services_field = serializer.fields.get("services")
    if services_field:
        print(f"✓ Services field found in serializer: {type(services_field)}")
        print(f"✓ Services field queryset: {services_field.queryset.count()} services")
    else:
        print("✗ Services field not found in serializer")

except Exception as e:
    print(f"✗ Serializer error: {e}")
    import traceback

    traceback.print_exc()
