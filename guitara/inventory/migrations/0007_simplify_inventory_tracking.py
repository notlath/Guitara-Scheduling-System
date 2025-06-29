# Generated migration for inventory simplification
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0006_inventoryitem_size_per_unit'),
    ]

    operations = [
        # Remove size_per_unit field since we're going back to simple unit tracking
        migrations.RemoveField(
            model_name='inventoryitem',
            name='size_per_unit',
        ),
        # Add empty and in_use fields
        migrations.AddField(
            model_name='inventoryitem',
            name='empty',
            field=models.PositiveIntegerField(default=0, help_text='Number of empty units (bottles/containers)'),
        ),
        migrations.AddField(
            model_name='inventoryitem',
            name='in_use',
            field=models.PositiveIntegerField(default=0, help_text='Number of units currently in use during services'),
        ),
    ]
