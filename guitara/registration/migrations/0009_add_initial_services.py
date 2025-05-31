from django.db import migrations

def create_initial_services(apps, schema_editor):
    Service = apps.get_model('registration', 'Service')
    
    # Create predefined services
    services_data = [
        {
            'name': 'Shiatsu Massage',
            'description': 'A Japanese technique involving pressure points.',
            'duration': 60,  # 1 hour
            'price': 500.00,
            'is_active': True,
        },
        {
            'name': 'Combi Massage',
            'description': 'A combination of multiple massage techniques.',
            'duration': 60,
            'price': 550.00,
            'is_active': True,
        },
        {
            'name': 'Dry Massage',
            'description': 'Performed without oils or lotions.',
            'duration': 60,
            'price': 450.00,
            'is_active': True,
        },
        {
            'name': 'Foot Massage',
            'description': 'Focused on the feet and lower legs.',
            'duration': 60,
            'price': 400.00,
            'is_active': True,
        },
        {
            'name': 'Hot Stone Service',
            'description': 'Uses heated stones for deep muscle relaxation.',
            'duration': 90,  # 1.5 hours
            'price': 650.00,
            'is_active': True,
        },
        {
            'name': 'Ventosa',
            'description': 'Traditional cupping therapy to relieve muscle tension.',
            'duration': 45,  # 45 minutes
            'price': 450.00,
            'is_active': True,
        },
        {
            'name': 'Hand Massage',
            'description': 'Focused on hands and arms.',
            'duration': 45,  # 45 minutes
            'price': 350.00,
            'is_active': True,
        },
    ]
    
    for service_data in services_data:
        # Check if service with this name already exists
        existing = Service.objects.filter(name=service_data['name']).first()
        if not existing:
            Service.objects.create(**service_data)


class Migration(migrations.Migration):
    dependencies = [
        ('registration', '0008_material_auto_deduct_material_category_and_more'),
    ]

    operations = [
        migrations.RunPython(create_initial_services, migrations.RunPython.noop),
    ]
