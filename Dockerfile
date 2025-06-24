# ===================================
# GUITARA SCHEDULING SYSTEM DOCKERFILE
# ===================================

# Use official Python image as base
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
        netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Django project
COPY guitara/ ./guitara/

# Create directories for static and media files
RUN mkdir -p /app/staticfiles /app/media

# Set working directory to Django project
WORKDIR /app/guitara

# Set environment variables for Railway - force minimal settings
ENV DJANGO_SETTINGS_MODULE=guitara.settings_railway_minimal
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Create directories for static files and logs
RUN mkdir -p /app/staticfiles /app/media /app/logs

# Create a non-root user and set permissions
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Expose port
EXPOSE 8000

# Health check - Railway will handle this via the JSON config
# HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
#     CMD curl -f http://localhost:8000/ || exit 1

# Default command - using robust startup with database fallback
CMD ["python", "robust_startup.py"]
