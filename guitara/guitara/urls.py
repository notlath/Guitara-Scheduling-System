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
    """Enhanced health check endpoint for Railway deployment"""
    try:
        # Check database connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        db_status = "connected"

        # Try cache if Redis is configured - don't fail if cache is unavailable
        cache_status = "not_configured"
        try:
            if hasattr(settings, "REDIS_URL") and settings.REDIS_URL:
                cache.set("health_check", "ok", 10)
                cache_status = cache.get("health_check", "error")
                if cache_status == "ok":
                    cache_status = "connected"
                else:
                    cache_status = "available_but_failed"
            else:
                cache_status = "not_configured"
        except Exception as e:
            cache_status = "unavailable"
            # Don't log this as an error since Redis is optional
            pass

        # Check if we're running on Railway
        is_railway = bool(os.environ.get("RAILWAY_ENVIRONMENT"))

        response_data = {
            "status": "healthy",
            "database": db_status,
            "cache": cache_status,
            "debug": settings.DEBUG,
            "environment": "railway" if is_railway else "other",
            "timestamp": int(time.time()),
        }

        return JsonResponse(response_data, status=200)

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return JsonResponse(
            {
                "status": "unhealthy",
                "error": str(e)[:100],
                "debug": settings.DEBUG,
                "timestamp": int(time.time()),
            },
            status=503,
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
]

# Serve media files during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
