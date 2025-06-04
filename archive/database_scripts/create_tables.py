import sqlite3
import os


def create_scheduling_tables():
    """Manually create the scheduling tables with all required columns"""
    db_path = "db.sqlite3"

    if not os.path.exists(db_path):
        print("Database file not found!")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Create scheduling_client table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS scheduling_client (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name VARCHAR(100) NOT NULL,
                last_name VARCHAR(100) NOT NULL,
                email VARCHAR(254),
                phone_number VARCHAR(20) NOT NULL,
                address TEXT NOT NULL,
                notes TEXT,
                created_at DATETIME NOT NULL
            );
        """
        )

        # Create scheduling_availability table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS scheduling_availability (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                is_available BOOLEAN NOT NULL DEFAULT 1,
                FOREIGN KEY (user_id) REFERENCES core_customuser (id),
                UNIQUE (user_id, date, start_time, end_time)
            );
        """
        )

        # Create scheduling_appointment table with all required columns
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS scheduling_appointment (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id INTEGER NOT NULL,
                therapist_id INTEGER,
                driver_id INTEGER,
                operator_id INTEGER,
                date DATE NOT NULL,
                start_time TIME NOT NULL,
                end_time TIME NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid',
                payment_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                location TEXT NOT NULL,
                notes TEXT,
                required_materials TEXT,
                rejection_reason TEXT,
                rejected_by_id INTEGER,
                rejected_at DATETIME,
                response_deadline DATETIME,
                auto_cancelled_at DATETIME,
                created_at DATETIME NOT NULL,
                updated_at DATETIME NOT NULL,
                FOREIGN KEY (client_id) REFERENCES scheduling_client (id),
                FOREIGN KEY (therapist_id) REFERENCES core_customuser (id),
                FOREIGN KEY (driver_id) REFERENCES core_customuser (id),
                FOREIGN KEY (operator_id) REFERENCES core_customuser (id),
                FOREIGN KEY (rejected_by_id) REFERENCES core_customuser (id)
            );
        """
        )

        # Create scheduling_appointment_services junction table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS scheduling_appointment_services (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                appointment_id INTEGER NOT NULL,
                service_id INTEGER NOT NULL,
                FOREIGN KEY (appointment_id) REFERENCES scheduling_appointment (id),
                FOREIGN KEY (service_id) REFERENCES registration_service (id),
                UNIQUE (appointment_id, service_id)
            );
        """
        )

        # Create scheduling_appointmentrejection table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS scheduling_appointmentrejection (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                appointment_id INTEGER NOT NULL UNIQUE,
                rejection_reason TEXT NOT NULL,
                rejected_by_id INTEGER NOT NULL,
                rejected_at DATETIME NOT NULL,
                operator_response VARCHAR(20) NOT NULL DEFAULT 'pending',
                operator_response_reason TEXT,
                reviewed_by_id INTEGER,
                reviewed_at DATETIME,
                FOREIGN KEY (appointment_id) REFERENCES scheduling_appointment (id),
                FOREIGN KEY (rejected_by_id) REFERENCES core_customuser (id),
                FOREIGN KEY (reviewed_by_id) REFERENCES core_customuser (id)
            );
        """
        )

        # Create scheduling_notification table
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS scheduling_notification (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                appointment_id INTEGER,
                notification_type VARCHAR(30) NOT NULL DEFAULT 'appointment_created',
                message TEXT NOT NULL,
                is_read BOOLEAN NOT NULL DEFAULT 0,
                created_at DATETIME NOT NULL,
                rejection_id INTEGER,
                FOREIGN KEY (user_id) REFERENCES core_customuser (id),
                FOREIGN KEY (appointment_id) REFERENCES scheduling_appointment (id),
                FOREIGN KEY (rejection_id) REFERENCES scheduling_appointmentrejection (id)
            );
        """
        )

        # Add migration record to track this manual creation
        cursor.execute(
            """
            INSERT OR IGNORE INTO django_migrations (app, name, applied) 
            VALUES ('scheduling', '0001_initial', datetime('now'));
        """
        )

        cursor.execute(
            """
            INSERT OR IGNORE INTO django_migrations (app, name, applied) 
            VALUES ('scheduling', '0002_appointment_auto_cancelled_at_and_more', datetime('now'));
        """
        )

        conn.commit()
        print(
            "✓ Successfully created all scheduling tables with rejection_reason column!"
        )

        # Verify the tables were created
        cursor.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'scheduling_%';"
        )
        tables = cursor.fetchall()
        print(f"Created tables: {[table[0] for table in tables]}")

        # Verify the rejection_reason column exists
        cursor.execute("PRAGMA table_info(scheduling_appointment);")
        columns = [column[1] for column in cursor.fetchall()]
        if "rejection_reason" in columns:
            print("✓ rejection_reason column is present!")
        else:
            print("✗ rejection_reason column is missing!")

    except Exception as e:
        print(f"Error creating tables: {e}")
        conn.rollback()
    finally:
        conn.close()


if __name__ == "__main__":
    create_scheduling_tables()
