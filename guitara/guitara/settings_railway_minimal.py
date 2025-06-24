"""
Ultra-minimal Railway settings for fastest possible startup
NO base settings import to avoid performance middleware
"""

import os
from pathlib import Path

print(f"[ULTRA-MINIMAL RAILWAY] Loading ultra-minimal Railway configuration")

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Security settings
SECRET_KEY = os.environ.get(
    "SECRET_KEY", "railway-ultra-minimal-key-change-in-production"
)
DEBUG = os.environ.get("DEBUG", "False").lower() == "true"

# Ultra-minimal ALLOWED_HOSTS
ALLOWED_HOSTS = [
    "charismatic-appreciation-production.up.railway.app",
    "localhost",
    "127.0.0.1",
    "testserver",
    "healthcheck.railway.app",
    "*.up.railway.app",
    "*.railway.app",
]

# Parse additional hosts from environment
if os.environ.get("ALLOWED_HOSTS"):
    ALLOWED_HOSTS.extend(
        [
            host.strip()
            for host in os.environ.get("ALLOWED_HOSTS", "").split(",")
            if host.strip()
        ]
    )

# Remove duplicates
ALLOWED_HOSTS = list(set([host for host in ALLOWED_HOSTS if host]))

print(f"[ULTRA-MINIMAL RAILWAY] ALLOWED_HOSTS: {ALLOWED_HOSTS}")

# Ultra-minimal application definition - only essential apps + required for URLs
INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "knox",  # Required for authentication
    "django_filters",  # Required for filtering
    # Required apps for URL routing to work
    "core",
    "authentication",
    "registration",
    "scheduling",
    "attendance",
    "inventory",
]

# Ultra-minimal middleware - NO performance middleware that blocks health checks
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]

ROOT_URLCONF = "guitara.urls_minimal"

# Templates
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "guitara.wsgi.application"
ASGI_APPLICATION = "guitara.asgi_minimal.application"
# Database - Use environment variables with ultra-fast settings
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("SUPABASE_DB_NAME", "postgres"),
        "USER": os.environ.get("SUPABASE_DB_USER", "postgres"),
        "PASSWORD": os.environ.get("SUPABASE_DB_PASSWORD", ""),
        "HOST": os.environ.get("SUPABASE_DB_HOST", "localhost"),
        "PORT": "5432",
        "OPTIONS": {
            "connect_timeout": 10,
            "options": "-c default_transaction_isolation=read_committed",
        },
        "ATOMIC_REQUESTS": False,
        "CONN_HEALTH_CHECKS": False,  # Critical: disable health checks
        "CONN_MAX_AGE": 0,  # No connection pooling for startup
    }
}

# REST Framework minimal config
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["knox.auth.TokenAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": [],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
}

# Custom user model
AUTH_USER_MODEL = "core.CustomUser"

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR.parent, "staticfiles")
MEDIA_URL = "/media/"
MEDIA_ROOT = os.path.join(BASE_DIR.parent, "media")

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Minimal CORS settings
CORS_ALLOW_ALL_ORIGINS = True  # For Railway health checks
CORS_ALLOW_CREDENTIALS = True

# Minimal logging to avoid startup delays
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
        "level": "WARNING",  # Minimal logging
    },
}

print(
    f"[ULTRA-MINIMAL RAILWAY] ✅ Ultra-minimal settings loaded for Railway deployment"
)
print(f"[ULTRA-MINIMAL RAILWAY] Database: {os.environ.get('SUPABASE_DB_HOST')}")
print(f"[ULTRA-MINIMAL RAILWAY] Debug: {DEBUG}")
print(f"[ULTRA-MINIMAL RAILWAY] Apps count: {len(INSTALLED_APPS)}")
print(f"[ULTRA-MINIMAL RAILWAY] Middleware count: {len(MIDDLEWARE)}")
