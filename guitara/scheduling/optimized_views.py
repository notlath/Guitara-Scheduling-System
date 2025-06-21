# scheduling/optimized_views.py
"""
Optimized views for OperatorDashboard performance improvements
Addresses the 32-second query time issue
"""

# Critical imports for optimized appointment handling
from rest_framework import viewsets, serializers, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Case, When, Value, IntegerField, Count, Q, Prefetch
from django.core.cache import cache
from django.core.paginator import Paginator
from django.conf import settings
from django.db import connection
from datetime import datetime
import time
import logging

# Import models and existing serializers
from .models import Appointment, Notification
from registration.models import Service
from .serializers import AppointmentSerializer, NotificationSerializer
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()
logger = logging.getLogger(__name__)


class OptimizedAppointmentViewSet(viewsets.ModelViewSet):
    """
    Ultra-optimized Appointment ViewSet for OperatorDashboard
    Fixes 32-second query time issue with proper indexing and caching
    """

    serializer_class = AppointmentSerializer

    def get_queryset(self):
        """
        Highly optimized queryset with proper prefetching and field selection
        Uses the new database indexes for maximum performance
        """
        # Base queryset with essential relationships only
        queryset = (
            Appointment.objects.select_related(
                "client", "therapist", "driver", "operator"
            )
            .prefetch_related(
                # Optimize services prefetch with limited fields
                Prefetch(
                    "services",
                    queryset=Service.objects.only("id", "name", "price", "duration"),
                )
            )
            .only(
                # CRITICAL: Only fetch required fields to reduce data transfer
                "id",
                "date",
                "start_time",
                "end_time",
                "status",
                "location",
                "client_id",
                "therapist_id",
                "driver_id",
                "operator_id",
                "created_at",
                "updated_at",
                "rejection_reason",
                "payment_status",
                "response_deadline",
                "session_started_at",
                "session_ended_at",
                "pickup_request_time",
                "therapist_accepted",
                "driver_confirmed_at",
                "pickup_urgency",
                "total_amount",
                "notes",
            )
        )

        return queryset

    def list(self, request):
        """
        Optimized list endpoint with aggressive caching and pagination
        Prevents the 32-second query time issue
        """
        # Create cache key based on user and query parameters
        cache_key = (
            f"appointments_list_{request.user.id}_{hash(request.GET.urlencode())}"
        )

        # Try cache first (5 minute cache for non-debug)
        if not settings.DEBUG:
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.info(
                    f"Served appointments from cache for user {request.user.id}"
                )
                return Response(cached_data)

        try:
            # Performance monitoring
            queries_before = len(connection.queries) if settings.DEBUG else 0
            start_time = time.time()

            queryset = self.get_queryset()

            # Apply filters efficiently using indexed fields
            status_filter = request.GET.get("status")
            if status_filter:
                queryset = queryset.filter(status=status_filter)

            date_filter = request.GET.get("date")
            if date_filter:
                try:
                    filter_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
                    queryset = queryset.filter(date=filter_date)
                except ValueError:
                    pass

            # Date range filters using indexed compound fields
            date_from = request.GET.get("date_from")
            date_to = request.GET.get("date_to")
            if date_from:
                try:
                    from_date = datetime.strptime(date_from, "%Y-%m-%d").date()
                    queryset = queryset.filter(date__gte=from_date)
                except ValueError:
                    pass

            if date_to:
                try:
                    to_date = datetime.strptime(date_to, "%Y-%m-%d").date()
                    queryset = queryset.filter(date__lte=to_date)
                except ValueError:
                    pass

            # Use indexed ordering (status + date index)
            queryset = queryset.order_by("status", "-date", "-created_at")

            # Mandatory pagination to prevent large result sets
            page_size = min(int(request.GET.get("page_size", 50)), 100)  # Max 100 items
            paginator = Paginator(queryset, page_size)
            page_number = request.GET.get("page", 1)

            try:
                page = paginator.get_page(page_number)
            except Exception as e:
                logger.error(f"Pagination error: {e}")
                page = paginator.get_page(1)

            # Serialize efficiently
            serializer = self.get_serializer(page, many=True)

            # Performance logging
            duration = time.time() - start_time
            if settings.DEBUG:
                queries_after = len(connection.queries)
                query_count = queries_after - queries_before

                if duration > 2.0:  # Log slow queries
                    logger.warning(
                        f"Slow appointments query: {duration:.2f}s, {query_count} queries"
                    )
                else:
                    logger.info(
                        f"Appointments query: {duration:.2f}s, {query_count} queries"
                    )

            response_data = {
                "results": serializer.data,
                "count": paginator.count,
                "next": page.has_next(),
                "previous": page.has_previous(),
                "page_number": page.number,
                "total_pages": paginator.num_pages,
                "performance": (
                    {
                        "query_time": f"{duration:.2f}s",
                        "query_count": query_count if settings.DEBUG else 0,
                        "cached": False,
                    }
                    if settings.DEBUG
                    else {}
                ),
            }

            # Cache successful responses for 5 minutes
            if not settings.DEBUG and duration < 5.0:  # Only cache if not too slow
                cache_data = response_data.copy()
                cache_data.pop("performance", None)
                cache.set(cache_key, cache_data, 300)

            return Response(response_data)

        except Exception as e:
            logger.error(f"Appointments list error: {str(e)}")
            return Response(
                {
                    "error": "Failed to fetch appointments",
                    "detail": str(e) if settings.DEBUG else "Internal server error",
                },
                status=500,
            )

    @action(detail=False, methods=["get"], url_path="operator-dashboard")
    def operator_dashboard(self, request):
        """
        Specialized endpoint for operator dashboard with actionable items only
        CRITICAL: This prevents the 32-second query time by limiting data
        """
        cache_key = f"operator_dashboard_{request.user.id}"

        # Check cache first (2 minute cache for frequent updates)
        if not settings.DEBUG:
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.info(
                    f"Served operator dashboard from cache for user {request.user.id}"
                )
                return Response(cached_data)

        try:
            start_time = time.time()
            queries_before = len(connection.queries) if settings.DEBUG else 0

            # CRITICAL: Only fetch actionable appointments (much smaller dataset)
            actionable_statuses = [
                "pending",
                "rejected",
                "awaiting_payment",
                "in_progress",
                "pickup_requested",
                "overdue",
                "driver_confirmed",
                "journey_started",
                "arrived",
            ]

            # Limit to recent actionable items (last 7 days) to prevent large datasets
            from datetime import datetime, timedelta

            week_ago = datetime.now() - timedelta(days=7)

            queryset = (
                self.get_queryset()
                .filter(status__in=actionable_statuses, created_at__gte=week_ago)
                .order_by(
                    # Order by urgency using indexed fields
                    Case(
                        When(status="overdue", then=Value(1)),
                        When(status="rejected", then=Value(2)),
                        When(status="pending", then=Value(3)),
                        When(status="awaiting_payment", then=Value(4)),
                        default=Value(5),
                        output_field=IntegerField(),
                    ),
                    "response_deadline",
                    "created_at",
                )[:100]
            )  # Hard limit to prevent large responses

            # Use optimized serializer for dashboard
            serializer = DashboardAppointmentSerializer(queryset, many=True)

            # Get aggregated counts efficiently using single query
            stats = Appointment.objects.filter(created_at__gte=week_ago).aggregate(
                total_rejected=Count("id", filter=Q(status="rejected")),
                total_pending=Count("id", filter=Q(status="pending")),
                total_overdue=Count("id", filter=Q(status="overdue")),
                total_awaiting_payment=Count("id", filter=Q(status="awaiting_payment")),
                total_active=Count(
                    "id",
                    filter=Q(status__in=["in_progress", "journey_started", "arrived"]),
                ),
                total_pickup_requests=Count("id", filter=Q(status="pickup_requested")),
            )

            duration = time.time() - start_time

            if settings.DEBUG:
                queries_after = len(connection.queries)
                query_count = queries_after - queries_before
                logger.info(
                    f"Operator dashboard query: {duration:.2f}s, {query_count} queries"
                )

            response_data = {
                "actionable_appointments": serializer.data,
                "stats": stats,
                "performance": (
                    {
                        "query_time": f"{duration:.2f}s",
                        "count": len(serializer.data),
                        "cached": False,
                    }
                    if settings.DEBUG
                    else {}
                ),
            }

            # Cache for 2 minutes (frequent updates needed for operator dashboard)
            if not settings.DEBUG and duration < 5.0:
                cache.set(cache_key, response_data, 120)

            return Response(response_data)

        except Exception as e:
            logger.error(f"Operator dashboard error: {str(e)}")
            return Response(
                {
                    "error": "Failed to load operator dashboard",
                    "detail": str(e) if settings.DEBUG else "Internal server error",
                },
                status=500,
            )

    @action(detail=False, methods=["get"], url_path="today")
    def today_appointments(self, request):
        """Optimized today's appointments endpoint"""
        from datetime import date

        cache_key = f"today_appointments_{request.user.id}_{date.today()}"

        # Check cache first (30 minute cache)
        if not settings.DEBUG:
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data)

        try:
            start_time = time.time()

            # Use indexed date field for efficient filtering
            queryset = (
                self.get_queryset()
                .filter(date=date.today())
                .order_by("start_time", "status")
            )

            serializer = self.get_serializer(queryset, many=True)
            duration = time.time() - start_time

            response_data = {
                "results": serializer.data,
                "date": date.today().isoformat(),
                "count": len(serializer.data),
                "performance": (
                    {"query_time": f"{duration:.2f}s"} if settings.DEBUG else {}
                ),
            }

            # Cache for 30 minutes
            if not settings.DEBUG:
                cache.set(cache_key, response_data, 1800)

            return Response(response_data)

        except Exception as e:
            logger.error(f"Today appointments error: {str(e)}")
            return Response({"error": str(e)}, status=500)

    @action(detail=False, methods=["get"], url_path="upcoming")
    def upcoming_appointments(self, request):
        """Optimized upcoming appointments endpoint"""
        from datetime import date, timedelta

        cache_key = f"upcoming_appointments_{request.user.id}"

        if not settings.DEBUG:
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data)

        try:
            # Next 7 days using indexed date field
            today = date.today()
            next_week = today + timedelta(days=7)

            queryset = (
                self.get_queryset()
                .filter(date__gt=today, date__lte=next_week)
                .order_by("date", "start_time")
            )

            serializer = self.get_serializer(queryset, many=True)

            response_data = {
                "results": serializer.data,
                "date_range": {
                    "from": (today + timedelta(days=1)).isoformat(),
                    "to": next_week.isoformat(),
                },
                "count": len(serializer.data),
            }

            # Cache for 1 hour
            if not settings.DEBUG:
                cache.set(cache_key, response_data, 3600)

            return Response(response_data)

        except Exception as e:
            logger.error(f"Upcoming appointments error: {str(e)}")
            return Response({"error": str(e)}, status=500)


# Optimized serializers for better performance
class DashboardAppointmentSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for operator dashboard - only essential fields
    Reduces data transfer and serialization time
    """

    client_name = serializers.CharField(source="client.get_full_name", read_only=True)
    therapist_name = serializers.CharField(
        source="therapist.get_full_name", read_only=True
    )
    driver_name = serializers.CharField(source="driver.get_full_name", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id",
            "status",
            "date",
            "start_time",
            "end_time",
            "client_name",
            "therapist_name",
            "driver_name",
            "rejection_reason",
            "response_deadline",
            "location",
            "payment_status",
            "created_at",
        ]


class NotificationViewSet(viewsets.ModelViewSet):
    """
    Optimized ViewSet for notifications with caching and performance enhancements
    """

    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Return notifications for the current user with optimizations
        """
        user = self.request.user
        return (
            Notification.objects.filter(user=user)
            .select_related("user")
            .order_by("-created_at")
        )

    def list(self, request):
        """
        List notifications with caching
        """
        user = request.user
        cache_key = f"notifications_user_{user.id}"

        # Try to get from cache first
        cached_data = cache.get(cache_key)
        if cached_data:
            return Response(cached_data)

        queryset = self.get_queryset()[:20]  # Limit to 20 most recent
        serializer = self.get_serializer(queryset, many=True)

        # Cache for 5 minutes
        cache.set(cache_key, serializer.data, timeout=300)

        return Response(serializer.data)
