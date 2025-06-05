# Archive Log - June 5, 2025

This log documents the test scripts and utility files that were archived on June 5, 2025, during the project cleanup to organize testing utilities, database scripts, and documentation.

## Files Moved to Archive

### Test Scripts

- `test_availability_api.py` → `archive/test_scripts/test_availability_api.py`

  - **Purpose**: Python script to test availability API endpoints for therapists and drivers
  - **Description**: Comprehensive test script that validates API connectivity, response structure, and expected fields for scheduling endpoints
  - **Status**: Functional testing utility for API validation

- `test-api.html` → `archive/test_scripts/test-api.html`

  - **Purpose**: HTML-based API connectivity test page
  - **Description**: Browser-based test interface for checking backend connectivity and basic API endpoint accessibility
  - **Status**: Frontend testing utility for API validation

- `guitara/guitara/test.py` → `archive/test_scripts/database_connection_test.py`

  - **Purpose**: Database connection verification script
  - **Description**: Tests PostgreSQL/Supabase database connectivity using Django settings
  - **Status**: Database connectivity testing utility

- `guitara/check_tables.py` → `archive/test_scripts/check_tables.py`
  - **Purpose**: SQLite database table verification script
  - **Description**: Checks for existing tables in the database and identifies missing scheduling tables
  - **Status**: Database inspection utility

### Database Scripts

- `guitara/create_tables.py` → `archive/database_scripts/create_tables.py`

  - **Purpose**: Manual table creation script for SQLite
  - **Description**: Creates scheduling tables manually if migrations fail
  - **Status**: Database setup utility

- `guitara/fix_db.py` → `archive/database_scripts/fix_db.py`

  - **Purpose**: Database schema repair script
  - **Description**: Adds missing columns to appointment table (e.g., rejection_reason)
  - **Status**: Database repair utility

- `create_env_file.py` → `archive/database_scripts/create_env_file.py`

  - **Purpose**: Environment configuration script
  - **Description**: Interactive script to create .env file with Supabase database credentials
  - **Status**: Setup utility

- `django_management.py` → `archive/database_scripts/django_management.py`

  - **Purpose**: Django management helper script
  - **Description**: Helper script for creating superusers and testing API endpoints
  - **Status**: Management utility

- `fix_database_schema.py` → `archive/database_scripts/fix_database_schema.py`

  - **Purpose**: Schema validation and repair script
  - **Description**: Checks for missing columns and repairs appointment table schema
  - **Status**: Database validation utility

- `setup_database.bat` → `archive/database_scripts/setup_database.bat`
  - **Purpose**: Complete database setup script for Windows
  - **Description**: Automated setup script that handles environment, migrations, and verification
  - **Status**: Setup automation script

### Migration Scripts

- `guitara/run_migrations.py` → `archive/migration_scripts/run_migrations.py`
  - **Purpose**: Migration execution script
  - **Description**: Simple script to run Django migrations with error handling
  - **Status**: Migration utility

## Reason for Archival

These files were moved to the archive because they are:

1. **Testing utilities** - Used for validation and debugging rather than core functionality
2. **Development tools** - Helper scripts for checking system components during development
3. **One-time setup scripts** - Used to set up and configure the system initially
4. **Database repair utilities** - Scripts for fixing specific issues that should not be needed in normal operation
5. **Maintenance tools** - Scripts for database and system maintenance

## Current Status

- All core Django test files remain in their respective app directories (`*/tests.py`)
- Production testing should use Django's built-in testing framework
- Core Django management commands remain in their standard locations (`manage.py`)
- These archived scripts remain available for manual testing, setup, and debugging when needed

## Usage Notes

### Test Scripts

- `test_availability_api.py`: Run with `python test_availability_api.py` (requires requests library)
- `test-api.html`: Open in browser while Django server is running
- `database_connection_test.py`: Run with `python database_connection_test.py` (requires psycopg2)
- `check_tables.py`: Run with `python check_tables.py` from guitara directory

### Database Scripts

- `create_env_file.py`: Run with `python create_env_file.py` for interactive setup
- `django_management.py`: Run with `python django_management.py` for superuser creation and API testing
- `setup_database.bat`: Run on Windows for complete automated setup
- `fix_database_schema.py`: Run with `python fix_database_schema.py` to repair schema issues

### Migration Scripts

- `run_migrations.py`: Run with `python run_migrations.py` to execute migrations with verbose output

## Second Phase - Test Scripts Cleanup (Later on June 5, 2025)

### Additional Test Scripts Moved from Root Directory

During a comprehensive cleanup of the project root directory, the following test and debugging scripts were moved to the archive:

#### Notification Testing Scripts

- `debug_notifications.py` → `archive/test_scripts/debug_notifications.py`

  - **Purpose**: Django debug script to test notifications model and serializer functionality
  - **Description**: Comprehensive debugging tool for the notification system, tests model access, serialization, and viewset functionality
  - **Status**: Debugging utility for notification-related issues

- `simple_notifications_test.py` → `archive/test_scripts/simple_notifications_test.py`

  - **Purpose**: Simple test script to check notifications endpoint issues
  - **Description**: Basic test for notification model import and serialization to identify 500 errors
  - **Status**: Diagnostic tool for notification problems

- `test_endpoint_directly.py` → `archive/test_scripts/test_endpoint_directly.py`

  - **Purpose**: Direct HTTP test of the notifications API endpoint
  - **Description**: Quick test to identify notifications endpoint issues using direct HTTP requests
  - **Status**: API connectivity testing utility

- `test_notification_features.py` → `archive/test_scripts/test_notification_features.py`

  - **Purpose**: Comprehensive test script for notification system features
  - **Description**: Tests all notification features including creation, user management, and counts
  - **Status**: Feature validation testing utility

- `test_notification_logic.py` → `archive/test_scripts/test_notification_logic.py`

  - **Purpose**: Direct test of notification logic to identify 500 errors
  - **Description**: Comprehensive testing of notification models, serializers, and viewsets to diagnose server errors
  - **Status**: Error diagnosis utility

- `test_notifications.py` → `archive/test_scripts/test_notifications.py`

  - **Purpose**: Test script to verify notifications endpoint functionality
  - **Description**: End-to-end test of notifications endpoint with user authentication and cleanup
  - **Status**: Integration testing utility

- `test_notifications_endpoint.py` → `archive/test_scripts/test_notifications_endpoint.py`
  - **Purpose**: Direct test script for notifications API endpoint
  - **Description**: Comprehensive test of notification models, serializers, and viewsets
  - **Status**: API endpoint testing utility

#### Workflow and Rejection Testing Scripts

- `test_rejection_flow.py` → `archive/test_scripts/test_rejection_flow.py`

  - **Purpose**: Test script to verify appointment rejection workflow
  - **Description**: Tests the backend rejection endpoint and validates rejection reason requirements
  - **Status**: Workflow validation testing utility

- `test_review_payload.py` → `archive/test_scripts/test_review_payload.py`

  - **Purpose**: Test script for review rejection endpoint payload handling
  - **Description**: Tests that the review rejection endpoint handles correct payload format
  - **Status**: Payload validation testing utility

- `test_workflow.py` → `archive/test_scripts/test_workflow.py`
  - **Purpose**: Comprehensive test suite for appointment assignment and therapist notification workflow
  - **Description**: Tests complete workflow including timeouts, rejection handling, and notification creation
  - **Status**: End-to-end workflow testing utility

#### Database Testing Scripts

- `check_sqlite_direct.py` → `archive/test_scripts/check_sqlite_direct.py`
  - **Purpose**: Direct SQLite database connectivity and integrity test script
  - **Description**: Tests database connection, table existence, and data integrity without Django
  - **Status**: Database diagnostic utility

### Cleanup Rationale

These scripts were moved to archive because they were:

1. **Temporary debugging tools** - Created to diagnose specific issues during development phases
2. **One-time testing scripts** - Used to verify functionality during implementation but not part of regular testing
3. **Development utilities** - Diagnostic tools that clutter the project root directory
4. **Standalone scripts** - Not integrated into the main Django test suite

### Impact Assessment

- **Project Organization**: Significantly improved by removing 11 test scripts from root directory
- **Functionality**: No impact on regular development - these were diagnostic tools
- **Future Reference**: All scripts preserved in archive with detailed documentation
- **Maintenance**: Easier to maintain project with cleaner root directory structure

### Recovery Instructions

If any of these scripts are needed for future debugging:

1. Scripts are preserved in `archive/test_scripts/` with full functionality
2. Can be copied back to root directory or run from archive location
3. All scripts remain functional and documented for future reference
