#!/usr/bin/env python
import os
import sys

# Add the project directory to Python path
project_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "guitara")
sys.path.append(project_dir)

# Set Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")

# Setup Django
import django

django.setup()

from core.models import CustomUser
from scheduling.models import Notification


def debug_notifications():
    print("=== NOTIFICATION DEBUG ===")

    # Check total counts
    total_users = CustomUser.objects.count()
    total_notifications = Notification.objects.count()

    print(f"Total users: {total_users}")
    print(f"Total notifications: {total_notifications}")
    print()

    # Check notifications per user
    print("Notifications per user:")
    for user in CustomUser.objects.all()[:10]:  # First 10 users
        notif_count = Notification.objects.filter(user=user).count()
        unread_count = Notification.objects.filter(user=user, is_read=False).count()
        print(
            f"  {user.username} ({user.role}): {notif_count} total, {unread_count} unread"
        )

    print()

    # Check notification types
    print("Notification types in database:")
    types = Notification.objects.values_list("notification_type", flat=True).distinct()
    for notif_type in types:
        count = Notification.objects.filter(notification_type=notif_type).count()
        print(f"  {notif_type}: {count}")

    print()

    # Check recent notifications
    print("Recent notifications (last 10):")
    recent_notifications = Notification.objects.all().order_by("-created_at")[:10]
    for notif in recent_notifications:
        print(
            f"  {notif.id}: {notif.notification_type} for {notif.user.username} ({notif.user.role}) - Read: {notif.is_read}"
        )

    print()

    # Test API endpoint simulation
    print("=== API ENDPOINT SIMULATION ===")
    from scheduling.views import NotificationViewSet
    from django.test import RequestFactory
    from django.contrib.auth.models import AnonymousUser

    factory = RequestFactory()

    # Test for different user roles
    for role in ["operator", "therapist", "driver"]:
        try:
            user = CustomUser.objects.filter(role=role).first()
            if user:
                print(f"\nTesting for {role} user: {user.username}")

                # Create mock request
                request = factory.get("/api/scheduling/notifications/")
                request.user = user

                # Create viewset
                viewset = NotificationViewSet()
                viewset.request = request
                viewset.format_kwarg = None

                # Test get_queryset
                queryset = viewset.get_queryset()
                print(f"  Queryset count: {queryset.count()}")

                # Test actual notifications
                notifications = list(queryset[:5])  # Get first 5
                print(f"  Sample notifications:")
                for notif in notifications:
                    print(f"    - {notif.notification_type}: {notif.message[:50]}...")

        except Exception as e:
            print(f"  Error testing {role}: {e}")


if __name__ == "__main__":
    debug_notifications()
