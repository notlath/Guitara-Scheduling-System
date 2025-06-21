#!/usr/bin/env python
"""
Quick Migration Verification Script
Checks if the performance indexes were created successfully
"""

import os
import sys
import django
from pathlib import Path

# Add the guitara directory to Python path
project_root = Path(__file__).parent / "guitara"
sys.path.insert(0, str(project_root))

# Set Django settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")

# Setup Django
django.setup()

from django.db import connection


def check_indexes():
    """Check if performance indexes were created"""
    print("🔍 Checking Database Indexes")
    print("=" * 40)

    try:
        with connection.cursor() as cursor:
            # Check for indexes on scheduling_appointment table
            cursor.execute(
                """
                SELECT 
                    indexname,
                    indexdef
                FROM pg_indexes 
                WHERE tablename = 'scheduling_appointment'
                ORDER BY indexname
            """
            )

            indexes = cursor.fetchall()

            if indexes:
                print(f"✅ Found {len(indexes)} indexes on scheduling_appointment:")
                for idx_name, idx_def in indexes:
                    print(f"   📋 {idx_name}")
                    if (
                        "status" in idx_name
                        or "date" in idx_name
                        or "performance" in idx_name
                    ):
                        print(f"     🚀 OPTIMIZATION INDEX: {idx_def}")
                    else:
                        print(f"     📝 {idx_def[:80]}...")
            else:
                print("❌ No indexes found on scheduling_appointment table")

            # Check if the table exists
            cursor.execute(
                """
                SELECT COUNT(*) 
                FROM information_schema.tables 
                WHERE table_name = 'scheduling_appointment'
            """
            )

            table_exists = cursor.fetchone()[0]
            if table_exists:
                print("\n✅ scheduling_appointment table exists")

                # Check for any data
                cursor.execute("SELECT COUNT(*) FROM scheduling_appointment")
                count = cursor.fetchone()[0]
                print(f"📊 Total appointments: {count}")

                if count > 0:
                    # Test a query that should use our indexes
                    cursor.execute(
                        """
                        EXPLAIN (ANALYZE, BUFFERS) 
                        SELECT id, status, date, client_id, therapist_id 
                        FROM scheduling_appointment 
                        WHERE status = 'pending' 
                        ORDER BY date DESC 
                        LIMIT 10
                    """
                    )

                    explain_result = cursor.fetchall()
                    print("\n🔍 Query Performance Analysis:")
                    for row in explain_result[:3]:  # Show first 3 lines
                        print(f"   {row[0]}")

                    # Check if index is being used
                    explain_text = " ".join([row[0] for row in explain_result])
                    if "Index Scan" in explain_text:
                        print("   ✅ Index is being used!")
                    elif "Seq Scan" in explain_text:
                        print("   ⚠️ Using sequential scan (indexes may not be optimal)")
                    else:
                        print("   📝 Query executed successfully")
                else:
                    print("   ⚠️ No data to test with")
            else:
                print("❌ scheduling_appointment table does not exist")

    except Exception as e:
        print(f"❌ Error checking indexes: {e}")

    print("\n" + "=" * 40)
    print("✅ Index verification complete")


if __name__ == "__main__":
    check_indexes()
