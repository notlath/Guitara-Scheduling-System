"""
Script to delete all logs related to appointments and inventory from the database.
This helps with testing the logging system from scratch.
"""
import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

# Import models after Django setup
from core.models import SystemLog


def clear_logs():
    """Remove all logs related to appointments and inventory from the database."""
    print("=== CLEARING SELECTED LOGS ===")
    
    # Delete appointment logs
    appointment_logs = SystemLog.objects.filter(log_type='appointment')
    appointment_log_count = appointment_logs.count()
    if appointment_log_count > 0:
        appointment_logs.delete()
        print(f"Deleted {appointment_log_count} appointment logs.")
    else:
        print("No appointment logs found.")
    
    # Delete inventory logs
    inventory_logs = SystemLog.objects.filter(log_type='inventory')
    inventory_log_count = inventory_logs.count()
    if inventory_log_count > 0:
        inventory_logs.delete()
        print(f"Deleted {inventory_log_count} inventory logs.")
    else:
        print("No inventory logs found.")
    
    # Check all remaining logs
    remaining_logs = SystemLog.objects.all()
    print(f"\nRemaining logs: {remaining_logs.count()}")
    for log_type, count in SystemLog.objects.values_list('log_type').annotate(count=django.db.models.Count('log_type')):
        print(f"  - {log_type}: {count}")
    
    print("\n=== CLEANUP COMPLETED ===")
    print("You can now test logging with a clean database.")


if __name__ == "__main__":
    clear_logs()
