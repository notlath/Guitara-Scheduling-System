from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from scheduling.models import Notification
from scheduling.serializers import NotificationSerializer
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Check notification system health and fix common issues"

    def add_arguments(self, parser):
        parser.add_argument(
            "--fix",
            action="store_true",
            help="Fix found issues automatically",
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS("🏥 Starting Notification System Health Check...")
        )

        User = get_user_model()

        # Test 1: Basic counts
        try:
            user_count = User.objects.count()
            notification_count = Notification.objects.count()
            self.stdout.write(
                f"✓ Database accessible: {user_count} users, {notification_count} notifications"
            )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Database error: {e}"))
            return

        # Test 2: Check for orphaned notifications
        try:
            orphaned_notifications = Notification.objects.filter(user__isnull=True)
            orphaned_count = orphaned_notifications.count()

            if orphaned_count > 0:
                self.stdout.write(
                    self.style.WARNING(
                        f"⚠️  Found {orphaned_count} orphaned notifications"
                    )
                )
                if options["fix"]:
                    deleted_count = orphaned_notifications.delete()[0]
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"✓ Deleted {deleted_count} orphaned notifications"
                        )
                    )
            else:
                self.stdout.write("✓ No orphaned notifications found")
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"✗ Error checking orphaned notifications: {e}")
            )

        # Test 3: Check serialization
        try:
            if notification_count > 0:
                sample_notifications = Notification.objects.all()[:5]
                for notification in sample_notifications:
                    try:
                        serializer = NotificationSerializer(notification)
                        data = serializer.data
                        # Basic validation
                        if "id" not in data or "message" not in data:
                            raise ValueError("Missing required fields")
                    except Exception as e:
                        self.stdout.write(
                            self.style.WARNING(
                                f"⚠️  Notification {notification.id} serialization issue: {e}"
                            )
                        )
                        if options["fix"]:
                            # Try to fix by setting default values
                            if not notification.message:
                                notification.message = (
                                    f"Notification ({notification.notification_type})"
                                )
                                notification.save()
                                self.stdout.write(
                                    f"✓ Fixed empty message for notification {notification.id}"
                                )

                self.stdout.write("✓ Serialization test completed")
            else:
                self.stdout.write("ℹ️  No notifications to test serialization")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Serialization test failed: {e}"))

        # Test 4: Check for invalid foreign key references
        try:
            notifications_with_appointments = Notification.objects.filter(
                appointment__isnull=False
            )
            invalid_appointments = 0

            for notification in notifications_with_appointments[:10]:  # Check first 10
                try:
                    _ = notification.appointment.id
                except:
                    invalid_appointments += 1
                    if options["fix"]:
                        notification.appointment = None
                        notification.save()
                        self.stdout.write(
                            f"✓ Fixed invalid appointment reference for notification {notification.id}"
                        )

            if invalid_appointments > 0:
                self.stdout.write(
                    self.style.WARNING(
                        f"⚠️  Found {invalid_appointments} notifications with invalid appointment references"
                    )
                )
            else:
                self.stdout.write("✓ All appointment references are valid")
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"✗ Error checking appointment references: {e}")
            )

        # Summary
        self.stdout.write(self.style.SUCCESS("\n🏁 Health check complete!"))

        if options["fix"]:
            self.stdout.write(
                self.style.SUCCESS("✨ Fixed issues automatically where possible.")
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    "ℹ️  To fix issues automatically, run with --fix flag"
                )
            )
