import sqlite3
import os

# Database path
db_path = "db.sqlite3"

if os.path.exists(db_path):
    # Connect to the database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Check if the rejection_reason column exists
        cursor.execute("PRAGMA table_info(scheduling_appointment);")
        columns = [column[1] for column in cursor.fetchall()]

        print("Current columns in scheduling_appointment table:")
        for col in columns:
            print(f"  - {col}")

        if "rejection_reason" not in columns:
            print("\nAdding missing rejection_reason column...")
            cursor.execute(
                "ALTER TABLE scheduling_appointment ADD COLUMN rejection_reason TEXT;"
            )
            print("✓ Added rejection_reason column")
        else:
            print("\n✓ rejection_reason column already exists")

        # Add other missing columns if needed
        missing_columns = [
            ("rejected_by_id", "INTEGER"),
            ("rejected_at", "DATETIME"),
            ("response_deadline", "DATETIME"),
            ("auto_cancelled_at", "DATETIME"),
        ]

        for col_name, col_type in missing_columns:
            if col_name not in columns:
                try:
                    cursor.execute(
                        f"ALTER TABLE scheduling_appointment ADD COLUMN {col_name} {col_type};"
                    )
                    print(f"✓ Added {col_name} column")
                except Exception as e:
                    print(f"✗ Failed to add {col_name}: {e}")

        # Commit changes
        conn.commit()
        print("\n✓ Database schema updated successfully!")

    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()
else:
    print(f"Database file {db_path} not found!")
