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
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
echo "🔄 Waiting for services to be ready..."\n\
\n\
# Wait for Redis\n\
if [ -n "$REDIS_URL" ]; then\n\
    echo "⏳ Waiting for Redis..."\n\
    until redis-cli -u "$REDIS_URL" ping > /dev/null 2>&1; do\n\
        echo "Redis is unavailable - sleeping"\n\
        sleep 2\n\
    done\n\
    echo "✅ Redis is ready!"\n\
fi\n\
\n\
# Wait for PostgreSQL (if using local postgres instead of Supabase)\n\
if [ -n "$POSTGRES_HOST" ] && [ "$POSTGRES_HOST" != "localhost" ]; then\n\
    echo "⏳ Waiting for PostgreSQL..."\n\
    until nc -z "$POSTGRES_HOST" "${POSTGRES_PORT:-5432}"; do\n\
        echo "PostgreSQL is unavailable - sleeping"\n\
        sleep 2\n\
    done\n\
    echo "✅ PostgreSQL is ready!"\n\
fi\n\
\n\
echo "✅ All services are ready!"' > /app/wait-for-services.sh

RUN chmod +x /app/wait-for-services.sh
USER app

# Enhanced startup script for WebSocket support
USER root
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
echo "🚀 Starting Guitara Scheduling System with WebSocket support..."\n\
\n\
# Wait for services\n\
/app/wait-for-services.sh\n\
\n\
cd /app/guitara\n\
\n\
# Run Django management commands\n\
echo "📊 Collecting static files..."\n\
python manage.py collectstatic --noinput --clear\n\
\n\
echo "🗃️ Running database migrations..."\n\
python manage.py migrate --noinput\n\
\n\
# Create superuser if specified\n\
if [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then\n\
    echo "👤 Creating superuser..."\n\
    python manage.py shell -c "\n\
import os\n\
from django.contrib.auth import get_user_model\n\
User = get_user_model()\n\
email = os.environ.get(\"DJANGO_SUPERUSER_EMAIL\")\n\
password = os.environ.get(\"DJANGO_SUPERUSER_PASSWORD\")\n\
if not User.objects.filter(email=email).exists():\n\
    User.objects.create_superuser(\n\
        email=email,\n\
        username=email.split(\"@\")[0],\n\
        password=password,\n\
        first_name=\"Admin\",\n\
        last_name=\"User\"\n\
    )\n\
    print(f\"Superuser {email} created successfully!\")\n\
else:\n\
    print(f\"Superuser {email} already exists\")\n\
"\n\
fi\n\
\n\
echo "🌐 Starting ASGI server with Daphne for WebSocket support..."\n\
# Use Daphne for production WebSocket handling\n\
exec daphne -b 0.0.0.0 -p 8000 \\\n\
    --proxy-headers \\\n\
    --access-log /app/logs/access.log \\\n\
    --application-close-timeout 10 \\\n\
    guitara.asgi:application' > /app/enhanced-start.sh

RUN chmod +x /app/enhanced-start.sh
USER app

# Health check for the application
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health/ || exit 1

# Default command - use enhanced startup script
CMD ["python", "railway_simple_start.py"]