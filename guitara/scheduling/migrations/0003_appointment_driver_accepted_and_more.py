# Generated by Django 5.1.4 on 2025-06-07 19:07

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scheduling', '0002_appointment_auto_cancelled_at_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='appointment',
            name='driver_accepted',
            field=models.BooleanField(default=False, help_text='Whether the driver has accepted this appointment'),
        ),
        migrations.AddField(
            model_name='appointment',
            name='driver_accepted_at',
            field=models.DateTimeField(blank=True, help_text='When the driver accepted the appointment', null=True),
        ),
        migrations.AddField(
            model_name='appointment',
            name='therapist_accepted',
            field=models.BooleanField(default=False, help_text='Whether the therapist has accepted this appointment'),
        ),
        migrations.AddField(
            model_name='appointment',
            name='therapist_accepted_at',
            field=models.DateTimeField(blank=True, help_text='When the therapist accepted the appointment', null=True),
        ),
    ]
