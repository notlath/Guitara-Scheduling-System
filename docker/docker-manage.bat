@echo off
REM =============================================
REM GUITARA DOCKER MANAGEMENT SCRIPT (Windows)
REM =============================================

REM Change to project root directory
cd /d "%~dp0\.."

set COMPOSE_FILE=docker-compose.yml
set DEV_COMPOSE_FILE=docker\docker-compose.dev.yml
set PROD_COMPOSE_FILE=docker\docker-compose.prod.yml

if "%1"=="" goto help
if "%1"=="help" goto help
if "%1"=="--help" goto help
if "%1"=="-h" goto help

if "%1"=="build" goto build
if "%1"=="up" goto up
if "%1"=="dev" goto dev
if "%1"=="prod" goto prod
if "%1"=="down" goto down
if "%1"=="logs" goto logs
if "%1"=="shell" goto shell
if "%1"=="migrate" goto migrate
if "%1"=="test" goto test
if "%1"=="clean" goto clean

echo Unknown command: %1
echo.
goto help

:build
echo Building Docker images...
docker-compose -f %COMPOSE_FILE% build
goto :eof

:up
echo Starting Guitara services...
docker-compose -f %COMPOSE_FILE% up -d
echo Services started. Access the application at http://localhost:8000
goto :eof

:dev
echo Starting Guitara services in development mode...
docker-compose -f %COMPOSE_FILE% -f %DEV_COMPOSE_FILE% up -d
echo Development services started. Access the application at http://localhost:8000
goto :eof

:prod
echo Starting Guitara services in production mode...
docker-compose -f %COMPOSE_FILE% -f %PROD_COMPOSE_FILE% up -d
echo Production services started. Access the application at http://localhost:8000
goto :eof

:down
echo Stopping Guitara services...
docker-compose -f %COMPOSE_FILE% -f %DEV_COMPOSE_FILE% -f %PROD_COMPOSE_FILE% down
goto :eof

:logs
if "%2"=="" (
    docker-compose -f %COMPOSE_FILE% logs -f
) else (
    docker-compose -f %COMPOSE_FILE% logs -f %2
)
goto :eof

:shell
echo Opening Django shell...
docker-compose -f %COMPOSE_FILE% exec web python manage.py shell
goto :eof

:migrate
echo Running Django migrations...
docker-compose -f %COMPOSE_FILE% exec web python manage.py migrate
goto :eof

:test
echo Running Django tests...
docker-compose -f %COMPOSE_FILE% exec web python manage.py test
goto :eof

:clean
echo Cleaning up Docker resources...
docker-compose -f %COMPOSE_FILE% -f %DEV_COMPOSE_FILE% -f %PROD_COMPOSE_FILE% down --volumes --remove-orphans
docker system prune -f
goto :eof

:help
echo.
echo Guitara Docker Management Script
echo =================================
echo.
echo Usage: %0 [COMMAND]
echo.
echo Commands:
echo   build     - Build Docker images
echo   up        - Start all services
echo   dev       - Start services in development mode (with volume mounts)
echo   prod      - Start services in production mode
echo   down      - Stop all services
echo   logs      - Show logs for all services
echo   shell     - Open Django shell in web container
echo   migrate   - Run Django migrations
echo   test      - Run Django tests
echo   clean     - Clean up Docker images and volumes
echo   help      - Show this help message
echo.
echo Examples:
echo   %0 dev              # Start in development mode
echo   %0 prod             # Start in production mode
echo   %0 logs web         # Show logs for web service only
echo   %0 shell            # Access Django shell
echo.
goto :eof
