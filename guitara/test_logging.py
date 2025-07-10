#!/usr/bin/env python
"""
Test script to verify all logging systems are working properly
Run this in the Django shell: python manage.py shell < test_logging.py
"""

import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from core.models import SystemLog
from core.utils.logging_utils import (
    log_authentication_event,
    log_appointment_event, 
    log_data_event,
    log_inventory_event,
    log_payment_event
)
from inventory.models import UsageLog, InventoryItem
from django.contrib.auth import get_user_model

User = get_user_model()

print("🧪 TESTING ALL LOGGING SYSTEMS")
print("=" * 50)

# Clear test logs
print("🧹 Clearing any existing test logs...")
SystemLog.objects.filter(description__contains="TEST").delete()

# Get or create a test user
test_user, created = User.objects.get_or_create(
    username='test_operator',
    defaults={
        'email': 'test@example.com',
        'first_name': 'Test',
        'last_name': 'Operator',
        'role': 'operator'
    }
)
print(f"👤 Using test user: {test_user.username} (ID: {test_user.id})")

print("\n1. Testing Authentication Logging...")
try:
    auth_log = log_authentication_event(
        action="login",
        user_id=test_user.id,
        username=test_user.username,
        user_name=f"{test_user.first_name} {test_user.last_name}",
        success=True,
        metadata={"test": True, "ip": "127.0.0.1"}
    )
    print(f"✅ Authentication log created: {auth_log.id if auth_log else 'FAILED'}")
except Exception as e:
    print(f"❌ Authentication logging failed: {e}")

print("\n2. Testing Appointment Logging...")
try:
    appt_log = log_appointment_event(
        appointment_id=999,
        action_type="create",
        user_id=test_user.id,
        client_name="TEST CLIENT",
        metadata={"test": True, "appointment_date": "2025-07-10"}
    )
    print(f"✅ Appointment log created: {appt_log.id if appt_log else 'FAILED'}")
except Exception as e:
    print(f"❌ Appointment logging failed: {e}")

print("\n3. Testing Data Registration Logging...")
try:
    data_log = log_data_event(
        entity_type="driver",
        entity_name="TEST DRIVER",
        action_type="create",
        user_id=test_user.id,
        metadata={"test": True, "email": "testdriver@example.com"}
    )
    print(f"✅ Data registration log created: {data_log.id if data_log else 'FAILED'}")
except Exception as e:
    print(f"❌ Data registration logging failed: {e}")

print("\n4. Testing Inventory Logging...")
try:
    inventory_log = log_inventory_event(
        action_type="material_usage_test",
        user_id=test_user.id,
        item_name="TEST MATERIAL",
        metadata={"test": True, "quantity": 5}
    )
    print(f"✅ Inventory log created: {inventory_log.id if inventory_log else 'FAILED'}")
except Exception as e:
    print(f"❌ Inventory logging failed: {e}")

print("\n5. Testing Payment Logging...")
try:
    payment_log = log_payment_event(
        payment_id=999,
        action_type="verify",
        amount=1000,
        user_id=test_user.id,
        metadata={"test": True, "method": "cash"}
    )
    print(f"✅ Payment log created: {payment_log.id if payment_log else 'FAILED'}")
except Exception as e:
    print(f"❌ Payment logging failed: {e}")

print("\n6. Testing Inventory Usage Log (for refill logs)...")
try:
    # Try to find an existing inventory item or create one
    inventory_item, created = InventoryItem.objects.get_or_create(
        name="TEST INVENTORY ITEM",
        defaults={
            'category': 'Test',
            'current_stock': 10,
            'min_stock': 5,
            'unit': 'pcs',
            'cost_per_unit': 10.0
        }
    )
    
    usage_log = UsageLog.objects.create(
        item=inventory_item,
        quantity_used=5,
        operator=test_user,
        action_type="restock",
        notes="TEST restock operation"
    )
    print(f"✅ Usage log created: {usage_log.id}")
except Exception as e:
    print(f"❌ Usage log creation failed: {e}")

print("\n📊 FINAL RESULTS:")
print("=" * 50)

# Count all logs
total_system_logs = SystemLog.objects.count()
test_system_logs = SystemLog.objects.filter(description__contains="TEST").count()
auth_logs = SystemLog.objects.filter(log_type="authentication").count()
appointment_logs = SystemLog.objects.filter(log_type="appointment").count()
data_logs = SystemLog.objects.filter(log_type="data").count()
inventory_system_logs = SystemLog.objects.filter(log_type="inventory").count()
payment_logs = SystemLog.objects.filter(log_type="payment").count()
usage_logs = UsageLog.objects.count()

print(f"📈 Total SystemLog entries: {total_system_logs}")
print(f"🧪 Test SystemLog entries: {test_system_logs}")
print(f"🔐 Authentication logs: {auth_logs}")
print(f"📋 Appointment logs: {appointment_logs}")
print(f"📝 Data registration logs: {data_logs}")
print(f"📦 Inventory system logs: {inventory_system_logs}")
print(f"💰 Payment logs: {payment_logs}")
print(f"📊 Usage logs (for refill): {usage_logs}")

print("\n🔍 Recent logs (last 5):")
for log in SystemLog.objects.order_by('-timestamp')[:5]:
    print(f"  - {log.timestamp}: {log.log_type} - {log.description}")

print("\n✅ LOGGING TEST COMPLETE!")
