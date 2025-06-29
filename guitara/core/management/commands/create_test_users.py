from django.core.management.base import BaseCommand
from core.models import CustomUser


class Command(BaseCommand):
    help = "Create test users for development role switching"

    def handle(self, *args, **options):
        # Test user data
        test_users = [
            {
                "username": "operator1",
                "email": "operator@test.com",
                "first_name": "John",
                "last_name": "Operator",
                "role": "operator",
                "password": "testpass123",
            },
            {
                "username": "therapist1",
                "email": "therapist@test.com",
                "first_name": "Jane",
                "last_name": "Therapist",
                "role": "therapist",
                "password": "testpass123",
            },
            {
                "username": "driver1",
                "email": "driver@test.com",
                "first_name": "Mike",
                "last_name": "Driver",
                "role": "driver",
                "password": "testpass123",
                "motorcycle_plate": "TEST-123",  # Required for drivers
            },
        ]

        created_count = 0
        updated_count = 0

        for user_data in test_users:
            username = user_data["username"]
            password = user_data.pop("password")

            # Check if user already exists
            user, created = CustomUser.objects.get_or_create(
                username=username, defaults=user_data
            )

            if created:
                user.set_password(password)
                user.save()
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Created test user: {username} ({user_data["role"]})'
                    )
                )
            else:
                # Update existing user with new data and password
                for key, value in user_data.items():
                    setattr(user, key, value)
                user.set_password(password)
                user.save()
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'🔄 Updated existing user: {username} ({user_data["role"]})'
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"\n🎯 Summary: {created_count} users created, {updated_count} users updated"
            )
        )

        self.stdout.write("\n📋 Test Credentials:")
        for user_data in test_users:
            self.stdout.write(f'  {user_data["username"]}: testpass123')

        self.stdout.write("\n🧪 Use these credentials in the frontend role switcher!")
