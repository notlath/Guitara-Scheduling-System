"""
Docker-specific Django settings for Guitara Scheduling System.
This file extends the base settings for containerized deployment.
"""

from .settings import *
import os

# Override specific settings for Docker environment
DEBUG = os.environ.get("DEBUG", "False").lower() == "true"

# Security settings for Docker
ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "web",  # Docker service name
    os.environ.get("ALLOWED_HOST", ""),
]

# Remove empty strings
ALLOWED_HOSTS = [host for host in ALLOWED_HOSTS if host]

# Database configuration for Docker
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("SUPABASE_DB_NAME", "guitara_db"),
        "USER": os.environ.get("SUPABASE_DB_USER", "postgres"),
        "PASSWORD": os.environ.get("SUPABASE_DB_PASSWORD", "postgres"),
        "HOST": os.environ.get("SUPABASE_DB_HOST", "postgres"),
        "PORT": "5432",
        "OPTIONS": {
            "connect_timeout": 5,
            "application_name": "guitara_scheduling_docker",
            "sslmode": "require",
        },
        "CONN_MAX_AGE": 0,
    }
}

# Redis configuration for Docker
REDIS_URL = os.environ.get(
    "REDIS_URL",
    "redis://default:OZAurZgciODtPejgVDYSJHQtODNQDTBj@trolley.proxy.rlwy.net:12062",
)
CELERY_BROKER_URL = os.environ.get(
    "CELERY_BROKER_URL",
    "redis://default:OZAurZgciODtPejgVDYSJHQtODNQDTBj@trolley.proxy.rlwy.net:12062",
)

# Channel layers for Docker
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [REDIS_URL],
        },
    },
}

# Static and Media files for Docker
STATIC_ROOT = "/app/staticfiles"
MEDIA_ROOT = "/app/media"

# Logging configuration for Docker
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "[{levelname}] {asctime} {name} {process:d} {thread:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "guitara": {
            "handlers": ["console"],
            "level": "DEBUG" if DEBUG else "INFO",
            "propagate": False,
        },
    },
}

print(f"[DOCKER SETTINGS] DEBUG: {DEBUG}")
print(f"[DOCKER SETTINGS] DATABASE: {DATABASES['default']['HOST']}")
print(f"[DOCKER SETTINGS] REDIS: {REDIS_URL}")
