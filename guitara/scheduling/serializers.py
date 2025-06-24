from rest_framework import serializers
from django.db.models import Q, F
from .models import (
    Client,
    Availability,
    Appointment,
    Notification,
    AppointmentRejection,
)
from core.models import CustomUser
from datetime import datetime, timedelta

# Try to import Service, or create a mock class if import fails
try:
    from registration.models import Service
except ImportError:
    # Create a fallback Service class if import fails
    import logging

    logger = logging.getLogger(__name__)
    logger.warning("Could not import Service model in serializers, using mock class")
    from django.db import models

    class Service(models.Model):
        """Mock Service class for fallback when the real model can't be imported"""

        id = None
        name = ""
        description = ""
        duration = 0
        price = 0
        oil = None
        is_active = True
        objects = models.Manager()


class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = "__all__"


class ServiceSerializer(serializers.ModelSerializer):
    """Serializer for massage services"""

    id = serializers.IntegerField(required=False)
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(max_length=255)
    duration = serializers.SerializerMethodField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    oil = serializers.CharField(max_length=100, required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False)

    class Meta:
        model = Service
        fields = ["id", "name", "description", "duration", "price", "oil", "is_active"]

    def get_duration(self, obj):
        """Convert timedelta to total seconds (as integer)"""
        if hasattr(obj, "duration") and obj.duration:
            # Handle both timedelta objects and integer values
            if hasattr(obj.duration, "total_seconds"):
                return int(obj.duration.total_seconds())
            elif isinstance(obj.duration, (int, float)):
                return int(obj.duration)
        return 0


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "role",
            "is_active",  # Added missing is_active field
            "specialization",
            "massage_pressure",
            "license_number",
            "motorcycle_plate",
            "phone_number",
        ]


class AvailabilitySerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source="user", read_only=True)

    class Meta:
        model = Availability
        fields = "__all__"

    def validate(self, attrs):
        """
        Check that the times are valid and that there are no overlapping availability slots.
        Support cross-day availability (e.g., 13:00 to 01:00 next day).
        """
        start_time = attrs.get("start_time")
        end_time = attrs.get("end_time")

        # Only validate that start and end time are not exactly the same
        if start_time == end_time:
            raise serializers.ValidationError(
                "Start time and end time cannot be the same"
            )

        # Check for overlapping availability slots
        if self.instance:  # In case of update
            overlapping = Availability.objects.filter(
                user=attrs.get("user", self.instance.user),
                date=attrs.get("date", self.instance.date),
                is_available=attrs.get("is_available", self.instance.is_available),
            ).exclude(pk=self.instance.pk)
        else:  # In case of create
            overlapping = Availability.objects.filter(
                user=attrs.get("user"),
                date=attrs.get("date"),
                is_available=attrs.get("is_available", True),
            )

        for slot in overlapping:
            # For cross-day availability, we need more complex overlap detection
            # This is a simplified check - you may want to enhance this based on your needs
            current_start = attrs.get("start_time")
            current_end = attrs.get("end_time")
            existing_start = slot.start_time
            existing_end = slot.end_time

            # Simple overlap check (can be enhanced for cross-day logic if needed)
            if current_start <= existing_end and current_end >= existing_start:
                raise serializers.ValidationError(
                    "This time slot overlaps with another availability slot"
                )

        return attrs


class AppointmentRejectionSerializer(serializers.ModelSerializer):
    rejected_by_details = UserSerializer(source="rejected_by", read_only=True)
    reviewed_by_details = UserSerializer(source="reviewed_by", read_only=True)

    class Meta:
        model = AppointmentRejection
        fields = [
            "id",
            "appointment",
            "rejection_reason",
            "rejected_by",
            "rejected_by_details",
            "rejected_at",
            "operator_response",
            "operator_response_reason",
            "reviewed_by",
            "reviewed_by_details",
            "reviewed_at",
        ]


class AppointmentSerializer(serializers.ModelSerializer):
    client_details = ClientSerializer(source="client", read_only=True)
    therapist_details = UserSerializer(source="therapist", read_only=True)
    therapists_details = UserSerializer(source="therapists", many=True, read_only=True)
    driver_details = UserSerializer(source="driver", read_only=True)
    operator_details = UserSerializer(source="operator", read_only=True)
    rejected_by_details = UserSerializer(source="rejected_by", read_only=True)
    services_details = ServiceSerializer(source="services", many=True, read_only=True)
    rejection_details = AppointmentRejectionSerializer(read_only=True)
    total_duration = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()
    # Add acceptance status fields
    both_parties_accepted = serializers.SerializerMethodField()
    pending_acceptances = serializers.SerializerMethodField()
    # Add formatted fields for better frontend display
    formatted_date = serializers.SerializerMethodField()
    formatted_start_time = serializers.SerializerMethodField()
    formatted_end_time = serializers.SerializerMethodField()
    urgency_level = serializers.SerializerMethodField()

    # Add explicit services field to handle ManyToManyField properly
    services = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Service.objects.all(), required=True
    )

    class Meta:
        model = Appointment
        fields = "__all__"

    def get_formatted_date(self, obj):
        """Return formatted date for frontend display"""
        if obj.date:
            return obj.date.strftime("%B %d, %Y")
        return None

    def get_formatted_start_time(self, obj):
        """Return formatted start time for frontend display"""
        if obj.start_time:
            return obj.start_time.strftime("%I:%M %p")
        return None

    def get_formatted_end_time(self, obj):
        """Return formatted end time for frontend display"""
        if obj.end_time:
            return obj.end_time.strftime("%I:%M %p")
        return None

    def get_urgency_level(self, obj):
        """Calculate urgency level based on appointment status and time"""
        from datetime import datetime, timezone

        if not obj.date or not obj.start_time:
            return "normal"

        now = datetime.now(timezone.utc)
        appointment_datetime = datetime.combine(obj.date, obj.start_time)
        if appointment_datetime.tzinfo is None:
            appointment_datetime = appointment_datetime.replace(tzinfo=timezone.utc)

        time_diff = appointment_datetime - now
        hours_until_appointment = time_diff.total_seconds() / 3600

        status = obj.status or ""

        if status == "pending":
            if hours_until_appointment <= 2:
                return "high"
            elif hours_until_appointment <= 4:
                return "medium"
            return "normal"
        elif status in ["confirmed", "driver_confirmed"]:
            if hours_until_appointment <= 1:
                return "high"
            elif hours_until_appointment <= 2:
                return "medium"
            return "normal"
        elif status in ["in_progress", "session_started", "journey_started"]:
            return "critical"
        elif status == "awaiting_payment":
            return "medium"
        else:
            return "normal"

    def get_total_duration(self, obj):
        """Calculate total duration from all services in minutes"""
        total_seconds = 0
        # Use prefetched services instead of obj.services.all() to avoid N+1 queries
        services = getattr(obj, "_prefetched_objects_cache", {}).get(
            "services", obj.services.all()
        )
        for service in services:
            if service.duration:
                # Handle both timedelta objects and integer values
                if hasattr(service.duration, "total_seconds"):
                    total_seconds += service.duration.total_seconds()
                elif isinstance(service.duration, (int, float)):
                    total_seconds += service.duration
        return int(total_seconds / 60)

    def get_total_price(self, obj):
        """Calculate the total price of all services"""
        # Use prefetched services instead of obj.services.all() to avoid N+1 queries
        services = getattr(obj, "_prefetched_objects_cache", {}).get(
            "services", obj.services.all()
        )
        return sum(service.price for service in services)

    def get_both_parties_accepted(self, obj):
        """Check if both parties have accepted"""
        return obj.both_parties_accepted()

    def get_pending_acceptances(self, obj):
        """Get list of parties that still need to accept"""
        return obj.get_pending_acceptances()

    def validate_services(self, value):
        """Validate that services exist and are active"""
        if not value:
            raise serializers.ValidationError("At least one service must be selected.")

        # Check that all services exist and are active
        for service in value:
            if not service.is_active:
                raise serializers.ValidationError(
                    f"Service '{service.name}' is not currently active."
                )

        return value

    def validate(self, attrs):
        """
        Validate appointment data, checking for conflicts and availability
        Optimized to reduce N+1 queries for therapists and drivers.
        """
        instance = getattr(self, "instance", None)
        status_update_fields = {
            "status",
            "therapist_accepted",
            "therapist_accepted_at",
            "driver_accepted",
            "driver_accepted_at",
            "driver",
            "rejection_reason",
            "rejected_by",
            "rejected_at",
            "notes",
            "location",
        }
        provided_fields = set(getattr(self, "initial_data", {}).keys())
        if provided_fields.issubset(status_update_fields):
            return attrs

        # Extract common fields
        date = attrs.get("date")
        start_time = attrs.get("start_time")
        end_time = attrs.get("end_time")

        # Note: This validation runs on the serializer data, but actual therapists are set in the view
        # The view should perform this validation on the request data
        therapists_ids = []
        initial_data = getattr(self, "initial_data", {})
        if initial_data:
            therapists_ids = initial_data.get("therapists", [])
        if therapists_ids and date and start_time and end_time:
            therapists = CustomUser.objects.filter(
                id__in=therapists_ids, role="therapist"
            )
            conflicting_appointments = Appointment.objects.filter(
                (Q(therapist__in=therapists) | Q(therapists__in=therapists)),
                date=date,
                status__in=["pending", "confirmed", "in_progress"],
            ).only("id", "therapist", "start_time", "end_time")
            if instance:
                conflicting_appointments = conflicting_appointments.exclude(
                    pk=instance.pk
                )
            for appointment in conflicting_appointments:
                if (
                    start_time <= appointment.end_time
                    and end_time >= appointment.start_time
                ):
                    raise serializers.ValidationError(
                        {
                            "therapists": f"Therapist is already booked during this time slot ({appointment.start_time} - {appointment.end_time})"
                        }
                    )
            # Batch fetch availabilities for all therapists
            availabilities = Availability.objects.filter(
                user__in=therapists,
                date__in=[date, date - timedelta(days=1)],
                is_available=True,
            )
            # (You can add further logic here to check for time slot coverage)
        # Validate therapist availability and conflicts
        therapist = attrs.get(
            "therapist", getattr(instance, "therapist", None) if instance else None
        )
        if therapist and date and start_time and end_time:
            conflicting_query = Appointment.objects.filter(
                therapist=therapist,
                date=date,
                status__in=["pending", "confirmed", "in_progress"],
            )
            if instance:
                conflicting_query = conflicting_query.exclude(pk=instance.pk)
            for appointment in conflicting_query.only("id", "start_time", "end_time"):
                if (
                    start_time <= appointment.end_time
                    and end_time >= appointment.start_time
                ):
                    raise serializers.ValidationError(
                        {
                            "therapist": f"Therapist is already booked during this time slot ({appointment.start_time} - {appointment.end_time})"
                        }
                    )
            # Check therapist availability
            availabilities = Availability.objects.filter(
                user=therapist,
                date__in=[date, date - timedelta(days=1)],
                is_available=True,
            )
            # (You can add further logic here to check for time slot coverage)
        # Validate driver availability and conflicts
        driver = attrs.get(
            "driver", getattr(instance, "driver", None) if instance else None
        )
        if driver and date and start_time and end_time:
            conflicting_query = Appointment.objects.filter(
                driver=driver,
                date=date,
                status__in=["pending", "confirmed", "in_progress"],
            )
            if instance:
                conflicting_query = conflicting_query.exclude(pk=instance.pk)
            for appointment in conflicting_query.only("id", "start_time", "end_time"):
                if (
                    start_time <= appointment.end_time
                    and end_time >= appointment.start_time
                ):
                    raise serializers.ValidationError(
                        {
                            "driver": f"Driver is already booked during this time slot ({appointment.start_time} - {appointment.end_time})"
                        }
                    )
            availabilities = Availability.objects.filter(
                user=driver,
                date__in=[date, date - timedelta(days=1)],
                is_available=True,
            )
            # (You can add further logic here to check for time slot coverage)
        return attrs


class NotificationSerializer(serializers.ModelSerializer):
    """Simplified notification serializer to avoid circular dependencies"""

    class Meta:
        model = Notification
        fields = [
            "id",
            "user",
            "appointment",
            "notification_type",
            "message",
            "is_read",
            "created_at",
            "rejection",
        ]

    def to_representation(self, instance):
        """Custom representation to handle potential relationship issues"""
        try:
            data = super().to_representation(instance)

            # Safely add user info
            try:
                if instance.user:
                    data["user_info"] = {
                        "id": instance.user.id,
                        "username": getattr(instance.user, "username", ""),
                        "first_name": getattr(instance.user, "first_name", ""),
                        "last_name": getattr(instance.user, "last_name", ""),
                    }
            except Exception as user_error:
                import logging

                logger = logging.getLogger(__name__)
                logger.warning(f"NotificationSerializer user info error: {user_error}")
                data["user_info"] = None

            # Safely add appointment info
            try:
                if instance.appointment:
                    data["appointment_info"] = {
                        "id": instance.appointment.id,
                        "date": (
                            instance.appointment.date.isoformat()
                            if hasattr(instance.appointment.date, "isoformat")
                            else str(instance.appointment.date)
                        ),
                        "status": getattr(instance.appointment, "status", "unknown"),
                    }
            except Exception as appointment_error:
                import logging

                logger = logging.getLogger(__name__)
                logger.warning(
                    f"NotificationSerializer appointment info error: {appointment_error}"
                )
                data["appointment_info"] = None

            return data

        except Exception as e:
            import logging
            from django.utils import timezone

            logger = logging.getLogger(__name__)
            logger.error(f"NotificationSerializer critical error: {e}", exc_info=True)

            # Return minimal safe data
            try:
                return {
                    "id": getattr(instance, "id", None),
                    "user": (
                        getattr(instance.user, "id", None)
                        if hasattr(instance, "user") and instance.user
                        else None
                    ),
                    "appointment": (
                        getattr(instance.appointment, "id", None)
                        if hasattr(instance, "appointment") and instance.appointment
                        else None
                    ),
                    "notification_type": getattr(
                        instance, "notification_type", "unknown"
                    ),
                    "message": getattr(
                        instance, "message", "Error loading notification"
                    ),
                    "is_read": getattr(instance, "is_read", False),
                    "created_at": str(getattr(instance, "created_at", timezone.now())),
                    "rejection": (
                        getattr(instance.rejection, "id", None)
                        if hasattr(instance, "rejection") and instance.rejection
                        else None
                    ),
                    "user_info": None,
                    "appointment_info": None,
                    "error": str(e),
                }
            except Exception as critical_error:
                logger.error(
                    f"NotificationSerializer complete failure: {critical_error}"
                )
                return {
                    "id": None,
                    "user": None,
                    "appointment": None,
                    "notification_type": "error",
                    "message": "Critical error loading notification",
                    "is_read": False,
                    "created_at": timezone.now().isoformat(),
                    "rejection": None,
                    "error": f"Critical error: {critical_error}",
                }
