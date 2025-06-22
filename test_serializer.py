#!/usr/bin/env python
"""
Test script to diagnose serializer issues
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
sys.path.append("c:\\Users\\USer\\Downloads\\Guitara-Scheduling-System\\guitara")

django.setup()

from scheduling.models import Appointment
from scheduling.serializers import AppointmentSerializer
from django.db import connection


def test_appointment_serialization():
    print("Testing appointment serialization...")

    try:
        # Get appointments with optimized queryset
        appointments = Appointment.objects.select_related(
            "client", "therapist", "driver", "operator", "rejected_by"
        ).prefetch_related("services", "therapists", "rejection_details")[:3]

        print(f"Found {len(appointments)} appointments")

        if appointments:
            # Reset query tracking
            connection.queries_log.clear()

            # Try to serialize appointments
            serializer = AppointmentSerializer(appointments, many=True)
            data = serializer.data

            queries_count = len(connection.queries)
            print(f"Serialization successful!")
            print(f"Database queries during serialization: {queries_count}")
            print(f"Serialized {len(data)} appointments")

            # Show sample data structure
            if data:
                sample = data[0]
                print(f"Sample appointment keys: {list(sample.keys())}")
                print(f"Total duration: {sample.get('total_duration')}")
                print(f"Total price: {sample.get('total_price')}")
        else:
            print("No appointments found in database")

    except Exception as e:
        print(f"Error during serialization: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    test_appointment_serialization()
