# Archive Log - June 2, 2025

This log documents the migration and test scripts that were archived on June 2, 2025, after the successful database migration and schema setup.

## Files Moved to Archive

### Migration Scripts

- `fix_migration.py` → `archive/migration_scripts/fix_migration.py`
- `fix_sqlite_migrations.py` → `archive/migration_scripts/fix_sqlite_migrations.py`
- `fresh_migrations.py` → `archive/migration_scripts/fresh_migrations.py`

### Database Scripts

- `check_services.py` → `archive/database_scripts/check_services.py`
- `check_services_and_create.py` → `archive/database_scripts/check_services_and_create.py`
- `verify_database.py` → `archive/database_scripts/verify_database.py`
- `repair_database.py` → `archive/database_scripts/repair_database.py`
- `sync_services.py` → `archive/database_scripts/sync_services.py`
- `add_missing_services.py` → `archive/database_scripts/add_missing_services.py`
- `drop_supabase_tables.py` → `archive/database_scripts/drop_supabase_tables.py`

### WebSocket Scripts

- `check_websocket.py` → `archive/websocket_scripts/check_websocket.py`
- `verify_websocket.py` → `archive/websocket_scripts/verify_websocket.py`

## Reason for Archiving

These scripts were created for one-time database migration and troubleshooting tasks during the transition from PostgreSQL/Supabase to SQLite. Now that the database schema is properly set up and the migrations have been fixed, these scripts are no longer needed for day-to-day development.

The scripts are preserved in the archive directory for future reference in case similar issues arise or if documentation of the migration process is needed.

## Note on Migration Files

The migration files themselves (`.py` files in the `migrations` directories) were not moved, as they are required for Django's migration system to track the database state correctly. Only the utility scripts used to manage the migration process were archived.
