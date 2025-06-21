@echo off
echo Starting Django Backend Server...
echo.

REM Navigate to the project directory
cd /d "c:\Users\USer\Downloads\Guitara-Scheduling-System"

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Navigate to Django project directory
cd guitara

REM Start Django server
echo Starting Django server on http://localhost:8000
python manage.py runserver

pause
