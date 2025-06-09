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
        # Support cross-day availability (e.g., 13:00 to 01:00 next day)
        # Only validate that they're not exactly the same time
        if self.start_time == self.end_time:
            raise ValidationError("Start time and end time cannot be the same")

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
        ("therapist_confirm", "Therapist Confirm"),
        ("driver_confirm", "Driver Confirm"),
        ("driver_confirmed", "Driver Confirmed"),
        ("in_progress", "In Progress"),
        ("journey", "Journey"),
        ("arrived", "Arrived"),
        ("dropped_off", "Dropped Off"),
        ("session_in_progress", "Session In Progress"),
        ("awaiting_payment", "Awaiting Payment"),
        ("completed", "Completed"),
        ("pickup_requested", "Pickup Requested"),
        ("driver_assigned_pickup", "Driver Assigned for Pickup"),
        ("return_journey", "Return Journey"),
        ("cancelled", "Cancelled"),
        ("rejected", "Rejected"),
        ("auto_cancelled", "Auto Cancelled"),
        # Legacy statuses for backward compatibility
        ("confirmed", "Confirmed"),
        ("driving_to_location", "Driver En Route"),
        ("at_location", "Driver at Location"),
        ("therapist_dropped_off", "Therapist Dropped Off"),
        ("transport_completed", "Transport Completed"),
        ("picking_up_therapists", "Picking Up Therapists"),
        ("transporting_group", "Transporting Group"),
        ("driver_assigned", "Driver Assigned"),
    ]

    PAYMENT_STATUS = [
        ("unpaid", "Unpaid"),
        ("partial", "Partially Paid"),
        ("paid", "Fully Paid"),
        ("refunded", "Refunded"),
    ]

    PICKUP_URGENCY_CHOICES = [
        ("normal", "Normal"),
        ("urgent", "Urgent"),
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

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default="pending")
    payment_status = models.CharField(
        max_length=20, choices=PAYMENT_STATUS, default="unpaid"
    )
    payment_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    location = models.TextField()
    notes = models.TextField(blank=True, null=True)
    required_materials = models.TextField(
        blank=True, null=True, help_text="Materials needed for this appointment"
    )

    # Pickup request fields
    pickup_requested = models.BooleanField(
        default=False, help_text="Whether therapist has requested pickup after session"
    )
    pickup_request_time = models.DateTimeField(
        null=True, blank=True, help_text="When pickup was requested"
    )
    pickup_urgency = models.CharField(
        max_length=10,
        choices=PICKUP_URGENCY_CHOICES,
        default="normal",
        help_text="Urgency level of pickup request",
    )
    pickup_notes = models.TextField(
        blank=True, null=True, help_text="Additional notes for pickup request"
    )
    estimated_pickup_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Estimated time for driver arrival at pickup location",
    )
    session_end_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the therapy session actually ended",
    )

    # New fields for rejection system
    rejection_reason = models.TextField(
        blank=True,
        null=True,
        help_text="Reason for rejection provided by therapist",
    )
    rejected_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rejected_appointments",
        help_text="User who rejected the appointment",
    )
    rejected_at = models.DateTimeField(
        null=True, blank=True, help_text="When the appointment was rejected"
    )

    # Timeout handling
    response_deadline = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Deadline for therapist to respond (30 minutes after creation)",
    )
    auto_cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the appointment was auto-cancelled due to timeout",
    )

    # Dual acceptance tracking - NEW FIELDS
    therapist_accepted = models.BooleanField(
        default=False, help_text="Whether the therapist has accepted this appointment"
    )
    therapist_accepted_at = models.DateTimeField(
        null=True, blank=True, help_text="When the therapist accepted the appointment"
    )
    driver_accepted = models.BooleanField(
        default=False, help_text="Whether the driver has accepted this appointment"
    )
    driver_accepted_at = models.DateTimeField(
        null=True, blank=True, help_text="When the driver accepted the appointment"
    )

    # Multiple therapists support
    therapists = models.ManyToManyField(
        CustomUser,
        related_name="multi_therapist_appointments",
        limit_choices_to={"role": "therapist"},
        blank=True,
        help_text="Multiple therapists for group appointments",
    )    # Enhanced workflow fields
    therapist_confirmed_at = models.DateTimeField(
        null=True, blank=True, help_text="When therapist confirmed the appointment"
    )
    driver_confirmed_at = models.DateTimeField(
        null=True, blank=True, help_text="When driver confirmed the appointment"
    )
    started_at = models.DateTimeField(
        null=True, blank=True, help_text="When the appointment was officially started by operator"
    )
    journey_started_at = models.DateTimeField(
        null=True, blank=True, help_text="When the journey to client location started"
    )
    arrived_at = models.DateTimeField(
        null=True, blank=True, help_text="When therapist(s) arrived at client location"
    )
    session_started_at = models.DateTimeField(
        null=True, blank=True, help_text="When the therapy session actually started"
    )
    payment_initiated_at = models.DateTimeField(
        null=True, blank=True, help_text="When payment process was initiated"
    )

    # Carpooling support
    requires_car = models.BooleanField(
        default=False,
        help_text="Whether this appointment requires a car (for multiple therapists)",
    )
    group_confirmation_complete = models.BooleanField(
        default=False, help_text="Whether all therapists in group have confirmed"
    )
    group_size = models.PositiveIntegerField(
        default=1, help_text="Number of therapists for this appointment"
    )

    # Driver assignment tracking
    driver_available_since = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When driver became available for pickup assignment",
    )
    auto_assignment_eligible = models.BooleanField(
        default=True,
        help_text="Whether this appointment is eligible for automatic driver assignment",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Set response deadline when creating a new pending appointment
        if not self.pk and self.status == "pending":
            self.response_deadline = timezone.now() + timedelta(minutes=30)

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

    def is_overdue(self):
        """Check if the appointment response is overdue (past 30 minutes)"""
        if self.status == "pending" and self.response_deadline:
            return timezone.now() > self.response_deadline
        return False

    def can_auto_cancel(self):
        """Check if appointment can be auto-cancelled due to timeout"""
        return self.status == "pending" and self.is_overdue()

    def both_parties_accepted(self):
        """Check if both therapist and driver have accepted the appointment"""
        therapist_accepted = (
            self.therapist_accepted if self.therapist else True
        )  # No therapist means no acceptance needed
        driver_accepted = (
            self.driver_accepted if self.driver else True
        )  # No driver means no acceptance needed
        return therapist_accepted and driver_accepted

    def get_pending_acceptances(self):
        """Get list of parties that still need to accept"""
        pending = []
        if self.therapist and not self.therapist_accepted:
            pending.append(f"Therapist ({self.therapist.get_full_name()})")
        if self.driver and not self.driver_accepted:
            pending.append(f"Driver ({self.driver.get_full_name()})")
        return pending

    def can_progress_to_confirmed(self):
        """Check if appointment can progress to confirmed status"""
        return self.status == "pending" and self.both_parties_accepted()

    def can_progress_to_in_progress(self):
        """Check if appointment can progress to in_progress status"""
        return self.status == "confirmed" and self.both_parties_accepted()

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

    def __str__(self):
        return f"Appointment for {self.client} on {self.date} at {self.start_time}"

    # Enhanced workflow helper methods    def can_therapist_confirm(self):
        """Check if therapist can confirm the appointment"""
        return self.status == "pending"

    def can_driver_confirm(self):
        """Check if driver can confirm the appointment"""
        if self.group_size > 1:
            # For group appointments, all therapists must confirm first
            return (
                self.status == "therapist_confirm" and self.group_confirmation_complete
            )
        else:
            # For single therapist, driver can confirm after therapist
            return self.status == "therapist_confirm"

    def can_start_journey(self):
        """Check if journey can be started"""
        return self.status == "in_progress"

    def can_arrive(self):
        """Check if therapist(s) can be marked as arrived"""
        return self.status == "journey"

    def can_start_session(self):
        """Check if session can be started (automatically after drop-off)"""
        return self.status == "arrived"

    def can_request_payment(self):
        """Check if payment can be requested"""
        return self.status == "session_in_progress"

    def can_complete(self):
        """Check if appointment can be completed"""
        return self.status == "awaiting_payment"

    def can_request_pickup(self):
        """Check if pickup can be requested"""
        return self.status == "completed"

    def is_visible_to_driver(self):
        """Check if appointment should be visible to driver"""
        # Driver can only see appointment after therapist(s) have confirmed
        if self.group_size > 1:
            return self.status in ["therapist_confirm", "in_progress", "journey", "arrived", "session_in_progress", "awaiting_payment", "completed"] and self.group_confirmation_complete
        else:
            return self.status in ["therapist_confirm", "in_progress", "journey", "arrived", "session_in_progress", "awaiting_payment", "completed"] and self.therapist_confirmed_at is not None

    def is_eligible_for_auto_pickup_assignment(self):
        """Check if appointment is eligible for automatic pickup driver assignment"""
        return (
            self.status == "pickup_requested"
            and self.auto_assignment_eligible
            and not self.driver  # No driver currently assigned
        )

    def get_required_vehicle_type(self):
        """Get the required vehicle type based on group size"""
        return "car" if self.group_size > 1 or self.requires_car else "motorcycle"

    def all_therapists_confirmed(self):
        """Check if all therapists in a group have confirmed"""
        if self.group_size <= 1:
            return self.therapist_confirmed_at is not None

        # For multi-therapist appointments, check therapists many-to-many field
        confirmed_count = self.therapists.filter(
            multi_therapist_appointments__therapist_confirmed_at__isnull=False
        ).count()
        return confirmed_count == self.group_size

    def update_group_confirmation_status(self):
        """Update the group confirmation status"""
        if self.group_size > 1:
            self.group_confirmation_complete = self.all_therapists_confirmed()
            self.save(update_fields=["group_confirmation_complete"])

    def get_session_duration_minutes(self):
        """Get the estimated session duration in minutes"""
        if self.session_started_at and self.session_end_time:
            delta = self.session_end_time - self.session_started_at
            return int(delta.total_seconds() / 60)

        # Fallback to service duration
        total_duration = sum(
            [service.duration for service in self.services.all()], timedelta()
        )
        return int(total_duration.total_seconds() / 60)


class TherapistConfirmation(models.Model):
    """Model to track individual therapist confirmations for multi-therapist appointments"""

    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name="therapist_confirmations",
    )
    therapist = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        limit_choices_to={"role": "therapist"},
    )
    confirmed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("appointment", "therapist")

    def __str__(self):
        status = "Confirmed" if self.confirmed_at else "Pending"
        return f"{self.therapist.get_full_name()} - Appointment #{self.appointment.id} - {status}"


class AppointmentRejection(models.Model):
    """Model to store appointment rejections and operator responses"""

    OPERATOR_RESPONSE_CHOICES = [
        ("pending", "Pending Review"),
        ("accepted", "Reason Accepted"),
        ("denied", "Reason Denied"),
    ]

    appointment = models.OneToOneField(
        Appointment, on_delete=models.CASCADE, related_name="rejection_details"
    )
    rejection_reason = models.TextField(
        help_text="Reason provided by therapist for rejecting"
    )
    rejected_by = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name="rejections_made",
        help_text="Therapist who rejected the appointment",
    )
    rejected_at = models.DateTimeField(auto_now_add=True)

    # Operator response to rejection
    operator_response = models.CharField(
        max_length=20, choices=OPERATOR_RESPONSE_CHOICES, default="pending"
    )
    operator_response_reason = models.TextField(
        blank=True,
        null=True,
        help_text="Operator's reason for accepting/denying the rejection",
    )
    reviewed_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rejections_reviewed",
        help_text="Operator who reviewed the rejection",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Rejection for {self.appointment} by {self.rejected_by}"


class Notification(models.Model):
    """Model to store notifications for users"""

    NOTIFICATION_TYPES = [
        ("appointment_created", "Appointment Created"),
        ("appointment_updated", "Appointment Updated"),
        ("appointment_reminder", "Appointment Reminder"),
        ("appointment_cancelled", "Appointment Cancelled"),
        ("appointment_accepted", "Appointment Accepted"),
        ("appointment_rejected", "Appointment Rejected"),
        ("appointment_started", "Appointment Started"),
        ("appointment_completed", "Appointment Completed"),
        ("appointment_auto_cancelled", "Appointment Auto Cancelled"),
        ("rejection_reviewed", "Rejection Reviewed"),
        ("therapist_disabled", "Therapist Disabled"),
    ]

    user = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name="notifications"
    )
    appointment = models.ForeignKey(
        Appointment,
        on_delete=models.CASCADE,
        related_name="notifications",
        null=True,
        blank=True,
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPES,
        default="appointment_created",
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    # For rejection-related notifications
    rejection = models.ForeignKey(
        AppointmentRejection,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="notifications",
    )

    def __str__(self):
        return f"{self.notification_type} for {self.user.username}"
