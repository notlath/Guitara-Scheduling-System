release: cd guitara && python manage.py migrate && python manage.py collectstatic --noinput
web: cd guitara && daphne -b 0.0.0.0 -p $PORT guitara.asgi:application
