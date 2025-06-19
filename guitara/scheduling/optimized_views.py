"""
Optimized API views with built-in performance enhancements
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.cache import cache
from django.utils import timezone
from django.db.models import Q, Prefetch
from datetime import datetime, timedelta
import time
import logging
from .optimized_data_manager import data_manager
from .tasks import process_driver_assignment, send_appointment_notifications

logger = logging.getLogger(__name__)


class OptimizedAPIViewMixin:
    """
    Mixin providing performance optimizations for API views
    """

    def get_cache_key(self, action_name, *args):
        """Generate cache key for this view action"""
        user_id = (
            self.request.user.id if self.request.user.is_authenticated else "anonymous"
        )
        return f"{self.__class__.__name__}_{action_name}_{user_id}_{'_'.join(str(arg) for arg in args)}"

    def get_cached_response(self, cache_key, timeout=300):
        """Get cached response if available"""
        return cache.get(cache_key)

    def set_cached_response(self, cache_key, data, timeout=300):
        """Cache response data"""
        cache.set(cache_key, data, timeout)

    def get_optimized_queryset(self):
        """Get queryset with optimized select_related and prefetch_related"""
        queryset = self.get_queryset()

        # Add common optimizations
        if hasattr(self.get_queryset().model, "client"):
            queryset = queryset.select_related("client")
        if hasattr(self.get_queryset().model, "therapist"):
            queryset = queryset.select_related("therapist")
        if hasattr(self.get_queryset().model, "driver"):
            queryset = queryset.select_related("driver")
        if hasattr(self.get_queryset().model, "operator"):
            queryset = queryset.select_related("operator")

        return queryset

    def log_performance(self, action_name, start_time, query_count_start):
        """Log performance metrics for this action"""
        from django.db import connection

        duration = time.time() - start_time
        query_count = len(connection.queries) - query_count_start

        if duration > 0.5:  # Log slow actions
            logger.warning(
                f"Slow API action: {action_name} took {duration:.3f}s with {query_count} queries"
            )

        return {"duration": duration, "query_count": query_count}


class OptimizedAppointmentViewSet(OptimizedAPIViewMixin, viewsets.ModelViewSet):
    """
    Optimized appointment viewset with caching and performance monitoring
    """

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return self.get_optimized_queryset()

    @action(detail=False, methods=["get"])
    def today(self, request):
        """Get today's appointments with aggressive caching"""
        start_time = time.time()
        from django.db import connection

        query_count_start = len(connection.queries)

        try:
            appointments = data_manager.get_today_appointments_ultra_fast(request.user)

            performance = self.log_performance("today", start_time, query_count_start)

            return Response(
                {
                    "appointments": appointments,
                    "count": len(appointments),
                    "performance": performance if request.user.is_staff else None,
                }
            )

        except Exception as e:
            logger.error(f"Error getting today's appointments: {e}")
            return Response(
                {"error": "Failed to load appointments"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"])
    def upcoming(self, request):
        """Get upcoming appointments with caching"""
        start_time = time.time()
        from django.db import connection

        query_count_start = len(connection.queries)

        try:
            # Get date range from query params
            days_ahead = int(request.query_params.get("days", 7))
            end_date = timezone.now().date() + timedelta(days=days_ahead)

            cache_key = self.get_cache_key("upcoming", request.user.id, days_ahead)
            cached_data = self.get_cached_response(cache_key)

            if cached_data:
                return Response(cached_data)

            appointments = data_manager.get_appointments_optimized(
                user=request.user,
                date=None,  # Will get filtered by date range in the manager
                status=None,
            )

            # Filter by date range
            filtered_appointments = [
                apt
                for apt in appointments
                if datetime.fromisoformat(apt["date"]).date() <= end_date
            ]

            response_data = {
                "appointments": filtered_appointments,
                "count": len(filtered_appointments),
                "date_range": {
                    "start": timezone.now().date().isoformat(),
                    "end": end_date.isoformat(),
                },
            }

            # Cache for 5 minutes
            self.set_cached_response(cache_key, response_data, 300)

            performance = self.log_performance(
                "upcoming", start_time, query_count_start
            )
            if request.user.is_staff:
                response_data["performance"] = performance

            return Response(response_data)

        except Exception as e:
            logger.error(f"Error getting upcoming appointments: {e}")
            return Response(
                {"error": "Failed to load upcoming appointments"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"])
    def check_conflicts(self, request):
        """Check for appointment conflicts optimized"""
        start_time = time.time()
        from django.db import connection

        query_count_start = len(connection.queries)

        try:
            appointment_data = request.data
            conflicts = data_manager.get_appointment_conflicts_optimized(
                appointment_data
            )

            performance = self.log_performance(
                "check_conflicts", start_time, query_count_start
            )

            return Response(
                {
                    "conflicts": conflicts,
                    "has_conflicts": len(conflicts) > 0,
                    "performance": performance if request.user.is_staff else None,
                }
            )

        except Exception as e:
            logger.error(f"Error checking conflicts: {e}")
            return Response(
                {"error": "Failed to check conflicts"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"])
    def assign_driver(self, request, pk=None):
        """Assign driver using background task"""
        try:
            appointment = self.get_object()

            if appointment.driver:
                return Response(
                    {"error": "Driver already assigned"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Use background task for heavy FIFO logic
            task = process_driver_assignment.delay(appointment.id)

            return Response(
                {
                    "message": "Driver assignment in progress",
                    "task_id": task.id,
                    "appointment_id": appointment.id,
                }
            )

        except Exception as e:
            logger.error(f"Error assigning driver: {e}")
            return Response(
                {"error": "Failed to assign driver"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def update_status(self, request, pk=None):
        """Update appointment status with real-time broadcasting"""
        start_time = time.time()

        try:
            appointment = self.get_object()
            new_status = request.data.get("status")

            if not new_status:
                return Response(
                    {"error": "Status is required"}, status=status.HTTP_400_BAD_REQUEST
                )

            # Validate status
            from .models import Appointment

            valid_statuses = [choice[0] for choice in Appointment.STATUS_CHOICES]
            if new_status not in valid_statuses:
                return Response(
                    {"error": "Invalid status"}, status=status.HTTP_400_BAD_REQUEST
                )

            old_status = appointment.status
            appointment.status = new_status
            appointment.save(update_fields=["status"])

            # Serialize appointment data for broadcasting
            appointment_data = {
                "id": appointment.id,
                "status": appointment.status,
                "date": appointment.date.isoformat(),
                "start_time": appointment.start_time.isoformat(),
                "end_time": appointment.end_time.isoformat(),
                "therapist_id": appointment.therapist_id,
                "driver_id": appointment.driver_id,
                "updated_by": request.user.id,
            }

            # Broadcast update in real-time
            data_manager.broadcast_appointment_update(appointment_data, "status_update")

            # Send notifications asynchronously
            send_appointment_notifications.delay(
                appointment.id,
                "status_updated",
                f"Appointment status changed from {old_status} to {new_status}",
            )

            duration = time.time() - start_time

            return Response(
                {
                    "success": True,
                    "appointment": appointment_data,
                    "old_status": old_status,
                    "performance": (
                        {"duration": duration} if request.user.is_staff else None
                    ),
                }
            )

        except Exception as e:
            logger.error(f"Error updating appointment status: {e}")
            return Response(
                {"error": "Failed to update status"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def create(self, request, *args, **kwargs):
        """Optimized appointment creation"""
        start_time = time.time()

        try:
            # Check conflicts before creating
            conflicts = data_manager.get_appointment_conflicts_optimized(request.data)

            if conflicts:
                return Response(
                    {"error": "Appointment conflicts detected", "conflicts": conflicts},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            response = super().create(request, *args, **kwargs)

            if response.status_code == status.HTTP_201_CREATED:
                appointment_data = response.data

                # Broadcast new appointment
                data_manager.broadcast_appointment_update(appointment_data, "created")

                # Send notifications
                send_appointment_notifications.delay(
                    appointment_data["id"],
                    "appointment_created",
                    "New appointment has been created",
                )

            duration = time.time() - start_time
            if request.user.is_staff:
                response.data["performance"] = {"duration": duration}

            return response

        except Exception as e:
            logger.error(f"Error creating appointment: {e}")
            return Response(
                {"error": "Failed to create appointment"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class OptimizedAvailabilityViewSet(OptimizedAPIViewMixin, viewsets.ModelViewSet):
    """
    Optimized availability viewset
    """

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def by_date(self, request):
        """Get availability by date with caching"""
        start_time = time.time()
        from django.db import connection

        query_count_start = len(connection.queries)

        try:
            date_str = request.query_params.get("date")
            role = request.query_params.get("role")
            specialization = request.query_params.get("specialization")

            if not date_str:
                return Response(
                    {"error": "Date parameter is required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
            availability_data = data_manager.get_availability_optimized(
                date_obj, role, specialization
            )

            performance = self.log_performance("by_date", start_time, query_count_start)

            return Response(
                {
                    "availability": availability_data,
                    "date": date_str,
                    "role": role,
                    "count": len(availability_data),
                    "performance": performance if request.user.is_staff else None,
                }
            )

        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f"Error getting availability: {e}")
            return Response(
                {"error": "Failed to get availability"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["get"])
    def next_slot(self, request):
        """Find next available slot for a user"""
        try:
            user_id = request.query_params.get("user_id")
            date_str = request.query_params.get("date")
            duration = int(request.query_params.get("duration", 60))

            if not user_id or not date_str:
                return Response(
                    {"error": "user_id and date parameters are required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
            next_slot = data_manager.get_next_available_slot(
                user_id, date_obj, duration
            )

            return Response(
                {
                    "next_slot": next_slot,
                    "user_id": user_id,
                    "date": date_str,
                    "duration_minutes": duration,
                }
            )

        except ValueError:
            return Response(
                {"error": "Invalid date format or duration"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            logger.error(f"Error finding next slot: {e}")
            return Response(
                {"error": "Failed to find next available slot"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class OptimizedStaffViewSet(OptimizedAPIViewMixin, viewsets.ModelViewSet):
    """
    Optimized staff management viewset
    """

    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=["get"])
    def available(self, request):
        """Get available staff with FIFO ordering"""
        start_time = time.time()

        try:
            role = request.query_params.get("role")
            date_str = request.query_params.get("date")
            specialization = request.query_params.get("specialization")

            if not role or not date_str:
                return Response(
                    {"error": "role and date parameters are required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
            available_staff = data_manager.get_available_staff_optimized(
                role, date_obj, specialization
            )

            duration = time.time() - start_time

            return Response(
                {
                    "staff": available_staff,
                    "role": role,
                    "date": date_str,
                    "count": len(available_staff),
                    "performance": (
                        {"duration": duration} if request.user.is_staff else None
                    ),
                }
            )

        except ValueError:
            return Response(
                {"error": "Invalid date format"}, status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Error getting available staff: {e}")
            return Response(
                {"error": "Failed to get available staff"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
