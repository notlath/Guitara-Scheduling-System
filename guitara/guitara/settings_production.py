"""
Production settings for Guitara project.
Inherits from base settings and overrides for production environment.
"""

from .settings import *
import os
import re

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
ALLOWED_HOSTS.extend(
    [
        "*.up.railway.app",
        "*.railway.app",
        "healthcheck.railway.app",  # Railway health check domain
        "127.0.0.1",
        "localhost",
    ]
)

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

    # Debug environment variables
    print(f"[ENV DEBUG] REDIS_URL: {os.environ.get('REDIS_URL', 'NOT SET')[:50]}...")
    print(
        f"[ENV DEBUG] SUPABASE_URL: {os.environ.get('SUPABASE_URL', 'NOT SET')[:50]}..."
    )
    print(
        f"[ENV DEBUG] SUPABASE_SERVICE_KEY: {'SET' if os.environ.get('SUPABASE_SERVICE_KEY') else 'NOT SET'}"
    )
    print(
        f"[ENV DEBUG] All SUPABASE vars: {[k for k in os.environ.keys() if 'SUPABASE' in k]}"
    )
    print(
        f"[ENV DEBUG] CELERY_BROKER_URL: {os.environ.get('CELERY_BROKER_URL', 'NOT SET')[:50]}..."
    )
    print(
        f"[ENV DEBUG] RAILWAY_ENVIRONMENT: {os.environ.get('RAILWAY_ENVIRONMENT', 'NOT SET')}"
    )

    # Database connection test removed - should not block Django startup
    # Database connectivity will be tested when Django actually needs to connect
    print(f"[DB CONFIG] Host: {os.environ.get('SUPABASE_DB_HOST')}")
    print(f"[DB CONFIG] Database: {os.environ.get('SUPABASE_DB_NAME')}")
    print(f"[DB CONFIG] User: {os.environ.get('SUPABASE_DB_USER')}")
    print(
        "[DB CONFIG] Database configuration loaded, connection will be tested on first use"
    )

except Exception as e:
    print(f"[ERROR] Configuration error: {e}")

# Database configuration for Railway production
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("SUPABASE_DB_NAME"),
        "USER": os.environ.get("SUPABASE_DB_USER"),
        "PASSWORD": os.environ.get("SUPABASE_DB_PASSWORD"),
        "HOST": os.environ.get("SUPABASE_DB_HOST"),
        "PORT": "5432",
        "OPTIONS": {
            "connect_timeout": 10,  # Short timeout for Railway health checks
            "application_name": "guitara_scheduling_railway",
            "sslmode": "require",  # Required for Supabase
            "sslcert": None,
            "sslkey": None,
            "sslrootcert": None,
            "options": "-c default_transaction_isolation=read_committed -c statement_timeout=30000",  # 30 second statement timeout
        },
        "ATOMIC_REQUESTS": False,
        "CONN_HEALTH_CHECKS": False,  # Disable for Railway deployment
        "CONN_MAX_AGE": 0,  # Don't reuse connections to avoid timeout issues
        "TEST": {
            "NAME": None,  # Use default test database name
        },
    }
}

# Redis configuration for Railway
REDIS_URL = os.environ.get("REDIS_URL", None)

# Channels layer configuration with Redis fallback
if REDIS_URL:
    try:
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
        print(f"[PRODUCTION SETTINGS] Using Redis for channels: {REDIS_URL[:20]}...")
    except Exception as e:
        print(f"[WARNING] Redis configuration failed: {e}")
        CHANNEL_LAYERS = {
            "default": {
                "BACKEND": "channels.layers.InMemoryChannelLayer",
            },
        }
        print("[PRODUCTION SETTINGS] Falling back to in-memory channel layer")
else:
    # Fallback to in-memory channel layer for Railway deployment
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        },
    }
    print("[PRODUCTION SETTINGS] Using in-memory channel layer (Redis not available)")

# Celery configuration for Railway with Redis fallback
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", REDIS_URL)
if CELERY_BROKER_URL:
    try:
        CELERY_RESULT_BACKEND = "django-db"
        CELERY_CACHE_BACKEND = "django-cache"
        CELERY_ACCEPT_CONTENT = ["application/json"]
        CELERY_TASK_SERIALIZER = "json"
        CELERY_RESULT_SERIALIZER = "json"
        CELERY_TIMEZONE = "UTC"
        CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
        CELERY_BROKER_CONNECTION_RETRY = True
        CELERY_BROKER_CONNECTION_MAX_RETRIES = 10
        print(f"[PRODUCTION SETTINGS] Celery broker: {CELERY_BROKER_URL[:20]}...")
    except Exception as e:
        print(f"[WARNING] Celery configuration failed: {e}")
        CELERY_TASK_ALWAYS_EAGER = True
        CELERY_TASK_EAGER_PROPAGATES = True
        print("[PRODUCTION SETTINGS] Celery running in eager mode (broker failed)")
else:
    # Disable Celery if no Redis/broker available
    CELERY_TASK_ALWAYS_EAGER = True
    CELERY_TASK_EAGER_PROPAGATES = True
    print("[PRODUCTION SETTINGS] Celery running in eager mode (no broker available)")

# Static files configuration for production
STATIC_ROOT = "/app/staticfiles"
STATIC_URL = "/static/"  # This was missing and is required
MEDIA_ROOT = "/app/media"
MEDIA_URL = "/media/"

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
    "https://guitara-scheduling-system.vercel.app",  # Replace with your actual Vercel URL
    "https://your-custom-domain.com",  # If you have a custom domain
    "http://localhost:3000",  # Keep for local development
    "http://localhost:5173",  # Vite dev server
]

# Allow credentials for authentication
CORS_ALLOW_CREDENTIALS = True

# Additional CORS settings for production
CORS_ALLOWED_HEADERS = [
    "accept",
    "accept-encoding",
    "authorization",
    "content-type",
    "dnt",
    "origin",
    "user-agent",
    "x-csrftoken",
    "x-requested-with",
    "cache-control",
]

CORS_ALLOWED_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]

# For development/testing - set to False in final production
CORS_ALLOW_ALL_ORIGINS = False

# Logging configuration for production - use console only for Railway
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
        # File handler removed for Railway deployment - logs go to console
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
        },
        "guitara": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "scheduling": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "channels": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
}
