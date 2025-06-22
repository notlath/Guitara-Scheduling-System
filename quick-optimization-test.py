#!/usr/bin/env python3
"""
Quick test for optimized endpoints
"""

import os
import sys
import django
import time

# Setup Django
project_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(project_dir, "guitara"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from django.test import Client
from django.db import connection, reset_queries
from core.models import CustomUser


def quick_test():
    """Quick test of optimized endpoints"""
    print("Quick Optimization Test")
    print("=" * 30)

    client = Client()

    # Get or create a test user
    try:
        user = CustomUser.objects.get(username="test_operator")
    except CustomUser.DoesNotExist:
        user = CustomUser.objects.create_user(
            username="test_operator",
            email="test@example.com",
            password="testpass123",
            role="operator",
        )

    # Login
    client.login(username="test_operator", password="testpass123")

    # Test notifications endpoint
    print("\n1. Testing Notifications Endpoint:")
    reset_queries()
    start = time.time()

    response = client.get("/api/scheduling/notifications/")

    duration = time.time() - start
    queries = len(connection.queries)

    print(f"   Status: {response.status_code}")
    print(f"   Time: {duration:.3f}s")
    print(f"   Queries: {queries}")

    # Test staff endpoint
    print("\n2. Testing Staff Endpoint:")
    reset_queries()
    start = time.time()

    response = client.get("/api/scheduling/staff/")

    duration = time.time() - start
    queries = len(connection.queries)

    print(f"   Status: {response.status_code}")
    print(f"   Time: {duration:.3f}s")
    print(f"   Queries: {queries}")

    # Test active staff endpoint
    print("\n3. Testing Active Staff Endpoint:")
    reset_queries()
    start = time.time()

    response = client.get("/api/scheduling/staff/active_staff/")

    duration = time.time() - start
    queries = len(connection.queries)

    print(f"   Status: {response.status_code}")
    print(f"   Time: {duration:.3f}s")
    print(f"   Queries: {queries}")

    print("\n✅ Quick test completed!")
    print("The optimizations should show:")
    print("- Reduced query counts")
    print("- Faster response times")
    print("- Better error handling")


if __name__ == "__main__":
    quick_test()
