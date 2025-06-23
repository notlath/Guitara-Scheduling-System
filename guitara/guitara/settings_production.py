"""
Production settings for Guitara project.
Inherits from base settings and overrides for production environment.
"""

from .settings import *
import os

# Production settings override
DEBUG = os.environ.get("DEBUG", "False").lower() == "true"

# Security settings for production
SECRET_KEY = os.environ.get("SECRET_KEY", SECRET_KEY)

# Allowed hosts from environment variable
ALLOWED_HOSTS = (
    os.environ.get("ALLOWED_HOSTS", "").split(",")
    if os.environ.get("ALLOWED_HOSTS")
    else ALLOWED_HOSTS
)

# Database configuration for Docker
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("SUPABASE_DB_NAME"),
        "USER": os.environ.get("SUPABASE_DB_USER"),
        "PASSWORD": os.environ.get("SUPABASE_DB_PASSWORD"),
        "HOST": os.environ.get("SUPABASE_DB_HOST"),
        "PORT": "5432",
        "OPTIONS": {
            "connect_timeout": 10,
            "application_name": "guitara_scheduling",
        },
        "ATOMIC_REQUESTS": False,
        "CONN_HEALTH_CHECKS": True,
        "CONN_MAX_AGE": 600,
    }
}

# Redis configuration for Docker
REDIS_URL = os.environ.get("REDIS_URL", "redis://redis:6379/0")

# Channels layer configuration with Redis
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [REDIS_URL],
        },
    },
}

# Celery configuration for Docker
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = "django-db"
CELERY_CACHE_BACKEND = "django-cache"

# Static files configuration for production
STATIC_ROOT = "/app/staticfiles"
MEDIA_ROOT = "/app/media"

# Security settings for production
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = "DENY"
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

# CORS settings for production
CORS_ALLOWED_ORIGINS = [
    "https://yourdomain.com",  # Replace with your frontend domain
    "https://www.yourdomain.com",  # Replace with your frontend domain
]

# Logging configuration for production
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{levelname}] {asctime} {name} {process:d} {thread:d} {message}",
            "style": "{",
        },
        "simple": {
            "format": "[{levelname}] {name}: {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
        "file": {
            "class": "logging.FileHandler",
            "filename": "/app/logs/django.log",
            "formatter": "verbose",
        },
    },
    "loggers": {
        "django": {
            "handlers": ["console", "file"],
            "level": "INFO",
        },
        "guitara": {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": False,
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
