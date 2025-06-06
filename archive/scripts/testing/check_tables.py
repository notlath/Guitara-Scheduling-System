import sqlite3
import os

# Database path
db_path = "db.sqlite3"

if os.path.exists(db_path):
    # Connect to the database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # List all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()

        print("Existing tables in database:")
        for table in tables:
            print(f"  - {table[0]}")

        # Check if any scheduling tables exist
        scheduling_tables = [table[0] for table in tables if "scheduling" in table[0]]
        if scheduling_tables:
            print(f"\nFound scheduling tables: {scheduling_tables}")
        else:
            print("\nNo scheduling tables found - migrations need to be run")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
else:
    print(f"Database file {db_path} not found!")
