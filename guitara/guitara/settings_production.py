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

# Allowed hosts from environment variable - Railway deployment support
RAILWAY_STATIC_URL = os.environ.get("RAILWAY_STATIC_URL", "")
RAILWAY_PUBLIC_DOMAIN = os.environ.get("RAILWAY_PUBLIC_DOMAIN", "")

ALLOWED_HOSTS = []
if os.environ.get("ALLOWED_HOSTS"):
    ALLOWED_HOSTS.extend(
        [
            host.strip()
            for host in os.environ.get("ALLOWED_HOSTS", "").split(",")
            if host.strip()
        ]
    )

# Add Railway domains automatically
if RAILWAY_STATIC_URL:
    # Extract domain from Railway static URL
    import re

    domain_match = re.search(r"https?://([^/]+)", RAILWAY_STATIC_URL)
    if domain_match:
        ALLOWED_HOSTS.append(domain_match.group(1))

if RAILWAY_PUBLIC_DOMAIN:
    ALLOWED_HOSTS.append(RAILWAY_PUBLIC_DOMAIN)

# Add common Railway patterns
ALLOWED_HOSTS.extend(["*.up.railway.app", "*.railway.app", "127.0.0.1", "localhost"])

# Remove duplicates and empty strings
ALLOWED_HOSTS = list(set([host for host in ALLOWED_HOSTS if host]))

print(f"[PRODUCTION SETTINGS] ALLOWED_HOSTS: {ALLOWED_HOSTS}")

# Database connection error handling
try:
    # Validate required database environment variables
    required_db_vars = [
        "SUPABASE_DB_NAME",
        "SUPABASE_DB_USER",
        "SUPABASE_DB_PASSWORD",
        "SUPABASE_DB_HOST",
    ]
    missing_vars = [var for var in required_db_vars if not os.environ.get(var)]

    if missing_vars:
        print(
            f"[ERROR] Missing required database environment variables: {missing_vars}"
        )
        print("[ERROR] Application will not be able to connect to database")
    else:
        print(f"[SUCCESS] All required database environment variables are present")
        print(f"[DB CONFIG] Host: {os.environ.get('SUPABASE_DB_HOST')}")
        print(f"[DB CONFIG] Database: {os.environ.get('SUPABASE_DB_NAME')}")
        print(f"[DB CONFIG] User: {os.environ.get('SUPABASE_DB_USER')}")

except Exception as e:
    print(f"[ERROR] Database configuration error: {e}")

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
            "connect_timeout": 30,
            "application_name": "guitara_scheduling_railway",
        },
        "ATOMIC_REQUESTS": False,
        "CONN_HEALTH_CHECKS": True,
        "CONN_MAX_AGE": 300,  # Reduced for Railway
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
