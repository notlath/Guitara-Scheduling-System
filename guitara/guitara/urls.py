"""
URL configuration for guitara project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from django.conf import settings
from django.conf.urls.static import static
from django.db import connection
from django.core.cache import cache
import logging
import os
import time

# Emergency health check imports - no external dependencies
from .emergency_health import emergency_health, railway_ping
# Railway-specific health checks
from .railway_health import railway_health_primary, railway_ping as railway_ping_alt, railway_healthcheck

logger = logging.getLogger(__name__)


@require_GET
def default_route(request):
    return JsonResponse({"message": "Welcome to the API"}, status=200)


@require_GET
def health_check(request):
    """Railway-optimized health check endpoint - ultra-fast response"""
    # Return immediately without any external dependencies
    return JsonResponse(
        {
            "status": "healthy",
            "timestamp": int(time.time()),
            "service": "guitara-scheduling-system",
            "environment": "railway" if os.environ.get("RAILWAY_ENVIRONMENT") else "other",
        },
        status=200,
    )


@require_GET
def simple_health_check(request):
    """Ultra-simple health check for Railway - immediate response"""
    return JsonResponse({"status": "ok"}, status=200)


@require_GET
def railway_health_check(request):
    """Railway-specific health check endpoint - immediate response"""
    return JsonResponse({"status": "healthy"}, status=200)


@require_GET
def diagnostic_health_check(request):
    """Detailed health check for diagnostics - NOT for Railway health checks"""
    response_data = {
        "status": "healthy",
        "timestamp": int(time.time()),
        "service": "guitara-scheduling-system",
        "environment": "railway" if os.environ.get("RAILWAY_ENVIRONMENT") else "other",
        "debug": settings.DEBUG,
    }

    # Test database connection with short timeout
    try:
        from django.db import connection

        # Set connection timeout
        connection.ensure_connection()
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        response_data["database"] = "connected"
    except Exception as e:
        response_data["database"] = "disconnected"
        response_data["database_error"] = str(e)[:100]
        logger.warning(f"Database diagnostic failed: {e}")

    # Test cache connection
    try:
        if hasattr(settings, "REDIS_URL") and getattr(settings, "REDIS_URL", None):
            cache.set("diagnostic_check", "ok", 10)
            cache_result = cache.get("diagnostic_check", "error")
            response_data["cache"] = (
                "connected" if cache_result == "ok" else "available_but_failed"
            )
        else:
            response_data["cache"] = "not_configured"
    except Exception as e:
        response_data["cache"] = "unavailable"
        response_data["cache_error"] = str(e)[:50]

    return JsonResponse(response_data, status=200)


urlpatterns = [
    # Railway health checks - MUST BE FIRST to bypass middleware
    path("health/", railway_health_primary, name="railway_health_primary"),  # Railway primary
    path("healthcheck/", railway_healthcheck, name="railway_healthcheck"),  # Railway alt
    path("ping/", railway_ping_alt, name="railway_ping"),  # Railway ping
    # API routes
    path("api/inventory/", include("inventory.urls")),
    path("api/auth/", include("authentication.urls")),
    path("api/", include("core.urls")),
    path("", default_route),
    path("admin/", admin.site.urls),
    path("api/registration/", include("registration.urls")),
    path("api/scheduling/", include("scheduling.urls")),
    path("api/attendance/", include("attendance.urls")),
    # Detailed health checks for diagnostics (not Railway)
    path("health-check/", health_check, name="health_check"),
    path("diagnostic-health-check/", diagnostic_health_check, name="diagnostic_health_check"),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
