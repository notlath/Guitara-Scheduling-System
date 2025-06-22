#!/usr/bin/env python3
"""
Performance test for optimized notification and staff endpoints
Tests the improvements made to /api/scheduling/notifications/ and /api/scheduling/staff/
"""

import os
import sys
import django
import time
import requests
from datetime import datetime

# Add the project directory to the Python path
project_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(project_dir, "guitara"))

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import connection, reset_queries
from scheduling.models import Notification, Appointment
from core.models import CustomUser

User = get_user_model()


class OptimizedEndpointTester:
    def __init__(self):
        self.client = Client()
        self.base_url = "http://127.0.0.1:8000"
        self.test_users = {}

    def setup_test_users(self):
        """Create test users for different roles"""
        print("Setting up test users...")

        # Create operator
        operator, created = CustomUser.objects.get_or_create(
            username="test_operator",
            defaults={
                "email": "operator@test.com",
                "first_name": "Test",
                "last_name": "Operator",
                "role": "operator",
                "is_active": True,
            },
        )
        if created:
            operator.set_password("testpass123")
            operator.save()
        self.test_users["operator"] = operator

        # Create therapist
        therapist, created = CustomUser.objects.get_or_create(
            username="test_therapist",
            defaults={
                "email": "therapist@test.com",
                "first_name": "Test",
                "last_name": "Therapist",
                "role": "therapist",
                "is_active": True,
            },
        )
        if created:
            therapist.set_password("testpass123")
            therapist.save()
        self.test_users["therapist"] = therapist

        # Create driver
        driver, created = CustomUser.objects.get_or_create(
            username="test_driver",
            defaults={
                "email": "driver@test.com",
                "first_name": "Test",
                "last_name": "Driver",
                "role": "driver",
                "is_active": True,
            },
        )
        if created:
            driver.set_password("testpass123")
            driver.save()
        self.test_users["driver"] = driver

        print(f"Test users ready: {list(self.test_users.keys())}")

    def create_test_notifications(self, user, count=50):
        """Create test notifications for performance testing"""
        print(f"Creating {count} test notifications for {user.username}...")

        notifications = []
        for i in range(count):
            notifications.append(
                Notification(
                    user=user,
                    message=f"Test notification {i+1} for performance testing",
                    notification_type="test",
                    is_read=(i % 3 == 0),  # Some read, some unread
                    created_at=timezone.now(),
                )
            )

        Notification.objects.bulk_create(notifications)
        print(f"Created {count} notifications for {user.username}")

    def login_user(self, role):
        """Login as specific user role"""
        user = self.test_users[role]
        logged_in = self.client.login(username=user.username, password="testpass123")
        if not logged_in:
            raise Exception(f"Failed to login as {role}")
        return user

    def test_notifications_endpoint(self, role):
        """Test notifications endpoint performance"""
        print(f"\n--- Testing Notifications Endpoint for {role.upper()} ---")

        user = self.login_user(role)

        # Create test notifications
        self.create_test_notifications(user, 50)

        # Reset query count
        reset_queries()
        start_time = time.time()

        # Make request to notifications endpoint
        response = self.client.get("/api/scheduling/notifications/")

        end_time = time.time()
        duration = end_time - start_time
        query_count = len(connection.queries)

        print(f"Response Status: {response.status_code}")
        print(f"Response Time: {duration:.3f} seconds")
        print(f"Database Queries: {query_count}")

        if response.status_code == 200:
            data = response.json()
            print(f"Notifications Count: {len(data.get('notifications', []))}")
            print(f"Unread Count: {data.get('unreadCount', 0)}")
            print(f"Total Count: {data.get('totalCount', 0)}")

            # Check response structure
            if "notifications" in data and len(data["notifications"]) > 0:
                first_notification = data["notifications"][0]
                print(f"First notification fields: {list(first_notification.keys())}")
        else:
            print(f"Error Response: {response.content}")

        return {
            "status_code": response.status_code,
            "duration": duration,
            "query_count": query_count,
            "success": response.status_code == 200,
        }

    def test_staff_endpoint(self, role):
        """Test staff endpoint performance"""
        print(f"\n--- Testing Staff Endpoint for {role.upper()} ---")

        self.login_user(role)

        # Reset query count
        reset_queries()
        start_time = time.time()

        # Make request to staff endpoint
        response = self.client.get("/api/scheduling/staff/")

        end_time = time.time()
        duration = end_time - start_time
        query_count = len(connection.queries)

        print(f"Response Status: {response.status_code}")
        print(f"Response Time: {duration:.3f} seconds")
        print(f"Database Queries: {query_count}")

        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print(f"Staff Count: {len(data)}")
                if len(data) > 0:
                    print(f"First staff member fields: {list(data[0].keys())}")
            elif "results" in data:
                print(f"Staff Count: {len(data['results'])}")
                if len(data["results"]) > 0:
                    print(
                        f"First staff member fields: {list(data['results'][0].keys())}"
                    )
        else:
            print(f"Error Response: {response.content}")

        return {
            "status_code": response.status_code,
            "duration": duration,
            "query_count": query_count,
            "success": response.status_code == 200,
        }

    def test_active_staff_endpoint(self, role):
        """Test the new active_staff endpoint"""
        print(f"\n--- Testing Active Staff Endpoint for {role.upper()} ---")

        self.login_user(role)

        # Reset query count
        reset_queries()
        start_time = time.time()

        # Make request to active staff endpoint
        response = self.client.get("/api/scheduling/staff/active_staff/")

        end_time = time.time()
        duration = end_time - start_time
        query_count = len(connection.queries)

        print(f"Response Status: {response.status_code}")
        print(f"Response Time: {duration:.3f} seconds")
        print(f"Database Queries: {query_count}")

        if response.status_code == 200:
            data = response.json()
            print(f"Active Staff Count: {len(data.get('staff', []))}")
            print(f"Total Count: {data.get('count', 0)}")
            print(f"Filter Applied: {data.get('filter', {})}")

            if "staff" in data and len(data["staff"]) > 0:
                first_staff = data["staff"][0]
                print(f"First staff member fields: {list(first_staff.keys())}")
        else:
            print(f"Error Response: {response.content}")

        return {
            "status_code": response.status_code,
            "duration": duration,
            "query_count": query_count,
            "success": response.status_code == 200,
        }

    def test_mark_all_read_endpoint(self, role):
        """Test the optimized mark_all_as_read endpoint"""
        print(f"\n--- Testing Mark All Read Endpoint for {role.upper()} ---")

        user = self.login_user(role)

        # Ensure there are unread notifications
        unread_count = Notification.objects.filter(user=user, is_read=False).count()
        print(f"Unread notifications before: {unread_count}")

        # Reset query count
        reset_queries()
        start_time = time.time()

        # Make request to mark all as read
        response = self.client.post("/api/scheduling/notifications/mark_all_as_read/")

        end_time = time.time()
        duration = end_time - start_time
        query_count = len(connection.queries)

        print(f"Response Status: {response.status_code}")
        print(f"Response Time: {duration:.3f} seconds")
        print(f"Database Queries: {query_count}")

        if response.status_code == 200:
            data = response.json()
            print(f"Response: {data.get('status', 'Unknown')}")

            # Verify the operation worked
            unread_count_after = Notification.objects.filter(
                user=user, is_read=False
            ).count()
            print(f"Unread notifications after: {unread_count_after}")
        else:
            print(f"Error Response: {response.content}")

        return {
            "status_code": response.status_code,
            "duration": duration,
            "query_count": query_count,
            "success": response.status_code == 200,
        }

    def run_performance_tests(self):
        """Run all performance tests"""
        print("=" * 60)
        print("OPTIMIZED ENDPOINT PERFORMANCE TESTS")
        print("=" * 60)

        self.setup_test_users()

        results = {}

        # Test each endpoint for each role
        for role in ["operator", "therapist", "driver"]:
            print(f"\n{'=' * 40}")
            print(f"TESTING FOR ROLE: {role.upper()}")
            print(f"{'=' * 40}")

            results[role] = {}

            # Test notifications endpoint
            results[role]["notifications"] = self.test_notifications_endpoint(role)

            # Test staff endpoint
            results[role]["staff"] = self.test_staff_endpoint(role)

            # Test active staff endpoint
            results[role]["active_staff"] = self.test_active_staff_endpoint(role)

            # Test mark all read endpoint
            results[role]["mark_all_read"] = self.test_mark_all_read_endpoint(role)

        return results

    def print_summary(self, results):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("PERFORMANCE TEST SUMMARY")
        print("=" * 60)

        for role, role_results in results.items():
            print(f"\n{role.upper()} ROLE:")
            print("-" * 30)

            for endpoint, result in role_results.items():
                status = "✅ PASS" if result["success"] else "❌ FAIL"
                print(
                    f"{endpoint:15} | {status} | {result['duration']:.3f}s | {result['query_count']} queries"
                )

        print(f"\n{'=' * 60}")
        print("OPTIMIZATION TARGETS:")
        print("- Notifications endpoint: < 1.0s, < 5 queries")
        print("- Staff endpoint: < 0.5s, < 3 queries")
        print("- Active staff endpoint: < 0.3s, < 2 queries")
        print("- Mark all read: < 0.2s, < 2 queries")
        print("=" * 60)


def main():
    """Main test function"""
    tester = OptimizedEndpointTester()

    try:
        results = tester.run_performance_tests()
        tester.print_summary(results)

        print("\n" + "=" * 60)
        print("TEST COMPLETED SUCCESSFULLY!")
        print("Check the performance metrics above to verify optimizations.")
        print("=" * 60)

    except Exception as e:
        print(f"\nTest failed with error: {e}")
        import traceback

        traceback.print_exc()
        return False

    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
