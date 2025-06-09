from django.core.management.base import BaseCommand
from scheduling.models import Client
import random


class Command(BaseCommand):
    help = "Populate the database with Filipino clients in Pasig City"

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=50,
            help="Number of clients to create (default: 50)",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force creation even if clients already exist",
        )

    def handle(self, *args, **options):
        count = options["count"]
        force = options["force"]

        self.stdout.write(
            self.style.SUCCESS(f"Creating {count} Filipino clients in Pasig City...")
        )

        # Common Filipino first names
        filipino_first_names = [
            "Maria",
            "Jose",
            "Juan",
            "Ana",
            "Antonio",
            "Carmen",
            "Francisco",
            "Rosa",
            "Manuel",
            "Teresa",
            "Pedro",
            "Luz",
            "Miguel",
            "Esperanza",
            "Ricardo",
            "Remedios",
            "Roberto",
            "Cristina",
            "Eduardo",
            "Josefina",
            "Carlos",
            "Dolores",
            "Fernando",
            "Gloria",
            "Rafael",
            "Leonora",
            "Ramon",
            "Felisa",
            "Alejandro",
            "Elena",
            "Luis",
            "Rosario",
            "Daniel",
            "Maricel",
            "Mark",
            "Mary Grace",
            "John Paul",
            "Princess",
            "Kristine",
            "Michael",
            "Angel",
            "Jhon",
            "Mary Ann",
            "Kenneth",
            "Joy",
            "Christian",
            "Lovely",
            "Jerome",
            "Rose",
            "Jerico",
            "Faith",
            "Joshua",
            "Hope",
            "Patrick",
            "Cherry",
        ]

        # Common Filipino last names
        filipino_last_names = [
            "Santos",
            "Reyes",
            "Cruz",
            "Bautista",
            "Ocampo",
            "Garcia",
            "Mendoza",
            "Torres",
            "Tomas",
            "Andres",
            "Marquez",
            "Romualdez",
            "Mercado",
            "Aguilar",
            "Flores",
            "Ramos",
            "Valdez",
            "Castillo",
            "Morales",
            "Aquino",
            "Villanueva",
            "Francisco",
            "Soriano",
            "Tolentino",
            "Gonzales",
            "Manalo",
            "Santiago",
            "Alvarez",
            "Hernandez",
            "Pascual",
            "Dela Cruz",
            "Jimenez",
            "Dizon",
            "Perez",
            "Lopez",
            "Gutierrez",
            "Salazar",
            "Navarro",
            "Dimaculangan",
            "Magbanua",
            "Lim",
            "Tan",
            "Go",
            "Chua",
            "Wong",
            "Lee",
            "Ong",
            "Sy",
            "Co",
        ]

        # Pasig City areas and streets
        pasig_addresses = [
            "123 Ortigas Avenue, Ortigas Center, Pasig City",
            "456 C. Raymundo Avenue, Maybunga, Pasig City",
            "789 Shaw Boulevard, Capitol Site, Pasig City",
            "321 Meralco Avenue, Ugong Norte, Pasig City",
            "654 Dr. Sixto Antonio Avenue, Kapasigan, Pasig City",
            "987 Caruncho Avenue, Pasig Heights, Pasig City",
            "147 Julia Vargas Avenue, Ortigas Center, Pasig City",
            "258 F. Legaspi Street, Oranbo, Pasig City",
            "369 Mercedes Avenue, San Miguel, Pasig City",
            "741 Estrella Street, Santolan, Pasig City",
            "852 Pioneer Street, Buting, Pasig City",
            "963 Rosario Bridge, Rosario, Pasig City",
            "159 Bambang Street, Bambang, Pasig City",
            "357 Manggahan Street, Manggahan, Pasig City",
            "468 Pinagbuhatan Road, Pinagbuhatan, Pasig City",
            "579 Sagad Street, Sagad, Pasig City",
            "681 Tiendesitas Drive, Ugong Norte, Pasig City",
            "792 Emerald Avenue, Ortigas Center, Pasig City",
            "814 Ruby Road, Kapitolyo, Pasig City",
            "925 Sapphire Street, San Antonio, Pasig City",
            "136 Diamond Drive, Dela Paz, Pasig City",
            "247 Pearl Lane, Pineda, Pasig City",
            "358 Gold Street, Kalawaan, Pasig City",
            "469 Silver Avenue, Malinao, Pasig City",
            "571 Bronze Boulevard, Caniogan, Pasig City",
            "682 Copper Circle, Maybunga, Pasig City",
            "793 Platinum Plaza, Bagong Ilog, Pasig City",
            "815 Titanium Terrace, Bagong Katipunan, Pasig City",
            "926 Iron Street, San Joaquin, Pasig City",
            "137 Steel Square, Sto. Tomas, Pasig City",
        ]

        # Generate phone numbers (Philippine format)
        def generate_phone():
            prefixes = [
                "0917",
                "0918",
                "0919",
                "0920",
                "0921",
                "0922",
                "0923",
                "0924",
                "0925",
                "0926",
                "0927",
                "0928",
                "0929",
                "0939",
                "0949",
                "0999",
            ]
            prefix = random.choice(prefixes)
            suffix = "".join([str(random.randint(0, 9)) for _ in range(7)])
            return f"{prefix}{suffix}"

        # Generate email addresses
        def generate_email(first_name, last_name):
            domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"]
            first_clean = first_name.lower().replace(" ", "").replace("-", "")
            last_clean = last_name.lower().replace(" ", "").replace("-", "")

            patterns = [
                f"{first_clean}.{last_clean}",
                f"{first_clean}{last_clean}",
                f"{first_clean}_{last_clean}",
                f"{first_clean}{random.randint(1, 999)}",
                f"{last_clean}{first_clean[:3]}",
            ]

            email_prefix = random.choice(patterns)
            domain = random.choice(domains)
            return f"{email_prefix}@{domain}"

        # Sample notes for variety
        sample_notes = [
            "Regular client, prefers morning appointments",
            "Has back issues, needs gentle pressure",
            "Allergic to strong scents",
            "First-time client",
            "Prefers female therapist",
            "Senior citizen discount applicable",
            "Frequent client, has membership package",
            "Prefers weekend appointments",
            "Has mobility issues, may need assistance",
            "Enjoys hot stone therapy",
            "",  # Some clients have no notes
            "",
            "",
        ]

        created_count = 0
        skipped_count = 0

        for i in range(count):
            first_name = random.choice(filipino_first_names)
            last_name = random.choice(filipino_last_names)
            email = generate_email(first_name, last_name)
            phone = generate_phone()
            address = random.choice(pasig_addresses)
            notes = random.choice(sample_notes)

            # Check if client already exists (unless force is used)
            if not force:
                existing_client = Client.objects.filter(
                    first_name=first_name, last_name=last_name, phone_number=phone
                ).first()

                if existing_client:
                    skipped_count += 1
                    continue

            # Create client
            client = Client.objects.create(
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone_number=phone,
                address=address,
                notes=notes if notes else None,
            )

            created_count += 1
            self.stdout.write(f"✓ Created: {client.first_name} {client.last_name}")

        # Summary
        total_clients = Client.objects.count()
        self.stdout.write(self.style.SUCCESS(f"\n=== Summary ==="))
        self.stdout.write(f"Total clients in database: {total_clients}")
        self.stdout.write(f"Clients created: {created_count}")
        if skipped_count > 0:
            self.stdout.write(f"Clients skipped (already exist): {skipped_count}")

        # Show sample clients
        self.stdout.write(self.style.SUCCESS(f"\n=== Sample Clients ==="))
        sample_clients = Client.objects.all().order_by("-created_at")[:5]
        for client in sample_clients:
            self.stdout.write(f"• {client.first_name} {client.last_name}")
            self.stdout.write(f"  Phone: {client.phone_number}")
            self.stdout.write(f"  Address: {client.address}")
            if client.notes:
                self.stdout.write(f"  Notes: {client.notes}")
            self.stdout.write("")
