"""
Enhanced health check for minimal mode with database connectivity
"""

import json
import time
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET
from django.views.decorators.cache import never_cache
from django.db import connection
from django.core.cache import cache


@csrf_exempt
@never_cache
@require_GET
def minimal_health_check(request):
    """
    Comprehensive health check for minimal mode
    Tests database, cache, and overall system health
    """
    start_time = time.time()
    response_data = {
        "status": "healthy",
        "mode": "minimal",
        "timestamp": int(time.time()),
        "checks": {},
    }

    # Database health check
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            if result and result[0] == 1:
                response_data["checks"]["database"] = {
                    "status": "healthy",
                    "engine": connection.settings_dict["ENGINE"],
                    "host": connection.settings_dict["HOST"],
                    "name": connection.settings_dict["NAME"],
                }
            else:
                response_data["checks"]["database"] = {
                    "status": "error",
                    "message": "Invalid database response",
                }
                response_data["status"] = "degraded"
    except Exception as e:
        response_data["checks"]["database"] = {
            "status": "error",
            "message": str(e)[:100],
        }
        response_data["status"] = "degraded"

    # Cache health check
    try:
        test_key = f"health_check_{int(time.time())}"
        cache.set(test_key, "test", 10)
        if cache.get(test_key) == "test":
            response_data["checks"]["cache"] = {"status": "healthy"}
            cache.delete(test_key)
        else:
            response_data["checks"]["cache"] = {
                "status": "error",
                "message": "Cache not working",
            }
    except Exception as e:
        response_data["checks"]["cache"] = {"status": "error", "message": str(e)[:50]}

    # Response time
    response_data["response_time_ms"] = round((time.time() - start_time) * 1000, 2)

    # Status code based on overall health
    status_code = 200 if response_data["status"] == "healthy" else 503

    return JsonResponse(response_data, status=status_code)


@csrf_exempt
@never_cache
@require_GET
def minimal_ping(request):
    """Ultra-fast ping endpoint for Railway health checks"""
    return JsonResponse(
        {"status": "ok", "mode": "minimal", "timestamp": int(time.time())}
    )


@csrf_exempt
@never_cache
@require_GET
def minimal_ready(request):
    """Readiness check - tests if application is ready to serve traffic"""
    try:
        # Quick database connectivity test
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()

        return JsonResponse(
            {"status": "ready", "mode": "minimal", "database": "connected"}
        )
    except Exception as e:
        return JsonResponse(
            {
                "status": "not_ready",
                "mode": "minimal",
                "database": "disconnected",
                "error": str(e)[:100],
            },
            status=503,
        )
