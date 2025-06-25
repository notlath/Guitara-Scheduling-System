from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
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
        
        # Find the user first (by username or email)
        user_obj = None
        try:
            user_obj = CustomUser.objects.get(username=username_or_email)
        except CustomUser.DoesNotExist:
            try:
                user_obj = CustomUser.objects.get(email=username_or_email)
            except CustomUser.DoesNotExist:
                # Invalid user - still increment attempts to prevent user enumeration
                raise serializers.ValidationError("Invalid credentials")
        
        # Check if account is locked
        if user_obj.locked_until and timezone.now() < user_obj.locked_until:
            time_remaining = user_obj.locked_until - timezone.now()
            minutes_remaining = int(time_remaining.total_seconds() / 60)
            seconds_remaining = int(time_remaining.total_seconds() % 60)
            if minutes_remaining > 0:
                raise serializers.ValidationError(
                    f"Account is temporarily locked. Try again in {minutes_remaining} minutes and {seconds_remaining} seconds."
                )
            else:
                raise serializers.ValidationError(
                    f"Account is temporarily locked. Try again in {seconds_remaining} seconds."
                )
        
        # Attempt authentication
        user = authenticate(username=user_obj.username, password=password)
        
        if user and user.is_active:
            # Successful login - reset failed attempts and unlock account
            if user_obj.failed_login_attempts > 0 or user_obj.locked_until:
                user_obj.failed_login_attempts = 0
                user_obj.locked_until = None
                user_obj.save()
            return user
        else:
            # Failed login - increment attempts and potentially lock account
            user_obj.failed_login_attempts += 1
            
            if user_obj.failed_login_attempts >= 3:
                # Lock account for 5 minutes (300 seconds)
                user_obj.locked_until = timezone.now() + timedelta(seconds=300)
                user_obj.save()
                raise serializers.ValidationError(
                    "Too many failed login attempts. Account locked for 5 minutes."
                )
            else:
                user_obj.save()
                attempts_remaining = 3 - user_obj.failed_login_attempts
                raise serializers.ValidationError(
                    f"Invalid credentials. {attempts_remaining} attempts remaining before account lockout."
                )
        
        raise serializers.ValidationError("Invalid credentials")
