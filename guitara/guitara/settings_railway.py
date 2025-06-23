"""
Railway-specific Django settings for Guitara Scheduling System.
This file is optimized for Railway's deployment constraints.
"""

from .settings import *
import os
import re

# Production settings for Railway
DEBUG = os.environ.get("DEBUG", "False").lower() == "true"

# Security settings for Railway
SECRET_KEY = os.environ.get("SECRET_KEY", SECRET_KEY)

# Railway-specific ALLOWED_HOSTS configuration
ALLOWED_HOSTS = []

# Parse ALLOWED_HOSTS from environment variable
if os.environ.get("ALLOWED_HOSTS"):
    ALLOWED_HOSTS.extend(
        [
            host.strip()
            for host in os.environ.get("ALLOWED_HOSTS", "").split(",")
            if host.strip()
        ]
    )

# Auto-detect Railway domains
railway_env = os.environ.get("RAILWAY_ENVIRONMENT")
if railway_env:
    # Add Railway-specific patterns
    railway_service_domain = os.environ.get("RAILWAY_SERVICE_DOMAIN")
    railway_public_domain = os.environ.get("RAILWAY_PUBLIC_DOMAIN")

    if railway_service_domain:
        ALLOWED_HOSTS.append(railway_service_domain)
    if railway_public_domain:
        ALLOWED_HOSTS.append(railway_public_domain)

    # Add common Railway patterns
    ALLOWED_HOSTS.extend(
        [
            "*.up.railway.app",
            "*.railway.app",
        ]
    )

# Always include localhost for health checks
ALLOWED_HOSTS.extend(["127.0.0.1", "localhost"])

# Remove duplicates and empty strings
ALLOWED_HOSTS = list(set([host for host in ALLOWED_HOSTS if host]))

print(f"[RAILWAY SETTINGS] ALLOWED_HOSTS: {ALLOWED_HOSTS}")

# Database configuration for Railway (Supabase)
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
            "sslmode": "require",  # Railway/Supabase requires SSL
        },
        "ATOMIC_REQUESTS": False,
        "CONN_HEALTH_CHECKS": True,
        "CONN_MAX_AGE": 300,  # Shorter connection age for Railway
    }
}

# Redis configuration - Railway doesn't provide Redis by default
REDIS_URL = os.environ.get("REDIS_URL", None)

if REDIS_URL:
    # Use Redis if available (if user added Redis plugin)
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {
                "hosts": [REDIS_URL],
            },
        },
    }
    CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", REDIS_URL)
    CELERY_RESULT_BACKEND = "django-db"
    print(f"[RAILWAY SETTINGS] Using Redis: {REDIS_URL}")
else:
    # Fallback configuration for Railway without Redis
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        },
    }
    # Run Celery tasks synchronously if no broker
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True
    print("[RAILWAY SETTINGS] No Redis - using in-memory channels and eager Celery")

# Static files configuration for Railway
STATIC_ROOT = "/app/staticfiles"
MEDIA_ROOT = "/app/media"
STATIC_URL = "/static/"
MEDIA_URL = "/media/"

# Security settings for Railway production
if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = "DENY"
    SECURE_HSTS_SECONDS = 31536000

    # Only enforce HTTPS if not in Railway development
    if railway_env == "production":
        SECURE_SSL_REDIRECT = True
        SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# CORS settings for Railway
CORS_ALLOWED_ORIGINS = [
    "https://yourdomain.com",
    "https://www.yourdomain.com",
]

# If Railway public domain is set, add it to CORS
railway_public_domain = os.environ.get("RAILWAY_PUBLIC_DOMAIN")
if railway_public_domain:
    CORS_ALLOWED_ORIGINS.append(f"https://{railway_public_domain}")

# Logging configuration optimized for Railway
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "railway": {
            "format": "[{levelname}] {asctime} {name}: {message}",
            "style": "{",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "railway",
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
        "django.db.backends": {
            "handlers": ["console"],
            "level": "WARNING",  # Reduce DB query logs in production
            "propagate": False,
        },
    },
}

# Railway-specific optimizations
if railway_env:
    # Reduce middleware overhead in production
    MIDDLEWARE = [m for m in MIDDLEWARE if "performance_middleware" not in m.lower()]

    # Add only essential performance middleware
    MIDDLEWARE.extend(
        [
            "scheduling.performance_middleware.HealthCheckMiddleware",
        ]
    )

print(f"[RAILWAY SETTINGS] Environment: {railway_env}")
print(f"[RAILWAY SETTINGS] DEBUG: {DEBUG}")
print(f"[RAILWAY SETTINGS] Database: {DATABASES['default']['HOST']}")
