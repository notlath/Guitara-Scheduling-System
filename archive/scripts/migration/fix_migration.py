"""
This script fixes the InconsistentMigrationHistory in your Django project.
"""
import os
import sys
import django

# Add the project root to Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.guitara.settings")
django.setup()

from django.db import connection
from django.utils import timezone

def fix_migration_conflict():
    """Fix the inconsistent migration history by removing and re-adding migrations in correct order."""
    print("Starting migration fix...")
    now = timezone.now()
    
    with connection.cursor() as cursor:
        # 1. First check if django_migrations table exists
        cursor.execute("""
        SELECT EXISTS(
            SELECT FROM information_schema.tables 
            WHERE table_name = 'django_migrations'
        );
        """)
        migrations_table_exists = cursor.fetchone()[0]
        
        if not migrations_table_exists:
            print("django_migrations table doesn't exist! Can't fix migrations.")
            return False
            
        # 2. Remove the problematic migrations
        print("Removing conflicting migrations...")
        cursor.execute("""
        DELETE FROM django_migrations 
        WHERE app = 'registration' AND name IN (
            '0008_material_auto_deduct_material_category_and_more',
            '0009_add_initial_services',
            '0009_service_is_active_create_initial_services',
            '0010_merge_20250531_1658',
            '0008_material_auto_deduct_material_category_fix'
        );
        """)
        
        # 3. Add migrations in correct order
        print("Adding migrations in correct order...")
        migrations_to_apply = [
            ('registration', '0008_material_auto_deduct_material_category_and_more', now),
            ('registration', '0009_add_initial_services', now),
            ('registration', '0009_service_is_active_create_initial_services', now),
            ('registration', '0010_merge_20250531_1658', now)
        ]
        
        for app, name, applied in migrations_to_apply:
            cursor.execute(
                "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
                [app, name, applied]
            )
            print(f"Added {app}.{name} as applied")
        
        print("Migration fix complete!")
        return True

if __name__ == "__main__":
    if fix_migration_conflict():
        print("\nSuccess! You should now be able to run makemigrations and migrate without errors.")
        print("Try running: python manage.py makemigrations")
    else:
        print("\nFailed to fix migrations. You may need to use a different approach.")
