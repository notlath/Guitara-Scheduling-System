#!/usr/bin/env python
"""
Quick test to check notifications for user ID 25 (rco_gibaga)
"""

import os
import sys
import django

# Add the Django project directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), "guitara"))

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from core.models import CustomUser
from scheduling.models import Notification


def check_user_notifications():
    try:
        # Get user 25
        user = CustomUser.objects.get(id=25)
        print(f"User: {user.username} ({user.role})")

        # Get notifications for this user
        notifications = Notification.objects.filter(user=user)
        print(f"Total notifications: {notifications.count()}")

        if notifications.exists():
            print("\nRecent notifications:")
            for n in notifications.order_by("-created_at")[:5]:
                print(f"  {n.id}: {n.notification_type} - {n.message[:50]}...")
        else:
            print("No notifications found for this user")

            # Create a test notification
            print("Creating a test notification...")
            test_notification = Notification.objects.create(
                user=user,
                notification_type="system_test",
                message="Test notification created for debugging frontend issue",
                is_read=False,
            )
            print(f"Created test notification with ID: {test_notification.id}")

    except CustomUser.DoesNotExist:
        print("User with ID 25 does not exist")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    check_user_notifications()
