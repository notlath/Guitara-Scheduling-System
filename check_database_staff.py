#!/usr/bin/env python3
"""
Simple script to examine staff data in the database
"""
import sqlite3
import os
import json

def check_database_staff():
    """Check staff data directly in the SQLite database"""
    db_path = os.path.join(os.path.dirname(__file__), 'guitara', 'db.sqlite3')
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found at: {db_path}")
        return
    
    print(f"🔍 Checking database at: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get staff members (therapists and drivers)
        query = """
        SELECT id, username, first_name, last_name, role, is_active, is_staff, is_superuser
        FROM core_customuser 
        WHERE role IN ('therapist', 'driver')
        ORDER BY first_name
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        
        print(f"\n👥 Found {len(results)} staff members:")
        print("-" * 80)
        
        for row in results:
            id, username, first_name, last_name, role, is_active, is_staff, is_superuser = row
            status = "ACTIVE" if is_active else "DISABLED"
            print(f"ID: {id:2} | {first_name:10} {last_name:10} | {role:10} | {status:8} | is_active: {is_active}")
        
        # Summary
        active_count = sum(1 for row in results if row[5])  # is_active is index 5
        disabled_count = len(results) - active_count
        
        print("-" * 80)
        print(f"Summary: {active_count} ACTIVE, {disabled_count} DISABLED")
        
        if disabled_count > 0:
            print(f"\n🔧 To enable all disabled staff members, run:")
            print(f"UPDATE core_customuser SET is_active = 1 WHERE role IN ('therapist', 'driver') AND is_active = 0;")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_database_staff()
