@echo off
title Django Backend Server
cd /d "%~dp0"
call .venv\Scripts\activate.bat
cd guitara
echo Running migrations...
python manage.py makemigrations
python manage.py migrate --run-syncdb
echo Starting Django development server...
python manage.py runserver 8000 --noreload
pause
