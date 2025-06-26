from scheduling.models import Client

# Create sample clients
clients_data = [
    {
        "first_name": "Maria",
        "last_name": "Santos", 
        "email": "maria.santos@email.com",
        "phone_number": "+63 912 345 6789",
        "address": "123 Rizal Street, Makati City",
        "notes": "Regular client, prefers afternoon appointments"
    },
    {
        "first_name": "Juan",
        "last_name": "Dela Cruz",
        "email": "juan.delacruz@gmail.com", 
        "phone_number": "+63 917 234 5678",
        "address": "456 Bonifacio Avenue, Quezon City",
        "notes": "Has back pain, prefers medium pressure"
    },
    {
        "first_name": "Ana", 
        "last_name": "Rodriguez",
        "email": "ana.rodriguez@yahoo.com",
        "phone_number": "+63 920 123 4567",
        "address": "789 Luna Street, Pasig City",
        "notes": "First-time client, interested in hot stone therapy"
    }
]

# Check existing clients
existing_count = Client.objects.count()
print(f"Current clients in database: {existing_count}")

# Create clients if they don't exist
created = 0
for client_data in clients_data:
    if not Client.objects.filter(phone_number=client_data["phone_number"]).exists():
        Client.objects.create(**client_data)
        print(f"Created: {client_data['first_name']} {client_data['last_name']}")
        created += 1
    else:
        print(f"Already exists: {client_data['first_name']} {client_data['last_name']}")

print(f"Created {created} new clients")
print(f"Total clients now: {Client.objects.count()}")

# Display all clients
print("\nAll clients:")
for client in Client.objects.all():
    print(f"- {client.first_name} {client.last_name} ({client.phone_number})")
