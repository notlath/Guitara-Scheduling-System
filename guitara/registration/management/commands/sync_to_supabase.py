from django.core.management.base import BaseCommand
from registration.models import Service, Material
from registration.supabase_client import get_supabase_client
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Sync Django services and materials to Supabase"

    def handle(self, *args, **options):
        supabase = get_supabase_client()
        if not supabase:
            self.stdout.write(self.style.ERROR("Supabase client not available"))
            return

        self.stdout.write("=== Syncing Django Data to Supabase ===\n")

        # Sync services
        self.stdout.write("--- Syncing Services ---")
        services = Service.objects.all()
        synced_services = {}

        for service in services:
            service_data = {
                "name": service.name,
                "description": service.description,
                "duration": service.duration,
                "price": float(service.price),
                "oil": service.oil,
                "is_active": service.is_active,
            }

            try:
                result = (
                    supabase.table("registration_service")
                    .upsert(service_data, on_conflict="name")
                    .execute()
                )
                if getattr(result, "error", None):
                    self.stdout.write(
                        self.style.ERROR(
                            f"Failed to sync service {service.name}: {result.error}"
                        )
                    )
                    continue
                else:
                    supabase_service_id = result.data[0]["id"]
                    synced_services[service.id] = supabase_service_id
                    self.stdout.write(
                        self.style.SUCCESS(f"✓ Synced service: {service.name}")
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Exception syncing service {service.name}: {e}")
                )
                continue

        # Sync materials
        self.stdout.write("\n--- Syncing Materials ---")
        materials = Material.objects.all()
        synced_materials = {}

        for material in materials:
            material_data = {
                "name": material.name,
                "description": material.description,
                "category": material.category,
                "unit_of_measure": material.unit_of_measure,
                "stock_quantity": material.stock_quantity,
                "auto_deduct": material.auto_deduct,
                "reusable": material.reusable,
            }

            try:
                mat_result = (
                    supabase.table("registration_material")
                    .upsert(material_data, on_conflict="name")
                    .execute()
                )
                if getattr(mat_result, "error", None):
                    self.stdout.write(
                        self.style.ERROR(
                            f"Failed to sync material {material.name}: {mat_result.error}"
                        )
                    )
                    continue
                else:
                    supabase_material_id = mat_result.data[0]["id"]
                    synced_materials[material.id] = supabase_material_id
                    self.stdout.write(
                        self.style.SUCCESS(f"✓ Synced material: {material.name}")
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"Exception syncing material {material.name}: {e}")
                )
                continue

        # Sync service-material relationships
        self.stdout.write("\n--- Syncing Service-Material Relationships ---")
        for service in services:
            if service.id not in synced_services:
                continue

            supabase_service_id = synced_services[service.id]
            materials = Material.objects.filter(service=service)

            for material in materials:
                if material.id not in synced_materials:
                    continue

                supabase_material_id = synced_materials[material.id]

                # Create junction table entry
                junction_data = {
                    "service_id": supabase_service_id,
                    "material_id": supabase_material_id,
                    "material_name": material.name,
                    "material_description": material.description,
                    "quantity_required": 1,
                    "is_required": True,
                }

                try:
                    junction_result = (
                        supabase.table("registration_material_service")
                        .upsert(junction_data, on_conflict="service_id,material_id")
                        .execute()
                    )

                    if getattr(junction_result, "error", None):
                        self.stdout.write(
                            self.style.ERROR(
                                f"Failed to link {material.name} to {service.name}: {junction_result.error}"
                            )
                        )
                    else:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"  ✓ Linked material: {material.name} → {service.name}"
                            )
                        )
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Exception linking {material.name} to {service.name}: {e}"
                        )
                    )

        self.stdout.write(f"\n=== Sync Summary ===")
        self.stdout.write(f"Services synced: {len(synced_services)}")
        self.stdout.write(f"Materials synced: {len(synced_materials)}")
        self.stdout.write(self.style.SUCCESS("Sync completed!"))
