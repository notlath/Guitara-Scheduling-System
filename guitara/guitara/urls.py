"""
URL configuration for guitara project.
"""
import logging
import os
import time
from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static

logger = logging.getLogger(__name__)


def default_route(request):
    return JsonResponse({"message": "Welcome to the API"}, status=200)


def railway_ultra_health(request):
    return JsonResponse(
        {"status": "healthy", "service": "guitara-scheduling"}, status=200
    )


def health_check(request):
    """Railway health check endpoint"""
    return JsonResponse(
        {
            "status": "healthy",
            "service": "guitara-scheduling-system",
            "timestamp": int(time.time()),
            "environment": "production" if not settings.DEBUG else "development",
            "websocket_support": True,
        },
        status=200,
    )


def websocket_test(request):
    """WebSocket endpoint test"""
    return JsonResponse(
        {
            "websocket_url": "wss://charismatic-appreciation-production.up.railway.app/ws/scheduling/appointments/",
            "status": "available",
            "authentication": "Knox token required as ?token= parameter",
            "timestamp": int(time.time()),
        },
        status=200,
    )


urlpatterns = [
    # Ultra-minimal Railway health check endpoint FIRST, no DB/cache
    path("health/", railway_ultra_health, name="railway_ultra_health"),
    path("healthcheck/", health_check, name="healthcheck"),
    path("ping/", health_check, name="ping"),
    path("ws-test/", websocket_test, name="websocket_test"),
    path("api/inventory/", include("inventory.urls")),
    path("api/auth/", include("authentication.urls")),
    path("api/core/", include("core.urls")),
    path("api/registration/", include("registration.urls")),
    path("api/scheduling/", include("scheduling.urls")),
    path("api/attendance/", include("attendance.urls")),
    # Detailed health checks for diagnostics (not Railway)
    path("health-check/", health_check, name="health_check"),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
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
