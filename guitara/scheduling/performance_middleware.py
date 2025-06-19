"""
Performance monitoring middleware for tracking and optimizing response times
"""

import time
import logging
from django.conf import settings
from django.core.cache import cache
from django.db import connection
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
import json

logger = logging.getLogger(__name__)


class PerformanceMonitoringMiddleware(MiddlewareMixin):
    """
    Monitor request performance and database queries
    """

    def __init__(self, get_response):
        self.get_response = get_response
        super().__init__(get_response)

    def process_request(self, request):
        """Start timing the request"""
        request._performance_start_time = time.time()
        request._performance_start_queries = len(connection.queries)

        # Add request ID for tracking
        request._request_id = f"{int(time.time() * 1000)}_{id(request)}"

        return None

    def process_response(self, request, response):
        """Calculate and log performance metrics"""
        if not hasattr(request, "_performance_start_time"):
            return response

        # Calculate timing
        total_time = time.time() - request._performance_start_time
        query_count = len(connection.queries) - request._performance_start_queries

        # Log slow requests
        if total_time > 1.0:  # Log requests taking more than 1 second
            logger.warning(
                f"Slow request: {request.method} {request.path} "
                f"took {total_time:.3f}s with {query_count} queries"
            )

        # Log excessive queries
        if query_count > 10:
            logger.warning(
                f"High query count: {request.method} {request.path} "
                f"executed {query_count} queries in {total_time:.3f}s"
            )

        # Add performance headers in development
        if settings.DEBUG:
            response["X-Response-Time"] = f"{total_time:.3f}s"
            response["X-Query-Count"] = str(query_count)
            response["X-Request-ID"] = getattr(request, "_request_id", "unknown")

        # Update performance metrics cache
        self._update_performance_cache(request, total_time, query_count)

        return response

    def _update_performance_cache(self, request, response_time, query_count):
        """Update cached performance metrics"""
        try:
            metrics_key = "api_performance_metrics"
            current_metrics = cache.get(
                metrics_key,
                {
                    "request_count": 0,
                    "total_response_time": 0,
                    "total_queries": 0,
                    "slow_requests": 0,
                    "endpoints": {},
                },
            )

            endpoint = f"{request.method} {request.path}"

            # Update overall metrics
            current_metrics["request_count"] += 1
            current_metrics["total_response_time"] += response_time
            current_metrics["total_queries"] += query_count

            if response_time > 1.0:
                current_metrics["slow_requests"] += 1

            # Update endpoint-specific metrics
            if endpoint not in current_metrics["endpoints"]:
                current_metrics["endpoints"][endpoint] = {
                    "count": 0,
                    "total_time": 0,
                    "total_queries": 0,
                    "avg_time": 0,
                    "avg_queries": 0,
                }

            endpoint_metrics = current_metrics["endpoints"][endpoint]
            endpoint_metrics["count"] += 1
            endpoint_metrics["total_time"] += response_time
            endpoint_metrics["total_queries"] += query_count
            endpoint_metrics["avg_time"] = (
                endpoint_metrics["total_time"] / endpoint_metrics["count"]
            )
            endpoint_metrics["avg_queries"] = (
                endpoint_metrics["total_queries"] / endpoint_metrics["count"]
            )

            # Cache updated metrics for 1 hour
            cache.set(metrics_key, current_metrics, 3600)

        except Exception as e:
            logger.error(f"Error updating performance cache: {e}")


class DatabaseQueryLoggingMiddleware(MiddlewareMixin):
    """
    Log database queries for debugging N+1 problems
    """

    def process_request(self, request):
        """Reset query tracking"""
        if settings.DEBUG:
            request._debug_queries_start = len(connection.queries)
        return None

    def process_response(self, request, response):
        """Log database queries in debug mode"""
        if not settings.DEBUG or not hasattr(request, "_debug_queries_start"):
            return response

        queries = connection.queries[request._debug_queries_start :]

        if len(queries) > 5:  # Log endpoints with many queries
            logger.debug(f"Database queries for {request.path}:")
            for i, query in enumerate(queries, 1):
                logger.debug(f"  {i}. {query['sql'][:100]}... ({query['time']}s)")

        return response


class CacheHitRateMiddleware(MiddlewareMixin):
    """
    Monitor cache hit rates for optimization
    """

    def process_response(self, request, response):
        """Track cache usage"""
        try:
            cache_stats_key = "cache_hit_stats"
            cache_stats = cache.get(
                cache_stats_key, {"hits": 0, "misses": 0, "total_requests": 0}
            )

            cache_stats["total_requests"] += 1

            # Check if this was likely a cache hit (fast response)
            if hasattr(request, "_performance_start_time"):
                response_time = time.time() - request._performance_start_time
                if response_time < 0.1:  # Fast response likely indicates cache hit
                    cache_stats["hits"] += 1
                else:
                    cache_stats["misses"] += 1

            # Calculate hit rate
            if cache_stats["total_requests"] > 0:
                hit_rate = cache_stats["hits"] / cache_stats["total_requests"]
                cache_stats["hit_rate"] = round(hit_rate * 100, 2)

            cache.set(cache_stats_key, cache_stats, 3600)

        except Exception as e:
            logger.error(f"Error tracking cache stats: {e}")

        return response


class RealTimeConnectionMiddleware(MiddlewareMixin):
    """
    Monitor WebSocket connections and real-time performance
    """

    def process_request(self, request):
        """Track WebSocket-related requests"""
        if "websocket" in request.path.lower() or "ws/" in request.path:
            connection_stats_key = "websocket_connection_stats"
            stats = cache.get(
                connection_stats_key,
                {
                    "active_connections": 0,
                    "total_connections": 0,
                    "connection_attempts": 0,
                },
            )

            stats["connection_attempts"] += 1
            cache.set(connection_stats_key, stats, 3600)

        return None


class APIResponseOptimizationMiddleware(MiddlewareMixin):
    """
    Optimize API responses for better performance
    """

    def process_response(self, request, response):
        """Optimize API responses"""
        # Add caching headers for API endpoints
        if request.path.startswith("/api/"):
            if request.method == "GET":
                # Cache GET requests for 5 minutes
                response["Cache-Control"] = "max-age=300, private"
            elif request.method in ["POST", "PUT", "PATCH", "DELETE"]:
                # Don't cache write operations
                response["Cache-Control"] = "no-cache, no-store, must-revalidate"

        # Add performance optimization headers
        response["X-Content-Type-Options"] = "nosniff"
        response["X-Frame-Options"] = "DENY"

        # Compress JSON responses
        if (
            response.get("Content-Type", "").startswith("application/json")
            and hasattr(response, "content")
            and len(response.content) > 1024
        ):
            # Let the web server handle compression
            response["Vary"] = "Accept-Encoding"

        return response


class HealthCheckMiddleware(MiddlewareMixin):
    """
    Provide health check endpoint for monitoring
    """

    def process_request(self, request):
        """Handle health check requests"""
        if request.path == "/health/":
            try:
                # Check database connection
                from django.db import connection

                with connection.cursor() as cursor:
                    cursor.execute("SELECT 1")

                # Check cache
                cache.set("health_check", "ok", 10)
                cache_ok = cache.get("health_check") == "ok"

                # Get performance metrics
                performance_metrics = cache.get("api_performance_metrics", {})
                cache_stats = cache.get("cache_hit_stats", {})
                websocket_stats = cache.get("websocket_connection_stats", {})

                health_data = {
                    "status": "healthy",
                    "timestamp": time.time(),
                    "database": "ok",
                    "cache": "ok" if cache_ok else "error",
                    "performance": {
                        "avg_response_time": round(
                            performance_metrics.get("total_response_time", 0)
                            / max(performance_metrics.get("request_count", 1), 1),
                            3,
                        ),
                        "request_count": performance_metrics.get("request_count", 0),
                        "slow_requests": performance_metrics.get("slow_requests", 0),
                        "cache_hit_rate": cache_stats.get("hit_rate", 0),
                    },
                    "websocket": websocket_stats,
                }

                return JsonResponse(health_data)

            except Exception as e:
                logger.error(f"Health check failed: {e}")
                return JsonResponse(
                    {"status": "unhealthy", "error": str(e), "timestamp": time.time()},
                    status=503,
                )

        return None
