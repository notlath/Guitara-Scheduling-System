#!/usr/bin/env python3
"""
Script to fix staff member is_active status directly in the database
"""
import sqlite3
import os
import sys

def fix_staff_status():
    """Fix staff member is_active status in the SQLite database"""
    db_path = os.path.join(os.path.dirname(__file__), 'guitara', 'db.sqlite3')
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found at: {db_path}")
        return False
    
    print(f"🔍 Checking database at: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check current status
        query = """
        SELECT id, username, first_name, last_name, role, is_active
        FROM core_customuser 
        WHERE role IN ('therapist', 'driver')
        ORDER BY first_name
        """
        
        cursor.execute(query)
        results = cursor.fetchall()
        
        print(f"\n👥 Current staff status ({len(results)} members):")
        print("-" * 60)
        
        disabled_members = []
        for row in results:
            id, username, first_name, last_name, role, is_active = row
            status = "ACTIVE" if is_active else "DISABLED"
            print(f"  {first_name:10} {last_name:10} | {role:10} | {status}")
            
            if not is_active:
                disabled_members.append((id, first_name, last_name))
        
        if not disabled_members:
            print(f"\n✅ All staff members are already active!")
            conn.close()
            return True
        
        print(f"\n🔧 Found {len(disabled_members)} disabled staff members.")
        print(f"Would you like to enable them all? (y/n): ", end="")
        
        try:
            response = input().lower().strip()
        except (EOFError, KeyboardInterrupt):
            print("\n❌ Operation cancelled")
            conn.close()
            return False
        
        if response in ['y', 'yes']:
            # Enable all disabled staff
            update_query = """
            UPDATE core_customuser 
            SET is_active = 1 
            WHERE role IN ('therapist', 'driver') AND is_active = 0
            """
            
            cursor.execute(update_query)
            affected_rows = cursor.rowcount
            conn.commit()
            
            print(f"✅ Enabled {affected_rows} staff member(s)")
            
            # Verify the changes
            cursor.execute(query)
            updated_results = cursor.fetchall()
            
            print(f"\n🔍 Updated status:")
            print("-" * 60)
            for row in updated_results:
                id, username, first_name, last_name, role, is_active = row
                status = "ACTIVE" if is_active else "DISABLED"
                print(f"  {first_name:10} {last_name:10} | {role:10} | {status}")
            
        else:
            print(f"ℹ️ No changes made")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = fix_staff_status()
    sys.exit(0 if success else 1)
