# Generated by Django 5.1.4 on 2025-06-15 23:54

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='attendancerecord',
            name='date',
            field=models.DateField(default=django.utils.timezone.localdate),
        ),
    ]
