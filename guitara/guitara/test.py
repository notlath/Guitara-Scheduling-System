import os
import sys
import django
from pathlib import Path

# Add the project directory to the path so Django can find the settings module
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

# Now we can import and use Django settings
from django.conf import settings
import psycopg2

try:
    cfg = settings.DATABASES['default']
    print("Database configuration:", cfg)  # Debugging: Print configuration
    conn = psycopg2.connect(
        dbname=cfg['NAME'],
        user=cfg['USER'],
        password=cfg['PASSWORD'],
        host=cfg['HOST'],
        port=cfg['PORT']
    )
    print("Connected successfully:", conn.status == psycopg2.extensions.STATUS_READY)
except psycopg2.Error as e:
    print("Database connection error:", e)
finally:
    if 'conn' in locals() and conn:
        conn.close()
