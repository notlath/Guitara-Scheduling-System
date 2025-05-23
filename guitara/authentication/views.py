from rest_framework import generics, permissions
from rest_framework.response import Response
from knox.models import AuthToken
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
import random
from .serializers import LoginSerializer
from core.models import CustomUser
from core.serializers import UserSerializer  # Ensure this is imported
from knox.views import LoginView as KnoxLoginView

class RegisterAPI(generics.GenericAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response({
            "user": UserSerializer(user).data,
            "message": "User registered successfully."
        })

class LoginAPI(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Validate username existence
        username = request.data.get('username')
        if not username:
            return Response({"error": "Username is required"}, status=400)

        try:
            user = CustomUser.objects.get(username=username)
        except CustomUser.DoesNotExist:
            return Response({"error": "Invalid credentials"}, status=401)

        # Validate password
        if not user.check_password(request.data['password']):
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 3:
                user.locked_until = timezone.now() + timezone.timedelta(minutes=5)
            user.save()
            return Response({"error": "Invalid credentials"}, status=401)

        # Check account lock
        if user.locked_until and timezone.now() < user.locked_until:
            return Response({"error": "Account locked for 5 minutes"}, status=403)

        # Reset failed attempts
        user.failed_login_attempts = 0
        user.save()

        # Generate and send 2FA code
        if user.two_factor_enabled:
            code = str(random.randint(100000, 999999))
            user.verification_code = code
            user.save()

            send_mail(
                'Your Verification Code',
                f'Your verification code is: {code}',
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            return Response({"message": "2FA code sent"}, status=200)

        # Return token if 2FA disabled
        return Response({
            "user": UserSerializer(user).data,  # Includes role and other user details
            "token": AuthToken.objects.create(user)[1]
        })

class TwoFactorVerifyAPI(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user = CustomUser.objects.get(email=request.data['email'])

        if user.verification_code != request.data['code']:
            return Response({"error": "Invalid verification code"}, status=400)

        user.verification_code = None
        user.save()

        return Response({
            "user": UserSerializer(user).data,
            "token": AuthToken.objects.create(user)[1]
        })
