# Generated migration for pickup confirmation timestamp

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("scheduling", "0008_add_therapist_confirmed_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="appointment",
            name="pickup_confirmed_at",
            field=models.DateTimeField(
                blank=True,
                help_text="When the pickup assignment was confirmed by driver",
                null=True,
            ),
        ),
    ]
