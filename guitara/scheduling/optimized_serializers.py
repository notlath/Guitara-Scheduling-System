"""
Performance-optimized serializers for the OperatorDashboard
Reduces database queries and serialization overhead through selective field inclusion
"""

from rest_framework import serializers
from .models import Appointment, Service, PaymentRecord, NotificationRecord
from core.models import User, TherapistProfile, ClientProfile, DriverProfile
from django.db.models import Prefetch


class MinimalUserSerializer(serializers.ModelSerializer):
    """Lightweight user serializer for appointments"""

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "phone_number"]


class MinimalTherapistSerializer(serializers.ModelSerializer):
    """Lightweight therapist serializer for appointments"""

    user = MinimalUserSerializer(read_only=True)

    class Meta:
        model = TherapistProfile
        fields = ["id", "user", "specialty", "availability_status"]


class MinimalClientSerializer(serializers.ModelSerializer):
    """Lightweight client serializer for appointments"""

    user = MinimalUserSerializer(read_only=True)

    class Meta:
        model = ClientProfile
        fields = ["id", "user", "medical_conditions", "emergency_contact"]


class MinimalDriverSerializer(serializers.ModelSerializer):
    """Lightweight driver serializer for appointments"""

    user = MinimalUserSerializer(read_only=True)

    class Meta:
        model = DriverProfile
        fields = ["id", "user", "vehicle_info", "availability_status"]


class ServiceSerializer(serializers.ModelSerializer):
    """Service serializer for appointments"""

    class Meta:
        model = Service
        fields = ["id", "name", "duration", "price"]


class OptimizedAppointmentSerializer(serializers.ModelSerializer):
    """
    Performance-optimized appointment serializer for the OperatorDashboard
    Uses minimal nested serializers and selective field inclusion
    """

    therapist = MinimalTherapistSerializer(read_only=True)
    client = MinimalClientSerializer(read_only=True)
    driver = MinimalDriverSerializer(read_only=True)
    services = ServiceSerializer(many=True, read_only=True)

    # Computed fields for quick filtering
    is_actionable = serializers.SerializerMethodField()
    needs_attention = serializers.SerializerMethodField()
    client_name = serializers.SerializerMethodField()
    therapist_name = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = [
            "id",
            "date",
            "time",
            "status",
            "priority",
            "therapist",
            "client",
            "driver",
            "services",
            "location_type",
            "address",
            "city",
            "state",
            "zip_code",
            "total_amount",
            "payment_status",
            "payment_method",
            "response_deadline",
            "notes",
            "special_instructions",
            "is_actionable",
            "needs_attention",
            "client_name",
            "therapist_name",
            "created_at",
            "updated_at",
        ]

    def get_is_actionable(self, obj):
        """Determine if appointment requires operator action"""
        actionable_statuses = [
            "pending",
            "confirmed",
            "needs_driver",
            "urgent",
            "follow_up_required",
        ]
        return obj.status in actionable_statuses

    def get_needs_attention(self, obj):
        """Determine if appointment needs immediate attention"""
        urgent_conditions = [
            obj.status == "urgent",
            obj.priority == "high",
            obj.response_deadline and obj.response_deadline.date() <= obj.date,
            obj.payment_status == "failed",
        ]
        return any(urgent_conditions)

    def get_client_name(self, obj):
        """Get client full name for quick display"""
        if obj.client and obj.client.user:
            return f"{obj.client.user.first_name} {obj.client.user.last_name}".strip()
        return "N/A"

    def get_therapist_name(self, obj):
        """Get therapist full name for quick display"""
        if obj.therapist and obj.therapist.user:
            return f"{obj.therapist.user.first_name} {obj.therapist.user.last_name}".strip()
        return "N/A"


class ActionableAppointmentSerializer(OptimizedAppointmentSerializer):
    """
    Ultra-lightweight serializer for actionable appointments only
    Used for the default dashboard view to minimize data transfer
    """

    class Meta:
        model = Appointment
        fields = [
            "id",
            "date",
            "time",
            "status",
            "priority",
            "client_name",
            "therapist_name",
            "location_type",
            "city",
            "state",
            "payment_status",
            "response_deadline",
            "needs_attention",
            "is_actionable",
        ]


class AppointmentSummarySerializer(serializers.ModelSerializer):
    """
    Minimal serializer for appointment lists and counts
    Used for pagination metadata and quick overviews
    """

    client_name = serializers.SerializerMethodField()

    class Meta:
        model = Appointment
        fields = ["id", "date", "time", "status", "client_name", "priority"]

    def get_client_name(self, obj):
        if obj.client and obj.client.user:
            return f"{obj.client.user.first_name} {obj.client.user.last_name}".strip()
        return "N/A"


class NotificationSerializer(serializers.ModelSerializer):
    """Lightweight notification serializer"""

    class Meta:
        model = NotificationRecord
        fields = ["id", "message", "type", "is_read", "created_at"]


class PaymentSummarySerializer(serializers.ModelSerializer):
    """Payment information for appointments"""

    class Meta:
        model = PaymentRecord
        fields = ["id", "amount", "status", "method", "processed_at"]
