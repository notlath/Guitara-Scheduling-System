#!/usr/bin/env python3
"""
Test script to verify staff member data and is_active field values
"""

import os
import sys
import django
import json

# Setup Django environment
project_root = os.path.join(os.path.dirname(__file__), 'guitara')
sys.path.insert(0, project_root)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')

try:
    django.setup()
    from core.models import CustomUser
    from scheduling.serializers import UserSerializer
    
    def test_staff_data():
        print("🔍 Testing staff member data and is_active field...")
        
        # Get all staff members (therapists and drivers)
        staff_members = CustomUser.objects.filter(role__in=['therapist', 'driver']).order_by('first_name')
        
        print(f"\nFound {staff_members.count()} staff members:")
        
        for staff in staff_members:
            print(f"\n👤 {staff.first_name} {staff.last_name}")
            print(f"   ID: {staff.id}")
            print(f"   Username: {staff.username}")
            print(f"   Role: {staff.role}")
            print(f"   Raw is_active: {staff.is_active} (type: {type(staff.is_active)})")
            
            # Test serializer output
            serializer = UserSerializer(staff)
            serialized_data = serializer.data
            
            print(f"   Serialized data:")
            for key, value in serialized_data.items():
                if key == 'is_active':
                    print(f"     {key}: {value} (type: {type(value)})")
                else:
                    print(f"     {key}: {value}")
            
            # Test JSON serialization
            json_data = json.dumps(serialized_data)
            parsed_data = json.loads(json_data)
            print(f"   After JSON round-trip - is_active: {parsed_data.get('is_active')} (type: {type(parsed_data.get('is_active'))})")
        
        # Test creating a staff member with different is_active values
        print(f"\n🧪 Testing different is_active values...")
        
        # Test boolean True
        test_user = CustomUser(
            username='test_active',
            first_name='Test',
            last_name='Active',
            role='therapist',
            is_active=True
        )
        serializer = UserSerializer(test_user)
        print(f"Boolean True -> Serialized: {serializer.data.get('is_active')} (type: {type(serializer.data.get('is_active'))})")
        
        # Test boolean False
        test_user.is_active = False
        serializer = UserSerializer(test_user)
        print(f"Boolean False -> Serialized: {serializer.data.get('is_active')} (type: {type(serializer.data.get('is_active'))})")
        
        print(f"\n✅ Staff data test completed!")
    
    if __name__ == "__main__":
        test_staff_data()
        
except Exception as e:
    print(f"❌ Error setting up Django or running test: {e}")
    import traceback
    traceback.print_exc()
