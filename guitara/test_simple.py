from core.utils.logging_utils import log_authentication_event, log_appointment_event, log_data_event
from core.models import SystemLog

print("Creating test logs...")

# Create test logs
auth_log = log_authentication_event('login', user_id=1, username='test_user', user_name='Test User', success=True)
appt_log = log_appointment_event(999, 'create', user_id=1, client_name='Test Client')  
data_log = log_data_event('driver', 'Test Driver', 'create', user_id=1)

print(f"Auth log ID: {auth_log.id if auth_log else 'FAILED'}")
print(f"Appointment log ID: {appt_log.id if appt_log else 'FAILED'}")
print(f"Data log ID: {data_log.id if data_log else 'FAILED'}")

# Check total logs
total = SystemLog.objects.count()
print(f"Total logs in database: {total}")

# Show latest logs
print("\nLatest 3 logs:")
for log in SystemLog.objects.order_by('-timestamp')[:3]:
    print(f"  {log.timestamp}: {log.log_type} - {log.description}")
