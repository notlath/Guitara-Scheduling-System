# ===================================
# GUITARA SCHEDULING SYSTEM DOCKERFILE
# Enhanced for WebSocket + Redis Support
# ===================================

# Use official Python image as base
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies including Redis tools
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
        netcat-openbsd \
        redis-tools \
        procps \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Django project
COPY guitara/ ./guitara/

# Create directories for static, media files, and logs
RUN mkdir -p /app/staticfiles /app/media /app/logs

# Set working directory to Django project
WORKDIR /app/guitara

# Set environment variables - use Docker settings for containerized environment
ENV DJANGO_SETTINGS_MODULE=guitara.settings_docker
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Create a non-root user and set permissions
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

# Expose port for HTTP and WebSocket connections
EXPOSE 8000

# Create wait-for-services script
USER root
RUN cat > /app/wait-for-services.sh << 'EOF'
#!/bin/bash
set -e

echo "🔄 Waiting for services to be ready..."

# Wait for Redis
if [ -n "$REDIS_URL" ]; then
    echo "⏳ Waiting for Redis..."
    until redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; do
        echo "Redis is unavailable - sleeping"
        sleep 2
    done
    echo "✅ Redis is ready!"
fi

# Wait for PostgreSQL (if using local postgres instead of Supabase)
if [ -n "$POSTGRES_HOST" ] && [ "$POSTGRES_HOST" != "localhost" ]; then
    echo "⏳ Waiting for PostgreSQL..."
    until nc -z "$POSTGRES_HOST" "${POSTGRES_PORT:-5432}"; do
        echo "PostgreSQL is unavailable - sleeping"
        sleep 2
    done
    echo "✅ PostgreSQL is ready!"
fi

echo "✅ All services are ready!"
EOF

RUN chmod +x /app/wait-for-services.sh
USER app

# Enhanced startup script for WebSocket support
USER root
RUN cat > /app/enhanced-start.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 Starting Guitara Scheduling System with WebSocket support..."

# Wait for services
/app/wait-for-services.sh

cd /app/guitara

# Run Django management commands
echo "📊 Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "🗃️ Running database migrations..."
python manage.py migrate --noinput

# Create superuser if specified
if [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
    echo "👤 Creating superuser..."
    python manage.py shell << PYTHON_SCRIPT
import os
from django.contrib.auth import get_user_model
User = get_user_model()
email = os.environ.get('DJANGO_SUPERUSER_EMAIL')
password = os.environ.get('DJANGO_SUPERUSER_PASSWORD')
if not User.objects.filter(email=email).exists():
    User.objects.create_superuser(
        email=email,
        username=email.split('@')[0],
        password=password,
        first_name='Admin',
        last_name='User'
    )
    print(f"Superuser {email} created successfully!")
else:
    print(f"Superuser {email} already exists")
PYTHON_SCRIPT
fi

echo "🌐 Starting ASGI server with Daphne for WebSocket support..."
# Use Daphne for production WebSocket handling
exec daphne -b 0.0.0.0 -p 8000 \
    --proxy-headers \
    --access-log /app/logs/access.log \
    --application-close-timeout 10 \
    guitara.asgi:application
EOF

RUN chmod +x /app/enhanced-start.sh
USER app

# Health check for the application
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health/ || exit 1

# Default command - use enhanced startup script
CMD ["/app/enhanced-start.sh"]