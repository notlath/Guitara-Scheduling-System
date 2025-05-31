"""
This is a utility script to fix migration issues.
Run this script to safely create tables and then apply migrations.
"""

import os
import sys
import django
from django.db import connection

# Set up the Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

def run_direct_sql():
    """Execute direct SQL commands to ensure tables exist."""
    with connection.cursor() as cursor:
        # Check if the service table exists
        cursor.execute("""
        SELECT EXISTS(
            SELECT FROM information_schema.tables 
            WHERE table_name = 'registration_service'
        );
        """)
        service_table_exists = cursor.fetchone()[0]
        
        if not service_table_exists:
            print("Creating registration_service table...")
            # Create the service table with all needed fields
            cursor.execute("""
            CREATE TABLE "registration_service" (
                "id" bigserial NOT NULL PRIMARY KEY,
                "name" varchar(100) NOT NULL DEFAULT 'New Service',
                "description" varchar(255) NOT NULL DEFAULT 'Service description',
                "duration" integer NOT NULL DEFAULT 60,
                "price" numeric(10, 2) NOT NULL DEFAULT 0.00,
                "oil" varchar(100) NULL,
                "is_active" boolean NOT NULL DEFAULT true
            );
            """)
            print("registration_service table created successfully.")
        else:
            print("registration_service table already exists.")
            
            # Check if the is_active column exists
            cursor.execute("""
            SELECT EXISTS(
                SELECT FROM information_schema.columns 
                WHERE table_name = 'registration_service' AND column_name = 'is_active'
            );
            """)
            is_active_exists = cursor.fetchone()[0]
            
            if not is_active_exists:
                print("Adding is_active column...")
                cursor.execute("""
                ALTER TABLE "registration_service" 
                ADD COLUMN "is_active" boolean NOT NULL DEFAULT true;
                """)
                print("is_active column added successfully.")
            
            # Check if the name column exists
            cursor.execute("""
            SELECT EXISTS(
                SELECT FROM information_schema.columns 
                WHERE table_name = 'registration_service' AND column_name = 'name'
            );
            """)
            name_exists = cursor.fetchone()[0]
            
            if not name_exists:
                print("Adding name column...")
                cursor.execute("""
                ALTER TABLE "registration_service" 
                ADD COLUMN "name" varchar(100) NOT NULL DEFAULT 'New Service';
                """)
                print("name column added successfully.")
            
            # Check for other essential columns
            columns = ['description', 'duration', 'price', 'oil']
            defaults = {
                'description': "varchar(255) NOT NULL DEFAULT 'Service description'",
                'duration': "integer NOT NULL DEFAULT 60",
                'price': "numeric(10, 2) NOT NULL DEFAULT 0.00",
                'oil': "varchar(100) NULL"
            }
            
            for column in columns:
                cursor.execute(f"""
                SELECT EXISTS(
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'registration_service' AND column_name = '{column}'
                );
                """)
                col_exists = cursor.fetchone()[0]
                
                if not col_exists:
                    print(f"Adding {column} column...")
                    cursor.execute(f"""
                    ALTER TABLE "registration_service" 
                    ADD COLUMN "{column}" {defaults[column]};
                    """)
                    print(f"{column} column added successfully.")

        # Check and fix django_migrations table
        cursor.execute("""
        SELECT EXISTS(
            SELECT FROM information_schema.tables 
            WHERE table_name = 'django_migrations'
        );
        """)
        migrations_table_exists = cursor.fetchone()[0]
        
        if not migrations_table_exists:
            print("Creating django_migrations table...")
            cursor.execute("""
            CREATE TABLE "django_migrations" (
                "id" bigserial NOT NULL PRIMARY KEY,
                "app" varchar(255) NOT NULL,
                "name" varchar(255) NOT NULL,
                "applied" timestamp with time zone NOT NULL
            );
            """)
            print("django_migrations table created successfully.")
        
        # Check for our problematic migration
        cursor.execute("""
        SELECT EXISTS(
            SELECT FROM django_migrations 
            WHERE app = 'registration' AND name = '0001_initial_services'
        );
        """)
        initial_services_exists = cursor.fetchone()[0]
        
        if not initial_services_exists:
            from django.utils import timezone
            now = timezone.now().isoformat()
            print("Adding 0001_initial_services migration record...")
            cursor.execute(f"""
            INSERT INTO django_migrations (app, name, applied)
            VALUES ('registration', '0001_initial_services', '{now}');
            """)
            print("0001_initial_services migration record added successfully.")

def main():
    try:
        run_direct_sql()
        print("Database tables and migrations have been fixed successfully.")
        print("Now you can run 'python manage.py migrate' to apply remaining migrations.")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
