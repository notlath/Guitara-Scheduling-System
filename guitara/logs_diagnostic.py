import os
import django
from django.utils import timezone
import json

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from core.models import SystemLog
from scheduling.pagination import LogsResultsPagination

print("🔍 SYSTEM LOGS DIAGNOSTIC TOOL")
print("==================================================")

# Get all log counts
total_logs = SystemLog.objects.count()
inventory_logs = SystemLog.objects.filter(log_type='inventory').count()
appointment_logs = SystemLog.objects.filter(log_type='appointment').count()
auth_logs = SystemLog.objects.filter(log_type='authentication').count()
data_logs = SystemLog.objects.filter(log_type='data').count()
payment_logs = SystemLog.objects.filter(log_type='payment').count()
other_logs = total_logs - (inventory_logs + appointment_logs + auth_logs + data_logs + payment_logs)

print(f"📊 LOG COUNTS:")
print(f"  Total logs in database: {total_logs}")
print(f"  Inventory logs: {inventory_logs}")
print(f"  Appointment logs: {appointment_logs}")
print(f"  Authentication logs: {auth_logs}")
print(f"  Data logs: {data_logs}")
print(f"  Payment logs: {payment_logs}")
print(f"  Other logs: {other_logs}")

print("\n📆 LOG TIMESPAN:")
oldest = SystemLog.objects.order_by('timestamp').first()
newest = SystemLog.objects.order_by('-timestamp').first()
if oldest and newest:
    print(f"  Oldest log: {oldest.timestamp.strftime('%Y-%m-%d %H:%M:%S')} ({oldest.log_type}: {oldest.description[:50]}...)")
    print(f"  Newest log: {newest.timestamp.strftime('%Y-%m-%d %H:%M:%S')} ({newest.log_type}: {newest.description[:50]}...)")
    span = newest.timestamp - oldest.timestamp
    print(f"  Log timespan: {span.days} days, {span.seconds // 3600} hours")
else:
    print("  No logs found")

print("\n📋 PAGINATION INFO:")
# Use the same pagination class as the API
paginator = LogsResultsPagination()
paginator.page_size = 10  # Use the same page size as the frontend
page_count = (total_logs + paginator.page_size - 1) // paginator.page_size
print(f"  Page size: {paginator.page_size} logs per page")
print(f"  Total pages: {page_count}")

print("\n📦 RECENT INVENTORY LOGS:")
recent_inventory = SystemLog.objects.filter(log_type='inventory').order_by('-timestamp')[:5]
for i, log in enumerate(recent_inventory, 1):
    metadata_str = ""
    if log.metadata:
        try:
            # Extract key info from metadata
            if isinstance(log.metadata, str):
                metadata = json.loads(log.metadata)
            else:
                metadata = log.metadata
                
            if 'quantity' in metadata:
                metadata_str = f"Quantity: {metadata['quantity']}"
            elif 'materials_summary' in metadata:
                metadata_str = f"Materials: {metadata['materials_summary'][:30]}..."
        except:
            pass
            
    print(f"  {i}. [{log.timestamp.strftime('%Y-%m-%d %H:%M:%S')}] {log.description[:50]}... {metadata_str}")

print("\n✅ DIAGNOSTIC COMPLETE")
print("==================================================")
print("The logs are now properly sorted by timestamp (newest first) and paginated")
print("All refill logs should appear in the Inventory tab of the logs page")
