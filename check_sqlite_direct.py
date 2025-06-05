#!/usr/bin/env python
"""
Direct SQLite test to check database status
"""
import sqlite3
import os

db_path = r"c:\Users\USer\Downloads\Guitara-Scheduling-System\guitara\db.sqlite3"

print(f"Checking database at: {db_path}")
print(f"File exists: {os.path.exists(db_path)}")

if os.path.exists(db_path):
    print(f"File size: {os.path.getsize(db_path)} bytes")
    
    try:
        # Try to connect to the database
        print("Attempting to connect to SQLite database...")
        conn = sqlite3.connect(db_path, timeout=5.0)
        print("✓ Connected successfully")
        
        # Try a simple query
        cursor = conn.cursor()
        print("Testing basic query...")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"✓ Found {len(tables)} tables")
        for table in tables:
            print(f"  - {table[0]}")
        
        # Check if notifications table exists
        cursor.execute("SELECT count(*) FROM scheduling_notification;")
        count = cursor.fetchone()[0]
        print(f"✓ Notifications table has {count} records")
        
        # Check if users table exists  
        cursor.execute("SELECT count(*) FROM core_customuser;")
        user_count = cursor.fetchone()[0]
        print(f"✓ Users table has {user_count} records")
        
        cursor.close()
        conn.close()
        print("✓ Database connection closed successfully")
        
    except sqlite3.OperationalError as e:
        print(f"✗ SQLite Operational Error: {e}")
    except Exception as e:
        print(f"✗ Database error: {e}")
else:
    print("✗ Database file does not exist!")
