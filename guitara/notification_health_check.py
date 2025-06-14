"""
Comprehensive notification health check and diagnostic script.
This script tests all aspects of the notification system to identify issues.
Usage: python manage.py shell < notification_health_check.py
"""

from django.contrib.auth import get_user_model
from scheduling.models import Notification, Appointment
from scheduling.serializers import NotificationSerializer
from scheduling.views import NotificationViewSet
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from django.db import connection
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


def test_database_connection():
    """Test basic database connectivity"""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            return True, f"Database connection successful: {result}"
    except Exception as e:
        return False, f"Database connection failed: {e}"


def test_notification_model():
    """Test notification model operations"""
    try:
        # Test basic queries
        notification_count = Notification.objects.count()
        user_count = User.objects.count()

        # Test model creation if no notifications exist
        if notification_count == 0 and user_count > 0:
            test_user = User.objects.first()
            test_notification = Notification.objects.create(
                user=test_user,
                notification_type="appointment_created",
                message="Health check test notification",
                is_read=False,
            )
            return True, f"Created test notification {test_notification.id} for testing"

        return (
            True,
            f"Model operations successful. Found {notification_count} notifications for {user_count} users",
        )
    except Exception as e:
        return False, f"Model operations failed: {e}"


def test_notification_serializer():
    """Test notification serializer"""
    try:
        notifications = Notification.objects.all()[:5]  # Test first 5

        if not notifications:
            return True, "No notifications to test serializer with"

        # Test individual serialization
        for notification in notifications:
            try:
                serializer = NotificationSerializer(notification)
                data = serializer.data

                # Check required fields
                required_fields = [
                    "id",
                    "message",
                    "notification_type",
                    "is_read",
                    "created_at",
                ]
                for field in required_fields:
                    if field not in data:
                        return (
                            False,
                            f"Missing required field '{field}' in serialized data",
                        )

            except Exception as e:
                return False, f"Failed to serialize notification {notification.id}: {e}"

        # Test bulk serialization
        serializer = NotificationSerializer(notifications, many=True)
        bulk_data = serializer.data

        return True, f"Serializer test successful for {len(bulk_data)} notifications"
    except Exception as e:
        return False, f"Serializer test failed: {e}"


def test_notification_viewset():
    """Test notification viewset"""
    try:
        if User.objects.count() == 0:
            return False, "No users available to test viewset"

        test_user = User.objects.first()

        # Create mock request
        factory = APIRequestFactory()
        request = factory.get("/api/scheduling/notifications/")
        request.user = test_user
        django_request = Request(request)

        # Test viewset methods
        viewset = NotificationViewSet()
        viewset.request = django_request
        viewset.format_kwarg = None

        # Test get_queryset
        queryset = viewset.get_queryset()
        queryset_count = queryset.count()

        # Test list method
        response = viewset.list(django_request)

        if response.status_code != 200:
            return (
                False,
                f"ViewSet list method returned status {response.status_code}: {response.data}",
            )

        response_data = response.data
        if "notifications" not in response_data:
            return False, "Response missing 'notifications' key"

        return (
            True,
            f"ViewSet test successful. Queryset: {queryset_count}, Response notifications: {len(response_data['notifications'])}",
        )
    except Exception as e:
        return False, f"ViewSet test failed: {e}"


def test_notification_api_endpoint():
    """Test the actual API endpoint behavior"""
    try:
        from django.test import Client
        from django.contrib.auth import authenticate

        if User.objects.count() == 0:
            return False, "No users available to test API endpoint"

        # Get a test user
        test_user = User.objects.first()

        # Note: This is a simplified test - in a real scenario you'd need proper authentication
        # For now, we'll just test that the URL pattern is correctly configured
        from django.urls import reverse

        try:
            url = reverse(
                "notification-list"
            )  # This should exist if URLs are configured correctly
            return True, f"API endpoint URL configuration is correct: {url}"
        except:
            # Try alternative URL patterns
            try:
                from django.conf.urls import include
                from django.urls import resolve

                resolve("/api/scheduling/notifications/")
                return True, "API endpoint URL pattern is accessible"
            except:
                return (
                    False,
                    "API endpoint URL pattern not found or incorrectly configured",
                )

    except Exception as e:
        return False, f"API endpoint test failed: {e}"


def test_data_integrity():
    """Test notification data integrity"""
    try:
        issues = []

        # Check for orphaned notifications
        orphaned_users = Notification.objects.filter(user__isnull=True).count()
        if orphaned_users > 0:
            issues.append(f"{orphaned_users} notifications with null user references")

        # Check for invalid appointment references
        notifications_with_appointments = Notification.objects.filter(
            appointment__isnull=False
        )
        invalid_appointments = 0

        for notification in notifications_with_appointments[:10]:  # Check first 10
            try:
                _ = notification.appointment.id
            except:
                invalid_appointments += 1

        if invalid_appointments > 0:
            issues.append(
                f"At least {invalid_appointments} notifications with invalid appointment references"
            )

        # Check for empty messages
        empty_messages = (
            Notification.objects.filter(message__isnull=True).count()
            + Notification.objects.filter(message="").count()
        )
        if empty_messages > 0:
            issues.append(f"{empty_messages} notifications with empty messages")

        if issues:
            return False, f"Data integrity issues found: {'; '.join(issues)}"
        else:
            return True, "No data integrity issues found"

    except Exception as e:
        return False, f"Data integrity test failed: {e}"


def run_health_check():
    """Run comprehensive health check"""
    print("🏥 Starting Notification System Health Check...")
    print("=" * 60)

    tests = [
        ("Database Connection", test_database_connection),
        ("Notification Model", test_notification_model),
        ("Data Integrity", test_data_integrity),
        ("Notification Serializer", test_notification_serializer),
        ("Notification ViewSet", test_notification_viewset),
        ("API Endpoint Configuration", test_notification_api_endpoint),
    ]

    results = {}
    all_passed = True

    for test_name, test_func in tests:
        print(f"\n🔍 Running {test_name} test...")
        try:
            success, message = test_func()
            results[test_name] = (success, message)

            if success:
                print(f"   ✅ PASSED: {message}")
            else:
                print(f"   ❌ FAILED: {message}")
                all_passed = False

        except Exception as e:
            results[test_name] = (False, str(e))
            print(f"   ❌ FAILED with exception: {e}")
            all_passed = False

    print("\n" + "=" * 60)
    print("📊 HEALTH CHECK SUMMARY")
    print("=" * 60)

    for test_name, (success, message) in results.items():
        status_icon = "✅" if success else "❌"
        print(f"{status_icon} {test_name}: {message}")

    if all_passed:
        print("\n🎉 ALL TESTS PASSED! The notification system appears to be healthy.")
        print("   If you're still experiencing 500 errors, check:")
        print("   - Authentication/permissions")
        print("   - Network connectivity")
        print("   - Server logs for runtime errors")
    else:
        print(
            "\n⚠️  SOME TESTS FAILED. Address the issues above to fix the notification system."
        )
        print(
            "   You may want to run the cleanup script: python manage.py shell < cleanup_notifications.py"
        )

    print("\n🏁 Health check complete!")


# Run the health check
run_health_check()
