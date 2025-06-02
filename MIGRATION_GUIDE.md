# Fresh Migrations for Supabase Database

This guide provides step-by-step instructions to create fresh migrations for your Supabase PostgreSQL database after dropping it.

## Prerequisites

1. Make sure you have access to your Supabase database
2. Python 3.9+ and Django 4.0+ installed
3. All required Python packages installed
4. A fresh/reset Supabase database

## Step 1: Set Up Environment Variables

First, run the script to create your .env file:

```bash
python create_env_file.py
```

This will prompt you for your Supabase database credentials and create a `.env` file in the `guitara` directory.

## Step 2: Create Fresh Migrations

Run the migration reset script to:

- Clear all existing migrations
- Create fresh migrations
- Create a data migration for initial services
- Apply migrations to your database

```bash
python archive\migration_scripts\fresh_migrations.py
```

This script will:

1. Remove all existing migration files (except `__init__.py`)
2. Create new migration files for each app
3. Create a data migration file to add initial services with specific IDs
4. Apply all migrations to your database

## Step 3: Verify Database Setup

After running migrations, verify that the database is set up correctly:

```bash
python archive\database_scripts\verify_database.py
```

This will show:

- All services created in the database
- List of all models and their table names
- Database connection test results
- List of all tables in your database

## Step 4: Start Your Development Server

Once everything is set up, you can start your development server:

```bash
cd guitara
python manage.py runserver
```

## Note About Scripts

> **Important**: Many of the utility scripts referenced in this guide have been moved to the `/archive` directory for better organization. This includes:
>
> - Migration scripts are now in `/archive/migration_scripts/`
> - Database verification tools are in `/archive/database_scripts/`
> - WebSocket verification tools are in `/archive/websocket_scripts/`
>
> The paths in this guide have been updated to reflect these changes, but if you're using an older version of the guide, adjust the paths accordingly.

## Troubleshooting

### Missing Tables or Services

If any tables or services are missing after running migrations:

1. Check the Django console output for errors
2. Verify your Supabase connection details in `.env`
3. Make sure all apps are included in `INSTALLED_APPS` in `settings.py`

### Migration Errors

If you encounter migration errors:

1. Double-check your database credentials
2. Make sure your Supabase database is empty
3. Check that all model dependencies are correctly configured

### WebSocket Connectivity Issues

If WebSocket connections fail after successful migrations:

1. Check that your ASGI application is configured correctly
2. Ensure Channels is properly installed and configured
3. Verify that the WebSocket URL in the frontend matches your backend

## Important Notes

- The initial data migration creates 7 predefined services with specific IDs to match frontend expectations
- If you need to add more initial data, consider creating additional data migrations
