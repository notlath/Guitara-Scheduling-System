from django.db import migrations, models


def create_initial_services(apps, schema_editor):
    Service = apps.get_model('registration', 'Service')
    
    # Create predefined services - Only create them if they don't exist
    services_data = [
        {
            # Only use fields we know exist at this point
            'is_active': True
        },
    ]
    
    # Get the field names actually available in the Service model at this point
    service_fields = [f.name for f in Service._meta.get_fields()]
    print(f"Available service fields: {service_fields}")
    
    for service_data in services_data:
        # Filter the data to include only fields that exist in the model
        filtered_data = {k: v for k, v in service_data.items() if k in service_fields}
        
        try:
            # Get or create the service with available fields
            Service.objects.get_or_create(**filtered_data)
        except Exception as e:
            print(f"Could not create service: Error: {str(e)}")


class Migration(migrations.Migration):
    dependencies = [
        ('registration', '0001_initial'),  # Adjust this if there are existing migrations
    ]

    operations = [
        migrations.AddField(
            model_name='service',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        # Ensure all required fields exist before creating services
        migrations.RunPython(create_initial_services, migrations.RunPython.noop),
    ]
