@echo off
title Django Backend Server
cd /d "%~dp0"
call .venv\Scripts\activate.bat
cd guitara
python manage.py runserver 8000 --noreload
pause
