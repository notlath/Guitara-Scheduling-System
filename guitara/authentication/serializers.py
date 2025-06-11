from rest_framework import serializers
from django.contrib.auth import authenticate
from core.models import CustomUser

class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['username', 'email', 'password', 'role', 'phone_number']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        user = CustomUser.objects.create_user(**validated_data)
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, data):
        username_or_email = data.get("username")
        password = data.get("password")
        user = authenticate(username=username_or_email, password=password)
        if not user:
            # Try email if username failed
            try:
                from core.models import CustomUser
                user_obj = CustomUser.objects.get(email=username_or_email)
                user = authenticate(username=user_obj.username, password=password)
            except CustomUser.DoesNotExist:
                pass
        if user and user.is_active:
            return user
        raise serializers.ValidationError("Invalid credentials")
