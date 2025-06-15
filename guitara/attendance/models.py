from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class AttendanceRecord(models.Model):
    """
    Model to track daily attendance records for staff members.
    """

    STATUS_CHOICES = [
        ("present", "Present"),
        ("late", "Late"),
        ("absent", "Absent"),
        ("pending_approval", "Pending Approval"),
    ]

    staff_member = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="attendance_records"
    )
    date = models.DateField(default=timezone.localdate)
    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending_approval"
    )
    is_checked_in = models.BooleanField(default=False)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_attendance_records",
    )
    hours_worked = models.DecimalField(
        max_digits=4, decimal_places=2, null=True, blank=True
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("staff_member", "date")
        ordering = ["-date", "-created_at"]

    def __str__(self):
        return f"{self.staff_member.get_full_name()} - {self.date} - {self.status}"

    def save(self, *args, **kwargs):
        # Automatically calculate status based on check-in time
        if self.check_in_time and self.status == "pending_approval":
            cutoff_time = (
                timezone.now()
                .replace(hour=13, minute=15, second=0, microsecond=0)
                .time()
            )
            if self.check_in_time <= cutoff_time:
                self.status = "present"
            else:
                self.status = "late"

        # Calculate hours worked if both check-in and check-out times are available
        if self.check_in_time and self.check_out_time:
            check_in_datetime = timezone.datetime.combine(self.date, self.check_in_time)
            check_out_datetime = timezone.datetime.combine(
                self.date, self.check_out_time
            )

            # Handle check-out on the next day
            if self.check_out_time < self.check_in_time:
                check_out_datetime += timezone.timedelta(days=1)

            duration = check_out_datetime - check_in_datetime
            self.hours_worked = round(duration.total_seconds() / 3600, 2)

        super().save(*args, **kwargs)


class AttendanceSummary(models.Model):
    """
    Model to store daily attendance summaries for reporting.
    """

    date = models.DateField(unique=True)
    total_staff = models.IntegerField(default=0)
    present_count = models.IntegerField(default=0)
    late_count = models.IntegerField(default=0)
    absent_count = models.IntegerField(default=0)
    pending_approval_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date"]

    def __str__(self):
        return f"Attendance Summary - {self.date}"
