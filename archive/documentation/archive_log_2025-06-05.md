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
