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
    "django.contrib.admin",  # Required for admin URLs
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
# Database - Enhanced Supabase connection with Railway compatibility
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("SUPABASE_DB_NAME", "postgres"),
        "USER": os.environ.get("SUPABASE_DB_USER", "postgres"),
        "PASSWORD": os.environ.get("SUPABASE_DB_PASSWORD", ""),
        "HOST": os.environ.get("SUPABASE_DB_HOST", "localhost"),
        "PORT": os.environ.get("SUPABASE_DB_PORT", "5432"),
        "OPTIONS": {
            # Connection timeout settings
            "connect_timeout": 5,  # Reduced from 30 to 10 seconds
            "application_name": "guitara_railway",
            "options": "-c default_transaction_isolation=read_committed -c statement_timeout=15000",  # 15 seconds
            # SSL settings for Supabase
            "sslmode": "require",
            # Performance settings
            "server_side_binding": True,
        },
        "ATOMIC_REQUESTS": False,
        "CONN_HEALTH_CHECKS": False,  # Disable automatic health checks
        "CONN_MAX_AGE": 60,  # Reduced connection pooling to 1 minute
        "TEST": {
            "NAME": "test_guitara_railway",
        },
    }
}

# Validate required database environment variables
required_db_vars = [
    "SUPABASE_DB_HOST",
    "SUPABASE_DB_NAME",
    "SUPABASE_DB_USER",
    "SUPABASE_DB_PASSWORD",
]
missing_vars = [var for var in required_db_vars if not os.environ.get(var)]

if missing_vars:
    print(
        f"[ULTRA-MINIMAL RAILWAY] ⚠️ Missing database environment variables: {missing_vars}"
    )
    print(
        f"[ULTRA-MINIMAL RAILWAY] Available DB vars: {[var for var in required_db_vars if os.environ.get(var)]}"
    )
else:
    print(
        f"[ULTRA-MINIMAL RAILWAY] ✅ All required database environment variables are set"
    )

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

# CORS settings for Railway deployment
CORS_ALLOW_ALL_ORIGINS = False  # Use specific origins for security
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "https://charismatic-appreciation-production.up.railway.app",
    "https://guitara-scheduling-system.vercel.app",  # Add Vercel frontend domain
    "https://guitara-scheduling-system-git-main-lathrells-projects.vercel.app",  # Your actual deployed domain
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "https://royalcareinpasig.services/"
]

# Parse additional CORS origins from environment
if os.environ.get("CORS_ALLOWED_ORIGINS"):
    additional_origins = [
        origin.strip()
        for origin in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",")
        if origin.strip()
    ]
    CORS_ALLOWED_ORIGINS.extend(additional_origins)

# Remove duplicates and ensure we have the Vercel URL
CORS_ALLOWED_ORIGINS = list(set(CORS_ALLOWED_ORIGINS))

# Allow common headers
CORS_ALLOW_HEADERS = [
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
    "x-auth-token",
]

# Allow common HTTP methods
CORS_ALLOWED_METHODS = [
    "DELETE",
    "GET",
    "OPTIONS",
    "PATCH",
    "POST",
    "PUT",
]

# Additional CORS settings for API
CORS_PREFLIGHT_MAX_AGE = 86400  # Cache preflight for 24 hours

print(f"[ULTRA-MINIMAL RAILWAY] CORS Origins: {CORS_ALLOWED_ORIGINS}")
print(
    f"[ULTRA-MINIMAL RAILWAY] CORS Env Var: {os.environ.get('CORS_ALLOWED_ORIGINS', 'NOT SET')}"
)
print(f"[ULTRA-MINIMAL RAILWAY] CORS Allow All: {CORS_ALLOW_ALL_ORIGINS}")
print(f"[ULTRA-MINIMAL RAILWAY] CORS Allow Credentials: {CORS_ALLOW_CREDENTIALS}")

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
print(f"[ULTRA-MINIMAL RAILWAY] Database Host: {os.environ.get('SUPABASE_DB_HOST')}")
print(f"[ULTRA-MINIMAL RAILWAY] Database Name: {os.environ.get('SUPABASE_DB_NAME')}")
print(f"[ULTRA-MINIMAL RAILWAY] Database User: {os.environ.get('SUPABASE_DB_USER')}")
print(f"[ULTRA-MINIMAL RAILWAY] Debug: {DEBUG}")
print(f"[ULTRA-MINIMAL RAILWAY] Apps count: {len(INSTALLED_APPS)}")
print(f"[ULTRA-MINIMAL RAILWAY] Middleware count: {len(MIDDLEWARE)}")

# Debug: Print the complete database configuration (without password)
db_config = DATABASES["default"].copy()
if "PASSWORD" in db_config:
    db_config["PASSWORD"] = "***HIDDEN***"
print(f"[ULTRA-MINIMAL RAILWAY] Database config: {db_config}")

# Verify SSL mode for Supabase
if "sslmode" in DATABASES["default"]["OPTIONS"]:
    print(
        f"[ULTRA-MINIMAL RAILWAY] SSL Mode: {DATABASES['default']['OPTIONS']['sslmode']}"
    )
else:
    print(
        f"[ULTRA-MINIMAL RAILWAY] ⚠️ SSL mode not configured - this may cause connection issues with Supabase"
    )
