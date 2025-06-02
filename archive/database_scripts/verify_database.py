import os
import sys
import django
from pprint import pprint

# Add the project to the Python path and set up the environment
sys.path.append('guitara')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

def verify_database_setup():
    """Verify that the database is set up correctly with all required tables and data"""
    print("=== Database Verification ===")
    
    # Check that the models are accessible
    try:
        from django.apps import apps
        from registration.models import Service
        from scheduling.models import Appointment
        
        # Check that services were created
        services = Service.objects.all()
        print(f"\n=== Services ({services.count()} found) ===")
        for service in services:
            print(f"ID: {service.id} - {service.name} - ${service.price} - {service.duration} mins")
        
        if not services:
            print("WARNING: No services found in the database!")
        
        # List all models and their table names
        print("\n=== Database Models ===")
        for app_config in apps.get_app_configs():
            if app_config.name.startswith('django.'):
                continue
                
            print(f"\nApp: {app_config.name}")
            for model in app_config.get_models():
                print(f"  - {model.__name__} (table: {model._meta.db_table})")
                
        # Check database connection
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            print("\nDatabase connection test:", "Success" if result[0] == 1 else "Failed")
            
            # Get list of tables
            if connection.vendor == 'postgresql':
                cursor.execute("""
                    SELECT table_name 
                    FROM information_schema.tables 
                    WHERE table_schema = 'public'
                """)
                tables = cursor.fetchall()
                print("\n=== Database Tables ===")
                for table in tables:
                    print(f"  - {table[0]}")
        
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify_database_setup()
