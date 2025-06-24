"""
Ultra-minimal URLs for Railway deployment
Only includes health check endpoints to avoid app import issues
"""

import time
from django.http import JsonResponse
from django.urls import path


def railway_ultra_health(request):
    """Ultra-fast health check with no dependencies"""
    return JsonResponse(
        {
            "status": "healthy",
            "service": "guitara-scheduling-system",
            "timestamp": int(time.time()),
            "environment": "railway",
        },
        status=200,
    )


def railway_ping(request):
    """Simple ping endpoint"""
    return JsonResponse({"ping": "pong"}, status=200)


def default_route(request):
    """Default API route"""
    return JsonResponse(
        {
            "message": "Guitara Scheduling System API",
            "status": "running",
            "mode": "minimal",
        },
        status=200,
    )


# Ultra-minimal URL patterns - only health checks
urlpatterns = [
    # Health check endpoints ONLY
    path("health/", railway_ultra_health, name="railway_health"),
    path("healthcheck/", railway_ultra_health, name="railway_healthcheck"),
    path("ping/", railway_ping, name="railway_ping"),
    path("", default_route, name="default"),
]
