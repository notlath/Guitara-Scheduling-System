"""
Minimal URLs for Railway deployment with database connectivity
Includes both fast health checks and full API endpoints
"""

import time
from django.http import JsonResponse
from django.urls import path, include
from django.contrib import admin
from .minimal_health import minimal_health_check, minimal_ping, minimal_ready


def railway_ultra_health(request):
    """Ultra-fast health check with no dependencies"""
    return JsonResponse(
        {
            "status": "healthy",
            "service": "guitara-scheduling-system",
            "timestamp": int(time.time()),
            "environment": "railway",
            "mode": "minimal"
        },
        status=200,
    )


def default_route(request):
    """Default API route"""
    return JsonResponse(
        {
            "message": "Guitara Scheduling System API",
            "status": "running",
            "mode": "minimal",
            "timestamp": int(time.time()),
        },
        status=200,
    )


# Minimal URL patterns with full API support
urlpatterns = [
    # Fast health check endpoints (no database)
    path("health/", railway_ultra_health, name="railway_health"),
    path("healthcheck/", railway_ultra_health, name="railway_healthcheck"),
    path("ping/", minimal_ping, name="railway_ping"),
    
    # Enhanced health checks (with database)
    path("health/minimal/", minimal_health_check, name="minimal_health"),
    path("ready/", minimal_ready, name="minimal_ready"),
    
    # API endpoints
    path("api/", include([
        path("auth/", include("authentication.urls")),
        path("core/", include("core.urls")),
        path("registration/", include("registration.urls")),
        path("scheduling/", include("scheduling.urls")),
        path("attendance/", include("attendance.urls")),
        path("inventory/", include("inventory.urls")),
    ])),
    
    # Admin (if needed)
    path("admin/", admin.site.urls),
    
    # Default route
    path("", default_route, name="default"),
]
