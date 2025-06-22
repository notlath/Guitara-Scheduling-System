#!/usr/bin/env python
"""
Performance comparison script - shows the difference between optimized and unoptimized queries
"""

import os
import sys
import django
import time
from django.db import connection

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
sys.path.append("c:\\Users\\USer\\Downloads\\Guitara-Scheduling-System\\guitara")

django.setup()

from scheduling.models import Appointment
from scheduling.serializers import AppointmentSerializer


def test_unoptimized_approach():
    """Test the old approach that would cause N+1 queries"""
    print("Testing UNOPTIMIZED approach (without prefetch_related)...")

    # Get appointments WITHOUT prefetch optimization
    queryset = Appointment.objects.select_related(
        "client", "therapist", "driver", "operator", "rejected_by"
    )  # No prefetch_related for services/therapists

    appointments = list(queryset[:5])  # Small sample for testing

    if not appointments:
        print("No appointments found for testing")
        return 0, 0

    # Reset query tracking
    connection.queries_log.clear()
    start_time = time.time()

    # This would cause N+1 queries with the old serializer methods
    # We'll simulate by manually calling the problematic code
    total_duration = 0
    total_price = 0

    for appointment in appointments:
        # This is what the old serializer methods were doing - causing N+1
        for service in appointment.services.all():  # Each call hits the database
            if service.duration:
                if hasattr(service.duration, "total_seconds"):
                    total_duration += service.duration.total_seconds()
                elif isinstance(service.duration, (int, float)):
                    total_duration += service.duration
            total_price += service.price

    end_time = time.time()
    queries_count = len(connection.queries)

    print(f"- Appointments processed: {len(appointments)}")
    print(f"- Database queries: {queries_count}")
    print(f"- Time taken: {(end_time - start_time)*1000:.2f}ms")

    return queries_count, end_time - start_time


def test_optimized_approach():
    """Test the new optimized approach"""
    print("\nTesting OPTIMIZED approach (with prefetch_related)...")

    # Get appointments WITH prefetch optimization (our fix)
    queryset = Appointment.objects.select_related(
        "client", "therapist", "driver", "operator", "rejected_by"
    ).prefetch_related("services", "therapists", "rejection_details")

    appointments = list(queryset[:5])  # Same sample size

    if not appointments:
        print("No appointments found for testing")
        return 0, 0

    # Reset query tracking
    connection.queries_log.clear()
    start_time = time.time()

    # Use the optimized serializer
    serializer = AppointmentSerializer(appointments, many=True)
    serialized_data = serializer.data

    end_time = time.time()
    queries_count = len(connection.queries)

    print(f"- Appointments processed: {len(appointments)}")
    print(f"- Database queries: {queries_count}")
    print(f"- Time taken: {(end_time - start_time)*1000:.2f}ms")
    print(f"- Successfully serialized: {len(serialized_data)} appointments")

    return queries_count, end_time - start_time


def main():
    print("Appointment Query Optimization Test")
    print("=" * 50)

    # Test both approaches
    unopt_queries, unopt_time = test_unoptimized_approach()
    opt_queries, opt_time = test_optimized_approach()

    print("\n" + "=" * 50)
    print("COMPARISON RESULTS:")
    print(f"Unoptimized: {unopt_queries} queries, {unopt_time*1000:.2f}ms")
    print(f"Optimized:   {opt_queries} queries, {opt_time*1000:.2f}ms")

    if unopt_queries > 0 and opt_queries > 0:
        query_improvement = ((unopt_queries - opt_queries) / unopt_queries) * 100
        time_improvement = ((unopt_time - opt_time) / unopt_time) * 100

        print(f"\nImprovement:")
        print(f"- Query reduction: {query_improvement:.1f}%")
        print(f"- Time reduction: {time_improvement:.1f}%")

        if query_improvement > 50:
            print("✅ EXCELLENT optimization!")
        elif query_improvement > 20:
            print("✅ GOOD optimization!")
        else:
            print("⚠️  Modest optimization")


if __name__ == "__main__":
    main()
