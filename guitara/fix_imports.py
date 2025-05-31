import os
import importlib.util
import sys

def fix_service_serializer():
    """Fix the Service and Material model references in serializers.py"""
    
    # Path to the serializers.py file
    file_path = os.path.join(os.path.dirname(__file__), 'registration', 'serializers.py')
    
    # Create a backup
    backup_path = file_path + '.bak'
    try:
        with open(file_path, 'r') as f_in:
            content = f_in.read()
            
        with open(backup_path, 'w') as f_out:
            f_out.write(content)
        print(f"Created backup at {backup_path}")
    except Exception as e:
        print(f"Failed to create backup: {e}")
    
    try:
        # Replace the ServiceSerializer class
        new_content = """
class ServiceSerializer(serializers.ModelSerializer):
    materials = MaterialInfoSerializer(many=True, required=False, read_only=True, source='materials.all')
    
    class Meta:
        from .models import Service as ServiceModel
        model = ServiceModel
        fields = ['id', 'name', 'description', 'duration', 'price', 'oil', 'materials']
"""
        # Find and replace the service serializer class in the file
        with open(file_path, 'r') as f:
            content = f.read()
            
        if 'class ServiceSerializer' in content:
            import re
            pattern = r'class ServiceSerializer\(serializers\.ModelSerializer\):.*?(?=class|$)'
            new_content = re.sub(pattern, new_content, content, flags=re.DOTALL)
            
            with open(file_path, 'w') as f:
                f.write(new_content)
            print("Fixed ServiceSerializer in registration/serializers.py")
        else:
            print("Could not find ServiceSerializer class in the file")
            
    except Exception as e:
        print(f"Error fixing serializer: {e}")

if __name__ == '__main__':
    fix_service_serializer()
    print("Fix script completed")
