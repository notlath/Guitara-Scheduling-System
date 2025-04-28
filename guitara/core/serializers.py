from rest_framework import serializers
from .models import CustomUser

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