#!/usr/bin/env python
"""
Create some test notifications to check if the notification system works
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

from scheduling.models import Notification, Appointment
from core.models import CustomUser

def create_test_notifications():
    print("=== Creating Test Notifications ===")
    
    # Get or create a test user
    try:
        user = CustomUser.objects.first()
        if not user:
            print("No users found in database. Please create a user first.")
            return
        
        print(f"Creating notifications for user: {user.username}")
        
        # Create a few test notifications
        test_notifications = [
            {
                "notification_type": "appointment_created",
                "message": "Your appointment has been scheduled for tomorrow at 2:00 PM",
            },
            {
                "notification_type": "appointment_reminder",
                "message": "Reminder: You have an appointment in 1 hour",
            },
            {
                "notification_type": "appointment_updated",
                "message": "Your appointment time has been changed to 3:00 PM",
            }
        ]
        
        for notif_data in test_notifications:
            notification = Notification.objects.create(
                user=user,
                notification_type=notif_data["notification_type"],
                message=notif_data["message"],
                is_read=False
            )
            print(f"Created notification: {notification.id} - {notification.message}")
        
        print(f"\nTotal notifications for {user.username}: {Notification.objects.filter(user=user).count()}")
        
    except Exception as e:
        print(f"Error creating notifications: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    create_test_notifications()
