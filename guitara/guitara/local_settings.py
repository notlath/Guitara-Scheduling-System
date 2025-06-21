# Local settings override for mode configuration
# This file is imported by the main settings.py when it exists

import os
from pathlib import Path

# Temporary: Re-enable Supabase with corrected credentials
env_file = Path(__file__).resolve().parent.parent / ".env"
if env_file.exists():
    import environ

    env = environ.Env()
    environ.Env.read_env(env_file)

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("SUPABASE_DB_NAME", default="postgres"),
            "USER": env("SUPABASE_DB_USER", default="postgres"),
            "PASSWORD": env("SUPABASE_DB_PASSWORD", default=""),
            "HOST": env(
                "SUPABASE_DB_HOST", default="aws-0-us-east-1.pooler.supabase.com"
            ),
            "PORT": "5432",
            "OPTIONS": {
                "connect_timeout": 30,
                "application_name": "guitara_scheduling",
                "sslmode": "require",
            },
        }
    }
    print("[LOCAL SETTINGS] Using Supabase PostgreSQL with corrected credentials")
else:
    # Fallback to SQLite
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": Path(__file__).resolve().parent.parent / "db.sqlite3",
        }
    }
    print("[LOCAL SETTINGS] Using SQLite database fallback")

# Try to import mode configuration if it exists
try:
    from .mode_config import *

    print(f"[MODE CONFIG] Mode configuration loaded successfully")
except ImportError:
    print(f"[MODE CONFIG] No mode configuration found, using defaults")
    pass
