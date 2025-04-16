# Add 'corsheaders' to INSTALLED_APPS
INSTALLED_APPS = [
    # ...existing apps...
    'corsheaders',
]

# Add 'corsheaders.middleware.CorsMiddleware' to MIDDLEWARE
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
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