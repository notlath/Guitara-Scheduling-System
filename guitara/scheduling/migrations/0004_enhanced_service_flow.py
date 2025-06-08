# Generated migration for enhanced service flow

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ("scheduling", "0003_add_pickup_workflow_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="appointment",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("therapist_confirm", "Therapist Confirm"),
                    ("driver_confirm", "Driver Confirm"),
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
                ],
                default="pending",
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name="appointment",
            name="therapist_confirmed_at",
            field=models.DateTimeField(
                blank=True,
                help_text="When therapist confirmed the appointment",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="appointment",
            name="driver_confirmed_at",
            field=models.DateTimeField(
                blank=True, help_text="When driver confirmed the appointment", null=True
            ),
        ),
        migrations.AddField(
            model_name="appointment",
            name="journey_started_at",
            field=models.DateTimeField(
                blank=True,
                help_text="When the journey to client location started",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="appointment",
            name="arrived_at",
            field=models.DateTimeField(
                blank=True,
                help_text="When therapist(s) arrived at client location",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="appointment",
            name="session_started_at",
            field=models.DateTimeField(
                blank=True,
                help_text="When the therapy session actually started",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="appointment",
            name="payment_initiated_at",
            field=models.DateTimeField(
                blank=True, help_text="When payment process was initiated", null=True
            ),
        ),
        migrations.AddField(
            model_name="appointment",
            name="requires_car",
            field=models.BooleanField(
                default=False,
                help_text="Whether this appointment requires a car (for multiple therapists)",
            ),
        ),
        migrations.AddField(
            model_name="appointment",
            name="group_confirmation_complete",
            field=models.BooleanField(
                default=False,
                help_text="Whether all therapists in group have confirmed",
            ),
        ),
        migrations.AddField(
            model_name="appointment",
            name="group_size",
            field=models.PositiveIntegerField(
                default=1, help_text="Number of therapists for this appointment"
            ),
        ),
        migrations.AddField(
            model_name="appointment",
            name="driver_available_since",
            field=models.DateTimeField(
                blank=True,
                help_text="When driver became available for pickup assignment",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="appointment",
            name="auto_assignment_eligible",
            field=models.BooleanField(
                default=True,
                help_text="Whether this appointment is eligible for automatic driver assignment",
            ),
        ),
    ]
