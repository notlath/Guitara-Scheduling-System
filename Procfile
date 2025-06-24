release: python manage.py migrate && python manage.py collectstatic --noinput
web: daphne -b 0.0.0.0 -p $PORT guitara.asgi:application
