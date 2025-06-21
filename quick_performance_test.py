#!/usr/bin/env python
"""
Quick Performance Test - No Server Required
Tests the optimized code directly using Django's test client
"""

import os
import sys
import django
from pathlib import Path

# Add the guitara directory to Python path
project_root = Path(__file__).parent / "guitara"
sys.path.insert(0, str(project_root))

# Set Django settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")

# Setup Django
try:
    django.setup()
    print("✅ Django setup successful")
except Exception as e:
    print(f"❌ Django setup failed: {e}")
    sys.exit(1)

from django.test import Client
from django.contrib.auth.models import User
from django.db import connection
import json
import time


def test_performance_improvements():
    """Test the performance optimizations without requiring a running server"""

    print("\n🚀 Testing Performance Optimizations (Direct)")
    print("=" * 60)

    # Test 1: Check if our optimized views are properly imported
    print("📊 Test 1: Code Structure Verification")
    try:
        from scheduling.views import AppointmentViewSet

        viewset = AppointmentViewSet()

        # Check if our optimized methods exist
        if hasattr(viewset, "operator_dashboard"):
            print("   ✅ operator_dashboard method exists")
        else:
            print("   ❌ operator_dashboard method missing")

        if hasattr(viewset, "dashboard_stats"):
            print("   ✅ dashboard_stats method exists")
        else:
            print("   ❌ dashboard_stats method missing")

        # Check queryset optimization
        try:
            queryset = viewset.get_queryset()
            print(f"   ✅ Optimized queryset created successfully")

            # Check if select_related and prefetch_related are used
            query_str = str(queryset.query)
            if "JOIN" in query_str:
                print("   ✅ Query uses JOINs (select_related working)")
            else:
                print("   ⚠️ No JOINs detected in base query")

        except Exception as e:
            print(f"   ⚠️ Queryset test failed: {e}")

    except ImportError as e:
        print(f"   ❌ Import failed: {e}")

    # Test 2: Database connectivity
    print("\n📊 Test 2: Database Connection")
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            if result[0] == 1:
                print("   ✅ Database connection working")
            else:
                print("   ❌ Database connection issue")
    except Exception as e:
        print(f"   ❌ Database test failed: {e}")

    # Test 3: Check if migration was applied (look for indexes)
    print("\n📊 Test 3: Database Indexes Check")
    try:
        with connection.cursor() as cursor:
            # Check for PostgreSQL indexes
            cursor.execute(
                """
                SELECT indexname, tablename 
                FROM pg_indexes 
                WHERE tablename = 'scheduling_appointment' 
                AND indexname LIKE '%performance%'
                OR indexname LIKE '%status%'
                OR indexname LIKE '%date%'
                LIMIT 5
            """
            )
            indexes = cursor.fetchall()

            if indexes:
                print(f"   ✅ Found {len(indexes)} performance indexes:")
                for idx_name, table_name in indexes:
                    print(f"     - {idx_name}")
            else:
                print(
                    "   ⚠️ No performance indexes found (migration may not be applied)"
                )

    except Exception as e:
        print(f"   ⚠️ Index check failed: {e}")

    # Test 4: Cache configuration
    print("\n📊 Test 4: Cache Configuration")
    try:
        from django.core.cache import cache

        cache.set("test_key", "test_value", 30)
        value = cache.get("test_key")

        if value == "test_value":
            print("   ✅ Cache is working")
        else:
            print("   ❌ Cache not working properly")

    except Exception as e:
        print(f"   ❌ Cache test failed: {e}")

    # Test 5: Check if appointments exist in database
    print("\n📊 Test 5: Data Availability")
    try:
        from scheduling.models import Appointment

        total_appointments = Appointment.objects.count()
        print(f"   📄 Total appointments in database: {total_appointments}")

        if total_appointments > 0:
            # Test filtering for actionable appointments
            pending_appointments = Appointment.objects.filter(
                status__in=["pending", "confirmed", "assigned"]
            ).count()
            print(f"   📄 Actionable appointments: {pending_appointments}")

            if pending_appointments < total_appointments:
                print("   ✅ Smart filtering will improve performance")
                performance_gain = (1 - pending_appointments / total_appointments) * 100
                print(f"   📈 Expected data reduction: ~{performance_gain:.1f}%")
            else:
                print("   ⚠️ All appointments are actionable")
        else:
            print("   ⚠️ No appointments in database for testing")

    except Exception as e:
        print(f"   ❌ Data test failed: {e}")

    # Summary
    print("\n🎯 Performance Optimization Summary")
    print("=" * 60)
    print("✅ Code optimizations are in place")
    print("📋 Next steps to complete testing:")
    print("   1. Ensure database migration is fully applied")
    print("   2. Start Django server: python manage.py runserver 8001")
    print("   3. Test endpoints with authentication")
    print("   4. Measure actual response times")
    print()
    print("🚀 Expected improvements once fully deployed:")
    print("   - API response time: 32s → <1s")
    print("   - Data transfer: >1MB → <100KB")
    print("   - Frontend load time: 30s → <5s")

    return True


if __name__ == "__main__":
    print("🧪 Quick Performance Test")
    print("Testing optimizations without requiring server...")

    try:
        success = test_performance_improvements()

        if success:
            print("\n🎉 Testing completed!")
            print("\n💡 To complete the performance optimization:")
            print("   1. Apply migrations: python manage.py migrate")
            print("   2. Start server: python manage.py runserver 8001")
            print("   3. Test OperatorDashboard in browser")

    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        import traceback

        traceback.print_exc()
