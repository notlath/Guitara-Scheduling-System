import os
import sys
import shutil
import subprocess
from pathlib import Path

# Add the project to the Python path and set up the environment
sys.path.append('guitara')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')

def clear_migrations():
    """Remove all migration files except __init__.py files"""
    apps = ['core', 'authentication', 'registration', 'scheduling']
    
    for app in apps:
        migrations_dir = Path(f'guitara/{app}/migrations')
        if migrations_dir.exists():
            print(f"Cleaning migrations for {app}...")
            for migration_file in migrations_dir.glob('*.py'):
                if migration_file.name != '__init__.py':
                    print(f"  Removing {migration_file.name}")
                    migration_file.unlink()
            
            # Also remove the __pycache__ directory
            pycache_dir = migrations_dir / '__pycache__'
            if pycache_dir.exists():
                print(f"  Removing {app}/migrations/__pycache__")
                shutil.rmtree(pycache_dir)
        else:
            print(f"Creating migrations directory for {app}")
            migrations_dir.mkdir(exist_ok=True)
            # Create __init__.py file
            init_file = migrations_dir / '__init__.py'
            init_file.touch()

def run_command(command):
    """Run a command and print its output"""
    print(f"Running: {command}")
    process = subprocess.run(command, shell=True, text=True, capture_output=True)
    
    if process.stdout:
        print(process.stdout)
    
    if process.stderr:
        print("Error:")
        print(process.stderr)
        
    return process.returncode == 0

def create_fresh_migrations():
    """Create fresh migrations for all apps"""
    apps = ['core', 'authentication', 'registration', 'scheduling']
    
    for app in apps:
        print(f"Creating migrations for {app}...")
        success = run_command(f"python guitara/manage.py makemigrations {app}")
        if not success:
            print(f"Failed to create migrations for {app}")
            return False
    
    print("\nCreated fresh migrations. Now let's create our initial data migration...")
    return True

def create_initial_data_migration():
    """Create a data migration to add initial services"""
    print("Creating initial data migration for services...")
    success = run_command("python guitara/manage.py makemigrations registration --empty --name create_initial_services")
    
    if not success:
        print("Failed to create data migration")
        return False
    
    # Find the newest migration file
    migration_dir = Path('guitara/registration/migrations')
    migration_files = [f for f in migration_dir.glob('*.py') if f.stem.startswith('0') and 'create_initial_services' in f.stem]
    
    if not migration_files:
        print("Couldn't find the created migration file")
        return False
    
    # Sort by name to get the latest
    migration_file = sorted(migration_files)[-1]
    
    # Update the migration file with initial data
    with open(migration_file, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Import datetime/timedelta at the top
    content = content.replace(
        "from django.db import migrations",
        "from django.db import migrations\nfrom datetime import timedelta"
    )
    
    # Replace the operations list with our data migration
    new_content = content.replace(
        "operations = [",
        """operations = [
    migrations.RunPython(create_initial_services, migrations.RunPython.noop),
]

def create_initial_services(apps, schema_editor):
    Service = apps.get_model('registration', 'Service')
    
    # Create predefined services with exact IDs to match frontend expectations
    services_data = [
        {
            'id': 1,
            'name': 'Shiatsu Massage',
            'description': 'A Japanese technique involving pressure points.',
            'duration': timedelta(minutes=60),  # 1 hour
            'price': 500.00,
            'is_active': True,
        },
        {
            'id': 2,
            'name': 'Combi Massage',
            'description': 'A combination of multiple massage techniques.',
            'duration': timedelta(minutes=60),
            'price': 550.00,
            'is_active': True,
        },
        {
            'id': 3,
            'name': 'Dry Massage',
            'description': 'Performed without oils or lotions.',
            'duration': timedelta(minutes=60),
            'price': 450.00,
            'is_active': True,
        },
        {
            'id': 4,
            'name': 'Foot Massage',
            'description': 'Focused on the feet and lower legs.',
            'duration': timedelta(minutes=60),
            'price': 400.00,
            'is_active': True,
        },
        {
            'id': 5,
            'name': 'Hot Stone Service',
            'description': 'Uses heated stones for deep muscle relaxation.',
            'duration': timedelta(minutes=90),  # 1.5 hours
            'price': 650.00,
            'is_active': True,
        },
        {
            'id': 6,
            'name': 'Ventosa',
            'description': 'Traditional cupping therapy to relieve muscle tension.',
            'duration': timedelta(minutes=45),  # 45 minutes
            'price': 450.00,
            'is_active': True,
        },
        {
            'id': 7,
            'name': 'Hand Massage',
            'description': 'Focused on hands and arms.',
            'duration': timedelta(minutes=45),  # 45 minutes
            'price': 350.00,
            'is_active': True,
        },
    ]
    
    # Delete any existing services to ensure clean slate
    Service.objects.all().delete()
    
    # Create new services with specified IDs
    for service_data in services_data:
        Service.objects.create(**service_data)
        print(f"Created service: {service_data['name']} (ID: {service_data['id']})")
"""

    )

    # Update the migration file
    with open(migration_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
        f.write("\n")
    print(f"Updated {migration_file} with initial data migration")
    return True

def apply_migrations():
    """Apply all migrations"""
    print("Applying migrations...")
    return run_command("python guitara/manage.py migrate")

if __name__ == "__main__":
    print("=== Starting Fresh Migrations Process ===")
    
    # Step 1: Clear existing migrations
    print("\n1. Clearing existing migrations...")
    clear_migrations()
    
    # Step 2: Create fresh migrations
    print("\n2. Creating fresh migrations...")
    if not create_fresh_migrations():
        print("Failed to create fresh migrations. Exiting.")
        sys.exit(1)
    
    # Step 3: Create data migration for initial data
    print("\n3. Creating data migration for initial data...")
    if not create_initial_data_migration():
        print("Failed to create data migration. Exiting.")
        sys.exit(1)
    
    # Step 4: Apply migrations
    print("\n4. Applying migrations...")
    if not apply_migrations():
        print("Failed to apply migrations. Exiting.")
        sys.exit(1)
    
    print("\n=== Migration Process Complete ===")
    print("Your database now has fresh tables with initial service data.")
