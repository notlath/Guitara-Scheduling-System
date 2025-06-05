from django.core.management.base import BaseCommand
from core.models import CustomUser
from scheduling.models import Notification
from scheduling.serializers import NotificationSerializer
from scheduling.views import NotificationViewSet
from rest_framework.test import APIRequestFactory
import traceback

class Command(BaseCommand):
    help = 'Test notifications functionality to identify 500 error cause'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting notifications test...'))
        
        try:
            # Test 1: Basic model access
            self.stdout.write("=== Test 1: Basic Model Access ===")
            notification_count = Notification.objects.count()
            self.stdout.write(f"✓ Found {notification_count} notifications")
            
            user_count = CustomUser.objects.count()
            self.stdout.write(f"✓ Found {user_count} users")
            
            # Test 2: Get a test user
            self.stdout.write("\n=== Test 2: User Testing ===")
            test_user = CustomUser.objects.filter(role='operator').first()
            if not test_user:
                test_user = CustomUser.objects.first()
            
            if not test_user:
                self.stdout.write(self.style.WARNING("No users found - creating test user"))
                test_user = CustomUser.objects.create_user(
                    username="testoperator",
                    first_name="Test",
                    last_name="Operator", 
                    role="operator"
                )
            
            self.stdout.write(f"✓ Using test user: {test_user}")
            
            # Test 3: Test notification filtering for this user
            self.stdout.write("\n=== Test 3: User Notification Filtering ===")
            user_notifications = Notification.objects.filter(user=test_user)
            self.stdout.write(f"✓ Found {user_notifications.count()} notifications for user")
            
            # Test 4: Test serialization
            self.stdout.write("\n=== Test 4: Serialization Testing ===")
            if user_notifications.exists():
                for notif in user_notifications[:3]:
                    try:
                        serializer = NotificationSerializer(notif)
                        data = serializer.data
                        self.stdout.write(f"✓ Serialized notification {notif.id} successfully")
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f"✗ Serialization failed for notification {notif.id}: {e}"))
                        traceback.print_exc()
            else:
                # Create a test notification
                test_notification = Notification.objects.create(
                    user=test_user,
                    notification_type="appointment_created",
                    message="Test notification for debugging"
                )
                try:
                    serializer = NotificationSerializer(test_notification)
                    data = serializer.data
                    self.stdout.write(f"✓ Serialized test notification successfully: {data}")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"✗ Test notification serialization failed: {e}"))
                    traceback.print_exc()
            
            # Test 5: Test ViewSet logic
            self.stdout.write("\n=== Test 5: ViewSet Testing ===")
            factory = APIRequestFactory()
            request = factory.get('/api/scheduling/notifications/')
            request.user = test_user
            
            viewset = NotificationViewSet()
            viewset.request = request
            viewset.format_kwarg = None
            
            # Test get_queryset
            try:
                queryset = viewset.get_queryset()
                self.stdout.write(f"✓ ViewSet get_queryset returned {queryset.count()} notifications")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"✗ ViewSet get_queryset failed: {e}"))
                traceback.print_exc()
            
            # Test list method
            try:
                response = viewset.list(request)
                self.stdout.write(f"✓ ViewSet list method returned status {response.status_code}")
                if hasattr(response, 'data'):
                    self.stdout.write(f"✓ Response data length: {len(response.data) if isinstance(response.data, list) else 'Not a list'}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"✗ ViewSet list method failed: {e}"))
                traceback.print_exc()
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Command failed: {e}"))
            traceback.print_exc()
        
        self.stdout.write(self.style.SUCCESS('Notifications test completed!'))
