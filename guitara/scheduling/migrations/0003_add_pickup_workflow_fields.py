# Generated migration for pickup workflow fields

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('scheduling', '0002_update_appointment_status_choices'),
    ]

    operations = [
        migrations.AddField(
            model_name='appointment',
            name='pickup_requested',
            field=models.BooleanField(default=False, help_text='Whether therapist has requested pickup after session'),
        ),
        migrations.AddField(
            model_name='appointment',
            name='pickup_request_time',
            field=models.DateTimeField(blank=True, help_text='When pickup was requested', null=True),
        ),
        migrations.AddField(
            model_name='appointment',
            name='pickup_urgency',
            field=models.CharField(choices=[('normal', 'Normal'), ('urgent', 'Urgent')], default='normal', help_text='Urgency level of pickup request', max_length=10),
        ),
        migrations.AddField(
            model_name='appointment',
            name='pickup_notes',
            field=models.TextField(blank=True, help_text='Additional notes for pickup request', null=True),
        ),
        migrations.AddField(
            model_name='appointment',
            name='estimated_pickup_time',
            field=models.DateTimeField(blank=True, help_text='Estimated time for driver arrival at pickup location', null=True),
        ),
        migrations.AddField(
            model_name='appointment',
            name='session_end_time',
            field=models.DateTimeField(blank=True, help_text='When the therapy session actually ended', null=True),
        ),
    ]
