from django.core.management.base import BaseCommand
from django.db import connection
from core.models import CustomUser


class Command(BaseCommand):
    help = "Check if profile_photo_url column exists in CustomUser table"

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            # Get table description
            cursor.execute("PRAGMA table_info(core_customuser);")
            columns = cursor.fetchall()

            self.stdout.write("Current columns in core_customuser table:")
            for column in columns:
                self.stdout.write(f"  {column[1]} ({column[2]})")

            # Check if profile_photo_url exists
            photo_column_exists = any(
                "profile_photo_url" in column for column in columns
            )

            if photo_column_exists:
                self.stdout.write(
                    self.style.SUCCESS("✅ profile_photo_url column exists!")
                )
            else:
                self.stdout.write(
                    self.style.ERROR("❌ profile_photo_url column is missing!")
                )

                # Try to get the current model fields
                self.stdout.write("\nModel fields:")
                for field in CustomUser._meta.fields:
                    self.stdout.write(f"  {field.name} ({field.__class__.__name__})")
