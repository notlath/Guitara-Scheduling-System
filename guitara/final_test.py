from core.utils.logging_utils import *
from core.models import SystemLog
from django.contrib.auth import get_user_model

User = get_user_model()

print("🎯 FINAL COMPREHENSIVE TEST")
print("=" * 40)

# Get or create a real user for testing
user, created = User.objects.get_or_create(
    username='system_tester',
    defaults={
        'email': 'tester@royalcare.com',
        'first_name': 'System',
        'last_name': 'Tester',
        'role': 'operator',
        'is_active': True
    }
)
print(f"📋 Test user: {user.username} (ID: {user.id})")

# Clear existing test logs
SystemLog.objects.filter(description__icontains='test').delete()
print("🧹 Cleared old test logs")

print("\n🔐 Testing Authentication Logging...")
auth_log = log_authentication_event(
    action='login',
    user_id=user.id,
    username=user.username,
    user_name=f"{user.first_name} {user.last_name}",
    success=True,
    metadata={'ip': '127.0.0.1', 'test': True}
)
print(f"✅ Login log: {auth_log.id}")

logout_log = log_authentication_event(
    action='logout',
    user_id=user.id,
    username=user.username,
    user_name=f"{user.first_name} {user.last_name}",
    success=True,
    metadata={'test': True}
)
print(f"✅ Logout log: {logout_log.id}")

print("\n📋 Testing Appointment Logging...")
appt_log = log_appointment_event(
    appointment_id=12345,
    action_type='create',
    user_id=user.id,
    client_name='Maria Santos',
    metadata={
        'appointment_date': '2025-07-10',
        'services': ['Swedish Massage'],
        'location': 'Pasig City',
        'test': True
    }
)
print(f"✅ Appointment creation log: {appt_log.id}")

print("\n📝 Testing Data Registration Logging...")
driver_log = log_data_event(
    entity_type='driver',
    entity_name='Juan Dela Cruz',
    action_type='create',
    user_id=user.id,
    metadata={'email': 'juan@test.com', 'test': True}
)
print(f"✅ Driver registration log: {driver_log.id}")

therapist_log = log_data_event(
    entity_type='therapist',
    entity_name='Maria Therapist',
    action_type='create',
    user_id=user.id,
    metadata={'specialization': 'Swedish', 'test': True}
)
print(f"✅ Therapist registration log: {therapist_log.id}")

print("\n📦 Testing Inventory Logging...")
material_log = log_inventory_event(
    action_type='material_usage_appointment',
    user_id=user.id,
    item_name='Massage Oil',
    metadata={
        'appointment_id': 12345,
        'quantity_used': 2,
        'client_name': 'Maria Santos',
        'test': True
    }
)
print(f"✅ Material usage log: {material_log.id}")

print("\n💰 Testing Payment Logging...")
payment_log = log_payment_event(
    payment_id=67890,
    action_type='verify',
    amount=1500,
    user_id=user.id,
    metadata={'method': 'cash', 'test': True}
)
print(f"✅ Payment verification log: {payment_log.id}")

print("\n📊 RESULTS SUMMARY:")
print("=" * 40)
total_logs = SystemLog.objects.count()
test_logs = SystemLog.objects.filter(metadata__test=True).count()

print(f"📈 Total logs in database: {total_logs}")
print(f"🧪 Test logs created: {test_logs}")

print("\n📋 Logs by type:")
for log_type in ['authentication', 'appointment', 'data', 'inventory', 'payment']:
    count = SystemLog.objects.filter(log_type=log_type).count()
    print(f"  {log_type.title()}: {count}")

print("\n🔍 Latest 5 logs:")
for log in SystemLog.objects.order_by('-timestamp')[:5]:
    print(f"  {log.timestamp.strftime('%H:%M:%S')}: {log.log_type} - {log.description[:50]}...")

print("\n🎉 ALL LOGGING SYSTEMS WORKING!")
print("Frontend should now show these logs!")
