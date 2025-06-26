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
                raise serializers.ValidationError(
                    {
                        "error": "Incorrect username or password.",
                        "code": "INVALID_LOGIN",
                    }
                )

        # Check if account is locked
        current_time = timezone.now()
        if user_obj.locked_until and current_time < user_obj.locked_until:
            time_remaining = user_obj.locked_until - current_time
            minutes_remaining = int(time_remaining.total_seconds() / 60)
            raise serializers.ValidationError(
                {
                    "error": f"Your account has been temporarily locked due to multiple failed login attempts. Please wait 5 minutes before trying again.",
                    "code": "ACCOUNT_LOCKED",
                    "minutes_remaining": minutes_remaining,
                }
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
                # Use fresh timestamp to ensure accuracy
                current_timestamp = timezone.now()
                lock_time = current_timestamp + timedelta(seconds=300)  # 5 minutes
                user_obj.locked_until = lock_time
                user_obj.save()
                raise serializers.ValidationError(
                    {
                        "error": "Your account has been temporarily locked due to multiple failed login attempts. Please wait 5 minutes before trying again.",
                        "code": "ACCOUNT_LOCKED",
                    }
                )
            else:
                user_obj.save()
                attempts_remaining = 3 - user_obj.failed_login_attempts
                raise serializers.ValidationError(
                    {
                        "error": f"Incorrect username or password. {attempts_remaining} attempts remaining before lockout.",
                        "code": "INVALID_LOGIN",
                        "attempts_remaining": attempts_remaining,
                    }
                )

        if user and user.is_active:
            # Reset failed login attempts on successful login
            if user.failed_login_attempts > 0:
                user.failed_login_attempts = 0
                user.locked_until = None
                user.save()
            return user

        raise serializers.ValidationError(
            {
                "error": "Your account has been disabled. Please see your system administrator.",
                "code": "ACCOUNT_DISABLED",
            }
        )
