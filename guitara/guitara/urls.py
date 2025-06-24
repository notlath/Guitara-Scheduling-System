import logging
import os
import time
from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static

# Emergency health check imports - no external dependencies
from .emergency_health import emergency_health, railway_ping

# Railway-specific health checks
from .railway_health import (
    railway_health_primary,
    railway_ping as railway_ping_alt,
    railway_healthcheck,
)

logger = logging.getLogger(__name__)


def default_route(request):
    return JsonResponse({"message": "Welcome to the API"}, status=200)


def railway_ultra_health(request):
    return JsonResponse(
        {"status": "healthy", "service": "guitara-scheduling"}, status=200
    )


def health_check(request):
    return JsonResponse(
        {
            "status": "healthy",
            "timestamp": int(time.time()),
            "service": "guitara-scheduling-system",
            "environment": (
                "railway" if os.environ.get("RAILWAY_ENVIRONMENT") else "other"
            ),
        },
        status=200,
    )


def diagnostic_health_check(request):
    response_data = {
        "status": "healthy",
        "timestamp": int(time.time()),
        "service": "guitara-scheduling-system",
        "environment": "railway" if os.environ.get("RAILWAY_ENVIRONMENT") else "other",
        "debug": settings.DEBUG,
    }
    return JsonResponse(response_data, status=200)


urlpatterns = [
    # Ultra-minimal Railway health check endpoint FIRST, no DB/cache
    path("health/", railway_ultra_health, name="railway_ultra_health"),
    path("healthcheck/", railway_healthcheck, name="railway_healthcheck"),
    path("ping/", railway_ping_alt, name="railway_ping"),
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
    path(
        "diagnostic-health-check/",
        diagnostic_health_check,
        name="diagnostic_health_check",
    ),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
