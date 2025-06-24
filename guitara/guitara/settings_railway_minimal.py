"""
Minimal Railway settings that prioritize successful startup
"""

import os

# Import base settings
from .settings import *

print(f"[MINIMAL RAILWAY] Loading minimal Railway configuration")

# Override settings that might cause startup issues
DEBUG = os.environ.get("DEBUG", "False").lower() == "true"
SECRET_KEY = os.environ.get("SECRET_KEY", SECRET_KEY)

# Minimal ALLOWED_HOSTS
ALLOWED_HOSTS = []
if os.environ.get("ALLOWED_HOSTS"):
    ALLOWED_HOSTS.extend([
        host.strip() 
        for host in os.environ.get("ALLOWED_HOSTS", "").split(",") 
        if host.strip()
    ])

# Add Railway patterns
ALLOWED_HOSTS.extend([
    "*.up.railway.app",
    "*.railway.app",
    "127.0.0.1",
    "localhost",
])

# Remove duplicates
ALLOWED_HOSTS = list(set([host for host in ALLOWED_HOSTS if host]))

print(f"[MINIMAL RAILWAY] ALLOWED_HOSTS: {ALLOWED_HOSTS}")

# Minimal database configuration
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("SUPABASE_DB_NAME"),
        "USER": os.environ.get("SUPABASE_DB_USER"),
        "PASSWORD": os.environ.get("SUPABASE_DB_PASSWORD"),
        "HOST": os.environ.get("SUPABASE_DB_HOST"),
        "PORT": "5432",
        "OPTIONS": {
            "connect_timeout": 60,
            "application_name": "guitara_scheduling_railway",
            "sslmode": "require",
        },
        "ATOMIC_REQUESTS": False,
        "CONN_HEALTH_CHECKS": False,  # Disable to prevent startup failures
        "CONN_MAX_AGE": 0,
        "TEST": {"NAME": None},
    }
}

# Disable problematic middleware for startup
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # Removed performance middleware that might cause issues
]

# Minimal channels configuration
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}

# Disable Celery for minimal startup
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

# Static files
STATIC_ROOT = "/app/staticfiles"
STATIC_URL = "/static/"
MEDIA_ROOT = "/app/media"
MEDIA_URL = "/media/"

# Minimal CORS settings
CORS_ALLOW_ALL_ORIGINS = True  # Temporarily allow all for testing
CORS_ALLOW_CREDENTIALS = True

# Minimal logging
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}

print(f"[MINIMAL RAILWAY] ✅ Minimal Railway settings loaded")
print(f"[MINIMAL RAILWAY] Database: {os.environ.get('SUPABASE_DB_HOST')}")
print(f"[MINIMAL RAILWAY] Debug: {DEBUG}")
