import os
import sys
import django

# Add the project path
sys.path.append(os.path.join(os.path.dirname(__file__), 'guitara'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from core.models import CustomUser

def debug_user_is_active():
    """Debug script to check is_active field for all users"""
    print("🔍 Debugging user is_active field values...")
    
    users = CustomUser.objects.all()
    print(f"Found {users.count()} total users")
    
    for user in users:
        print(f"\n👤 User: {user.first_name} {user.last_name}")
        print(f"   ID: {user.id}")
        print(f"   Username: {user.username}")
        print(f"   Role: {user.role}")
        print(f"   is_active: {user.is_active} (type: {type(user.is_active)})")
        print(f"   is_staff: {user.is_staff}")
        print(f"   is_superuser: {user.is_superuser}")
        
        # Check what the serializer would return
        from scheduling.serializers import UserSerializer
        serializer = UserSerializer(user)
        serialized_data = serializer.data
        print(f"   Serialized is_active: {serialized_data.get('is_active')} (type: {type(serialized_data.get('is_active'))})")

if __name__ == "__main__":
    debug_user_is_active()
