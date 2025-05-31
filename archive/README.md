# Archive Directory

This directory contains files that were moved from the main project as they appear to be temporary, one-time utility scripts, or are no longer needed for ongoing development.

## Contents

### Migration Scripts (`/migration_scripts`)

- **fix_migrations.py** - One-time utility script to manually fix tables and migrations
- **fix_migration_records.py** - Script to mark problematic migrations as applied without running them
- **comprehensive_migration_fix.py** - A more complete migration fixer script
- **apply_migration.py** - Helper script for applying specific migrations

### Test Scripts (`/test_scripts`)

- **simple_db_test.py** - Basic script to test database connection
- **test_services.py** - Script to test Service model functionality
- **fix_imports.py** - Temporary script to fix import issues

### Frontend Temporary Files (`/frontend_temp`)

- **TestConnection.jsx** - React component used for testing API connections

## Important Note

These files were archived on June 1, 2025, as they appeared to be no longer needed for regular development. However, they are preserved here in case they are needed in the future.

If you encounter any issues after these files were moved, you can either:

1. Move them back to their original location
2. Reference them here for information about how certain problems were fixed previously

## Migration Files

Note that actual migration files were left in place, even if they appeared to be merge migrations or fixes. This is because Django's migration system relies on the complete migration history, and removing these files could cause issues with the database state tracking.
