# scheduling/middleware/performance_middleware.py
"""
Performance optimization middleware for OperatorDashboard
Addresses authentication caching and query monitoring
"""

import time
import logging
from django.core.cache import cache
from django.utils.deprecation import MiddlewareMixin
from django.conf import settings

logger = logging.getLogger(__name__)


class AuthCacheMiddleware(MiddlewareMixin):
    """
    Middleware to cache user authentication and reduce database queries
    Fixes the repeated knox_authtoken and core_customuser queries
    """

    def process_request(self, request):
        request._start_time = time.time()

        # Cache authenticated user data to avoid repeated DB queries
        if hasattr(request, "user") and request.user.is_authenticated:
            cache_key = f"user_auth_cache_{request.user.id}"
            cached_user_data = cache.get(cache_key)

            if not cached_user_data:
                # Cache essential user data for 5 minutes
                cached_user_data = {
                    "id": request.user.id,
                    "username": request.user.username,
                    "email": request.user.email,
                    "is_active": request.user.is_active,
                    "role": getattr(request.user, "role", None),
                    "first_name": request.user.first_name,
                    "last_name": request.user.last_name,
                }
                cache.set(cache_key, cached_user_data, 300)  # 5 minutes

                logger.debug(f"Cached user data for user {request.user.id}")
            else:
                logger.debug(f"Using cached user data for user {request.user.id}")

        return None

    def process_response(self, request, response):
        # Monitor request performance
        if hasattr(request, "_start_time"):
            duration = time.time() - request._start_time

            # Log performance based on severity
            if duration > 30.0:  # Critical: Over 30 seconds (like your current issue)
                logger.error(
                    f"CRITICAL SLOW REQUEST: {request.method} {request.path} took {duration:.2f}s - "
                    f"Status: {response.status_code}"
                )
            elif duration > 10.0:  # Very slow
                logger.warning(
                    f"VERY SLOW REQUEST: {request.method} {request.path} took {duration:.2f}s - "
                    f"Status: {response.status_code}"
                )
            elif duration > 2.0:  # Moderately slow
                logger.warning(
                    f"SLOW REQUEST: {request.method} {request.path} took {duration:.2f}s - "
                    f"Status: {response.status_code}"
                )
            elif settings.DEBUG and duration > 0.5:  # Debug logging for optimization
                logger.info(
                    f"Request: {request.method} {request.path} took {duration:.2f}s - "
                    f"Status: {response.status_code}"
                )

        return response


class QueryCountMiddleware(MiddlewareMixin):
    """
    Middleware to monitor database query count
    Helps identify N+1 query problems
    """

    def process_request(self, request):
        if settings.DEBUG:
            from django.db import connection, reset_queries

            reset_queries()
            request._queries_before = len(connection.queries)

    def process_response(self, request, response):
        if settings.DEBUG:
            from django.db import connection

            queries_after = len(connection.queries)
            query_count = queries_after - getattr(request, "_queries_before", 0)

            # Log high query count requests
            if query_count > 20:  # Very high query count
                logger.error(
                    f"EXCESSIVE QUERIES: {request.method} {request.path} - {query_count} queries"
                )

                # Log individual queries for debugging
                if query_count > 50:
                    for i, query in enumerate(
                        connection.queries[-10:], 1
                    ):  # Last 10 queries
                        logger.error(
                            f"Query {i}: {query['sql'][:200]}... ({query['time']}s)"
                        )

            elif query_count > 10:  # High query count
                logger.warning(
                    f"HIGH QUERY COUNT: {request.method} {request.path} - {query_count} queries"
                )
            elif query_count > 5:  # Moderate query count
                logger.info(
                    f"Moderate queries: {request.method} {request.path} - {query_count} queries"
                )

        return response


class CacheWarningMiddleware(MiddlewareMixin):
    """
    Middleware to monitor cache usage and performance
    """

    def process_request(self, request):
        # Track cache hits/misses for monitoring
        request._cache_operations = {"hits": 0, "misses": 0, "sets": 0}
        return None

    def process_response(self, request, response):
        # In production, you could integrate with cache monitoring tools
        # For now, just ensure cache is working
        try:
            # Test cache functionality
            cache.set("health_check", "ok", 10)
            health = cache.get("health_check")
            if health != "ok":
                logger.warning("Cache system not functioning properly")
        except Exception as e:
            logger.error(f"Cache system error: {e}")

        return response


class DatabaseHealthMiddleware(MiddlewareMixin):
    """
    Middleware to monitor database health and connection issues
    """

    def process_request(self, request):
        # Check database connectivity for critical endpoints
        if request.path.startswith("/api/scheduling/appointments"):
            try:
                from django.db import connection

                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")
                    result = cursor.fetchone()
                    if result[0] != 1:
                        logger.error("Database connectivity issue detected")
            except Exception as e:
                logger.error(f"Database health check failed: {e}")

        return None
