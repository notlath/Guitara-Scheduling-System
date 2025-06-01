# filepath: c:\Users\USer\Documents\College\Coding\Guitara-Scheduling-System\guitara\registration\migrations\0001_initial_services.py
from django.db import migrations, models


def create_initial_services(apps, schema_editor):
    Service = apps.get_model('registration', 'Service')
    
    # Create predefined services
    services_data = [
        {
            'name': 'Shiatsu Massage',
            'description': 'A Japanese technique involving pressure points.',
            'duration': 60,  # 1 hour
            'price': 500.00,
        },
        {
            'name': 'Combi Massage',
            'description': 'A combination of multiple massage techniques.',
            'duration': 60,
            'price': 550.00,
        },
        {
            'name': 'Dry Massage',
            'description': 'Performed without oils or lotions.',
            'duration': 60,
            'price': 450.00,
        },
        {
            'name': 'Foot Massage',
            'description': 'Focused on the feet and lower legs.',
            'duration': 60,
            'price': 400.00,
        },
        {
            'name': 'Hot Stone Service',
            'description': 'Uses heated stones for deep muscle relaxation.',
            'duration': 90,  # 1.5 hours
            'price': 650.00,
        },
        {
            'name': 'Ventosa',
            'description': 'Traditional cupping therapy to relieve muscle tension.',
            'duration': 45,  # 45 minutes
            'price': 450.00,
        },
        {
            'name': 'Hand Massage',
            'description': 'Focused on hands and arms.',
            'duration': 45,  # 45 minutes
            'price': 350.00,
        },
    ]
    
    try:
        for service_data in services_data:
            # Create service model objects one by one
            service, created = Service.objects.get_or_create(
                id=service_data.get('id', None),
                defaults={
                    'name': service_data.get('name', 'Unknown Service'),
                    'description': service_data.get('description', ''),
                    'duration': service_data.get('duration', 60),
                    'price': service_data.get('price', 0.00),
                }
            )
            if created:
                print(f"Created service: {service.name}")
            else:
                print(f"Service already exists: {service.name}")
    except Exception as e:
        print(f"Error creating services: {str(e)}")


class Migration(migrations.Migration):
    dependencies = [
        ('registration', '0008_material_auto_deduct_material_category_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.RunPython(create_initial_services, migrations.RunPython.noop),
    ]
