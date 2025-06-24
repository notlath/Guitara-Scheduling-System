"""
Railway Health Check Service
Ultra-minimal health check that works without database dependencies
"""

from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET
import json
import time
import os


@csrf_exempt
@never_cache
@require_GET
def railway_health_primary(request):
    """Primary Railway health check - ultra-fast, no dependencies"""
    response_data = {
        "status": "healthy",
        "timestamp": int(time.time()),
        "service": "guitara-scheduling",
        "environment": "railway"
    }
    
    response = JsonResponse(response_data, status=200)
    
    # Prevent caching
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    
    return response


@csrf_exempt
@never_cache
@require_GET
def railway_ping(request):
    """Ultra-minimal ping for Railway"""
    return JsonResponse({"status": "ok"}, status=200)


@csrf_exempt
@never_cache  
@require_GET
def railway_healthcheck(request):
    """Alternative healthcheck endpoint"""
    return JsonResponse({"status": "healthy"}, status=200)
