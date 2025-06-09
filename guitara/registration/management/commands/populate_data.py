from django.core.management.base import BaseCommand
from registration.models import Service, Material
from datetime import timedelta
from decimal import Decimal


class Command(BaseCommand):
    help = "Populate the database with service and material data"

    def handle(self, *args, **options):
        self.stdout.write(
            "=== Populating Database with Service and Material Data ===\n"
        )

        # Create services
        self.stdout.write("--- Creating Services ---")
        created_services = self.create_services()

        # Create materials
        self.stdout.write("\n--- Creating Materials ---")
        created_materials = self.create_materials()

        # Associate materials with services
        self.associate_materials_with_services()

        # Summary
        self.stdout.write(f"\n=== Summary ===")
        self.stdout.write(f"Total Services in database: {Service.objects.count()}")
        self.stdout.write(f"Total Materials in database: {Material.objects.count()}")
        self.stdout.write(f"Services created in this run: {len(created_services)}")
        self.stdout.write(f"Materials created in this run: {len(created_materials)}")

        # List all services
        self.stdout.write("\n=== Services List ===")
        for service in Service.objects.all():
            duration_minutes = service.duration.total_seconds() // 60
            self.stdout.write(
                f"• {service.name} - {duration_minutes:.0f} min - ₱{service.price}"
            )

        # List all materials
        self.stdout.write("\n=== Materials List ===")
        for material in Material.objects.all():
            service_name = material.service.name if material.service else "Not assigned"
            self.stdout.write(
                f"• {material.name} ({material.category}) - Stock: {material.stock_quantity} - Service: {service_name}"
            )

    def create_services(self):
        """Create services based on the provided data"""
        services_data = [
            {
                "name": "Shiatsu massage",
                "description": "Traditional Japanese massage technique focusing on pressure points",
                "duration": timedelta(minutes=60),
                "price": Decimal("500.00"),
                "oil": "Essential oil blend",
            },
            {
                "name": "Combi massage",
                "description": "Combination massage therapy with multiple techniques",
                "duration": timedelta(minutes=60),
                "price": Decimal("400.00"),
                "oil": "Therapeutic massage oil",
            },
            {
                "name": "Dry massage",
                "description": "Massage therapy without oils or lotions",
                "duration": timedelta(minutes=60),
                "price": Decimal("500.00"),
                "oil": None,
            },
            {
                "name": "Foot massage",
                "description": "Relaxing foot and lower leg massage therapy",
                "duration": timedelta(minutes=60),
                "price": Decimal("500.00"),
                "oil": "Peppermint oil blend",
            },
            {
                "name": "Hotstone service",
                "description": "Hot stone massage therapy for deep muscle relaxation",
                "duration": timedelta(minutes=90),
                "price": Decimal("675.00"),
                "oil": "Lavender oil",
            },
            {
                "name": "Ventosa",
                "description": "Cupping therapy using glass bottles for circulation",
                "duration": timedelta(minutes=90),
                "price": Decimal("675.00"),
                "oil": "Light massage oil",
            },
            {
                "name": "Hand massage",
                "description": "Therapeutic hand and wrist massage",
                "duration": timedelta(minutes=60),
                "price": Decimal("450.00"),
                "oil": "Hand cream lotion",
            },
        ]

        created_services = []
        for service_data in services_data:
            service, created = Service.objects.get_or_create(
                name=service_data["name"], defaults=service_data
            )
            if created:
                self.stdout.write(f"✓ Created service: {service.name}")
                created_services.append(service)
            else:
                self.stdout.write(f"→ Service already exists: {service.name}")

        return created_services

    def create_materials(self):
        """Create materials based on the provided data"""
        materials_data = [
            {
                "name": "Lavender Oil",
                "description": "Premium lavender essential oil for aromatherapy and relaxation massages",
                "category": "Massage Oil",
                "unit_of_measure": "Bottle",
                "stock_quantity": 50,
                "auto_deduct": True,
                "reusable": False,
            },
            {
                "name": "Peppermint Oil",
                "description": "Refreshing peppermint oil for foot and therapeutic massages",
                "category": "Massage Oil",
                "unit_of_measure": "Bottle",
                "stock_quantity": 30,
                "auto_deduct": True,
                "reusable": False,
            },
            {
                "name": "Massage Lotion",
                "description": "High-quality massage lotion for smooth skin contact during therapy",
                "category": "Massage Supplies",
                "unit_of_measure": "Tub",
                "stock_quantity": 40,
                "auto_deduct": True,
                "reusable": False,
            },
            {
                "name": "Alcohol Spray",
                "description": "Disinfectant alcohol spray for sanitizing equipment and surfaces",
                "category": "Hygiene Supplies",
                "unit_of_measure": "Spray Bottle",
                "stock_quantity": 25,
                "auto_deduct": True,
                "reusable": True,
            },
            {
                "name": "Ventosa Glass Bottles",
                "description": "Traditional glass bottles used for cupping therapy treatments",
                "category": "Ventosa Supplies",
                "unit_of_measure": "Set",
                "stock_quantity": 15,
                "auto_deduct": False,
                "reusable": True,
            },
            {
                "name": "Hot Stone Kit",
                "description": "Complete set of heated stones for hot stone massage therapy",
                "category": "Equipment",
                "unit_of_measure": "Set",
                "stock_quantity": 8,
                "auto_deduct": False,
                "reusable": True,
            },
        ]

        created_materials = []
        for material_data in materials_data:
            material, created = Material.objects.get_or_create(
                name=material_data["name"], defaults=material_data
            )
            if created:
                self.stdout.write(f"✓ Created material: {material.name}")
                created_materials.append(material)
            else:
                self.stdout.write(f"→ Material already exists: {material.name}")

        return created_materials

    def associate_materials_with_services(self):
        """Associate specific materials with relevant services"""
        associations = [
            ("Shiatsu massage", ["Lavender Oil", "Alcohol Spray"]),
            ("Combi massage", ["Massage Lotion", "Alcohol Spray"]),
            ("Dry massage", ["Alcohol Spray"]),
            ("Foot massage", ["Peppermint Oil", "Alcohol Spray"]),
            ("Hotstone service", ["Lavender Oil", "Hot Stone Kit", "Alcohol Spray"]),
            ("Ventosa", ["Massage Lotion", "Ventosa Glass Bottles", "Alcohol Spray"]),
            ("Hand massage", ["Massage Lotion", "Alcohol Spray"]),
        ]

        self.stdout.write("\n--- Associating Materials with Services ---")
        for service_name, material_names in associations:
            try:
                service = Service.objects.get(name=service_name)
                for material_name in material_names:
                    try:
                        material = Material.objects.get(name=material_name)
                        material.service = service
                        material.save()
                        self.stdout.write(
                            f"✓ Associated {material_name} with {service_name}"
                        )
                    except Material.DoesNotExist:
                        self.stdout.write(f"✗ Material not found: {material_name}")
            except Service.DoesNotExist:
                self.stdout.write(f"✗ Service not found: {service_name}")
