from rest_framework import serializers
from .models import AttendanceRecord, AttendanceSummary
from django.contrib.auth import get_user_model

User = get_user_model()


class StaffMemberSerializer(serializers.ModelSerializer):
    """Serializer for staff member information in attendance records."""

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "username", "email", "role"]


class AttendanceRecordSerializer(serializers.ModelSerializer):
    """Serializer for attendance records."""

    staff_member = StaffMemberSerializer(read_only=True)
    approved_by_name = serializers.CharField(
        source="approved_by.get_full_name", read_only=True
    )
    check_in_time = serializers.SerializerMethodField()
    check_out_time = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceRecord
        fields = [
            "id",
            "staff_member",
            "date",
            "check_in_time",
            "check_out_time",
            "status",
            "is_checked_in",
            "approved_at",
            "approved_by_name",
            "hours_worked",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "staff_member",
            "status",
            "hours_worked",
            "created_at",
            "updated_at",
        ]

    def get_check_in_time(self, obj):
        """Convert check-in time to string format to ensure consistent timezone handling."""
        if obj.check_in_time:
            # Format as HH:MM:SS string to avoid timezone conversion issues
            return obj.check_in_time.strftime("%H:%M:%S")
        return None

    def get_check_out_time(self, obj):
        """Convert check-out time to string format to ensure consistent timezone handling."""
        if obj.check_out_time:
            # Format as HH:MM:SS string to avoid timezone conversion issues
            return obj.check_out_time.strftime("%H:%M:%S")
        return None


class AttendanceCheckInSerializer(serializers.Serializer):
    """Serializer for check-in action."""

    check_in_time = serializers.TimeField(read_only=True)
    status = serializers.CharField(read_only=True)
    message = serializers.CharField(read_only=True)


class AttendanceCheckOutSerializer(serializers.Serializer):
    """Serializer for check-out action."""

    check_out_time = serializers.TimeField(read_only=True)
    hours_worked = serializers.DecimalField(
        max_digits=4, decimal_places=2, read_only=True
    )
    message = serializers.CharField(read_only=True)


class TodayAttendanceStatusSerializer(serializers.ModelSerializer):
    """Serializer for today's attendance status."""

    check_in_time = serializers.SerializerMethodField()
    check_out_time = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceRecord
        fields = [
            "id",
            "date",
            "check_in_time",
            "check_out_time",
            "status",
            "is_checked_in",
            "approved_at",
            "hours_worked",
            "notes",
        ]

    def get_check_in_time(self, obj):
        """Convert check-in time to string format to ensure consistent timezone handling."""
        if obj.check_in_time:
            # Format as HH:MM:SS string to avoid timezone conversion issues
            return obj.check_in_time.strftime("%H:%M:%S")
        return None

    def get_check_out_time(self, obj):
        """Convert check-out time to string format to ensure consistent timezone handling."""
        if obj.check_out_time:
            # Format as HH:MM:SS string to avoid timezone conversion issues
            return obj.check_out_time.strftime("%H:%M:%S")
        return None


class AttendanceSummarySerializer(serializers.ModelSerializer):
    """Serializer for attendance summary."""

    class Meta:
        model = AttendanceSummary
        fields = [
            "id",
            "date",
            "total_staff",
            "present_count",
            "late_count",
            "absent_count",
            "pending_approval_count",
            "created_at",
            "updated_at",
        ]
