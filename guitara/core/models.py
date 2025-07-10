from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone


class SystemLog(models.Model):
    """Model to track system events like authentication, data changes, etc."""
    LOG_TYPES = (
        ('authentication', 'Authentication'),
        ('appointment', 'Appointment'),
        ('payment', 'Payment'),
        ('data', 'Data'),
        ('system', 'System'),
        ('inventory', 'Inventory'),
    )
    
    ACTION_TYPES = (
        ('login', 'Login'),
        ('logout', 'Logout'),
        ('create', 'Create'),
        ('update', 'Update'),
        ('delete', 'Delete'),
        ('view', 'View'),
        ('export', 'Export'),
        ('import', 'Import'),
        ('error', 'Error'),
        ('success', 'Success'),
        ('verify', 'Verify'),
    )
    
    # Fields matching the actual DB schema in Supabase
    id = models.AutoField(primary_key=True)
    log_type = models.CharField(max_length=20, choices=LOG_TYPES)
    timestamp = models.DateTimeField(default=timezone.now)
    description = models.TextField()
    user_id = models.IntegerField(null=True, blank=True)  # Store direct user ID, no ForeignKey relation
    metadata = models.JSONField(null=True, blank=True)  # Supabase uses 'metadata' field for JSON data
    
    # action_type field has been removed as it doesn't exist in Supabase
    # We'll store the action_type in the metadata field instead
    
    class Meta:
        ordering = ['-timestamp']
        managed = True  # Let Django manage this table to ensure it exists
        db_table = 'core_systemlog'  # Match the Supabase table name
    
    def __str__(self):
        user_str = f"User {self.user_id}" if self.user_id else "Anonymous"
        action = self.metadata.get('action_type', 'Action').title() if self.metadata else "Action"
        return f"{self.log_type.title()} - {action} by {user_str}"
        
    def save(self, *args, **kwargs):
        """
        Override save method to ensure this is saved directly to Supabase,
        bypassing any potential local database configurations.
        """
        import logging
        logger = logging.getLogger(__name__)
        
        # Save to database using the default connection (Supabase)
        try:
            from django.db import connections
            logger.info(f"Saving SystemLog to Supabase: {self.description}")
            super().save(*args, **kwargs)
            # Force commit the transaction
            connections['default'].commit()
            logger.info(f"Successfully saved SystemLog #{self.id} to Supabase")
        except Exception as e:
            logger.error(f"Failed to save SystemLog to Supabase: {str(e)}")
            # Attempt a regular save as fallback
            super().save(*args, **kwargs)
            logger.warning(f"Saved SystemLog to fallback database")
        action = self.metadata.get('action_type', 'Action').title() if self.metadata else "Action"
        return f"{self.log_type.title()} - {action} at {self.timestamp}"


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
    profile_photo_url = models.URLField(
        max_length=500,
        blank=True,
        null=True,
        help_text="URL to profile photo stored in Supabase Storage",
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
