"""
ULTRA-ULTRA-MINIMAL Railway settings
ZERO custom apps to avoid import issues
"""

import os
from pathlib import Path

print(f"[ULTRA-ULTRA-MINIMAL] Loading emergency Railway configuration")

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Security settings
SECRET_KEY = os.environ.get(
    "SECRET_KEY", "railway-emergency-key-change-in-production"
)
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

# ZERO custom apps - only Django essentials
INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.staticfiles",
]

# ZERO middleware except essentials
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
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

print(f"[ULTRA-ULTRA-MINIMAL] ✅ Emergency settings loaded")
print(f"[ULTRA-ULTRA-MINIMAL] Apps count: {len(INSTALLED_APPS)}")
print(f"[ULTRA-ULTRA-MINIMAL] Middleware count: {len(MIDDLEWARE)}")
print(f"[ULTRA-ULTRA-MINIMAL] Database: DISABLED")
