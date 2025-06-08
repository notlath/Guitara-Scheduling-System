# Generated migration for updated appointment status choices

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scheduling', '0001_initial'),  # Update this to match your latest migration
    ]

    operations = [
        migrations.AlterField(
            model_name='appointment',
            name='status',
            field=models.CharField(
                choices=[
                    ('pending', 'Pending'),
                    ('confirmed', 'Confirmed'),
                    ('in_progress', 'In Progress'),
                    ('completed', 'Completed'),
                    ('cancelled', 'Cancelled'),
                    ('rejected', 'Rejected'),
                    ('auto_cancelled', 'Auto Cancelled'),
                    ('pickup_requested', 'Pickup Requested'),
                    ('driver_assigned', 'Driver Assigned'),
                    ('driving_to_location', 'Driver En Route'),
                    ('at_location', 'Driver at Location'),
                    ('therapist_dropped_off', 'Therapist Dropped Off'),
                    ('transport_completed', 'Transport Completed'),
                    ('picking_up_therapists', 'Picking Up Therapists'),
                    ('transporting_group', 'Transporting Group'),
                    ('driver_assigned_pickup', 'Driver Assigned for Pickup'),
                ],
                default='pending',
                max_length=30  # Increased from 20 to accommodate longer status names
            ),
        ),
    ]
