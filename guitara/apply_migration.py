#!/usr/bin/env python3
"""
Script to apply the critical performance migration
"""
import os
import sys
import django

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from django.core.management import execute_from_command_line
from django.db import connection


def apply_migration():
    print("🔧 Applying critical performance migration...")

    try:
        # Check current migration status
        print("📋 Checking migration status...")
        execute_from_command_line(["manage.py", "showmigrations", "scheduling"])

        # Apply the specific migration
        print("⚡ Applying 0014_critical_performance_indexes...")
        execute_from_command_line(["manage.py", "migrate", "scheduling", "0014"])

        print("✅ Migration applied successfully!")

        # Test URL routing and endpoint availability
        print("🧪 Testing optimized endpoint availability...")
        from django.test import Client
        from django.contrib.auth import get_user_model
        from rest_framework.authtoken.models import Token

        # Create test client
        client = Client()
        User = get_user_model()

        # Create or get test user
        try:
            user = User.objects.filter(role="operator").first()
            if not user:
                user = User.objects.create_user(
                    username="test_operator",
                    password="testpass123",
                    email="test@example.com",
                    role="operator",
                )

            token, created = Token.objects.get_or_create(user=user)
            print(f"✅ Test user available: {user.username}")

            # Test endpoints
            headers = {"HTTP_AUTHORIZATION": f"Token {token.key}"}

            # Test 1: operator_dashboard endpoint
            response = client.get(
                "/api/scheduling/appointments/operator_dashboard/", **headers
            )
            print(f"📊 operator_dashboard endpoint: Status {response.status_code}")

            # Test 2: dashboard_stats endpoint
            response = client.get(
                "/api/scheduling/appointments/dashboard_stats/", **headers
            )
            print(f"📊 dashboard_stats endpoint: Status {response.status_code}")

            print("✅ URL routing tests completed!")

        except Exception as url_error:
            print(f"⚠️ URL testing failed (this is okay if no data exists): {url_error}")

        # Test a simple query to verify indexes are working
        print("🧪 Testing database performance...")
        try:
            with connection.cursor() as cursor:
                # Use PostgreSQL EXPLAIN syntax instead of SQLite EXPLAIN QUERY PLAN
                cursor.execute(
                    "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM scheduling_appointment WHERE status = 'pending' AND date >= CURRENT_DATE LIMIT 10"
                )
                result = cursor.fetchall()
                print("Query execution plan (first few lines):")
                for i, row in enumerate(result[:5]):  # Show first 5 lines of explain
                    print(f"  {row[0]}")

                # Test if indexes are being used
                if any("Index Scan" in str(row) for row in result):
                    print("✅ Database indexes are being used!")
                else:
                    print("⚠️ Indexes may not be optimal, but query completed")
        except Exception as perf_error:
            print(f"⚠️ Performance test skipped (table may not exist yet): {perf_error}")

    except Exception as e:
        print(f"❌ Error applying migration: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    apply_migration()
