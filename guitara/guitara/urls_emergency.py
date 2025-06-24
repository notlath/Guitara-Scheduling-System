"""
Emergency URLs for Railway deployment
ZERO app imports - only pure Django views
"""

import time
import os
from django.http import JsonResponse
from django.urls import path


def emergency_health(request):
    """Emergency health check with zero dependencies"""
    return JsonResponse(
        {
            "status": "emergency_healthy",
            "service": "guitara-scheduling-system",
            "timestamp": int(time.time()),
            "environment": "railway",
            "mode": "emergency_bypass",
        },
        status=200,
    )


def emergency_ping(request):
    """Emergency ping endpoint"""
    return JsonResponse({"ping": "pong", "mode": "emergency"}, status=200)


def emergency_root(request):
    """Emergency root endpoint"""
    return JsonResponse(
        {
            "message": "Guitara Scheduling System",
            "status": "emergency_mode",
            "info": "Running in emergency bypass mode",
        },
        status=200,
    )


# Emergency URL patterns - ZERO app imports
urlpatterns = [
    path("health/", emergency_health, name="emergency_health"),
    path("healthcheck/", emergency_health, name="emergency_healthcheck"),
    path("ping/", emergency_ping, name="emergency_ping"),
    path("", emergency_root, name="emergency_root"),
]
