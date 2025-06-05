# Archive Directory

This directory contains files that were moved from the main project as they appear to be temporary, one-time utility scripts, or are no longer needed for ongoing development.

## Contents

### Migration Scripts (`/migration_scripts`)

- **fix_migrations.py** - One-time utility script to manually fix tables and migrations
- **fix_migration_records.py** - Script to mark problematic migrations as applied without running them
- **comprehensive_migration_fix.py** - A more complete migration fixer script
- **apply_migration.py** - Helper script for applying specific migrations
- **fix_migration.py** - Script to fix inconsistent migration history
- **fix_sqlite_migrations.py** - Script to repair SQLite migration records
- **fresh_migrations.py** - Script to create fresh migrations after database reset
- **run_migrations.py** - Migration execution script with error handling and verbose output

### Database Scripts (`/database_scripts`)

- **check_services.py** - Script to verify service records in the database
- **check_services_and_create.py** - Script to check services and create missing ones
- **verify_database.py** - Script to verify database state and connection
- **repair_database.py** - Script to repair corrupted or inconsistent database state
- **sync_services.py** - Script to synchronize service data between database and code
- **add_missing_services.py** - Script to add missing service records to the database
- **drop_supabase_tables.py** - Script to drop tables from Supabase database
- **create_tables.py** - Manual table creation script for SQLite database
- **fix_db.py** - Database schema repair script to add missing columns
- **create_env_file.py** - Interactive script to create .env file with database credentials
- **django_management.py** - Django management helper for creating superusers and testing APIs
- **fix_database_schema.py** - Schema validation and repair script for appointment table
- **setup_database.bat** - Complete database setup script for Windows automation

### WebSocket Scripts (`/websocket_scripts`)

- **check_websocket.py** - Script to test WebSocket functionality
- **verify_websocket.py** - Script to verify WebSocket connections and handlers

### Test Scripts (`/test_scripts`)

- **simple_db_test.py** - Basic script to test database connection
- **test_services.py** - Script to test Service model functionality
- **fix_imports.py** - Temporary script to fix import issues
- **test_availability_api.py** - Python script to test availability API endpoints for therapists and drivers
- **test-api.html** - HTML-based API connectivity test page for browser testing
- **database_connection_test.py** - Script to verify PostgreSQL/Supabase database connectivity
- **check_tables.py** - SQLite database table verification script
- **check_sqlite_direct.py** - Direct SQLite database connectivity and integrity test script
- **debug_notifications.py** - Django debug script to test notifications model and serializer functionality
- **simple_notifications_test.py** - Simple test script to check notifications endpoint issues
- **test_endpoint_directly.py** - Direct HTTP test of the notifications API endpoint
- **test_notification_features.py** - Comprehensive test script for notification system features
- **test_notification_logic.py** - Direct test of notification logic to identify 500 errors
- **test_notifications.py** - Test script to verify notifications endpoint functionality
- **test_notifications_endpoint.py** - Direct test script for notifications API endpoint
- **test_rejection_flow.py** - Test script to verify appointment rejection workflow
- **test_review_payload.py** - Test script for review rejection endpoint payload handling
- **test_workflow.py** - Comprehensive test suite for appointment assignment and therapist notification workflow

### Frontend Temporary Files (`/frontend_temp`)

- **TestConnection.jsx** - React component used for testing API connections

### Documentation (`/documentation`)

#### Archive Logs

- **archive_log_2025-06-01.md** - Log file documenting which files were archived on June 1, 2025, and why
- **archive_log_2025-06-02.md** - Log file documenting which migration and testing scripts were archived on June 2, 2025
- **archive_log_2025-06-05.md** - Log file documenting which test scripts were archived on June 5, 2025

#### Implementation and Fix Documentation

- **APPOINTMENT_WORKFLOW_IMPLEMENTATION.md** - Documentation of appointment workflow implementation and features
- **AVAILABILITY_FIX_SUMMARY.md** - Summary of therapist availability filtering fixes and implementation
- **IMPLEMENTATION_STATUS.md** - Comprehensive status summary of completed features and implementations
- **MIGRATION_GUIDE.md** - Step-by-step guide for creating fresh migrations for Supabase database
- **NOTIFICATION_FEATURES_IMPLEMENTATION.md** - Complete documentation of enhanced notification system implementation
- **NOTIFICATIONS_FIX_SUMMARY.md** - Fix documentation for operator dashboard notifications 500 error resolution
- **REJECTION_FIX_SUMMARY.md** - Documentation of therapist appointment rejection issue resolution
- **REVIEW_REJECTION_FIX.md** - Fix summary for review rejection field name mismatch between frontend and backend

## Important Note

These files were archived as they appeared to be no longer needed for regular development. However, they are preserved here in case they are needed in the future.

If you encounter any issues after these files were moved, you can either:

1. Move them back to their original location
2. Reference them here for information about how certain problems were fixed previously

## Migration Files

Note that actual migration files were left in place, even if they appeared to be merge migrations or fixes. This is because Django's migration system relies on the complete migration history, and removing these files could cause issues with the database state tracking.
