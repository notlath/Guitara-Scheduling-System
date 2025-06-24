@echo off
REM =============================================
REM GUITARA DOCKER SETUP SCRIPT (Windows)
REM =============================================

REM Change to project root directory
cd /d "%~dp0\.."

echo.
echo 🐳 Guitara Scheduling System - Docker Setup
echo ==================================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Check if Docker Compose is available
docker compose version >nul 2>&1
if errorlevel 1 (
    docker-compose --version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Docker Compose is not available. Please install Docker Compose.
        pause
        exit /b 1
    )
)

echo ✅ Docker is installed and running

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file from template...
    copy .env.example .env >nul
    echo ✅ .env file created
    echo ⚠️  Please edit .env file with your actual values before running the application
    echo.
) else (
    echo ✅ .env file already exists
)

echo.
echo 🚀 Next steps:
echo 1. Edit .env file with your database and email configuration
echo 2. Run the application:
echo    # For development (with hot reload):
echo    docker\docker-manage.bat dev
echo.
echo    # For production:
echo    docker\docker-manage.bat prod
echo.
echo 3. Access your application at: http://localhost:8000
echo.
echo 🎉 Setup complete!
pause
