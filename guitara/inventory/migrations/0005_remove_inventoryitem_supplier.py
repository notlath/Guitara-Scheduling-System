# Generated by Django 5.1.4 on 2025-06-23 04:08

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0004_merge_20250619_2037'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='inventoryitem',
            name='supplier',
        ),
    ]
