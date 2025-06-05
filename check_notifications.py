#!/usr/bin/env python
"""
Quick test to check notifications in the database
"""
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "guitara"))

# Set the Django settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")

# Setup Django
django.setup()

from scheduling.models import Notification
from core.models import CustomUser


def main():
    print("=== Checking Notifications in Database ===")

    # Check how many notifications exist
    total_notifications = Notification.objects.count()
    print(f"Total notifications in database: {total_notifications}")

    if total_notifications > 0:
        print("\nSample notifications:")
        for notification in Notification.objects.all()[:5]:
            print(f"ID: {notification.id}")
            print(
                f"User: {notification.user.username if notification.user else 'None'}"
            )
            print(f"Type: {notification.notification_type}")
            print(f"Message: {notification.message}")
            print(f"Read: {notification.is_read}")
            print(f"Created: {notification.created_at}")
            print("-" * 40)

    # Check users
    users = CustomUser.objects.all()
    print(f"\nTotal users: {users.count()}")
    for user in users:
        user_notifications = Notification.objects.filter(user=user).count()
        print(f"User {user.username}: {user_notifications} notifications")


if __name__ == "__main__":
    main()
