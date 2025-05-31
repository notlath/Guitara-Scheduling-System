"""
This is a one-time fix script to resolve all migration issues at once.
It will:
1. Ensure all required columns exist in the tables
2. Mark all pending migrations as applied

Run this script when experiencing migration conflicts.
"""
import os
import sys
import django
from django.utils import timezone

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from django.db import connection

def fix_all_migrations():
    print("Starting comprehensive migration fix...")
    
    try:
        # 1. Fix Material table schema
        with connection.cursor() as cursor:
            # Add all needed columns to Material table if they don't exist
            columns_to_check = [
                ('auto_deduct', 'ADD COLUMN auto_deduct boolean NOT NULL DEFAULT false'),
                ('category', 'ADD COLUMN category varchar(50) NOT NULL DEFAULT \'Other\''),
                ('description', 'ADD COLUMN description varchar(255) NOT NULL DEFAULT \'Material for massage service\''),
                ('name', 'ADD COLUMN name varchar(100) NOT NULL DEFAULT \'Unnamed Material\''),
                ('reusable', 'ADD COLUMN reusable boolean NOT NULL DEFAULT false'),
                ('stock_quantity', 'ADD COLUMN stock_quantity integer NOT NULL DEFAULT 0'),
                ('unit_of_measure', 'ADD COLUMN unit_of_measure varchar(50) NOT NULL DEFAULT \'Unit\'')
            ]
            
            for column_name, add_command in columns_to_check:
                cursor.execute(f"""
                SELECT EXISTS(
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'registration_material' AND column_name = '{column_name}'
                );
                """)
                column_exists = cursor.fetchone()[0]
                
                if not column_exists:
                    print(f"Adding missing column: {column_name}")
                    cursor.execute(f"ALTER TABLE registration_material {add_command}")
                else:
                    print(f"Column {column_name} already exists - skipping")
            
            # 2. Fix Service table schema - ensure is_active exists
            cursor.execute("""
            SELECT EXISTS(
                SELECT FROM information_schema.columns 
                WHERE table_name = 'registration_service' AND column_name = 'is_active'
            );
            """)
            is_active_exists = cursor.fetchone()[0]
            
            if not is_active_exists:
                print("Adding missing column: is_active to Service table")
                cursor.execute("ALTER TABLE registration_service ADD COLUMN is_active boolean NOT NULL DEFAULT true")
            else:
                print("Column is_active already exists in Service table - skipping")
            
            # 3. Mark all pending migrations as applied
            pending_migrations = [
                ('registration', '0008_material_auto_deduct_material_category_and_more'),
                ('registration', '0008_material_auto_deduct_material_category_fix'),
                ('registration', '0009_add_initial_services'),
                ('registration', '0009_service_is_active_create_initial_services'),
                ('registration', '0010_merge_20250531_1658')
            ]
            
            # First delete any of these migrations that might already be in the table
            migration_names = ', '.join([f"'{name}'" for _, name in pending_migrations])
            cursor.execute(f"""
            DELETE FROM django_migrations 
            WHERE app = 'registration' AND name IN ({migration_names});
            """)
            
            # Now insert them as applied
            now = timezone.now()
            for app, name in pending_migrations:
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
                    [app, name, now]
                )
                print(f"Marked {app}.{name} as applied")
        
        print("\nSuccess! All migration issues should be fixed.")
        print("You can now run the server without migration warnings.")
        return True
            
    except Exception as e:
        print(f"Error fixing migrations: {e}")
        return False

if __name__ == "__main__":
    success = fix_all_migrations()
    sys.exit(0 if success else 1)
