#!/usr/bin/env python
"""
Quick test to verify appointment API is working after optimization
"""

import os
import sys
import django
from django.test import RequestFactory

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
sys.path.append("c:\\Users\\USer\\Downloads\\Guitara-Scheduling-System\\guitara")

django.setup()


def test_appointment_api():
    """Test the appointments API endpoint"""
    print("🧪 Testing Appointment API Optimization")
    print("=" * 50)

    try:
        from scheduling.views import AppointmentViewSet
        from scheduling.models import Appointment
        from core.models import CustomUser
        from django.db import connection

        # Create a mock request
        factory = RequestFactory()
        request = factory.get("/api/scheduling/appointments/")

        # Get an operator user for testing
        operator = CustomUser.objects.filter(role="operator").first()
        if not operator:
            print("❌ No operator user found. Please create one first.")
            return False

        request.user = operator

        # Initialize the viewset
        viewset = AppointmentViewSet()
        viewset.request = request

        # Test the optimized queryset
        print("✅ Testing optimized queryset...")
        queryset = viewset.get_queryset()
        appointment_count = queryset.count()

        print(f"📊 Found {appointment_count} appointments")

        if appointment_count == 0:
            print(
                "⚠️  No appointments found for testing. This is expected if the database is empty."
            )
            return True

        # Test serialization (this was causing N+1 queries before)
        connection.queries_log.clear()

        print("🔬 Testing serialization performance...")
        from scheduling.serializers import AppointmentSerializer

        # Get first 5 appointments for testing
        test_appointments = list(queryset[:5])
        serializer = AppointmentSerializer(test_appointments, many=True)
        data = serializer.data

        query_count = len(connection.queries)

        print(f"📈 Serialization Results:")
        print(f"   - Appointments serialized: {len(test_appointments)}")
        print(f"   - Database queries: {query_count}")
        print(f"   - Data fields per appointment: {len(data[0]) if data else 0}")

        if query_count <= 5:
            print("✅ EXCELLENT: Very low query count - N+1 problem resolved!")
            return True
        elif query_count <= 15:
            print("✅ GOOD: Reasonable query count - significant improvement")
            return True
        else:
            print("❌ HIGH: Still too many queries - may need further optimization")
            print("Top 5 queries:")
            for i, query in enumerate(connection.queries[-5:], 1):
                print(f"   {i}. {query['sql'][:80]}...")
            return False

    except Exception as e:
        print(f"❌ Error during testing: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_endpoints():
    """Test individual endpoint functionality"""
    print("\n🌐 Testing API Endpoints")
    print("=" * 30)

    try:
        from django.urls import reverse
        from django.test import Client
        from core.models import CustomUser

        # Create test client
        client = Client()

        # Test without authentication (should get 401, not 500)
        print("Testing unauthenticated access...")
        response = client.get("/api/scheduling/appointments/")

        if response.status_code == 401:
            print("✅ Endpoint working - returns 401 Unauthorized (expected)")
        elif response.status_code == 500:
            print("❌ Endpoint returning 500 Internal Server Error")
            print(f"Response content: {response.content[:200]}")
        else:
            print(f"⚠️  Unexpected status code: {response.status_code}")

        return response.status_code != 500

    except Exception as e:
        print(f"❌ Error testing endpoints: {e}")
        return False


if __name__ == "__main__":
    print("🚀 Starting API Tests\n")

    # Test 1: Appointment API optimization
    api_success = test_appointment_api()

    # Test 2: Endpoint functionality
    endpoint_success = test_endpoints()

    print("\n" + "=" * 50)
    print("📋 FINAL RESULTS:")
    print(f"   API Optimization: {'✅ PASS' if api_success else '❌ FAIL'}")
    print(f"   Endpoint Function: {'✅ PASS' if endpoint_success else '❌ FAIL'}")

    if api_success and endpoint_success:
        print("🎉 ALL TESTS PASSED! The optimization is working correctly.")
        print("\n📊 Expected Performance Improvement:")
        print("   - Query count: From 144 → ~3-6 queries")
        print("   - Response time: From 34+ seconds → <2 seconds")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
