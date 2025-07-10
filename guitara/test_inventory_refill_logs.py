import os
import django
import datetime

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from core.utils.logging_utils import log_inventory_event
from core.models import SystemLog

print("🧪 TESTING INVENTORY REFILL LOGGING")
print("==================================================")

# Create several refill logs with different timestamps to test sorting
print("📝 Creating test refill logs...")

# Create a refill log for now
now = datetime.datetime.now()
log1 = log_inventory_event('Test Material Now', 'refill', quantity=10, 
                          user_id=62, metadata={'test': 'current_refill'})
print(f"✅ Created refill log at current time: {now}")

# Create a refill log for 2 hours ago
log2 = log_inventory_event('Test Material 2hr', 'refill', quantity=20,
                          user_id=62, metadata={'test': 'older_refill'})
# Manually update timestamp to 2 hours ago
log2.timestamp = now - datetime.timedelta(hours=2)
log2.save()
print(f"✅ Created refill log at 2 hours ago: {log2.timestamp}")

# Create a refill log for 4 hours ago
log3 = log_inventory_event('Test Material 4hr', 'refill', quantity=30, 
                          user_id=62, metadata={'test': 'oldest_refill'})
# Manually update timestamp to 4 hours ago
log3.timestamp = now - datetime.timedelta(hours=4)
log3.save()
print(f"✅ Created refill log at 4 hours ago: {log3.timestamp}")

# Verify the sorting
print("\n📊 Checking log ordering...")
print("Latest 5 inventory logs (should be in descending order by timestamp):")
latest_logs = SystemLog.objects.filter(log_type='inventory').order_by('-timestamp')[:5]
for i, log in enumerate(latest_logs, 1):
    print(f"  {i}. [{log.timestamp}] {log.description}")

print("\n✅ TEST COMPLETE - Check the logs page in the frontend to verify sorting")
print("==================================================")
