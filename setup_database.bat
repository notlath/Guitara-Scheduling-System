@echo off
echo ===================================================
echo     Guitara Scheduling System Database Setup
echo ===================================================
echo.

REM Check if Python is installed
python --version > nul 2>&1
if %errorlevel% neq 0 (
    echo Python is not installed or not in PATH. Please install Python 3.9 or higher.
    exit /b 1
)

REM Check if pip is installed
pip --version > nul 2>&1
if %errorlevel% neq 0 (
    echo pip is not installed or not in PATH. Please install pip.
    exit /b 1
)

REM Install required packages
echo Installing required packages...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo Failed to install required packages.
    exit /b 1
)
echo.

REM Step 1: Create .env file
echo Step 1: Setting up environment variables...
python create_env_file.py
if %errorlevel% neq 0 (
    echo Failed to create .env file.
    exit /b 1
)
echo.

REM Step 2: Create fresh migrations
echo Step 2: Creating fresh migrations...
python archive\migration_scripts\fresh_migrations.py
if %errorlevel% neq 0 (
    echo Failed to create and apply migrations.
    exit /b 1
)
echo.

REM Step 3: Verify database setup
echo Step 3: Verifying database setup...
python archive\database_scripts\verify_database.py
if %errorlevel% neq 0 (
    echo Failed to verify database setup.
    exit /b 1
)
echo.

REM Step 4: Check WebSocket configuration
echo Step 4: Checking WebSocket configuration...
python archive\websocket_scripts\verify_websocket.py
if %errorlevel% neq 0 (
    echo Failed to verify WebSocket configuration.
    exit /b 1
)
echo.

echo ===================================================
echo     Setup Complete!
echo ===================================================
echo.
echo You can now start the development server with:
echo     python guitara\manage.py runserver
echo.
echo If you want to access the admin interface:
echo     python guitara\manage.py createsuperuser
echo.
echo For more information, see MIGRATION_GUIDE.md
echo.
pause
