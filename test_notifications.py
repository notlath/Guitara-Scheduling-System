#!/usr/bin/env python3
"""
Test script to debug notification issues in the Guitara Scheduling System
"""

import os
import sys
import django

# Add the guitara directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'guitara'))

# Set Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from core.models import CustomUser
from scheduling.models import Notification, Appointment

def test_notifications():
    print("🔍 Testing Notification System...")
    print("=" * 50)
    
    # Check users by role
    print("\n👥 Users by Role:")
    for role, role_display in CustomUser.ROLES:
        users = CustomUser.objects.filter(role=role)
        print(f"  {role_display}: {users.count()} users")
        for user in users[:3]:  # Show first 3 users
            print(f"    - {user.username} (ID: {user.id})")
    
    print(f"\n📧 Total Notifications: {Notification.objects.count()}")
    
    # Check notifications by user role
    print("\n📊 Notifications by User Role:")
    for role, role_display in CustomUser.ROLES:
        users = CustomUser.objects.filter(role=role)
        notification_count = Notification.objects.filter(user__role=role).count()
        print(f"  {role_display}: {notification_count} notifications")
        
        # Show sample notifications for each role
        sample_notifications = Notification.objects.filter(user__role=role)[:2]
        for notif in sample_notifications:
            print(f"    - {notif.user.username}: {notif.message[:50]}... (Read: {notif.is_read})")
    
    # Check recent appointments and their notifications
    print(f"\n📅 Total Appointments: {Appointment.objects.count()}")
    recent_appointments = Appointment.objects.order_by('-id')[:5]
    
    print("\n🔄 Recent Appointments and their Notifications:")
    for appt in recent_appointments:
        print(f"  Appointment {appt.id} ({appt.status}):")
        print(f"    - Therapist: {appt.therapist.username if appt.therapist else 'None'}")
        print(f"    - Driver: {appt.driver.username if appt.driver else 'None'}")
        print(f"    - Operator: {appt.operator.username if appt.operator else 'None'}")
        
        # Count notifications for this appointment
        notif_count = Notification.objects.filter(appointment=appt).count()
        print(f"    - Notifications: {notif_count}")
        
        # Show sample notifications
        notifications = Notification.objects.filter(appointment=appt)
        for notif in notifications:
            print(f"      * {notif.user.username} ({notif.user.role}): {notif.message[:30]}...")
        print()
    
    # Test creating a notification
    print("🧪 Test Notification Creation:")
    operator = CustomUser.objects.filter(role='operator').first()
    therapist = CustomUser.objects.filter(role='therapist').first()
    driver = CustomUser.objects.filter(role='driver').first()
    
    if operator and therapist and driver:
        print(f"  Found test users: {operator.username}, {therapist.username}, {driver.username}")
        
        # Check if they have any notifications
        print("  Current notification counts:")
        print(f"    - {operator.username}: {Notification.objects.filter(user=operator).count()}")
        print(f"    - {therapist.username}: {Notification.objects.filter(user=therapist).count()}")
        print(f"    - {driver.username}: {Notification.objects.filter(user=driver).count()}")
    else:
        print("  ❌ Missing required users for testing")
        if not operator:
            print("    - No operator found")
        if not therapist:
            print("    - No therapist found")
        if not driver:
            print("    - No driver found")

if __name__ == "__main__":
    test_notifications()
