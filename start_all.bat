@echo off
cd guitara
call venv\Scripts\activate
py manage.py makemigrations
py manage.py migrate
start cmd /k "py manage.py runserver"
cd ..\royal-care-frontend
start cmd /k "npm run dev"
start http://localhost:5173/
