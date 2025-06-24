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

logger = logging.getLogger(__name__)


@require_GET
def default_route(request):
    return JsonResponse({"message": "Welcome to the API"}, status=200)


@require_GET
def health_check(request):
    """Railway-optimized health check endpoint that doesn't fail on DB issues"""
    response_data = {
        "status": "healthy",
        "timestamp": int(time.time()),
        "environment": "railway" if os.environ.get("RAILWAY_ENVIRONMENT") else "other",
        "debug": settings.DEBUG,
        "service": "guitara-scheduling-system",
    }

    # Test database connection - don't fail health check if DB is down
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        response_data["database"] = "connected"
    except Exception as e:
        # Database is down but service is still running
        response_data["database"] = "disconnected"
        response_data["database_error"] = str(e)[:100]
        logger.warning(f"Database health check failed (service still healthy): {e}")

    # Test cache - don't fail health check if cache is down
    try:
        if hasattr(settings, "REDIS_URL") and getattr(settings, "REDIS_URL", None):
            cache.set("health_check", "ok", 10)
            cache_result = cache.get("health_check", "error")
            response_data["cache"] = (
                "connected" if cache_result == "ok" else "available_but_failed"
            )
        else:
            response_data["cache"] = "not_configured"
    except Exception as e:
        response_data["cache"] = "unavailable"
        response_data["cache_error"] = str(e)[:50]

    # Service is healthy if Django is running, regardless of DB/cache status
    return JsonResponse(response_data, status=200)


@require_GET
def simple_health_check(request):
    """Ultra-simple health check for Railway that always succeeds if Django is running"""
    return JsonResponse(
        {
            "status": "ok",
            "service": "guitara-scheduling-system",
            "timestamp": int(time.time()),
        },
        status=200,
    )


urlpatterns = [
    path("api/inventory/", include("inventory.urls")),
    path("api/auth/", include("authentication.urls")),
    path("api/", include("core.urls")),
    path("", default_route),
    path("admin/", admin.site.urls),
    path("api/registration/", include("registration.urls")),
    path("api/scheduling/", include("scheduling.urls")),
    path("api/attendance/", include("attendance.urls")),
    path("health-check/", health_check, name="health_check"),
    path("health/", simple_health_check, name="simple_health_check"),
    path("ping/", simple_health_check, name="ping"),
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
