from django.db import models
from django.core.exceptions import ValidationError
from datetime import timedelta
from core.models import CustomUser
from django.db import transaction
from django.utils import timezone


class Client(models.Model):
    """Model to store client information"""

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True, null=True)
    phone_number = models.CharField(max_length=20)
    address = models.TextField()
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Availability(models.Model):
    """Model to track therapist and driver availability"""

    user = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name="availabilities"
    )
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = "Availabilities"
        unique_together = ("user", "date", "start_time", "end_time")

    def clean(self):
        # Ensure start time is before end time
        if self.start_time >= self.end_time:
            raise ValidationError("Start time must be before end time")

        # Ensure user role is therapist or driver
        if self.user.role not in ["therapist", "driver"]:
            raise ValidationError(
                "Only therapists and drivers can have availability slots"
            )

    def __str__(self):
        return (
            f"{self.user.username} - {self.date} ({self.start_time} to {self.end_time})"
        )


class Appointment(models.Model):
    """Model to store appointment/booking information"""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("in_progress", "In Progress"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    ]

    PAYMENT_STATUS = [
        ("unpaid", "Unpaid"),
        ("partial", "Partially Paid"),
        ("paid", "Fully Paid"),
        ("refunded", "Refunded"),
    ]

    client = models.ForeignKey(
        Client, on_delete=models.CASCADE, related_name="appointments"
    )
    services = models.ManyToManyField(
        "registration.Service", related_name="appointments"
    )

    therapist = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name="therapist_appointments",
        limit_choices_to={"role": "therapist"},
    )

    driver = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="driver_appointments",
        limit_choices_to={"role": "driver"},
    )

    operator = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name="operator_appointments",
        limit_choices_to={"role": "operator"},
    )

    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    payment_status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS, default="unpaid"
    )
    payment_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    location = models.TextField()
    notes = models.TextField(blank=True, null=True)
    required_materials = models.TextField(
        blank=True, null=True, help_text="Materials needed for this appointment"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        """Validate appointment constraints including conflict detection"""
        super().clean()

        # Check for therapist conflicts
        if self.therapist:
            conflicting_appointments = Appointment.objects.filter(
                therapist=self.therapist,
                date=self.date,
                status__in=["pending", "confirmed", "in_progress"],
            ).exclude(pk=self.pk)

            for appointment in conflicting_appointments:
                # Check if time ranges overlap
                if (
                    self.start_time <= appointment.end_time
                    and self.end_time >= appointment.start_time
                ):
                    raise ValidationError(
                        {
                            "therapist": f"Therapist is already booked during this time slot ({appointment.start_time} - {appointment.end_time})"
                        }
                    )

            # Check if therapist is available at this time
            has_availability = Availability.objects.filter(
                user=self.therapist,
                date=self.date,
                start_time__lte=self.start_time,
                end_time__gte=self.end_time,
                is_available=True,
            ).exists()

            if not has_availability:
                raise ValidationError(
                    {"therapist": "Therapist is not available during this time slot"}
                )

        # Check for driver conflicts
        if self.driver:
            conflicting_appointments = Appointment.objects.filter(
                driver=self.driver,
                date=self.date,
                status__in=["pending", "confirmed", "in_progress"],
            ).exclude(pk=self.pk)

            for appointment in conflicting_appointments:
                # Check if time ranges overlap
                if (
                    self.start_time <= appointment.end_time
                    and self.end_time >= appointment.start_time
                ):
                    raise ValidationError(
                        {
                            "driver": f"Driver is already booked during this time slot ({appointment.start_time} - {appointment.end_time})"
                        }
                    )

            # Check if driver is available at this time
            has_availability = Availability.objects.filter(
                user=self.driver,
                date=self.date,
                start_time__lte=self.start_time,
                end_time__gte=self.end_time,
                is_available=True,
            ).exists()

            if not has_availability:
                raise ValidationError(
                    {"driver": "Driver is not available during this time slot"}
                )

    def save(self, *args, **kwargs):
        with transaction.atomic():
            # Calculate end time based on service durations if not provided
            if not self.end_time or kwargs.pop("recalculate_duration", False):
                # We need to save first to establish M2M relationships
                super().save(*args, **kwargs)

                # Get total duration from all services
                total_duration = sum(
                    [service.duration for service in self.services.all()], timedelta()
                )

                # Calculate end time based on start time and duration
                start_datetime = timezone.make_aware(
                    timezone.datetime.combine(self.date, self.start_time)
                )
                end_datetime = start_datetime + total_duration

                # Update end time
                self.end_time = end_datetime.time()

                # Save again with the calculated end time
                return super().save(*args, **kwargs)
            else:
                return super().save(*args, **kwargs)

    def __str__(self):
        return f"Appointment for {self.client} on {self.date} at {self.start_time}"


class Notification(models.Model):
    """Model to store notifications for users"""

    NOTIFICATION_TYPES = [
        ("appointment_created", "Appointment Created"),
        ("appointment_updated", "Appointment Updated"),
        ("appointment_reminder", "Appointment Reminder"),
        ("appointment_cancelled", "Appointment Cancelled"),
    ]

    user = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name="notifications"
    )
    appointment = models.ForeignKey(
        Appointment, on_delete=models.CASCADE, related_name="notifications"
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPES,
        default="appointment_created",  # Setting the default value here
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.notification_type} for {self.user.username}"
