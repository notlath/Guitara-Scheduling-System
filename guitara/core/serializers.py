from rest_framework import serializers
from .models import CustomUser, SystemLog
import re

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = '__all__'
        extra_kwargs = {'password': {'write_only': True}}

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be 8+ characters")
        if not re.search(r'[A-Z]', value):
            raise serializers.ValidationError("Password must contain uppercase")
        if not re.search(r'[a-z]', value):
            raise serializers.ValidationError("Password must contain lowercase")
        if not re.search(r'[0-9]', value):
            raise serializers.ValidationError("Password must contain numbers")
        return value

    def create(self, validated_data):
        user = CustomUser.objects.create_user(**validated_data)
        return user

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ['username', 'email', 'password', 'role', 'phone']

    def create(self, validated_data):
        user = CustomUser.objects.create_user(**validated_data)
        return user

class SystemLogSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    action_type = serializers.SerializerMethodField()
    
    class Meta:
        model = SystemLog
        fields = ['id', 'timestamp', 'description', 'log_type', 'action_type', 'user', 'metadata']
        read_only_fields = ['id', 'timestamp']
    
    def get_action_type(self, obj):
        """
        Extract action_type from metadata if available.
        This maintains backward compatibility with the frontend.
        """
        if obj.metadata and 'action_type' in obj.metadata:
            return obj.metadata['action_type']
        return None
    
    def get_user(self, obj):
        """
        Return user information if available. Since we're only storing user_id in the model,
        we don't attempt to fetch the actual user object here.
        """
        if obj.user_id:
            return str(obj.user_id)
        return None
    
    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # Format timestamp for consistent display with timezone info
        if ret['timestamp'] and instance.timestamp:
            # Format with timezone info (ISO 8601 format) for better frontend parsing
            ret['timestamp'] = instance.timestamp.strftime('%Y-%m-%dT%H:%M:%S.%f%z')
        
        # Remove null fields for cleaner response
        for field in ['metadata', 'action_type', 'user']:
            if field in ret and ret[field] is None:
                ret.pop(field, None)
            
        # For frontend compatibility, add additional_data as an alias to metadata
        if 'metadata' in ret and ret['metadata'] is not None:
            ret['additional_data'] = ret['metadata']
            
            # Ensure item_name is always present in inventory logs
            if ret.get('log_type') == 'inventory' and 'item_name' not in ret['metadata']:
                if 'item_id' in ret['metadata']:
                    try:
                        from inventory.models import InventoryItem
                        item = InventoryItem.objects.filter(id=ret['metadata']['item_id']).first()
                        if item:
                            ret['metadata']['item_name'] = item.name
                            ret['additional_data']['item_name'] = item.name
                    except Exception as e:
                        # Don't break if lookup fails
                        pass
            
        return ret
