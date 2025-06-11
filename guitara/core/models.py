from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.exceptions import ValidationError


class CustomUser(AbstractUser):
    ROLES = (
        ("operator", "Operator"),
        ("therapist", "Therapist"),
        ("driver", "Driver"),
    )

    role = models.CharField(max_length=20, choices=ROLES)
    specialization = models.CharField(max_length=100, blank=True, null=True)
    massage_pressure = models.CharField(
        max_length=20,
        choices=[("soft", "Soft"), ("moderate", "Moderate"), ("hard", "Hard")],
        blank=True,
        null=True,
    )
    license_number = models.CharField(max_length=50, blank=True, null=True)
    motorcycle_plate = models.CharField(max_length=20, blank=True, null=True)
    phone_number = models.CharField(max_length=20, default="N/A")  # Add a default value
    failed_login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    email_verified = models.BooleanField(default=False)  # For 2FA
    verification_code = models.CharField(max_length=6, blank=True, null=True)
    two_factor_enabled = models.BooleanField(default=False)  # Add this missing field
    last_available_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when driver became available for FIFO assignment",
    )

    def clean(self):
        # Validate driver requirements
        if self.role == "driver" and not self.motorcycle_plate:
            raise ValidationError(
                {
                    "motorcycle_plate": "Drivers must have a valid motorcycle plate number"
                }
            )

        # Validate therapist requirements
        if self.role == "therapist" and not self.license_number:
            raise ValidationError(
                {"license_number": "Therapists must have a valid license number"}
            )

    def __str__(self):
        return f"{self.get_role_display()} - {self.username}"
