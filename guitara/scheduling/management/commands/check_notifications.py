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
        parser.add_argument(
            "--create-samples",
            action="store_true",
            help="Create sample notifications for testing",
        )
        parser.add_argument(
            "--test-filtering",
            action="store_true",
            help="Test role-based filtering logic",
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

        # New functionality: Test role filtering if requested
        if options["test_filtering"]:
            self.test_role_filtering()

        # New functionality: Create samples if requested
        if options["create_samples"]:
            self.create_sample_notifications()

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

    def test_role_filtering(self):
        """Test role-based filtering that might be hiding notifications"""
        self.stdout.write(self.style.WARNING("\n🔍 Testing Role-Based Filtering..."))

        User = get_user_model()
        from django.db import models

        for role in ["operator", "therapist", "driver"]:
            users = User.objects.filter(role=role)
            if not users.exists():
                self.stdout.write(f"⚠️  No {role} users found")
                continue

            user = users.first()

            # Count all notifications for this user
            all_notifications = Notification.objects.filter(user=user).count()

            # Simulate the filtering logic from NotificationViewSet
            queryset = Notification.objects.filter(user=user)

            if role == "therapist":
                filtered_queryset = queryset.exclude(
                    notification_type__in=["appointment_auto_cancelled"]
                ).filter(
                    models.Q(appointment__therapist=user)
                    | models.Q(appointment__therapists=user)
                    | models.Q(appointment__isnull=True)
                )
            elif role == "driver":
                filtered_queryset = queryset.exclude(
                    notification_type__in=[
                        "appointment_auto_cancelled",
                        "rejection_reviewed",
                        "therapist_disabled",
                    ]
                ).filter(
                    models.Q(appointment__driver=user)
                    | models.Q(appointment__isnull=True)
                )
            else:  # operator
                filtered_queryset = queryset  # No filtering for operators

            filtered_count = filtered_queryset.count()

            self.stdout.write(
                f"  {role} ({user.username}): {all_notifications} total → {filtered_count} after filtering"
            )

            if all_notifications > filtered_count:
                difference = all_notifications - filtered_count
                self.stdout.write(
                    self.style.ERROR(
                        f"    ❌ {difference} notifications hidden by role filtering!"
                    )
                )

                # Show what was filtered out
                excluded_ids = filtered_queryset.values_list("id", flat=True)
                filtered_out = queryset.exclude(id__in=excluded_ids)

                self.stdout.write("    Filtered out notifications:")
                for notif in filtered_out[:3]:  # Show first 3
                    self.stdout.write(
                        f"      - {notif.notification_type}: {notif.message[:50]}..."
                    )
            else:
                self.stdout.write(
                    self.style.SUCCESS("    ✅ All notifications visible")
                )

    def create_sample_notifications(self):
        """Create sample notifications for testing"""
        self.stdout.write(self.style.WARNING("\n🆕 Creating Sample Notifications..."))

        User = get_user_model()
        from django.db import transaction

        # Get users for each role
        operator = User.objects.filter(role="operator").first()
        therapist = User.objects.filter(role="therapist").first()
        driver = User.objects.filter(role="driver").first()

        sample_notifications = []

        if operator:
            sample_notifications.extend(
                [
                    {
                        "user": operator,
                        "notification_type": "appointment_created",
                        "message": "🆕 New appointment has been created and needs your review",
                    },
                    {
                        "user": operator,
                        "notification_type": "appointment_cancelled",
                        "message": "❌ An appointment has been cancelled by the client",
                    },
                ]
            )

        if therapist:
            sample_notifications.extend(
                [
                    {
                        "user": therapist,
                        "notification_type": "appointment_reminder",
                        "message": "⏰ You have an appointment tomorrow at 2:00 PM",
                    },
                    {
                        "user": therapist,
                        "notification_type": "appointment_updated",
                        "message": "📝 An appointment has been updated - please review",
                    },
                ]
            )

        if driver:
            sample_notifications.extend(
                [
                    {
                        "user": driver,
                        "notification_type": "appointment_reminder",
                        "message": "🚗 You have a pickup scheduled for tomorrow at 1:30 PM",
                    }
                ]
            )

        # Create notifications
        created_count = 0
        try:
            with transaction.atomic():
                for notif_data in sample_notifications:
                    notification = Notification.objects.create(**notif_data)
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"  ✅ Created notification for {notification.user.username} ({notification.user.role})"
                        )
                    )

            self.stdout.write(
                f"\n📊 Successfully created {created_count} sample notifications"
            )
            self.stdout.write(
                self.style.SUCCESS(
                    "🔧 To test: Refresh your browser and check the notification center"
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"❌ Error creating sample notifications: {e}")
            )
