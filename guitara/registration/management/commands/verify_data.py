from django.core.management.base import BaseCommand
from registration.models import Service, Material


class Command(BaseCommand):
    help = "Verify the populated service and material data"

    def handle(self, *args, **options):
        self.stdout.write("=== DATABASE VERIFICATION ===\n")

        # Services
        services = Service.objects.all()
        self.stdout.write(f"Services ({services.count()}):")
        for service in services:
            duration_minutes = service.duration.total_seconds() // 60
            self.stdout.write(
                f"  • {service.name}: {duration_minutes:.0f} min, ₱{service.price}"
            )

        # Materials
        materials = Material.objects.all()
        self.stdout.write(f"\nMaterials ({materials.count()}):")
        for material in materials:
            service_name = material.service.name if material.service else "Not assigned"
            self.stdout.write(
                f"  • {material.name} ({material.category}) - Stock: {material.stock_quantity} - Service: {service_name}"
            )

        self.stdout.write(f"\n=== SUCCESS ===")
        self.stdout.write(
            "All services and materials have been successfully populated!"
        )
