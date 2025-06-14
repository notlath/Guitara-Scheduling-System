"""
Simple Django management command to diagnose notification issues.
Usage: python manage.py shell < notification_debug.py
"""

from django.contrib.auth import get_user_model
from scheduling.models import Notification
from scheduling.serializers import NotificationSerializer
import traceback

User = get_user_model()

print("=== Notification Backend Diagnostic ===")

try:
    # Test 1: Check database connectivity
    user_count = User.objects.count()
    print(f"✓ Users in database: {user_count}")

    notification_count = Notification.objects.count()
    print(f"✓ Notifications in database: {notification_count}")

    # Test 2: Check for first user
    if user_count > 0:
        first_user = User.objects.first()
        print(f"✓ First user: {first_user.username} (ID: {first_user.id})")

        # Test 3: Query notifications for user
        user_notifications = Notification.objects.filter(user=first_user)
        user_notification_count = user_notifications.count()
        print(f"✓ Notifications for user: {user_notification_count}")

        # Test 4: Try to serialize a few notifications
        if user_notification_count > 0:
            sample_notifications = user_notifications[:3]
            print(f"✓ Sample notifications found: {len(sample_notifications)}")

            for i, notification in enumerate(sample_notifications):
                try:
                    print(f"  Notification {i+1}:")
                    print(f"    ID: {notification.id}")
                    print(f"    Type: {notification.notification_type}")
                    print(f"    Message: {notification.message[:50]}...")
                    print(f"    User: {notification.user}")
                    print(f"    Appointment: {notification.appointment}")
                    print(f"    Rejection: {notification.rejection}")
                    print(f"    Created: {notification.created_at}")

                    # Try to serialize individual notification
                    serializer = NotificationSerializer(notification)
                    serialized_data = serializer.data
                    print(
                        f"    ✓ Serialization successful, keys: {list(serialized_data.keys())}"
                    )

                except Exception as e:
                    print(f"    ✗ Error with notification {notification.id}: {e}")
                    traceback.print_exc()

            # Test 5: Try bulk serialization
            try:
                serializer = NotificationSerializer(sample_notifications, many=True)
                bulk_data = serializer.data
                print(f"✓ Bulk serialization successful: {len(bulk_data)} items")
            except Exception as e:
                print(f"✗ Bulk serialization failed: {e}")
                traceback.print_exc()

        else:
            print("  No notifications found for user")
    else:
        print("  No users found in database")

    # Test 6: Check for orphaned relationships
    print("\n=== Checking for data integrity issues ===")

    # Check for notifications with invalid user references
    try:
        invalid_user_refs = Notification.objects.filter(user__isnull=True).count()
        print(f"✓ Notifications with null user: {invalid_user_refs}")
    except Exception as e:
        print(f"✗ Error checking user references: {e}")

    # Check for notifications with invalid appointment references
    try:
        notifications_with_appointments = Notification.objects.filter(
            appointment__isnull=False
        )
        print(
            f"✓ Notifications with appointments: {notifications_with_appointments.count()}"
        )

        # Test a few to see if appointments exist
        for notification in notifications_with_appointments[:3]:
            try:
                appointment = notification.appointment
                print(
                    f"  Notification {notification.id} -> Appointment {appointment.id} ({appointment.status})"
                )
            except Exception as e:
                print(
                    f"  ✗ Notification {notification.id} has invalid appointment reference: {e}"
                )
    except Exception as e:
        print(f"✗ Error checking appointment references: {e}")

except Exception as e:
    print(f"✗ Critical error: {e}")
    traceback.print_exc()

print("\n=== Diagnostic Complete ===")
