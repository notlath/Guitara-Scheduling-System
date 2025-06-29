# Generated migration for AppointmentMaterial model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('scheduling', '0013_merge_20250619_2037'),  # Adjust to latest migration
        ('inventory', '0006_inventoryitem_size_per_unit'),
    ]

    operations = [
        migrations.CreateModel(
            name='AppointmentMaterial',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity_used', models.DecimalField(decimal_places=2, help_text='Quantity used (ml for liquids, units for items)', max_digits=10)),
                ('is_reusable', models.BooleanField(default=False, help_text='Whether this material is reusable (Ventosa/Hot Stone kits)')),
                ('deducted_at', models.DateTimeField(auto_now_add=True, help_text='When material was deducted from inventory')),
                ('returned_at', models.DateTimeField(blank=True, help_text='When reusable material was returned to inventory', null=True)),
                ('usage_type', models.CharField(choices=[('consumable', 'Consumable'), ('reusable', 'Reusable')], default='consumable', help_text='Type of material usage', max_length=20)),
                ('notes', models.TextField(blank=True, help_text='Additional notes about material usage', null=True)),
                ('appointment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='appointment_materials', to='scheduling.appointment')),
                ('inventory_item', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='appointment_usages', to='inventory.inventoryitem')),
            ],
            options={
                'verbose_name': 'Appointment Material Usage',
                'verbose_name_plural': 'Appointment Material Usages',
            },
        ),
    ]
