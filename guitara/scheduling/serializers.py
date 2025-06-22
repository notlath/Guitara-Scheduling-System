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

    class Service:
        """Mock Service class for fallback when the real model can't be imported"""

        id = None
        name = ""
        description = ""
        duration = 0
        price = 0
        oil = None
        is_active = True


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
    is_active = serializers.BooleanField(default=True, required=False)

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

    def validate(self, data):
        """
        Check that the times are valid and that there are no overlapping availability slots.
        Support cross-day availability (e.g., 13:00 to 01:00 next day).
        """
        start_time = data.get("start_time")
        end_time = data.get("end_time")

        # Only validate that start and end time are not exactly the same
        if start_time == end_time:
            raise serializers.ValidationError(
                "Start time and end time cannot be the same"
            )

        # Check for overlapping availability slots
        if self.instance:  # In case of update
            overlapping = Availability.objects.filter(
                user=data.get("user", self.instance.user),
                date=data.get("date", self.instance.date),
                is_available=data.get("is_available", self.instance.is_available),
            ).exclude(pk=self.instance.pk)
        else:  # In case of create
            overlapping = Availability.objects.filter(
                user=data.get("user"),
                date=data.get("date"),
                is_available=data.get("is_available", True),
            )

        for slot in overlapping:
            # For cross-day availability, we need more complex overlap detection
            # This is a simplified check - you may want to enhance this based on your needs
            current_start = data.get("start_time")
            current_end = data.get("end_time")
            existing_start = slot.start_time
            existing_end = slot.end_time

            # Simple overlap check (can be enhanced for cross-day logic if needed)
            if current_start <= existing_end and current_end >= existing_start:
                raise serializers.ValidationError(
                    "This time slot overlaps with another availability slot"
                )

        return data


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

    # Add explicit services field to handle ManyToManyField properly
    services = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Service.objects.all(), required=True
    )

    class Meta:
        model = Appointment
        fields = "__all__"

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

    def validate(self, data):
        """
        Validate appointment data, checking for conflicts and availability
        """
        instance = getattr(
            self, "instance", None
        )  # Skip complex validation for status-only updates
        # This allows simple status changes without running full appointment validation
        if instance and hasattr(
            self, "initial_data"
        ):  # Check if this is a simple status update (only status and related driver/therapist fields)
            # Only include fields that actually exist in the Appointment model
            status_update_fields = {
                "status",
                "therapist_accepted",
                "therapist_accepted_at",
                "driver_accepted",
                "driver_accepted_at",
                "driver",  # Add driver field for assignments
                "rejection_reason",
                "rejected_by",
                "rejected_at",
                "notes",
                "location",
            }
            provided_fields = set(self.initial_data.keys())

            # If only status-update fields are provided, skip complex validation
            if provided_fields.issubset(status_update_fields):
                return data

        # Validate therapist availability and conflicts
        therapist = data.get(
            "therapist", getattr(instance, "therapist", None) if instance else None
        )
        if therapist:
            # Check if therapist is available at this time
            date = data.get(
                "date", getattr(instance, "date", None) if instance else None
            )
            start_time = data.get(
                "start_time",
                getattr(instance, "start_time", None) if instance else None,
            )
            end_time = data.get(
                "end_time", getattr(instance, "end_time", None) if instance else None
            )

            if date and start_time and end_time:
                # Check for conflicting appointments
                conflicting_query = Appointment.objects.filter(
                    therapist=therapist,
                    date=date,
                    status__in=["pending", "confirmed", "in_progress"],
                )
                if instance:
                    conflicting_query = conflicting_query.exclude(pk=instance.pk)

                for appointment in conflicting_query:
                    if (
                        start_time <= appointment.end_time
                        and end_time >= appointment.start_time
                    ):
                        raise serializers.ValidationError(
                            {
                                "therapist": f"Therapist is already booked during this time slot ({appointment.start_time} - {appointment.end_time})"
                            }
                        )  # Check if therapist has marked availability (including cross-day availability)

                # Same-day normal availability
                same_day_normal = Q(
                    user=therapist,
                    date=date,
                    start_time__lte=start_time,
                    end_time__gte=end_time,
                    is_available=True,
                ) & Q(
                    start_time__lte=F("end_time")
                )  # Normal (non-cross-day)

                # Same-day cross-day availability (e.g., 13:00-01:00, appointment at 14:00)
                same_day_cross_day = Q(
                    user=therapist,
                    date=date,
                    start_time__lte=start_time,
                    start_time__gt=F("end_time"),  # Cross-day indicator
                    is_available=True,
                )

                # Previous day cross-day availability (e.g., appointment at 00:30 for 13:00-01:00 schedule from previous day)
                previous_day = date - timedelta(days=1)
                previous_day_cross_day = Q(
                    user=therapist,
                    date=previous_day,
                    end_time__gte=end_time,
                    start_time__gt=F("end_time"),  # Cross-day indicator
                    is_available=True,
                )

                has_availability = Availability.objects.filter(
                    same_day_normal | same_day_cross_day | previous_day_cross_day
                ).exists()

                if not has_availability:
                    raise serializers.ValidationError(
                        {
                            "therapist": "Therapist is not available during this time slot"
                        }
                    )  # Validate multiple therapists availability and conflicts (when using therapists field)
        # Note: This validation runs on the serializer data, but actual therapists are set in the view
        # The view should perform this validation on the request data
        therapists_ids = (
            self.initial_data.get("therapists", [])
            if hasattr(self, "initial_data")
            else []
        )
        if therapists_ids:
            date = data.get(
                "date", getattr(instance, "date", None) if instance else None
            )
            start_time = data.get(
                "start_time",
                getattr(instance, "start_time", None) if instance else None,
            )
            end_time = data.get(
                "end_time", getattr(instance, "end_time", None) if instance else None
            )

            if date and start_time and end_time:
                for therapist_id in therapists_ids:
                    try:
                        therapist = CustomUser.objects.get(
                            id=therapist_id, role="therapist"
                        )

                        # Check for conflicting appointments
                        conflicting_query = Appointment.objects.filter(
                            Q(therapist=therapist) | Q(therapists=therapist),
                            date=date,
                            status__in=["pending", "confirmed", "in_progress"],
                        )
                        if instance:
                            conflicting_query = conflicting_query.exclude(
                                pk=instance.pk
                            )

                        for appointment in conflicting_query:
                            if (
                                start_time <= appointment.end_time
                                and end_time >= appointment.start_time
                            ):
                                raise serializers.ValidationError(
                                    {
                                        "therapists": f"Therapist {therapist.get_full_name()} is already booked during this time slot ({appointment.start_time} - {appointment.end_time})"
                                    }
                                )  # Check if therapist has marked availability (including cross-day availability)

                        # Same-day normal availability
                        same_day_normal = Q(
                            user=therapist,
                            date=date,
                            start_time__lte=start_time,
                            end_time__gte=end_time,
                            is_available=True,
                        ) & Q(
                            start_time__lte=F("end_time")
                        )  # Normal (non-cross-day)

                        # Same-day cross-day availability (e.g., 13:00-01:00, appointment at 14:00)
                        same_day_cross_day = Q(
                            user=therapist,
                            date=date,
                            start_time__lte=start_time,
                            start_time__gt=F("end_time"),  # Cross-day indicator
                            is_available=True,
                        )

                        # Previous day cross-day availability (e.g., appointment at 00:30 for 13:00-01:00 schedule from previous day)
                        previous_day = date - timedelta(days=1)
                        previous_day_cross_day = Q(
                            user=therapist,
                            date=previous_day,
                            end_time__gte=end_time,
                            start_time__gt=F("end_time"),  # Cross-day indicator
                            is_available=True,
                        )

                        has_availability = Availability.objects.filter(
                            same_day_normal
                            | same_day_cross_day
                            | previous_day_cross_day
                        ).exists()

                        if not has_availability:
                            raise serializers.ValidationError(
                                {
                                    "therapists": f"Therapist {therapist.get_full_name()} is not available during this time slot"
                                }
                            )
                    except CustomUser.DoesNotExist:
                        raise serializers.ValidationError(
                            {
                                "therapists": f"Therapist with ID {therapist_id} does not exist"
                            }
                        )

        # Validate driver availability and conflicts
        driver = data.get(
            "driver", getattr(instance, "driver", None) if instance else None
        )
        if driver:
            # Similar checks for driver
            date = data.get(
                "date", getattr(instance, "date", None) if instance else None
            )
            start_time = data.get(
                "start_time",
                getattr(instance, "start_time", None) if instance else None,
            )
            end_time = data.get(
                "end_time", getattr(instance, "end_time", None) if instance else None
            )

            if date and start_time and end_time:
                # Check for conflicting appointments
                conflicting_query = Appointment.objects.filter(
                    driver=driver,
                    date=date,
                    status__in=["pending", "confirmed", "in_progress"],
                )
                if instance:
                    conflicting_query = conflicting_query.exclude(pk=instance.pk)

                for appointment in conflicting_query:
                    if (
                        start_time <= appointment.end_time
                        and end_time >= appointment.start_time
                    ):
                        raise serializers.ValidationError(
                            {
                                "driver": f"Driver is already booked during this time slot ({appointment.start_time} - {appointment.end_time})"
                            }
                        )  # Check if driver has marked availability (including cross-day availability)

                # Same-day normal availability
                same_day_normal = Q(
                    user=driver,
                    date=date,
                    start_time__lte=start_time,
                    end_time__gte=end_time,
                    is_available=True,
                ) & Q(
                    start_time__lte=F("end_time")
                )  # Normal (non-cross-day)

                # Same-day cross-day availability (e.g., 13:00-01:00, appointment at 14:00)
                same_day_cross_day = Q(
                    user=driver,
                    date=date,
                    start_time__lte=start_time,
                    start_time__gt=F("end_time"),  # Cross-day indicator
                    is_available=True,
                )

                # Previous day cross-day availability (e.g., appointment at 00:30 for 13:00-01:00 schedule from previous day)
                previous_day = date - timedelta(days=1)
                previous_day_cross_day = Q(
                    user=driver,
                    date=previous_day,
                    end_time__gte=end_time,
                    start_time__gt=F("end_time"),  # Cross-day indicator
                    is_available=True,
                )

                has_availability = Availability.objects.filter(
                    same_day_normal | same_day_cross_day | previous_day_cross_day
                ).exists()

                if not has_availability:
                    raise serializers.ValidationError(
                        {"driver": "Driver is not available during this time slot"}
                    )

        return data


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
