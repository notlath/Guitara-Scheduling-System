#!/usr/bin/env python
"""
Notification Debug and Fix Tool
This script will help diagnose and fix notification display issues
"""
import os
import sys
import json

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
from django.test import RequestFactory
from scheduling.views import NotificationViewSet


def main():
    print("🔧 NOTIFICATION SYSTEM DIAGNOSIS AND FIX")
    print("=" * 50)

    # 1. Check database state
    print("\n📊 DATABASE STATE:")
    total_users = CustomUser.objects.count()
    total_notifications = Notification.objects.count()
    print(f"Total users: {total_users}")
    print(f"Total notifications: {total_notifications}")

    if total_notifications == 0:
        print("❌ NO NOTIFICATIONS FOUND IN DATABASE!")
        print("This explains why no notifications are displayed.")
        create_sample_notifications()
        return

    # 2. Check notifications per role
    print("\n👥 NOTIFICATIONS PER USER ROLE:")
    for role in ["operator", "therapist", "driver"]:
        users = CustomUser.objects.filter(role=role)
        if users.exists():
            for user in users[:3]:  # Check first 3 users of each role
                total_notifs = Notification.objects.filter(user=user).count()
                unread_notifs = Notification.objects.filter(
                    user=user, is_read=False
                ).count()
                print(
                    f"  {user.username} ({role}): {total_notifs} total, {unread_notifs} unread"
                )

                # Test API filtering for this user
                test_api_filtering(user)
        else:
            print(f"  No {role} users found")

    # 3. Check notification types
    print("\n🏷️ NOTIFICATION TYPES IN DATABASE:")
    from django.db.models import Count

    types = (
        Notification.objects.values("notification_type")
        .annotate(count=Count("id"))
        .order_by("-count")
    )
    for type_data in types:
        print(f"  {type_data['notification_type']}: {type_data['count']}")

    # 4. Test current filtering logic
    print("\n🔍 TESTING CURRENT FILTERING LOGIC:")
    test_filtering_logic()

    print("\n✅ DIAGNOSIS COMPLETE!")
    print("Check the output above to identify the issue.")
    print(
        "If notifications exist but aren't showing, the role-based filtering may be too restrictive."
    )


def test_api_filtering(user):
    """Test the API filtering for a specific user"""
    try:
        factory = RequestFactory()
        request = factory.get("/api/scheduling/notifications/")
        request.user = user

        viewset = NotificationViewSet()
        viewset.request = request
        viewset.format_kwarg = None

        # Get the filtered queryset
        queryset = viewset.get_queryset()
        filtered_count = queryset.count()

        print(f"    → API filtering result: {filtered_count} notifications")

        if filtered_count == 0:
            # Check why filtering returned 0
            base_queryset = Notification.objects.filter(user=user)
            base_count = base_queryset.count()
            print(f"    → Before filtering: {base_count} notifications")

            if base_count > 0 and filtered_count == 0:
                print(
                    f"    ⚠️ ISSUE: Role-based filtering removed all notifications for {user.role}"
                )

    except Exception as e:
        print(f"    ❌ Error testing API for {user.username}: {e}")


def test_filtering_logic():
    """Test the filtering logic for different scenarios"""
    print("Testing role-based filtering logic...")

    # Check if any notifications would be filtered out by role restrictions
    for role in ["therapist", "driver"]:
        users = CustomUser.objects.filter(role=role)
        if users.exists():
            user = users.first()

            # Count notifications before filtering
            all_notifications = Notification.objects.filter(user=user).count()

            # Count notifications after role-based exclusions
            if role == "therapist":
                filtered_notifications = (
                    Notification.objects.filter(user=user)
                    .exclude(notification_type__in=["appointment_auto_cancelled"])
                    .filter(
                        models.Q(appointment__therapist=user)
                        | models.Q(appointment__therapists=user)
                        | models.Q(appointment__isnull=True)
                    )
                    .count()
                )
            elif role == "driver":
                filtered_notifications = (
                    Notification.objects.filter(user=user)
                    .exclude(
                        notification_type__in=[
                            "appointment_auto_cancelled",
                            "rejection_reviewed",
                            "therapist_disabled",
                        ]
                    )
                    .filter(
                        models.Q(appointment__driver=user)
                        | models.Q(appointment__isnull=True)
                    )
                    .count()
                )
            else:
                filtered_notifications = all_notifications

            print(
                f"  {role} ({user.username}): {all_notifications} → {filtered_notifications} (filtered)"
            )

            if all_notifications > filtered_notifications:
                print(
                    f"    ⚠️ {all_notifications - filtered_notifications} notifications filtered out by role restrictions"
                )


def create_sample_notifications():
    """Create sample notifications for testing"""
    print("\n🆕 CREATING SAMPLE NOTIFICATIONS FOR TESTING...")

    # Get first user of each role
    operator = CustomUser.objects.filter(role="operator").first()
    therapist = CustomUser.objects.filter(role="therapist").first()
    driver = CustomUser.objects.filter(role="driver").first()

    sample_notifications = []

    if operator:
        sample_notifications.append(
            {
                "user": operator,
                "notification_type": "appointment_created",
                "message": "New appointment has been created",
            }
        )

    if therapist:
        sample_notifications.append(
            {
                "user": therapist,
                "notification_type": "appointment_reminder",
                "message": "You have an appointment tomorrow",
            }
        )

    if driver:
        sample_notifications.append(
            {
                "user": driver,
                "notification_type": "appointment_reminder",
                "message": "You have a pickup tomorrow",
            }
        )

    # Create the notifications
    created_count = 0
    for notif_data in sample_notifications:
        try:
            notification = Notification.objects.create(**notif_data)
            created_count += 1
            print(
                f"  ✅ Created notification for {notification.user.username} ({notification.user.role})"
            )
        except Exception as e:
            print(f"  ❌ Failed to create notification: {e}")

    print(f"\n📊 Created {created_count} sample notifications")
    print("Try refreshing the frontend to see if notifications now appear.")


if __name__ == "__main__":
    # Import models here to avoid import issues
    from django.db import models

    main()
