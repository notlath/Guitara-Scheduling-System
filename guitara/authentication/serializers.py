from rest_framework import serializers
from django.contrib.auth import authenticate
from django.utils import timezone
from datetime import timedelta
from core.models import CustomUser


class RegisterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ["username", "email", "password", "role", "phone_number"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        user = CustomUser.objects.create_user(**validated_data)
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, data):
        username_or_email = data.get("username")
        password = data.get("password")

        # Find user by username or email
        user_obj = None
        try:
            user_obj = CustomUser.objects.get(username=username_or_email)
        except CustomUser.DoesNotExist:
            try:
                user_obj = CustomUser.objects.get(email=username_or_email)
            except CustomUser.DoesNotExist:
                raise serializers.ValidationError("Invalid credentials")

        # Check if account is locked
        current_time = timezone.now()
        if user_obj.locked_until and current_time < user_obj.locked_until:
            time_remaining = user_obj.locked_until - current_time
            minutes_remaining = int(time_remaining.total_seconds() / 60)
            raise serializers.ValidationError(
                f"Account is temporarily locked. Try again in {minutes_remaining} minutes."
            )

        # If lock period has expired, reset the lockout
        if user_obj.locked_until and current_time >= user_obj.locked_until:
            user_obj.failed_login_attempts = 0
            user_obj.locked_until = None
            user_obj.save()

        # Attempt authentication
        user = authenticate(username=user_obj.username, password=password)

        if not user:
            # Increment failed login attempts
            user_obj.failed_login_attempts += 1

            # Check if we need to lock the account
            if user_obj.failed_login_attempts >= 3:
                user_obj.locked_until = current_time + timedelta(
                    seconds=300
                )  # 5 minutes
                user_obj.save()
                raise serializers.ValidationError(
                    "Too many failed login attempts. Account locked for 5 minutes."
                )
            else:
                user_obj.save()
                attempts_remaining = 3 - user_obj.failed_login_attempts
                raise serializers.ValidationError(
                    f"Invalid credentials. {attempts_remaining} attempts remaining before lockout."
                )

        if user and user.is_active:
            # Reset failed login attempts on successful login
            if user.failed_login_attempts > 0:
                user.failed_login_attempts = 0
                user.locked_until = None
                user.save()
            return user

        raise serializers.ValidationError("Invalid credentials")
