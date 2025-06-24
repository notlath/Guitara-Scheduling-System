"""
Emergency Health Check Service
Ultra-lightweight health check that bypasses all Django middleware and dependencies
"""

from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.cache import never_cache
from django.utils.decorators import method_decorator
from django.views import View
import json
import time


@csrf_exempt
@never_cache
def emergency_health(request):
    """Emergency health check - no dependencies, immediate response"""
    if request.method != 'GET':
        return HttpResponse(status=405)
        
    response_data = {
        "status": "healthy",
        "timestamp": int(time.time()),
        "service": "guitara-scheduling"
    }
    
    response = HttpResponse(
        json.dumps(response_data),
        content_type='application/json',
        status=200
    )
    
    # Add headers to prevent caching
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache' 
    response['Expires'] = '0'
    
    return response


@csrf_exempt
@never_cache 
def railway_ping(request):
    """Ultra-minimal ping endpoint for Railway"""
    if request.method != 'GET':
        return HttpResponse(status=405)
        
    return HttpResponse(
        '{"status":"ok"}',
        content_type='application/json',
        status=200
    )
