# Generated by Django 4.2.x on 2025-06-19 12:00

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("scheduling", "0001_initial"),
    ]

    operations = [
        # Appointment Model Performance Indexes
        migrations.RunSQL(
            sql=[
                # Composite indexes for common filtering patterns
                "CREATE INDEX idx_appointments_status_date ON scheduling_appointment(status, date);",
                "CREATE INDEX idx_appointments_therapist_date_status ON scheduling_appointment(therapist_id, date, status);",
                "CREATE INDEX idx_appointments_driver_date_status ON scheduling_appointment(driver_id, date, status);",
                "CREATE INDEX idx_appointments_date_start_time ON scheduling_appointment(date, start_time);",
                "CREATE INDEX idx_appointments_date_range ON scheduling_appointment(date, start_time, end_time);",
                # Status-based partial indexes for frequently queried statuses
                "CREATE INDEX idx_appointments_pending_status ON scheduling_appointment(status) WHERE status = 'pending';",
                "CREATE INDEX idx_appointments_active_statuses ON scheduling_appointment(status) WHERE status IN ('pending', 'confirmed', 'in_progress');",
                # Time-range queries for conflict detection
                "CREATE INDEX idx_appointments_therapist_time_conflicts ON scheduling_appointment(therapist_id, date, start_time, end_time) WHERE status IN ('pending', 'confirmed', 'in_progress');",
                "CREATE INDEX idx_appointments_driver_time_conflicts ON scheduling_appointment(driver_id, date, start_time, end_time) WHERE status IN ('pending', 'confirmed', 'in_progress');",
                # Real-time query optimizations - Fixed: Removed CURRENT_DATE functions
                "CREATE INDEX idx_appointments_today ON scheduling_appointment(date);",
                "CREATE INDEX idx_appointments_upcoming ON scheduling_appointment(date, status) WHERE status IN ('pending', 'confirmed');",
                # Overdue appointments for auto-cancellation - Fixed: Removed NOW() function
                "CREATE INDEX idx_appointments_overdue ON scheduling_appointment(status, response_deadline) WHERE status = 'pending';",
                # Pickup request optimizations
                "CREATE INDEX idx_appointments_pickup_requests ON scheduling_appointment(pickup_requested, pickup_request_time, status) WHERE pickup_requested = true;",
                "CREATE INDEX idx_appointments_pickup_urgency ON scheduling_appointment(pickup_urgency, pickup_request_time) WHERE pickup_requested = true;",
                # Dual acceptance tracking
                "CREATE INDEX idx_appointments_therapist_acceptance ON scheduling_appointment(therapist_accepted, therapist_accepted_at, status);",
                "CREATE INDEX idx_appointments_driver_acceptance ON scheduling_appointment(driver_accepted, driver_accepted_at, status);",
                # Group appointments
                "CREATE INDEX idx_appointments_group_confirmation ON scheduling_appointment(group_confirmation_complete, group_size, status) WHERE group_size > 1;",
                "CREATE INDEX idx_appointments_requires_car ON scheduling_appointment(requires_car, status) WHERE requires_car = true;",
                # Auto-assignment eligibility
                "CREATE INDEX idx_appointments_auto_assignment ON scheduling_appointment(auto_assignment_eligible, status) WHERE auto_assignment_eligible = true;",
            ],
            reverse_sql=[
                "DROP INDEX IF EXISTS idx_appointments_status_date;",
                "DROP INDEX IF EXISTS idx_appointments_therapist_date_status;",
                "DROP INDEX IF EXISTS idx_appointments_driver_date_status;",
                "DROP INDEX IF EXISTS idx_appointments_date_start_time;",
                "DROP INDEX IF EXISTS idx_appointments_date_range;",
                "DROP INDEX IF EXISTS idx_appointments_pending_status;",
                "DROP INDEX IF EXISTS idx_appointments_active_statuses;",
                "DROP INDEX IF EXISTS idx_appointments_therapist_time_conflicts;",
                "DROP INDEX IF EXISTS idx_appointments_driver_time_conflicts;",
                "DROP INDEX IF EXISTS idx_appointments_today;",
                "DROP INDEX IF EXISTS idx_appointments_upcoming;",
                "DROP INDEX IF EXISTS idx_appointments_overdue;",
                "DROP INDEX IF EXISTS idx_appointments_pickup_requests;",
                "DROP INDEX IF EXISTS idx_appointments_pickup_urgency;",
                "DROP INDEX IF EXISTS idx_appointments_therapist_acceptance;",
                "DROP INDEX IF EXISTS idx_appointments_driver_acceptance;",
                "DROP INDEX IF EXISTS idx_appointments_group_confirmation;",
                "DROP INDEX IF EXISTS idx_appointments_requires_car;",
                "DROP INDEX IF EXISTS idx_appointments_auto_assignment;",
            ],
        ),
        # Availability Model Performance Indexes
        migrations.RunSQL(
            sql=[
                # User availability by date range
                "CREATE INDEX idx_availability_user_date_time ON scheduling_availability(user_id, date, start_time, end_time);",
                "CREATE INDEX idx_availability_user_date_available ON scheduling_availability(user_id, date, is_available);",
                "CREATE INDEX idx_availability_date_time_range ON scheduling_availability(date, start_time, end_time, is_available);",
                # Availability lookup optimization
                "CREATE INDEX idx_availability_available_only ON scheduling_availability(user_id, date, start_time, end_time) WHERE is_available = true;",
            ],
            reverse_sql=[
                "DROP INDEX IF EXISTS idx_availability_user_date_time;",
                "DROP INDEX IF EXISTS idx_availability_user_date_available;",
                "DROP INDEX IF EXISTS idx_availability_date_time_range;",
                "DROP INDEX IF EXISTS idx_availability_available_only;",
            ],
        ),
        # Notification Model Performance Indexes
        migrations.RunSQL(
            sql=[
                # User notifications by read status
                "CREATE INDEX idx_notifications_user_unread ON scheduling_notification(user_id, is_read, created_at);",
                "CREATE INDEX idx_notifications_user_unread_only ON scheduling_notification(user_id, created_at) WHERE is_read = false;",
                # Appointment-specific notifications
                "CREATE INDEX idx_notifications_appointment ON scheduling_notification(appointment_id, notification_type, created_at);",
                # Notification type filtering
                "CREATE INDEX idx_notifications_type_created ON scheduling_notification(notification_type, created_at);",
            ],
            reverse_sql=[
                "DROP INDEX IF EXISTS idx_notifications_user_unread;",
                "DROP INDEX IF EXISTS idx_notifications_user_unread_only;",
                "DROP INDEX IF EXISTS idx_notifications_appointment;",
                "DROP INDEX IF EXISTS idx_notifications_type_created;",
            ],
        ),
        # Multi-Therapist Appointment Support
        migrations.RunSQL(
            sql=[
                # Therapist assignment queries
                "CREATE INDEX idx_appointment_therapists ON scheduling_appointment_therapists(appointment_id, customuser_id);",
                "CREATE INDEX idx_therapist_appointments ON scheduling_appointment_therapists(customuser_id, appointment_id);",
            ],
            reverse_sql=[
                "DROP INDEX IF EXISTS idx_appointment_therapists;",
                "DROP INDEX IF EXISTS idx_therapist_appointments;",
            ],
        ),
        # Client Model Performance Indexes
        migrations.RunSQL(
            sql=[
                # Client search optimization
                "CREATE INDEX idx_clients_name_search ON scheduling_client(first_name, last_name);",
                "CREATE INDEX idx_clients_phone_search ON scheduling_client(phone_number);",
                "CREATE INDEX idx_clients_email_search ON scheduling_client(email) WHERE email IS NOT NULL;",
                "CREATE INDEX idx_clients_created_at ON scheduling_client(created_at);",
            ],
            reverse_sql=[
                "DROP INDEX IF EXISTS idx_clients_name_search;",
                "DROP INDEX IF EXISTS idx_clients_phone_search;",
                "DROP INDEX IF EXISTS idx_clients_email_search;",
                "DROP INDEX IF EXISTS idx_clients_created_at;",
            ],
        ),
    ]