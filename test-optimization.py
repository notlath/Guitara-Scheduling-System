#!/usr/bin/env python
"""
Test script to verify the N+1 query optimization for the appointments endpoint.
This script simulates the appointments API call and counts database queries.
"""

import os
import sys
import django
from django.db import connection
from django.test.utils import override_settings

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
sys.path.append("c:\\Users\\USer\\Downloads\\Guitara-Scheduling-System\\guitara")

django.setup()

from scheduling.models import Appointment
from scheduling.serializers import AppointmentSerializer
from scheduling.views import AppointmentViewSet
from django.test import RequestFactory
from core.models import CustomUser


def test_appointment_queries():
    """Test the appointment serialization with query counting"""

    # Reset query log
    connection.queries_log.clear()

    print("Testing Appointment API query optimization...")
    print("-" * 50)

    # Get the optimized queryset (same as in the view)
    queryset = Appointment.objects.select_related(
        "client", "therapist", "driver", "operator", "rejected_by"
    ).prefetch_related("services", "therapists", "rejection_details")

    # Count appointments
    appointment_count = queryset.count()
    print(f"Total appointments: {appointment_count}")

    if appointment_count == 0:
        print("No appointments found. Creating test data would be needed.")
        return

    # Get first 10 appointments to test
    appointments = list(queryset[:10])

    # Reset query count after fetching
    initial_queries = len(connection.queries)
    connection.queries_log.clear()

    print(f"Fetched {len(appointments)} appointments for testing")
    print(f"Starting serialization test...")

    # Serialize the appointments (this is what causes N+1 issues)
    serializer = AppointmentSerializer(appointments, many=True)
    serialized_data = serializer.data

    # Count queries used during serialization
    serialization_queries = len(connection.queries)

    print(f"\nSerialization Results:")
    print(f"- Appointments serialized: {len(appointments)}")
    print(f"- Database queries during serialization: {serialization_queries}")
    print(f"- Expected optimal queries: ~1-2 (should be minimal due to prefetch)")

    if serialization_queries <= 3:
        print("✅ EXCELLENT: Very few queries used - optimization working!")
    elif serialization_queries <= 10:
        print("⚠️  GOOD: Low query count - some optimization working")
    else:
        print("❌ POOR: High query count - N+1 problem likely still exists")

    # Show the queries if there are issues
    if serialization_queries > 5:
        print(f"\nQueries executed during serialization:")
        for i, query in enumerate(connection.queries[-serialization_queries:], 1):
            print(f"{i}. {query['sql'][:100]}...")

    print(f"\nTotal fields serialized per appointment:")
    if serialized_data:
        sample_appointment = serialized_data[0]
        print(f"- Fields: {len(sample_appointment)} fields per appointment")
        print(f"- Includes services, client details, therapist details, etc.")


if __name__ == "__main__":
    test_appointment_queries()
