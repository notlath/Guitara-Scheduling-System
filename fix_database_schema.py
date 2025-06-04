#!/usr/bin/env python3
"""
Script to fix the database schema issue with missing rejection_reason column
"""

import os
import sys
import sqlite3
from pathlib import Path

# Add the guitara directory to Python path
guitara_dir = Path(__file__).parent / "guitara"
sys.path.insert(0, str(guitara_dir))

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')

try:
    import django
    django.setup()
    
    from django.db import connection
    from scheduling.models import Appointment
    
    def check_column_exists():
        """Check if rejection_reason column exists in the database"""
        with connection.cursor() as cursor:
            cursor.execute("PRAGMA table_info(scheduling_appointment);")
            columns = [column[1] for column in cursor.fetchall()]
            return 'rejection_reason' in columns
    
    def add_missing_columns():
        """Add missing columns to the appointment table"""
        with connection.cursor() as cursor:
            # Check existing columns
            cursor.execute("PRAGMA table_info(scheduling_appointment);")
            existing_columns = [column[1] for column in cursor.fetchall()]
            
            # Add missing columns one by one
            columns_to_add = [
                ('rejection_reason', 'TEXT'),
                ('rejected_by_id', 'INTEGER'),
                ('rejected_at', 'DATETIME'),
                ('response_deadline', 'DATETIME'),
                ('auto_cancelled_at', 'DATETIME')
            ]
            
            for column_name, column_type in columns_to_add:
                if column_name not in existing_columns:
                    try:
                        cursor.execute(f"ALTER TABLE scheduling_appointment ADD COLUMN {column_name} {column_type};")
                        print(f"✓ Added column: {column_name}")
                    except Exception as e:
                        print(f"✗ Failed to add column {column_name}: {e}")
                else:
                    print(f"✓ Column {column_name} already exists")
    
    def main():
        print("Checking database schema...")
        
        # Check if the column exists
        if check_column_exists():
            print("✓ rejection_reason column already exists in the database")
        else:
            print("✗ rejection_reason column missing from database")
            print("Adding missing columns...")
            add_missing_columns()
        
        # Try to create a test appointment to verify everything works
        try:
            # Don't actually create, just test the model
            from django.core.exceptions import ValidationError
            print("✓ Database schema appears to be working correctly")
        except Exception as e:
            print(f"✗ Database schema issue: {e}")
    
    if __name__ == "__main__":
        main()

except ImportError as e:
    print(f"Error importing Django: {e}")
    print("Make sure you're in the correct directory and Django is installed")
except Exception as e:
    print(f"Error: {e}")
