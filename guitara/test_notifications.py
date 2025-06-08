#!/usr/bin/env python
"""
Test script to check notification creation and assignment for all user roles.
"""
import os
import sys
import django

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from django.contrib.auth import get_user_model
from core.models import CustomUser
from scheduling.models import Appointment, Notification
from django.utils import timezone
from datetime import datetime, timedelta

User = get_user_model()


def print_separator(title):
    print("\n" + "=" * 60)
    print(f" {title}")
    print("=" * 60)


def check_users():
    """Check existing users and their roles"""
    print_separator("CHECKING USERS AND ROLES")

    users = CustomUser.objects.all()
    print(f"Total users: {users.count()}")

    role_counts = {}
    for user in users:
        role = user.role
        role_counts[role] = role_counts.get(role, 0) + 1
        print(f"- {user.username} ({user.email}) - Role: {role}")

    print(f"\nRole distribution:")
    for role, count in role_counts.items():
        print(f"- {role}: {count} users")

    return users


def check_appointments():
    """Check existing appointments"""
    print_separator("CHECKING APPOINTMENTS")

    appointments = Appointment.objects.all().order_by("-created_at")[:10]
    print(f"Total appointments: {Appointment.objects.count()}")
    print(f"Showing last 10 appointments:")

    for apt in appointments:
        print(f"- ID: {apt.id}")
        print(f"  Client: {apt.client}")
        print(f"  Date: {apt.date}")
        print(f"  Time: {apt.start_time} - {apt.end_time}")
        print(f"  Therapist: {apt.therapist.username if apt.therapist else 'None'}")
        print(f"  Driver: {apt.driver.username if apt.driver else 'None'}")
        print(f"  Status: {apt.status}")
        print(f"  Created: {apt.created_at}")
        print()

    return appointments


def check_notifications():
    """Check existing notifications"""
    print_separator("CHECKING NOTIFICATIONS")

    notifications = Notification.objects.all().order_by("-created_at")[:20]
    print(f"Total notifications: {Notification.objects.count()}")
    print(f"Showing last 20 notifications:")

    notification_by_user = {}
    for notif in notifications:
        username = notif.user.username
        if username not in notification_by_user:
            notification_by_user[username] = []
        notification_by_user[username].append(notif)

    for username, user_notifications in notification_by_user.items():
        user = user_notifications[0].user
        print(f"\n{username} ({user.role}) - {len(user_notifications)} notifications:")
        for notif in user_notifications[:5]:  # Show first 5
            print(f"  - {notif.notification_type}")
            print(f"    Message: {notif.message}")
            print(f"    Read: {notif.is_read}")
            print(f"    Created: {notif.created_at}")

    return notifications


def check_notification_creation_logic():
    """Test the notification creation logic"""
    print_separator("TESTING NOTIFICATION CREATION")

    # Get users for each role
    try:
        operator = CustomUser.objects.filter(role="operator").first()
        therapist = CustomUser.objects.filter(role="therapist").first()
        driver = CustomUser.objects.filter(role="driver").first()

        print(f"Found users:")
        print(f"- Operator: {operator.username if operator else 'None'}")
        print(f"- Therapist: {therapist.username if therapist else 'None'}")
        print(f"- Driver: {driver.username if driver else 'None'}")

        if not all([operator, therapist, driver]):
            print(
                "\nERROR: Missing users for some roles. Cannot test notification creation."
            )
            return

        # Check if there are any appointments to analyze
        recent_appointments = Appointment.objects.filter(
            created_at__gte=timezone.now() - timedelta(days=7)
        )

        print(f"\nRecent appointments (last 7 days): {recent_appointments.count()}")

        if recent_appointments.exists():
            for apt in recent_appointments[:3]:
                print(f"\nAnalyzing appointment {apt.id}:")
                print(f"- Client: {apt.client}")
                print(
                    f"- Therapist: {apt.therapist.username if apt.therapist else 'None'}"
                )
                print(f"- Driver: {apt.driver.username if apt.driver else 'None'}")

                # Check notifications for this appointment
                apt_notifications = Notification.objects.filter(
                    appointment=apt
                ).order_by("-created_at")

                print(f"- Related notifications: {apt_notifications.count()}")
                for notif in apt_notifications:
                    print(
                        f"  * {notif.user.username} ({notif.user.role}): {notif.notification_type}"
                    )

    except Exception as e:
        print(f"Error testing notification creation: {e}")


def analyze_notification_patterns():
    """Analyze notification patterns by role"""
    print_separator("NOTIFICATION PATTERNS BY ROLE")

    roles = ["operator", "therapist", "driver"]

    for role in roles:
        users = CustomUser.objects.filter(role=role)
        total_notifications = 0
        unread_notifications = 0

        for user in users:
            user_notifications = Notification.objects.filter(user=user)
            user_unread = user_notifications.filter(is_read=False)
            total_notifications += user_notifications.count()
            unread_notifications += user_unread.count()

        print(f"\n{role}:")
        print(f"- Users: {users.count()}")
        print(f"- Total notifications: {total_notifications}")
        print(f"- Unread notifications: {unread_notifications}")

        if users.exists():
            avg_notifications = total_notifications / users.count()
            print(f"- Average notifications per user: {avg_notifications:.1f}")


def main():
    """Main test function"""
    print("NOTIFICATION SYSTEM TEST")
    print(f"Test run at: {timezone.now()}")

    try:
        users = check_users()
        appointments = check_appointments()
        notifications = check_notifications()
        check_notification_creation_logic()
        analyze_notification_patterns()

        print_separator("TEST SUMMARY")
        print(f"+ Users checked: {users.count()}")
        print(f"+ Appointments checked: {appointments.count()}")
        print(f"+ Notifications checked: {notifications.count()}")
        print("\nTest completed successfully!")

    except Exception as e:
        print(f"Error during test: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
