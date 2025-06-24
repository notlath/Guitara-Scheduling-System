"""
Health check utilities for production deployment
"""

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
from django.utils import timezone
import json
import logging

logger = logging.getLogger(__name__)


@require_GET
@csrf_exempt
def health_check(request):
    """Basic health check endpoint"""
    try:
        # Test database connection
        from django.db import connection

        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = f"error: {str(e)}"

    # Test Redis connection (if available)
    redis_status = "not_configured"
    try:
        from django.core.cache import cache

        cache.set("health_check", "test", 10)
        if cache.get("health_check") == "test":
            redis_status = "healthy"
        else:
            redis_status = "error: cache not working"
    except Exception as e:
        redis_status = f"error: {str(e)}"

    # Check ASGI application
    asgi_status = "healthy"
    try:
        from guitara.asgi import application

        if application:
            asgi_status = "healthy"
        else:
            asgi_status = "error: no application"
    except Exception as e:
        asgi_status = f"error: {str(e)}"

    health_data = {
        "status": "healthy",
        "database": db_status,
        "cache": redis_status,
        "asgi": asgi_status,
        "timestamp": timezone.now().isoformat(),
    }

    # Determine overall status
    if any("error" in str(status) for status in [db_status, asgi_status]):
        health_data["status"] = "degraded"
        return JsonResponse(health_data, status=503)

    return JsonResponse(health_data)


@require_GET
@csrf_exempt
def simple_health(request):
    """Ultra-simple health check"""
    return JsonResponse({"status": "ok", "message": "Django is running"})
