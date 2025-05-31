"""
This script marks problematic migrations as applied in the database without running them.
"""
import os
import django

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from django.db import connection

def mark_migrations_as_applied():
    """Mark the problematic migrations as applied in django_migrations table."""
    with connection.cursor() as cursor:
        # Check if migrations are already applied
        cursor.execute("""
        SELECT * FROM django_migrations 
        WHERE app = 'registration' AND name IN (
            '0008_material_auto_deduct_material_category_and_more',
            '0009_add_initial_services',
            '0009_service_is_active_create_initial_services',
            '0010_merge_20250531_1658',
            '0008_material_auto_deduct_material_category_fix'
        );
        """)
        rows = cursor.fetchall()
        
        if len(rows) < 5:  # If any of these migrations are not applied
            print("Marking migrations as applied...")
            
            # Delete if any of these exist (to avoid duplicates)
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
            
            # Insert migrations as if they were applied
            from django.utils import timezone
            now = timezone.now()
            
            # List of migrations to mark as applied
            migrations_to_apply = [
                ('registration', '0008_material_auto_deduct_material_category_fix', now),
                ('registration', '0009_add_initial_services', now),
                ('registration', '0009_service_is_active_create_initial_services', now),
                ('registration', '0010_merge_20250531_1658', now)
            ]
            
            # Insert each migration
            for app, name, applied in migrations_to_apply:
                cursor.execute(
                    "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, %s)",
                    [app, name, applied]
                )
                print(f"Marked {app}.{name} as applied")
        else:
            print("All migrations are already marked as applied.")

if __name__ == "__main__":
    mark_migrations_as_applied()
    print("Done! The migrations should now be marked as applied.")
    print("You should be able to run the server without migration warnings.")
