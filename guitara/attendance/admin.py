from django.contrib import admin
from .models import AttendanceRecord, AttendanceSummary


@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = [
        "staff_member",
        "date",
        "check_in_time",
        "check_out_time",
        "status",
        "hours_worked",
        "approved_at",
        "approved_by",
    ]
    list_filter = ["status", "date", "approved_at"]
    search_fields = [
        "staff_member__first_name",
        "staff_member__last_name",
        "staff_member__username",
    ]
    ordering = ["-date", "-created_at"]
    readonly_fields = ["created_at", "updated_at", "hours_worked"]


@admin.register(AttendanceSummary)
class AttendanceSummaryAdmin(admin.ModelAdmin):
    list_display = [
        "date",
        "total_staff",
        "present_count",
        "late_count",
        "absent_count",
        "pending_approval_count",
    ]
    list_filter = ["date"]
    ordering = ["-date"]
    readonly_fields = ["created_at", "updated_at"]
