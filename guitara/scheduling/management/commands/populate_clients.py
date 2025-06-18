from django.core.management.base import BaseCommand
from scheduling.models import Client
import random


class Command(BaseCommand):
    help = "Populate the database with specific Filipino clients in Pasig City"

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=40,
            help="Number of clients to create (default: 40)",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force creation even if clients already exist",
        )

    def handle(self, *args, **options):
        count = min(options["count"], 40)  # Maximum 40 clients from our data
        force = options["force"]

        self.stdout.write(
            self.style.SUCCESS(
                f"Creating {count} specific Filipino clients in Pasig City..."
            )
        )

        # Specific client data from your provided list (first 40)
        clients_data = [
            {
                "surname": "Rentoza",
                "firstname": "Luis Gabriel",
                "middlename": "Capua",
                "gender": "Male",
                "address": "204 Bayabas St. Napico Manggahan",
            },
            {
                "surname": "Aldave",
                "firstname": "Samantha Angeli",
                "middlename": "De Jesus",
                "gender": "Female",
                "address": "36 B San Buenaventura St. Bagong Ilog",
            },
            {
                "surname": "Gregorio",
                "firstname": "Winnie Grace",
                "middlename": "Diaz",
                "gender": "Female",
                "address": "#80 2nd St. Country Side",
            },
            {
                "surname": "Napalinga",
                "firstname": "Luis Gabriel",
                "middlename": "Laron",
                "gender": "Male",
                "address": "Villa Cuana P3, Pinagbuhatan",
            },
            {
                "surname": "Del Rosario",
                "firstname": "Katherine",
                "middlename": "Rustia",
                "gender": "Female",
                "address": "B4 L16 Alley 1 St. Cent. 2 Pinagbuhatan",
            },
            {
                "surname": "Paguio",
                "firstname": "Jehezekiah Reign",
                "middlename": "Alfonso",
                "gender": "Female",
                "address": "Blv. 15 Road 30 Planters Cainta",
            },
            {
                "surname": "Ramos",
                "firstname": "Leo Andrew",
                "middlename": "Hernadez",
                "gender": "Male",
                "address": "100 San Agustin Palatiw",
            },
            {
                "surname": "Viloria",
                "firstname": "Maridel",
                "middlename": "Idian",
                "gender": "Female",
                "address": "38-20 Alvarez Comp. Maybunga",
            },
            {
                "surname": "Peralta",
                "firstname": "Nathalya",
                "middlename": "Obana",
                "gender": "Female",
                "address": "Rosabella st. Sta. Lucia",
            },
            {
                "surname": "Quines",
                "firstname": "Aouie",
                "middlename": "De Luna",
                "gender": "Female",
                "address": "3717 Durian St. Centennial II Pinagbuhatan",
            },
            {
                "surname": "Padua",
                "firstname": "Jennilyn",
                "middlename": "Tinaliga",
                "gender": "Female",
                "address": "BLK 1 LOT 5 #37A Eusebio Ave.San Miguel",
            },
            {
                "surname": "Visda",
                "firstname": "Shalei Rocel",
                "middlename": "Lapat",
                "gender": "Female",
                "address": "265 Dr.Pilapil San Miguel",
            },
            {
                "surname": "Esposa",
                "firstname": "Inna Marie",
                "middlename": "Dalagan",
                "gender": "Female",
                "address": "742 Lansones st. Napico Manggahan",
            },
            {
                "surname": "Fibra",
                "firstname": "Aljanealle",
                "middlename": "Valenzuela",
                "gender": "Female",
                "address": "BLK12 LT7 Kagalakan rd. Karangalan",
            },
            {
                "surname": "Valderama",
                "firstname": "Lovern Jade",
                "middlename": "",
                "gender": "Male",
                "address": "13 Riverside Ilugin Pinagbuhatan",
            },
            {
                "surname": "Sardiña",
                "firstname": "Erin Juliana",
                "middlename": "Macaraeg",
                "gender": "Female",
                "address": "23 Pres. Roxas st. Rosario",
            },
            {
                "surname": "Onia",
                "firstname": "Kheanne Rein",
                "middlename": "Drio",
                "gender": "Female",
                "address": "2530 Chico St. Cent.2 Nagpayong",
            },
            {
                "surname": "Tarife",
                "firstname": "Veronica",
                "middlename": "Salmorin",
                "gender": "Female",
                "address": "84-2 BLK 3 West Bank rd. Maybungga",
            },
            {
                "surname": "Castro",
                "firstname": "Ahsley Kurt",
                "middlename": "Galilea",
                "gender": "Male",
                "address": "#7 Unit 1 Somera St. F. Pasco Santolan",
            },
            {
                "surname": "Layoso",
                "firstname": "Jessica",
                "middlename": "Salatan",
                "gender": "Female",
                "address": "4212 Saint Paul St. S.P.S Subd. Rosario",
            },
            {
                "surname": "Matta",
                "firstname": "Mikaela Nicole",
                "middlename": "Garcia",
                "gender": "Female",
                "address": "87 Capinpin St. Mnggahan",
            },
            {
                "surname": "Hernando",
                "firstname": "Bianca",
                "middlename": "Navaldasca",
                "gender": "Female",
                "address": "108 4TH st. Countryside Sta. Lucia",
            },
            {
                "surname": "Templo",
                "firstname": "Mary Andrea",
                "middlename": "Doronila",
                "gender": "Female",
                "address": "1316 Suarez Maybunga",
            },
            {
                "surname": "Cerado",
                "firstname": "Roilan",
                "middlename": "Ibuyan",
                "gender": "Male",
                "address": "326 Capt. Henry Javies St.Oranbo",
            },
            {
                "surname": "Capitle",
                "firstname": "Kaydee",
                "middlename": "Mangussad",
                "gender": "Male",
                "address": "16L Breezy sb. Dela Paz",
            },
            {
                "surname": "Santos",
                "firstname": "Frances Sophia",
                "middlename": "Acosta",
                "gender": "Female",
                "address": "8 Int. Lucas st. Santolan",
            },
            {
                "surname": "Collier",
                "firstname": "Dianne Joy",
                "middlename": "Sauza",
                "gender": "Female",
                "address": "126K Dr. Sixto Antonio Ave. Rosario",
            },
            {
                "surname": "Dizon",
                "firstname": "Gianna Alexa",
                "middlename": "Delicano",
                "gender": "Female",
                "address": "9G Berlin St. Mercedes",
            },
            {
                "surname": "Alveyra",
                "firstname": "Mikhaela",
                "middlename": "Guinomma",
                "gender": "Female",
                "address": "70-A E. Santos st. Sto. Tomas",
            },
            {
                "surname": "Magloyuan",
                "firstname": "Sonia",
                "middlename": "Lati",
                "gender": "Female",
                "address": "19 f. Cruz St. F. Pasco Santolan",
            },
            {
                "surname": "Gallares",
                "firstname": "Angelika Louise",
                "middlename": "Quizon",
                "gender": "Female",
                "address": "419 Dr. Sixto Antonio Ave. Maybunga",
            },
            {
                "surname": "Garcia",
                "firstname": "Malvin John",
                "middlename": "Avila",
                "gender": "Male",
                "address": "1149 Kalamansi St. Napico Mangghan",
            },
            {
                "surname": "Villanueva",
                "firstname": "Mc. Jabneel",
                "middlename": "Yalung",
                "gender": "Male",
                "address": "Blk 3, Lot 2 Sta. Teresa Starville Pinagbuhatan",
            },
            {
                "surname": "Casimsiman",
                "firstname": "Althea Marie",
                "middlename": "Manera",
                "gender": "Female",
                "address": "163 Ilaya St. Buting",
            },
            {
                "surname": "Rapsing",
                "firstname": "Patrisha Rhoxane",
                "middlename": "Aquino",
                "gender": "Female",
                "address": "B4 L8 Uha St. Kalawaan",
            },
            {
                "surname": "Cabanal",
                "firstname": "Raina Gwen",
                "middlename": "Domantay",
                "gender": "Female",
                "address": "18 Sgt. De Leon St. Santolan",
            },
            {
                "surname": "Pardinez",
                "firstname": "Nicole",
                "middlename": "Menes",
                "gender": "Female",
                "address": "18 Rosabella st. Llamson Sta. Lucia",
            },
            {
                "surname": "Beltran",
                "firstname": "Sebastian",
                "middlename": "Rodilas",
                "gender": "Male",
                "address": "Purok 7 Callejon 2 Brgy. Sta Cruz",
            },
            {
                "surname": "Platero",
                "firstname": "Jessivie Luis",
                "middlename": "Javier",
                "gender": "Male",
                "address": "5 Kaparangalan st. Karangalan Village",
            },
            {
                "surname": "Libres",
                "firstname": "James Dave",
                "middlename": "Ebol",
                "gender": "Male",
                "address": "L29 P2 Maybunga Pasig",
            },
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
            client_data = clients_data[i]

            first_name = client_data["firstname"]
            last_name = client_data["surname"]
            email = generate_email(first_name, last_name)
            phone = generate_phone()
            address = f"{client_data['address']}, Pasig City"
            notes = random.choice(sample_notes)

            # Check if client already exists (unless force is used)
            if not force:
                existing_client = Client.objects.filter(
                    first_name=first_name, last_name=last_name
                ).first()

                if existing_client:
                    skipped_count += 1
                    self.stdout.write(
                        f"→ Skipped: {first_name} {last_name} (already exists)"
                    )
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
        self.stdout.write(self.style.SUCCESS(f"\n=== First 10 Created Clients ==="))
        sample_clients = Client.objects.filter(
            first_name__in=[data["firstname"] for data in clients_data[:10]]
        ).order_by("-created_at")[:10]

        for client in sample_clients:
            self.stdout.write(f"• {client.first_name} {client.last_name}")
            self.stdout.write(f"  Phone: {client.phone_number}")
            self.stdout.write(f"  Email: {client.email}")
            self.stdout.write(f"  Address: {client.address}")
            if client.notes:
                self.stdout.write(f"  Notes: {client.notes}")
            self.stdout.write("")
