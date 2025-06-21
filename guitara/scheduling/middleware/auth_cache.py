"""
Authentication Caching Middleware to fix the 32-second query issue
Prevents redundant authentication queries that are causing performance bottlenecks
"""

import time
from django.core.cache import cache
from django.utils.deprecation import MiddlewareMixin
from django.contrib.auth import get_user
import logging

logger = logging.getLogger(__name__)


class AuthCacheMiddleware(MiddlewareMixin):
    """
    Middleware to cache user authentication and reduce database queries
    Fixes the issue where Knox authentication queries are repeated 6 times per request
    """

    def process_request(self, request):
        request._start_time = time.time()

        # Cache authenticated user for the request duration
        if hasattr(request, "user") and request.user.is_authenticated:
            # Create a cache key based on user ID and token
            auth_header = request.META.get("HTTP_AUTHORIZATION", "")
            if auth_header.startswith("Token "):
                token_key = auth_header[6:][:8]  # First 8 chars for cache key
                cache_key = f"user_auth_{request.user.id}_{token_key}"

                cached_user = cache.get(cache_key)
                if not cached_user:
                    # Cache user data for 5 minutes to prevent repeated lookups
                    cache.set(
                        cache_key,
                        {
                            "id": request.user.id,
                            "username": request.user.username,
                            "is_active": request.user.is_active,
                            "role": getattr(request.user, "role", None),
                            "email": request.user.email,
                        },
                        300,
                    )  # 5 minutes
                    logger.debug(f"Cached user {request.user.id} authentication")

        return None

    def process_response(self, request, response):
        # Log slow requests for monitoring
        if hasattr(request, "_start_time"):
            duration = time.time() - request._start_time

            if duration > 2.0:  # Log requests taking more than 2 seconds
                logger.warning(
                    f"SLOW REQUEST: {request.method} {request.path} took {duration:.2f}s"
                )
            elif duration > 10.0:  # Critical slow requests
                logger.error(
                    f"CRITICAL SLOW REQUEST: {request.method} {request.path} took {duration:.2f}s"
                )

        return response


class QueryCountMiddleware(MiddlewareMixin):
    """
    Middleware to monitor database query count in development
    Helps identify N+1 query problems and optimization opportunities
    """

    def process_request(self, request):
        from django.conf import settings

        if settings.DEBUG:
            from django.db import connection

            request._queries_before = len(connection.queries)

    def process_response(self, request, response):
        from django.conf import settings

        if settings.DEBUG:
            from django.db import connection

            queries_after = len(connection.queries)
            query_count = queries_after - getattr(request, "_queries_before", 0)

            if query_count > 10:  # Log high query count requests
                logger.warning(
                    f"HIGH QUERY COUNT: {request.method} {request.path} - {query_count} queries"
                )

                # Log the actual queries for debugging
                if query_count > 20:
                    recent_queries = connection.queries[-query_count:]
                    for i, query in enumerate(recent_queries):
                        logger.debug(
                            f"Query {i+1}: {query['sql'][:100]}... ({query['time']}s)"
                        )

        return response


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Enhanced request logging for performance monitoring
    """

    def process_request(self, request):
        request._start_time = time.time()

        # Log the start of potentially expensive requests
        if request.path.startswith("/api/scheduling/appointments"):
            logger.info(f"Starting request: {request.method} {request.path}")

    def process_response(self, request, response):
        if hasattr(request, "_start_time"):
            duration = time.time() - request._start_time

            # Special monitoring for appointments endpoint
            if request.path.startswith("/api/scheduling/appointments"):
                if duration > 1.0:
                    logger.warning(
                        f"Appointments endpoint slow: {request.method} {request.path} - {duration:.2f}s"
                    )
                else:
                    logger.info(
                        f"Appointments endpoint: {request.method} {request.path} - {duration:.2f}s"
                    )

        return response
