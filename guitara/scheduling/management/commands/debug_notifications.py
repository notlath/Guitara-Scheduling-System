from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from scheduling.models import Notification
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class Command(BaseCommand):
    help = (
        "Debug notification system by creating test notifications and checking database"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--user",
            type=str,
            help="Username to create test notification for",
        )
        parser.add_argument(
            "--cleanup",
            action="store_true",
            help="Delete all test notifications",
        )

    def handle(self, *args, **options):
        if options["cleanup"]:
            self.cleanup_test_notifications()
            return

        username = options.get("user")
        if not username:
            # Find any user to test with
            user = User.objects.first()
            if not user:
                self.stdout.write(self.style.ERROR("No users found in database"))
                return
        else:
            try:
                user = User.objects.get(username=username)
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"User {username} not found"))
                return

        self.stdout.write(f"Testing notifications for user: {user.username}")

        # Check current notifications
        current_count = Notification.objects.filter(user=user).count()
        self.stdout.write(f"Current notifications for user: {current_count}")

        # Create a test notification
        try:
            test_notification = Notification.objects.create(
                user=user,
                notification_type="appointment_created",
                message=f"Test notification for debugging - {user.username}",
                is_read=False,
            )
            self.stdout.write(
                self.style.SUCCESS(f"Created test notification: {test_notification.id}")
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to create test notification: {e}")
            )
            return

        # Try to fetch notifications like the API does
        try:
            notifications = Notification.objects.filter(user=user).order_by(
                "-created_at"
            )
            self.stdout.write(
                f"Successfully fetched {notifications.count()} notifications"
            )

            for notif in notifications[:5]:  # Show first 5
                self.stdout.write(
                    f"  - {notif.id}: {notif.notification_type} - {notif.message[:50]}..."
                )

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to fetch notifications: {e}"))

        # Test serialization
        try:
            from scheduling.serializers import NotificationSerializer

            serializer = NotificationSerializer(notifications, many=True)
            serialized_data = serializer.data
            self.stdout.write(
                f"Successfully serialized {len(serialized_data)} notifications"
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"Failed to serialize notifications: {e}")
            )

    def cleanup_test_notifications(self):
        """Remove test notifications"""
        test_notifications = Notification.objects.filter(
            message__icontains="Test notification for debugging"
        )
        count = test_notifications.count()
        test_notifications.delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {count} test notifications"))
