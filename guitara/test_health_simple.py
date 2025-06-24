#!/usr/bin/env python3
"""
Simple test for health check endpoints using Django test client
"""
import os
import sys
import django
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings_railway')
django.setup()

from django.test import Client

def test_health_endpoints():
    """Test health check endpoints"""
    print("Testing health check endpoints...")
    
    client = Client()
    endpoints = ['/health/', '/healthcheck/', '/health-check/', '/ping/']
    
    for endpoint in endpoints:
        try:
            response = client.get(endpoint)
            print(f'{endpoint}: Status {response.status_code}')
            if response.status_code == 200:
                data = response.json()
                print(f'  Response: {data.get("status", "unknown")}')
            print()
        except Exception as e:
            print(f'{endpoint}: Error - {e}')
            print()

if __name__ == "__main__":
    test_health_endpoints()
