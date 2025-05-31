# Archive Log - June 1, 2025

## Files Moved to Archive

The following files have been moved to the archive directory because they appear to be temporary, one-time utility scripts, or are no longer needed for ongoing development.

### Migration Scripts

- `guitara/fix_migrations.py` → `archive/migration_scripts/fix_migrations.py`
- `guitara/fix_migration_records.py` → `archive/migration_scripts/fix_migration_records.py`
- `guitara/comprehensive_migration_fix.py` → `archive/migration_scripts/comprehensive_migration_fix.py`
- `guitara/apply_migration.py` → `archive/migration_scripts/apply_migration.py`

### Test Scripts

- `guitara/simple_db_test.py` → `archive/test_scripts/simple_db_test.py`
- `guitara/test_services.py` → `archive/test_scripts/test_services.py`
- `guitara/fix_imports.py` → `archive/test_scripts/fix_imports.py`

### Frontend Temporary Files

- `royal-care-frontend/src/TestConnection.jsx` → `archive/frontend_temp/TestConnection.jsx`

## Code Changes

- Updated `royal-care-frontend/src/App.jsx` to remove imports and references to the TestConnection component
- Removed the `/test` route from the frontend application
- Updated `royal-care-frontend/README.md` to change the installation command from `npm install` to `npm install --legacy-peer-deps`

## Notes

- Migration files (like merge migrations) were left in place to avoid disrupting Django's migration system
- The services middleware was kept as it's still referenced in the settings.py file and appears to be in active use
