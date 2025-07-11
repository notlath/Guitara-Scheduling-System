# Generated by Django 5.1.4 on 2025-07-06 07:13

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('registration', '0005_remove_material_stock_quantity_alter_material_table_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='material',
            name='name',
            field=models.CharField(default='Unnamed Material', max_length=100, unique=True),
        ),
        migrations.AlterField(
            model_name='registrationmaterial',
            name='name',
            field=models.CharField(max_length=100, unique=True),
        ),
        migrations.AlterField(
            model_name='service',
            name='name',
            field=models.CharField(default='New Service', max_length=100, unique=True),
        ),
    ]
