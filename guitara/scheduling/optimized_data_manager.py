"""
Optimized Data Manager for ultra-low latency operations
Handles caching, database optimization, and real-time data synchronization
"""

from django.core.cache import cache
from django.db.models import Q, Prefetch, select_related
from django.utils import timezone
from datetime import datetime, timedelta
import logging
import asyncio
from typing import List, Dict, Optional, Any
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

logger = logging.getLogger(__name__)


class OptimizedDataManager:
    """
    High-performance data manager with intelligent caching and query optimization
    """

    def __init__(self):
        self.cache_timeout = 300  # 5 minutes default
        self.short_cache_timeout = 60  # 1 minute for frequently changing data
        self.long_cache_timeout = 1800  # 30 minutes for stable data

    def get_cache_key(self, prefix: str, *args) -> str:
        """Generate consistent cache keys"""
        return f"{prefix}_{'_'.join(str(arg) for arg in args)}"

    def invalidate_cache_pattern(self, pattern: str):
        """Invalidate caches matching a pattern"""
        try:
            cache.delete_pattern(pattern)
        except Exception as e:
            logger.error(f"Error invalidating cache pattern {pattern}: {e}")

    # ==========================================
    # APPOINTMENT OPTIMIZATION METHODS
    # ==========================================

    def get_appointments_optimized(
        self, user=None, date=None, status=None, use_cache=True
    ):
        """
        Get appointments with optimized queries and caching
        """
        # Build cache key
        cache_key_parts = ["appointments"]
        if user:
            cache_key_parts.append(f"user_{user.id}")
        if date:
            cache_key_parts.append(date.isoformat())
        if status:
            cache_key_parts.append(status)

        cache_key = self.get_cache_key(*cache_key_parts)

        # Try cache first
        if use_cache:
            cached_data = cache.get(cache_key)
            if cached_data:
                return cached_data

        # Build optimized query
        from .models import Appointment

        queryset = Appointment.objects.select_related(
            "client", "therapist", "driver", "operator"
        ).prefetch_related("services", "therapists", "notifications")

        # Apply filters
        if user:
            if user.role == "therapist":
                queryset = queryset.filter(therapist=user)
            elif user.role == "driver":
                queryset = queryset.filter(driver=user)
            elif user.role != "operator":
                queryset = queryset.none()

        if date:
            queryset = queryset.filter(date=date)

        if status:
            queryset = queryset.filter(status=status)

        # Execute query and serialize
        appointments = list(queryset.order_by("date", "start_time"))
        serialized_appointments = self._serialize_appointments(appointments)

        # Cache the results
        if use_cache:
            timeout = (
                self.short_cache_timeout
                if date == timezone.now().date()
                else self.cache_timeout
            )
            cache.set(cache_key, serialized_appointments, timeout)

        return serialized_appointments

    def get_today_appointments_ultra_fast(self, user=None):
        """
        Ultra-fast today's appointments with aggressive caching
        """
        today = timezone.now().date()
        cache_key = self.get_cache_key("today_appointments", user.id if user else "all")

        # Try cache first
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data

        appointments = self.get_appointments_optimized(
            user=user, date=today, use_cache=False
        )

        # Cache with shorter timeout for today's data
        cache.set(cache_key, appointments, self.short_cache_timeout)
        return appointments

    def get_appointment_conflicts_optimized(self, appointment_data):
        """
        Optimized conflict detection with indexed queries
        """
        from .models import Appointment

        date = appointment_data["date"]
        start_time = appointment_data["start_time"]
        end_time = appointment_data["end_time"]
        therapist_id = appointment_data.get("therapist_id")
        driver_id = appointment_data.get("driver_id")
        exclude_id = appointment_data.get("exclude_id")

        cache_key = self.get_cache_key(
            "conflicts",
            date.isoformat(),
            start_time.isoformat(),
            end_time.isoformat(),
            therapist_id or 0,
            driver_id or 0,
        )

        cached_conflicts = cache.get(cache_key)
        if cached_conflicts is not None:
            return cached_conflicts

        conflicts = []

        # Base conflict query - uses composite indexes
        base_query = Appointment.objects.filter(
            date=date, status__in=["pending", "confirmed", "in_progress"]
        ).filter(Q(start_time__lt=end_time) & Q(end_time__gt=start_time))

        if exclude_id:
            base_query = base_query.exclude(id=exclude_id)

        # Check therapist conflicts
        if therapist_id:
            therapist_conflicts = base_query.filter(therapist_id=therapist_id)
            conflicts.extend(
                list(therapist_conflicts.values("id", "start_time", "end_time"))
            )

        # Check driver conflicts
        if driver_id:
            driver_conflicts = base_query.filter(driver_id=driver_id)
            conflicts.extend(
                list(driver_conflicts.values("id", "start_time", "end_time"))
            )

        # Cache for 2 minutes (conflicts change frequently)
        cache.set(cache_key, conflicts, 120)
        return conflicts

    # ==========================================
    # AVAILABILITY OPTIMIZATION METHODS
    # ==========================================

    def get_availability_optimized(self, date, role=None, specialization=None):
        """
        Optimized availability lookup with caching and SQL debug logging
        """
        import time
        from django.db import connection
        cache_key = self.get_cache_key(
            "availability", date.isoformat(), role or "all", specialization or "none"
        )

        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data

        from .models import Availability
        from core.models import CustomUser

        # Build optimized query
        queryset = Availability.objects.select_related("user").only(
            "id", "user", "date", "start_time", "end_time", "is_available", "user__id", "user__first_name", "user__last_name", "user__role", "user__specialization", "user__last_available_at"
        ).filter(date=date, is_available=True)

        if role:
            queryset = queryset.filter(user__role=role, user__is_active=True)

        if specialization:
            queryset = queryset.filter(user__specialization=specialization)

        start_time = time.time()
        availabilities = list(queryset.order_by("user__last_available_at"))
        duration = time.time() - start_time

        # Debug: log SQL and timing if DEBUG is True
        from django.conf import settings
        if getattr(settings, "DEBUG", False):
            queries = connection.queries[-1] if connection.queries else None
            logger.debug(f"[Availability] SQL: {queries['sql'][:300]}..." if queries else "[Availability] No SQL recorded.")
            logger.debug(f"[Availability] Query duration: {duration:.3f}s, count: {len(availabilities)}")

        serialized_data = self._serialize_availability(availabilities)

        # Cache for 5 minutes
        cache.set(cache_key, serialized_data, self.cache_timeout)
        return serialized_data
        # For further profiling, consider using Django Debug Toolbar or EXPLAIN in DB shell.

    def get_next_available_slot(self, user_id, date, duration_minutes=60):
        """
        Find next available slot for a user on a given date
        """
        cache_key = self.get_cache_key(
            "next_slot", user_id, date.isoformat(), duration_minutes
        )

        cached_slot = cache.get(cache_key)
        if cached_slot:
            return cached_slot

        from .models import Appointment, Availability

        # Get user's availability for the date
        availability = Availability.objects.filter(
            user_id=user_id, date=date, is_available=True
        ).first()

        if not availability:
            return None

        # Get existing appointments for the user on that date
        existing_appointments = Appointment.objects.filter(
            Q(therapist_id=user_id) | Q(driver_id=user_id),
            date=date,
            status__in=["pending", "confirmed", "in_progress"],
        ).order_by("start_time")

        # Find gaps in the schedule
        current_time = availability.start_time
        duration = timedelta(minutes=duration_minutes)

        for appointment in existing_appointments:
            # Check if there's a gap before this appointment
            if appointment.start_time >= current_time + duration:
                next_slot = {
                    "start_time": current_time,
                    "end_time": current_time + duration,
                    "available": True,
                }
                cache.set(cache_key, next_slot, self.cache_timeout)
                return next_slot

            # Move current time to after this appointment
            if appointment.end_time > current_time:
                current_time = appointment.end_time

        # Check if there's time after all appointments
        if current_time + duration <= availability.end_time:
            next_slot = {
                "start_time": current_time,
                "end_time": current_time + duration,
                "available": True,
            }
            cache.set(cache_key, next_slot, self.cache_timeout)
            return next_slot

        # No available slot found
        cache.set(cache_key, None, self.cache_timeout)
        return None

    # ==========================================
    # USER OPTIMIZATION METHODS
    # ==========================================

    def get_available_staff_optimized(self, role, date, specialization=None):
        """
        Get available staff with FIFO ordering and caching
        """
        cache_key = self.get_cache_key(
            "available_staff", role, date.isoformat(), specialization or "all"
        )

        cached_staff = cache.get(cache_key)
        if cached_staff:
            return cached_staff

        from core.models import CustomUser
        from .models import Availability, Appointment

        # Get users of the specified role
        users_query = CustomUser.objects.filter(role=role, is_active=True)

        if specialization:
            users_query = users_query.filter(specialization=specialization)

        # Get users who have availability on the date
        available_users = (
            users_query.filter(availability__date=date, availability__is_available=True)
            .exclude(
                # Exclude users who are currently busy
                appointments__date=date,
                appointments__status__in=[
                    "in_progress",
                    "journey",
                    "arrived",
                    "driver_assigned_pickup",
                    "return_journey",
                ],
            )
            .order_by("last_available_at")
        )  # FIFO ordering

        staff_list = []
        for user in available_users:
            staff_data = {
                "id": user.id,
                "name": user.get_full_name(),
                "email": user.email,
                "phone": getattr(user, "phone", ""),
                "specialization": getattr(user, "specialization", ""),
                "last_available_at": (
                    user.last_available_at.isoformat()
                    if user.last_available_at
                    else None
                ),
                "workload_score": self._calculate_workload_score(user, date),
            }
            staff_list.append(staff_data)

        # Cache for 3 minutes (staff availability changes frequently)
        cache.set(cache_key, staff_list, 180)
        return staff_list

    def _calculate_workload_score(self, user, date):
        """Calculate workload score for fair distribution"""
        from .models import Appointment

        # Count appointments for this user in the past week
        week_ago = date - timedelta(days=7)

        appointment_count = Appointment.objects.filter(
            Q(therapist=user) | Q(driver=user),
            date__gte=week_ago,
            date__lte=date,
            status__in=["completed", "in_progress"],
        ).count()

        return appointment_count

    # ==========================================
    # REAL-TIME SYNCHRONIZATION METHODS
    # ==========================================

    def broadcast_appointment_update(self, appointment_data, update_type="update"):
        """
        Broadcast appointment updates to all connected clients
        """
        try:
            channel_layer = get_channel_layer()

            message = {
                "type": f"appointment_{update_type}",
                "appointment": appointment_data,
                "timestamp": timezone.now().isoformat(),
            }

            # Broadcast to general appointments group
            async_to_sync(channel_layer.group_send)(
                "appointments", {"type": "appointment_message", "message": message}
            )

            # Broadcast to specific appointment subscribers
            async_to_sync(channel_layer.group_send)(
                f"appointment_{appointment_data['id']}",
                {"type": "appointment_message", "message": message},
            )

            # Invalidate related caches
            self._invalidate_appointment_caches(appointment_data)

        except Exception as e:
            logger.error(f"Error broadcasting appointment update: {e}")

    def _invalidate_appointment_caches(self, appointment_data):
        """Invalidate all caches related to an appointment"""
        appointment_id = appointment_data.get("id")
        date = appointment_data.get("date")
        therapist_id = appointment_data.get("therapist_id")
        driver_id = appointment_data.get("driver_id")

        # Invalidate patterns
        patterns_to_invalidate = [
            "appointments_*",
            "today_appointments_*",
            "conflicts_*",
            "available_staff_*",
        ]

        if date:
            patterns_to_invalidate.append(f"*_{date}*")

        for pattern in patterns_to_invalidate:
            self.invalidate_cache_pattern(pattern)

        # Invalidate specific user caches
        if therapist_id:
            cache.delete(f"user_appointments_{therapist_id}")
        if driver_id:
            cache.delete(f"user_appointments_{driver_id}")

    # ==========================================
    # SERIALIZATION METHODS
    # ==========================================

    def _serialize_appointments(self, appointments):
        """Efficiently serialize appointments"""
        serialized = []
        for appointment in appointments:
            data = {
                "id": appointment.id,
                "client_id": appointment.client_id,
                "client_name": f"{appointment.client.first_name} {appointment.client.last_name}",
                "date": appointment.date.isoformat(),
                "start_time": appointment.start_time.isoformat(),
                "end_time": appointment.end_time.isoformat(),
                "status": appointment.status,
                "payment_status": appointment.payment_status,
                "location": appointment.location,
                "notes": appointment.notes or "",
                "created_at": appointment.created_at.isoformat(),
                "updated_at": appointment.updated_at.isoformat(),
            }

            if appointment.therapist:
                data["therapist"] = {
                    "id": appointment.therapist.id,
                    "name": appointment.therapist.get_full_name(),
                    "specialization": getattr(
                        appointment.therapist, "specialization", ""
                    ),
                }

            if appointment.driver:
                data["driver"] = {
                    "id": appointment.driver.id,
                    "name": appointment.driver.get_full_name(),
                    "phone": getattr(appointment.driver, "phone", ""),
                }

            if appointment.operator:
                data["operator"] = {
                    "id": appointment.operator.id,
                    "name": appointment.operator.get_full_name(),
                }

            serialized.append(data)

        return serialized

    def _serialize_availability(self, availabilities):
        """Efficiently serialize availability data"""
        serialized = []
        for availability in availabilities:
            data = {
                "id": availability.id,
                "user_id": availability.user.id,
                "user_name": availability.user.get_full_name(),
                "user_role": availability.user.role,
                "date": availability.date.isoformat(),
                "start_time": availability.start_time.isoformat(),
                "end_time": availability.end_time.isoformat(),
                "is_available": availability.is_available,
                "specialization": getattr(availability.user, "specialization", ""),
            }
            serialized.append(data)

        return serialized

    # ==========================================
    # PERFORMANCE MONITORING METHODS
    # ==========================================

    def get_performance_metrics(self):
        """Get cached performance metrics"""
        return cache.get("performance_metrics", {})

    def log_query_performance(self, operation, duration, query_count=1):
        """Log query performance for monitoring"""
        if duration > 0.1:  # Log slow queries (>100ms)
            logger.warning(
                f"Slow query detected: {operation} took {duration:.3f}s with {query_count} queries"
            )


# Global instance
data_manager = OptimizedDataManager()
