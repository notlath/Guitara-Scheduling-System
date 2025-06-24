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
print(f"[RAILWAY SETTINGS] Database Host: {os.environ.get('SUPABASE_DB_HOST')}")
print(f"[RAILWAY SETTINGS] Database Name: {os.environ.get('SUPABASE_DB_NAME')}")
print(f"[RAILWAY SETTINGS] Loading fault-tolerant configuration")

# Database configuration for Railway (Supabase) - fault tolerant
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("SUPABASE_DB_NAME"),
        "USER": os.environ.get("SUPABASE_DB_USER"),
        "PASSWORD": os.environ.get("SUPABASE_DB_PASSWORD"),
        "HOST": os.environ.get("SUPABASE_DB_HOST"),
        "PORT": "5432",
        "OPTIONS": {
            "connect_timeout": 60,  # Increased timeout for Railway
            "application_name": "guitara_scheduling_railway",
            "sslmode": "require",  # Railway/Supabase requires SSL
            "options": "-c default_transaction_isolation=read_committed",
        },
        "ATOMIC_REQUESTS": False,
        "CONN_HEALTH_CHECKS": False,  # Disable to prevent startup failures
        "CONN_MAX_AGE": 0,  # Don't reuse connections
        "TEST": {
            "NAME": None,
        },
    }
}

# Redis configuration - Railway doesn't provide Redis by default
# Redis configuration - Railway external Redis with fault tolerance
REDIS_URL = os.environ.get("REDIS_URL", None)

if REDIS_URL:
    try:
        # Use Redis if available and working
        CHANNEL_LAYERS = {
            "default": {
                "BACKEND": "channels_redis.core.RedisChannelLayer",
                "CONFIG": {
                    "hosts": [REDIS_URL],
                    "capacity": 1500,
                    "expiry": 60,
                },
            },
        }

        # Celery with Redis
        CELERY_BROKER_URL = REDIS_URL
        CELERY_RESULT_BACKEND = "django-db"
        CELERY_CACHE_BACKEND = "django-cache"
        CELERY_ACCEPT_CONTENT = ["application/json"]
        CELERY_TASK_SERIALIZER = "json"
        CELERY_RESULT_SERIALIZER = "json"
        CELERY_TIMEZONE = "UTC"
        CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
        CELERY_BROKER_CONNECTION_RETRY = True
        CELERY_BROKER_CONNECTION_MAX_RETRIES = 3  # Reduced for faster startup

        print(f"[RAILWAY SETTINGS] ✅ Redis configured: {REDIS_URL[:30]}...")

    except Exception as e:
        print(f"[RAILWAY SETTINGS] ⚠️ Redis configuration failed: {e}")
        # Fall back to in-memory options
        CHANNEL_LAYERS = {
            "default": {
                "BACKEND": "channels.layers.InMemoryChannelLayer",
            },
        }
        CELERY_TASK_ALWAYS_EAGER = True
        CELERY_TASK_EAGER_PROPAGATES = True
        print("[RAILWAY SETTINGS] Using fallback in-memory configuration")

else:
    # Fallback configuration for Railway without Redis
    print("[RAILWAY SETTINGS] Redis not available - using fallback configuration")

    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        },
    }

    # Run Celery tasks synchronously if no broker
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True

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

print("[RAILWAY SETTINGS] ✅ All Railway settings loaded successfully")
print(f"[RAILWAY SETTINGS] Environment: {railway_env}")
print(f"[RAILWAY SETTINGS] Debug mode: {DEBUG}")
print(f"[RAILWAY SETTINGS] Database engine: {DATABASES['default']['ENGINE']}")
print(f"[RAILWAY SETTINGS] Channel layer: {CHANNEL_LAYERS['default']['BACKEND']}")
