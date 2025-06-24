"""
Emergency URLs for Railway deployment
ZERO app imports - only pure Django views
"""

import time
import os
from django.http import JsonResponse
from django.urls import path, re_path


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
    """Emergency root endpoint with debug info"""
    return JsonResponse(
        {
            "message": "Guitara Scheduling System",
            "status": "emergency_mode",
            "info": "Running in emergency bypass mode",
            "version": "2.0.1", 
            "timestamp": int(time.time()),
            "path": request.path,
            "method": request.method,
            "available_endpoints": ["/health/", "/ping/", "/healthcheck/"],
            "fixes_applied": [
                "Root URL pattern fixed",
                "APPEND_SLASH enabled", 
                "Explicit slash handling added",
                "CORS headers configured"
            ]
        },
        status=200,
    )


# Emergency URL patterns - ZERO app imports
# Handle both root paths explicitly
urlpatterns = [
    path("health/", emergency_health, name="emergency_health"),
    path("healthcheck/", emergency_health, name="emergency_healthcheck"),
    path("ping/", emergency_ping, name="emergency_ping"),
    path("", emergency_root, name="emergency_root"),
    re_path(r"^/$", emergency_root, name="emergency_root_slash"),  # Explicit slash handling
]
