"""
Script to delete all appointments from the database.
This helps with testing the appointment creation flow from scratch.
"""
import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

# Import models after Django setup
from scheduling.models import Appointment, AppointmentMaterial
from core.models import SystemLog


def clear_appointments():
    """Remove all appointments and related data from the database."""
    print("=== CLEARING ALL APPOINTMENTS ===")
    
    # Count appointments before deletion
    appointment_count = Appointment.objects.count()
    material_count = AppointmentMaterial.objects.count()
    
    print(f"Found {appointment_count} appointments with {material_count} associated materials.")
    
    if appointment_count == 0:
        print("No appointments to delete.")
        return
    
    # Option to back out if too many appointments
    if appointment_count > 20:
        response = input(f"Are you sure you want to delete all {appointment_count} appointments? (yes/no): ")
        if response.lower() != 'yes':
            print("Aborted.")
            return

    # Delete related materials first (to avoid foreign key issues)
    AppointmentMaterial.objects.all().delete()
    print(f"Deleted {material_count} appointment materials.")
    
    # Delete all appointments
    Appointment.objects.all().delete()
    print(f"Deleted {appointment_count} appointments.")
    
    # Option to also delete related logs - assume yes for automation
    print("Deleting related appointment and inventory logs...")
    
    # Delete appointment logs
    appointment_logs = SystemLog.objects.filter(log_type='appointment')
    appointment_log_count = appointment_logs.count()
    appointment_logs.delete()
    
    # Delete inventory logs related to appointments
    try:
        # This might fail if metadata is not properly formatted as a JSON
        inventory_logs = SystemLog.objects.filter(log_type='inventory', 
                                             metadata__contains={'usage_context': 'appointment_service'})
        inventory_log_count = inventory_logs.count()
        inventory_logs.delete()
    except Exception as e:
        print(f"Error filtering inventory logs: {e}")
        # Fallback to a broader deletion - all inventory logs
        inventory_logs = SystemLog.objects.filter(log_type='inventory')
        inventory_log_count = inventory_logs.count()
        inventory_logs.delete()
    
    print(f"Deleted {appointment_log_count} appointment logs and {inventory_log_count} inventory logs.")
    
    print("=== CLEANUP COMPLETED ===")
    print("You can now test appointment creation with a clean database.")


if __name__ == "__main__":
    clear_appointments()
