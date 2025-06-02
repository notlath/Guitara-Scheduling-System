"""
Direct SQL fix for migration issues.
"""
import sqlite3
import datetime

def execute_fix():
    print("Starting direct SQL fix...")
    
    # Open database connection - use sqlite3 since errors suggest SQLite is being used
    db_path = 'guitara/db.sqlite3'
    conn = None
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if the migrations table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='django_migrations';")
        if not cursor.fetchone():
            print("django_migrations table not found. Cannot continue.")
            return False
            
        # Get a list of current migrations for debugging
        print("Current migrations in database:")
        cursor.execute("SELECT app, name FROM django_migrations WHERE app='registration' ORDER BY id;")
        for app, name in cursor.fetchall():
            print(f"  - {app}.{name}")
            
        # Delete problematic migration records
        print("\nDeleting conflicting migrations...")
        delete_query = """
        DELETE FROM django_migrations 
        WHERE app = 'registration' AND name IN (
            '0008_material_auto_deduct_material_category_and_more',
            '0009_add_initial_services',
            '0009_service_is_active_create_initial_services',
            '0010_merge_20250531_1658',
            '0008_material_auto_deduct_material_category_fix'
        );
        """
        cursor.execute(delete_query)
        print(f"Deleted {cursor.rowcount} migration records.")
        
        # Insert migrations in correct order
        now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')
        print("\nAdding migrations in correct order...")
        migrations_to_apply = [
            ('registration', '0008_material_auto_deduct_material_category_and_more', now),
            ('registration', '0008_material_auto_deduct_material_category_fix', now),
            ('registration', '0009_add_initial_services', now),
            ('registration', '0009_service_is_active_create_initial_services', now),
            ('registration', '0010_merge_20250531_1658', now)
        ]
        
        for app, name, applied in migrations_to_apply:
            insert_query = "INSERT INTO django_migrations (app, name, applied) VALUES (?, ?, ?);"
            cursor.execute(insert_query, [app, name, applied])
            print(f"Added {app}.{name} as applied")
            
        # Commit changes
        conn.commit()
        print("\nVerifying migrations...")
        
        cursor.execute("SELECT app, name FROM django_migrations WHERE app='registration' ORDER BY id;")
        print("\nUpdated migrations in database:")
        for app, name in cursor.fetchall():
            print(f"  - {app}.{name}")
            
        return True
        
    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    if execute_fix():
        print("\nSuccess! You should now be able to run makemigrations and migrate without errors.")
        print("Try running: cd guitara && python manage.py makemigrations")
    else:
        print("\nFailed to fix migrations. Please check the error messages above.")
