# Generated by Django 5.1.4 on 2025-07-06 07:13

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scheduling', '0017_merge_20250703_0634'),
    ]

    operations = [
        migrations.AlterField(
            model_name='appointmentmaterial',
            name='quantity_used',
            field=models.PositiveIntegerField(help_text='Quantity used (number of bottles/units)'),
        ),
        migrations.AlterField(
            model_name='client',
            name='email',
            field=models.EmailField(blank=True, max_length=254, null=True, unique=True),
        ),
        migrations.AlterField(
            model_name='client',
            name='phone_number',
            field=models.CharField(max_length=20, unique=True),
        ),
        migrations.AlterUniqueTogether(
            name='client',
            unique_together={('first_name', 'last_name', 'phone_number')},
        ),
    ]
