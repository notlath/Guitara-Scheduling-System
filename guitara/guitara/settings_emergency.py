"""
ULTRA-ULTRA-MINIMAL Railway settings with CORS support for frontend
"""

import os
from pathlib import Path

print(f"[ULTRA-ULTRA-MINIMAL] Loading emergency Railway configuration")

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Security settings
SECRET_KEY = os.environ.get("SECRET_KEY", "railway-emergency-key-change-in-production")
DEBUG = False  # Always False for Railway

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

print(f"[ULTRA-ULTRA-MINIMAL] ALLOWED_HOSTS: {ALLOWED_HOSTS}")

# Add CORS headers app for frontend connectivity
INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.staticfiles",
    "corsheaders",  # ✅ ADDED: Enable CORS support
]

# Add CORS middleware FIRST
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # ✅ ADDED: Must be first
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]

# ✅ ADDED: CORS settings for your Vercel frontend
CORS_ALLOWED_ORIGINS = [
    "https://guitara-scheduling-system.vercel.app",  # Your Vercel frontend
    "http://localhost:5173",  # Local development
    "http://localhost:3000",  # Alternative local dev
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False  # Keep secure

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

ROOT_URLCONF = "guitara.urls_emergency"

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
            ],
        },
    },
]

WSGI_APPLICATION = "guitara.wsgi.application"
ASGI_APPLICATION = "guitara.asgi_emergency.application"

# NO database connection to avoid timeouts
DATABASES = {}

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = False
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR.parent, "staticfiles")

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

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
        "level": "ERROR",  # Only errors
    },
}

print(f"[ULTRA-ULTRA-MINIMAL] ✅ Emergency settings loaded with CORS support")
print(f"[ULTRA-ULTRA-MINIMAL] Apps count: {len(INSTALLED_APPS)}")
print(f"[ULTRA-ULTRA-MINIMAL] Middleware count: {len(MIDDLEWARE)}")
print(f"[ULTRA-ULTRA-MINIMAL] Database: DISABLED")
print(f"[ULTRA-ULTRA-MINIMAL] CORS enabled for: {CORS_ALLOWED_ORIGINS}")
