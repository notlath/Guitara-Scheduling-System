import os
print("[SETTINGS IMPORT] DJANGO_SETTINGS_MODULE:", os.environ.get("DJANGO_SETTINGS_MODULE"))
print("[SETTINGS IMPORT] settings.py __file__:", __file__)
raise Exception("TEST SETTINGS IMPORT - If you see this, settings.py is being executed!")
os.environ["EMAIL_BACKEND"] = "django.core.mail.backends.console.EmailBackend"

import environ

# Initialize environ
env = environ.Env()

# Add 'corsheaders' to INSTALLED_APPS
INSTALLED_APPS = [
    # ...existing apps...
    "corsheaders",
]

# Add 'corsheaders.middleware.CorsMiddleware' to MIDDLEWARE
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    # ...existing middleware...
]

# Configure CORS settings
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Add your frontend's origin
]

# Optional: Allow credentials if needed
CORS_ALLOW_CREDENTIALS = True

# Optional: Allow all origins (not recommended for production)
# CORS_ALLOW_ALL_ORIGINS = True

EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env(
    "DEFAULT_FROM_EMAIL", default="Royal Care <noreply@royalcare.com>"
)
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"  # Force console backend for all environments
print("[SETTINGS IMPORT] EMAIL_BACKEND:", EMAIL_BACKEND)
