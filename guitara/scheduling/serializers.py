from rest_framework import serializers
from django.db.models import Q
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
            return int(obj.duration.total_seconds())
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
    rejection_details = AppointmentRejectionSerializer(
        source="appointmentrejection", read_only=True
    )
    total_duration = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()

    # Add acceptance status fields
    both_parties_accepted = serializers.SerializerMethodField()
    pending_acceptances = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = "__all__"

    def get_total_duration(self, obj):
        """Calculate total duration from all services in minutes"""
        total_seconds = 0
        for service in obj.services.all():
            if service.duration:
                total_seconds += service.duration.total_seconds()
        return int(total_seconds / 60)

    def get_total_price(self, obj):
        """Calculate the total price of all services"""
        return sum(service.price for service in obj.services.all())

    def get_both_parties_accepted(self, obj):
        """Check if both parties have accepted"""
        return obj.both_parties_accepted()

    def get_pending_acceptances(self, obj):
        """Get list of parties that still need to accept"""
        return obj.get_pending_acceptances()

    def validate(self, data):
        """
        Validate appointment data, checking for conflicts and availability
        """
        instance = getattr(
            self, "instance", None
        )  # Skip complex validation for status-only updates
        # This allows simple status changes without running full appointment validation
        if instance and hasattr(self, "initial_data"):            # Check if this is a simple status update (only status and related driver/therapist fields)
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
                        )  # Check if therapist has marked availability
                has_availability = Availability.objects.filter(
                    user=therapist,
                    date=date,
                    start_time__lte=start_time,
                    end_time__gte=end_time,
                    is_available=True,
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
                                )

                        # Check if therapist has marked availability
                        has_availability = Availability.objects.filter(
                            user=therapist,
                            date=date,
                            start_time__lte=start_time,
                            end_time__gte=end_time,
                            is_available=True,
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
                        )

                # Check if driver has marked availability
                has_availability = Availability.objects.filter(
                    user=driver,
                    date=date,
                    start_time__lte=start_time,
                    end_time__gte=end_time,
                    is_available=True,
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

            # Add basic user info if needed
            if instance.user:
                data["user_info"] = {
                    "id": instance.user.id,
                    "username": instance.user.username,
                    "first_name": instance.user.first_name,
                    "last_name": instance.user.last_name,
                }

            # Add basic appointment info if needed
            if instance.appointment:
                data["appointment_info"] = {
                    "id": instance.appointment.id,
                    "date": instance.appointment.date,
                    "status": instance.appointment.status,
                }

            return data
        except Exception as e:
            import logging

            logger = logging.getLogger(__name__)
            logger.error(f"NotificationSerializer error: {e}")
            # Return minimal data if there's an error
            return {
                "id": instance.id if hasattr(instance, "id") else None,
                "message": (
                    instance.message
                    if hasattr(instance, "message")
                    else "Error loading notification"
                ),
                "notification_type": (
                    instance.notification_type
                    if hasattr(instance, "notification_type")
                    else "unknown"
                ),
                "is_read": instance.is_read if hasattr(instance, "is_read") else False,
                "created_at": (
                    instance.created_at if hasattr(instance, "created_at") else None
                ),
                "error": str(e),
            }
