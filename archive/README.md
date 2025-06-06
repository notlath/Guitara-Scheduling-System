# Archive Directory

This directory contains archived files that were moved from the main project, including temporary utility scripts, documentation fixes, and completed implementations that are no longer needed for ongoing development.

## Directory Structure

### Documentation (`/docs`)

Organized documentation and fix summaries:

#### `/docs/summaries/`
- **frontend_fixes_progress.md** - Progress tracking for frontend fixes
- **testing_plan.md** - Comprehensive testing plan for applied fixes

#### `/docs/fixes/`
- **AVAILABILITY_CREATION_FIX.md** - Fix for availability creation issues
- **AVAILABILITY_DISPLAY_FIX.md** - Fix for availability display problems
- **REACT_INFINITE_LOOP_FIX.md** - Solution for React infinite loop issues
- **WEBSOCKET_FIX_SUMMARY.md** - WebSocket connectivity fixes

#### `/docs/implementation/`
- **LOADING_UX_IMPROVEMENTS.md** - Loading UX enhancement implementation
- **NON_INTRUSIVE_LOADING_SUMMARY.md** - Non-intrusive loading system summary
- **NOTIFICATION_SYSTEM_IMPROVEMENTS.md** - Notification system enhancements

#### `/docs/logs/`
- Empty directory for future log files

### Scripts (`/scripts`)

Organized utility and test scripts:

#### `/scripts/database/`
- Database management and utility scripts

#### `/scripts/migration/`
- **fix_migration.py** - Script to fix inconsistent migration history
- **fix_sqlite_migrations.py** - Script to repair SQLite migration records
- Migration management and repair tools

#### `/scripts/notification/`
- Notification system testing and utility scripts

#### `/scripts/testing/`
- **create_test_user.py** - Test user creation utility
- **test_api.py** - API testing script
- **test_availability_creation.py** - Availability creation tests
- **test_availability_display.py** - Availability display tests
- **TestConnection.jsx** - React component for testing Supabase connection
- **simple_db_test.py** - Basic database connection test
- **test_services.py** - Service model functionality tests
- **fix_imports.py** - Import issue resolution script
- **test_availability_api.py** - Availability API endpoint tests
- **test-api.html** - Browser-based API connectivity test
- **database_connection_test.py** - Database connectivity verification
- **check_tables.py** - SQLite table verification
- **check_sqlite_direct.py** - Direct SQLite connectivity test
- **debug_notifications.py** - Notifications debugging script
- **simple_notifications_test.py** - Basic notifications endpoint test
- **test_notifications.py** - Comprehensive notification tests
- **test_notifications_endpoint.py** - Notification endpoint testing
- **test_notification_features.py** - Notification feature testing
- **test_notification_logic.py** - Notification logic validation
- **test_rejection_flow.py** - Rejection workflow testing
- **test_review_payload.py** - Review payload testing
- **test_workflow.py** - General workflow testing
- **test_endpoint_directly.py** - Direct endpoint testing

#### `/scripts/websocket/`
- **check_websocket.py** - WebSocket functionality testing
- **verify_websocket.py** - WebSocket connection verification
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
