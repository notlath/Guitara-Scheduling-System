"""
Database cleanup script for notifications.
This script identifies and fixes common notification database issues.
Usage: python manage.py shell < cleanup_notifications.py
"""

from django.contrib.auth import get_user_model
from scheduling.models import Notification, Appointment, AppointmentRejection
from django.db import transaction
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

print("=== Notification Database Cleanup ===")

try:
    with transaction.atomic():
        # Check for notifications with invalid user references
        invalid_user_notifications = Notification.objects.filter(user__isnull=True)
        invalid_user_count = invalid_user_notifications.count()

        if invalid_user_count > 0:
            print(f"Found {invalid_user_count} notifications with null user references")
            # Delete these orphaned notifications
            deleted_count = invalid_user_notifications.delete()[0]
            print(f"✓ Deleted {deleted_count} orphaned notifications (null user)")
        else:
            print("✓ No notifications with null user references found")

        # Check for notifications with invalid appointment references
        # Note: We can't directly filter for non-existent appointments in Django ORM easily,
        # so we'll iterate through notifications that have appointment references
        notifications_with_appointments = Notification.objects.filter(
            appointment__isnull=False
        )
        invalid_appointment_notifications = []

        print(
            f"Checking {notifications_with_appointments.count()} notifications with appointment references..."
        )

        for notification in notifications_with_appointments:
            try:
                # Try to access the appointment - this will raise DoesNotExist if invalid
                _ = notification.appointment.id
            except Appointment.DoesNotExist:
                invalid_appointment_notifications.append(notification)

        if invalid_appointment_notifications:
            print(
                f"Found {len(invalid_appointment_notifications)} notifications with invalid appointment references"
            )
            # Set appointment to null for these notifications instead of deleting them
            for notification in invalid_appointment_notifications:
                notification.appointment = None
                notification.save()
            print(
                f"✓ Fixed {len(invalid_appointment_notifications)} notifications with invalid appointment references"
            )
        else:
            print("✓ No notifications with invalid appointment references found")

        # Check for notifications with invalid rejection references
        notifications_with_rejections = Notification.objects.filter(
            rejection__isnull=False
        )
        invalid_rejection_notifications = []

        print(
            f"Checking {notifications_with_rejections.count()} notifications with rejection references..."
        )

        for notification in notifications_with_rejections:
            try:
                # Try to access the rejection - this will raise DoesNotExist if invalid
                _ = notification.rejection.id
            except AppointmentRejection.DoesNotExist:
                invalid_rejection_notifications.append(notification)

        if invalid_rejection_notifications:
            print(
                f"Found {len(invalid_rejection_notifications)} notifications with invalid rejection references"
            )
            # Set rejection to null for these notifications instead of deleting them
            for notification in invalid_rejection_notifications:
                notification.rejection = None
                notification.save()
            print(
                f"✓ Fixed {len(invalid_rejection_notifications)} notifications with invalid rejection references"
            )
        else:
            print("✓ No notifications with invalid rejection references found")

        # Check for notifications with empty or null messages
        empty_message_notifications = Notification.objects.filter(
            message__isnull=True
        ) | Notification.objects.filter(message="")
        empty_message_count = empty_message_notifications.count()

        if empty_message_count > 0:
            print(f"Found {empty_message_count} notifications with empty messages")
            # Fix these notifications by giving them a default message
            for notification in empty_message_notifications:
                notification.message = (
                    f"Notification ({notification.notification_type})"
                )
                notification.save()
            print(f"✓ Fixed {empty_message_count} notifications with empty messages")
        else:
            print("✓ No notifications with empty messages found")

        # Final statistics
        total_notifications = Notification.objects.count()
        notifications_per_user = {}

        for user in User.objects.all():
            user_notifications = Notification.objects.filter(user=user).count()
            if user_notifications > 0:
                notifications_per_user[user.username] = user_notifications

        print(f"\n=== Cleanup Summary ===")
        print(f"Total notifications in database: {total_notifications}")
        print(f"Users with notifications: {len(notifications_per_user)}")

        for username, count in notifications_per_user.items():
            print(f"  {username}: {count} notifications")

        print("✅ Database cleanup completed successfully")

except Exception as e:
    print(f"❌ Cleanup failed: {e}")
    import traceback

    traceback.print_exc()

print("=== Cleanup Complete ===")
