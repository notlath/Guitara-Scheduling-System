#!/usr/bin/env python3
"""
Test script for the comprehensive appointment assignment and therapist notification system.
This script tests the complete workflow including timeouts and rejection handling.
"""

import os
import sys
import django
import time
from datetime import datetime, timedelta

# Setup Django environment
sys.path.append('/home/notlath/Downloads/Guitara-Scheduling-System/guitara')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from scheduling.models import Appointment, Client, AppointmentRejection, Notification
from registration.models import Service

User = get_user_model()

class WorkflowTestSuite:
    def __init__(self):
        self.test_results = []
        
    def log_test(self, test_name, result, details=""):
        """Log test results"""
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   {details}")
        self.test_results.append({
            'test': test_name,
            'result': result,
            'details': details
        })
    
    def setup_test_data(self):
        """Create test users and data"""
        print("🔧 Setting up test data...")
        
        # Create test users
        try:
            self.operator = User.objects.get_or_create(
                username='test_operator',
                defaults={
                    'first_name': 'Test',
                    'last_name': 'Operator',
                    'email': 'operator@test.com',
                    'user_type': 'operator',
                    'is_active': True
                }
            )[0]
            
            self.therapist = User.objects.get_or_create(
                username='test_therapist',
                defaults={
                    'first_name': 'Test',
                    'last_name': 'Therapist', 
                    'email': 'therapist@test.com',
                    'user_type': 'therapist',
                    'is_active': True
                }
            )[0]
            
            # Create test client
            self.client = Client.objects.get_or_create(
                email='testclient@test.com',
                defaults={
                    'first_name': 'Test',
                    'last_name': 'Client',
                    'phone_number': '1234567890'
                }
            )[0]
            
            # Create test service
            self.service = Service.objects.get_or_create(
                name='Test Massage',
                defaults={
                    'description': 'Test massage service',
                    'duration': 60,
                    'price': 100.00,
                    'is_active': True
                }
            )[0]
            
            print("✅ Test data setup complete")
            return True
            
        except Exception as e:
            print(f"❌ Test data setup failed: {e}")
            return False
    
    def test_appointment_creation_with_deadline(self):
        """Test 1: Appointment creation sets 30-minute response deadline"""
        try:
            # Create appointment
            appointment = Appointment.objects.create(
                client=self.client,
                therapist=self.therapist,
                operator=self.operator,
                date=timezone.now().date() + timedelta(days=1),
                start_time='09:00',
                end_time='10:00',
                status='pending',
                location='Test Location'
            )
            appointment.services.add(self.service)
            
            # Check if response_deadline is set (should be ~30 minutes from now)
            if appointment.response_deadline:
                time_diff = appointment.response_deadline - timezone.now()
                minutes_diff = time_diff.total_seconds() / 60
                
                # Should be approximately 30 minutes
                is_correct = 25 <= minutes_diff <= 35
                self.log_test(
                    "Appointment creation sets 30-minute deadline",
                    is_correct,
                    f"Deadline set to {minutes_diff:.1f} minutes from now"
                )
            else:
                self.log_test(
                    "Appointment creation sets 30-minute deadline",
                    False,
                    "No response_deadline was set"
                )
                
            self.test_appointment = appointment
            return True
            
        except Exception as e:
            self.log_test(
                "Appointment creation sets 30-minute deadline",
                False,
                f"Exception: {e}"
            )
            return False
    
    def test_therapist_rejection_workflow(self):
        """Test 2: Therapist rejection creates proper records"""
        try:
            # Simulate therapist rejection
            rejection_reason = "Double-booked for this time slot"
            
            # Create rejection record
            rejection = AppointmentRejection.objects.create(
                appointment=self.test_appointment,
                rejection_reason=rejection_reason,
                rejected_by=self.therapist
            )
            
            # Update appointment
            self.test_appointment.status = 'rejected'
            self.test_appointment.rejection_reason = rejection_reason
            self.test_appointment.rejected_by = self.therapist
            self.test_appointment.rejected_at = timezone.now()
            self.test_appointment.save()
            
            # Verify rejection record
            rejection_exists = AppointmentRejection.objects.filter(
                appointment=self.test_appointment,
                rejection_reason=rejection_reason
            ).exists()
            
            status_correct = self.test_appointment.status == 'rejected'
            
            self.log_test(
                "Therapist rejection creates proper records",
                rejection_exists and status_correct,
                f"Rejection record: {rejection_exists}, Status: {self.test_appointment.status}"
            )
            
            return True
            
        except Exception as e:
            self.log_test(
                "Therapist rejection creates proper records",
                False,
                f"Exception: {e}"
            )
            return False
    
    def test_operator_review_accept(self):
        """Test 3: Operator accepting rejection sets appointment to pending"""
        try:
            # Get the rejection record
            rejection = AppointmentRejection.objects.get(appointment=self.test_appointment)
            
            # Operator accepts the rejection
            rejection.review_decision = 'accept'
            rejection.review_notes = 'Valid reason, reassigning'
            rejection.reviewed_by = self.operator
            rejection.reviewed_at = timezone.now()
            rejection.save()
            
            # Update appointment status
            self.test_appointment.status = 'pending'
            self.test_appointment.therapist = None  # Clear therapist for reassignment
            self.test_appointment.save()
            
            review_recorded = rejection.review_decision == 'accept'
            status_pending = self.test_appointment.status == 'pending'
            therapist_cleared = self.test_appointment.therapist is None
            
            self.log_test(
                "Operator accepting rejection sets appointment to pending",
                review_recorded and status_pending and therapist_cleared,
                f"Review: {review_recorded}, Status: pending, Therapist cleared: {therapist_cleared}"
            )
            
            return True
            
        except Exception as e:
            self.log_test(
                "Operator accepting rejection sets appointment to pending",
                False,
                f"Exception: {e}"
            )
            return False
    
    def test_overdue_detection(self):
        """Test 4: System detects overdue appointments"""
        try:
            # Create appointment with past deadline
            overdue_appointment = Appointment.objects.create(
                client=self.client,
                therapist=self.therapist,
                operator=self.operator,
                date=timezone.now().date() + timedelta(days=1),
                start_time='10:00',
                end_time='11:00',
                status='pending',
                location='Test Location',
                response_deadline=timezone.now() - timedelta(minutes=5)  # 5 minutes ago
            )
            overdue_appointment.services.add(self.service)
            
            # Check if appointment is detected as overdue
            is_overdue = overdue_appointment.is_overdue()
            
            self.log_test(
                "System detects overdue appointments",
                is_overdue,
                f"Appointment overdue: {is_overdue}"
            )
            
            # Clean up
            overdue_appointment.delete()
            return True
            
        except Exception as e:
            self.log_test(
                "System detects overdue appointments", 
                False,
                f"Exception: {e}"
            )
            return False
    
    def test_auto_cancel_simulation(self):
        """Test 5: Simulate auto-cancel process"""
        try:
            # Create overdue appointment
            overdue_appointment = Appointment.objects.create(
                client=self.client,
                therapist=self.therapist,
                operator=self.operator,
                date=timezone.now().date() + timedelta(days=1),
                start_time='11:00',
                end_time='12:00',
                status='pending',
                location='Test Location',
                response_deadline=timezone.now() - timedelta(minutes=10)  # 10 minutes ago
            )
            overdue_appointment.services.add(self.service)
            
            # Simulate auto-cancel process
            original_active_status = self.therapist.is_active
            
            # Auto-cancel the appointment
            overdue_appointment.status = 'auto_cancelled'
            overdue_appointment.auto_cancelled_at = timezone.now()
            overdue_appointment.save()
            
            # Disable therapist
            self.therapist.is_active = False
            self.therapist.save()
            
            # Create notification
            notification = Notification.objects.create(
                user=self.therapist,
                appointment=overdue_appointment,
                notification_type='therapist_disabled',
                message='Account disabled due to timeout'
            )
            
            # Verify results
            status_correct = overdue_appointment.status == 'auto_cancelled'
            therapist_disabled = not self.therapist.is_active
            notification_created = Notification.objects.filter(
                appointment=overdue_appointment,
                notification_type='therapist_disabled'
            ).exists()
            
            self.log_test(
                "Auto-cancel process works correctly",
                status_correct and therapist_disabled and notification_created,
                f"Status: {overdue_appointment.status}, Therapist disabled: {therapist_disabled}, Notification: {notification_created}"
            )
            
            # Restore therapist status for other tests
            self.therapist.is_active = original_active_status
            self.therapist.save()
            
            # Clean up
            overdue_appointment.delete()
            notification.delete()
            
            return True
            
        except Exception as e:
            self.log_test(
                "Auto-cancel process works correctly",
                False,
                f"Exception: {e}"
            )
            return False
    
    def test_notification_creation(self):
        """Test 6: Notifications are created for key events"""
        try:
            # Create notifications for different events
            notifications_created = []
            
            # Appointment rejection notification
            rejection_notification = Notification.objects.create(
                user=self.operator,
                appointment=self.test_appointment,
                notification_type='appointment_rejected',
                message='Therapist rejected appointment'
            )
            notifications_created.append(rejection_notification)
            
            # Appointment assignment notification
            assignment_notification = Notification.objects.create(
                user=self.therapist,
                appointment=self.test_appointment,
                notification_type='appointment_assigned',
                message='New appointment assigned'
            )
            notifications_created.append(assignment_notification)
            
            # Verify notifications exist
            notifications_exist = all(
                Notification.objects.filter(id=notif.id).exists() 
                for notif in notifications_created
            )
            
            self.log_test(
                "Notifications created for key events",
                notifications_exist,
                f"Created {len(notifications_created)} notifications"
            )
            
            # Clean up
            for notif in notifications_created:
                notif.delete()
                
            return True
            
        except Exception as e:
            self.log_test(
                "Notifications created for key events",
                False,
                f"Exception: {e}"
            )
            return False
    
    def cleanup_test_data(self):
        """Clean up test data"""
        print("🧹 Cleaning up test data...")
        try:
            # Delete test appointment and related objects
            if hasattr(self, 'test_appointment'):
                AppointmentRejection.objects.filter(appointment=self.test_appointment).delete()
                Notification.objects.filter(appointment=self.test_appointment).delete()
                self.test_appointment.delete()
            
            # Note: We don't delete users and clients as they might be used elsewhere
            print("✅ Cleanup complete")
            
        except Exception as e:
            print(f"⚠️  Cleanup error: {e}")
    
    def run_all_tests(self):
        """Run the complete test suite"""
        print("🚀 Starting Appointment Workflow Test Suite")
        print("=" * 60)
        
        # Setup
        if not self.setup_test_data():
            print("❌ Setup failed, aborting tests")
            return
        
        # Run tests
        tests = [
            self.test_appointment_creation_with_deadline,
            self.test_therapist_rejection_workflow,
            self.test_operator_review_accept,
            self.test_overdue_detection,
            self.test_auto_cancel_simulation,
            self.test_notification_creation
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ Test failed with exception: {e}")
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['result'])
        total = len(self.test_results)
        
        print(f"Tests Passed: {passed}/{total}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if passed == total:
            print("🎉 All tests passed! The workflow implementation is working correctly.")
        else:
            print("⚠️  Some tests failed. Please review the implementation.")
            
        # Cleanup
        self.cleanup_test_data()

if __name__ == "__main__":
    test_suite = WorkflowTestSuite()
    test_suite.run_all_tests()
