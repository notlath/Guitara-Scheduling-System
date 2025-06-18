from rest_framework import generics, permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from knox.models import AuthToken
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
import random
from .serializers import LoginSerializer
from core.models import CustomUser
from core.serializers import UserSerializer  # Ensure this is imported
from knox.views import LoginView as KnoxLoginView
from .models import TwoFactorCode, PasswordResetCode
from datetime import timedelta
from registration.views import insert_into_table  # Use direct import for sibling app
import logging
import django.conf


class CheckUsernameAPI(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        username = request.query_params.get("username", "")
        if not username:
            return Response({"error": "Username parameter is required"}, status=400)

        # Check if username exists
        exists = CustomUser.objects.filter(username=username).exists()
        return Response({"available": not exists})


class RegisterAPI(generics.GenericAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "user": UserSerializer(user).data,
                "message": "User registered successfully.",
            }
        )


class LoginAPI(generics.GenericAPIView):
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        logger = logging.getLogger(__name__)
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = (
                serializer.validated_data
            )  # This is the authenticated user (by username or email)
            logger.debug(
                f"[LOGIN] Authenticated user: {user} (username={user.username}, email={user.email})"
            )

            if not user.is_active:
                account_type = getattr(user, "role", "account").lower()
                error_messages = {
                    "therapist": "Your therapist account is currently disabled. Please contact your supervisor for assistance.",
                    "driver": "Your driver account is currently disabled. Please contact your supervisor for assistance.",
                    "operator": "Your operator account is currently disabled. Please contact the administrator for assistance.",
                }
                error_msg = error_messages.get(
                    account_type,
                    "Your account has been disabled. Please contact support for assistance.",
                )
                return Response(
                    {
                        "error": error_msg,
                        "error_code": f"{account_type.upper()}_DISABLED",
                    },
                    status=403,
                )

            # Reset failed login attempts on successful login
            user.failed_login_attempts = 0
            user.save()

            # Generate and send 2FA code using TwoFactorCode model
            if user.two_factor_enabled:
                code = str(random.randint(100000, 999999))
                expires_at = timezone.now() + timedelta(minutes=10)
                # Save code using Django ORM instead of Supabase
                TwoFactorCode.objects.create(
                    user=user,
                    code=code,
                    created_at=timezone.now(),
                    expires_at=expires_at,
                    is_used=False,
                )
                print(
                    f"EMAIL_BACKEND: {django.conf.settings.EMAIL_BACKEND} | Sending code {code} to {user.email}"
                )
                send_mail(
                    "Your Verification Code",
                    f"Your verification code is: {code}",
                    settings.DEFAULT_FROM_EMAIL,
                    [user.email],
                    fail_silently=False,
                )
                return Response({"message": "2FA code sent"}, status=200)

            return Response(
                {
                    "user": UserSerializer(user).data,
                    "token": AuthToken.objects.create(user)[1],
                }
            )
        except serializers.ValidationError as ve:
            logger.warning(f"[LOGIN] Validation error: {ve}")
            return Response({"error": "Invalid credentials"}, status=401)
        except Exception as exc:
            logger.exception(f"LoginAPI 500 error: {exc}")
            return Response({"error": f"Internal server error: {exc}"}, status=500)


class TwoFactorVerifyAPI(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        logging.getLogger(__name__).debug("[2FA VERIFY] Incoming data: %s", {k: ('***' if k in ['code', 'password', 'new_password'] else v) for k, v in request.data.items()})
        identifier = request.data.get("email")  # Could be email or username
        code = request.data.get("code")
        user = None
        # Try to get user by email first, then by username
        try:
            user = CustomUser.objects.get(email=identifier)
        except CustomUser.DoesNotExist:
            try:
                user = CustomUser.objects.get(username=identifier)
            except CustomUser.DoesNotExist:
                # Debug print removed to avoid leaking identifiers
                return Response({"error": "Invalid user"}, status=400)

        # Print all codes for this user for debugging
        # WARNING: The following line exposes sensitive codes and should be disabled in production!
        # all_codes = list(TwoFactorCode.objects.filter(user=user).order_by("-created_at").values())
        # print(f"[2FA VERIFY] All codes for user {user.id}:", all_codes)

        # Get the latest unused, unexpired code
        tf_code = (
            TwoFactorCode.objects.filter(
                user=user, code=code, is_used=False, expires_at__gt=timezone.now()
            )
            .order_by("-created_at")
            .first()
        )
            logging.getLogger(__name__).warning("[2FA VERIFY] Invalid or expired verification code attempt.")
            return Response(
                {"error": "Invalid or expired verification code"}, status=400
            )
            )

        tf_code.is_used = True
        tf_code.save()

        return Response(
            {
                "user": UserSerializer(user).data,
                "token": AuthToken.objects.create(user)[1],
            }
        )


class RequestPasswordResetAPI(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        print(f"[DEBUG] Password reset requested for email: {email}")
        if not email:
            print("[DEBUG] No email provided.")
            return Response({"error": "Email is required"}, status=400)
        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            print("[DEBUG] User with this email does not exist.")
            return Response(
                {"error": "User with this email does not exist"}, status=400
            )
        try:
            code = str(random.randint(100000, 999999))
            expires_at = timezone.now() + timedelta(minutes=10)
            PasswordResetCode.objects.create(
                user=user, code=code, expires_at=expires_at
            )
            # Also insert into Supabase for centralized code management
            supabase_data = {
                "user_id": user.id,
                "code": code,
                "created_at": timezone.now().isoformat(),
                "expires_at": expires_at.isoformat(),
                "is_used": False,
            }
            try:
                insert_into_table("authentication_passwordresetcode", supabase_data)
            except Exception as e:
                print(f"[ERROR] Supabase insert failed: {e}")
            logging.getLogger(__name__).debug(f"Password reset code generated: {code}")
            send_mail(
                "Your Password Reset Code",
                f"Your password reset code is: {code}",
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
            print(f"[DEBUG] Password reset email sent to: {user.email}")
            return Response({"message": "Password reset code sent"}, status=200)
        except Exception as e:
            print(f"[ERROR] Exception in password reset: {e}")
            return Response({"error": f"Internal server error: {e}"}, status=500)


class VerifyPasswordResetCodeAPI(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        code = request.data.get("code")
        if not email or not code:
            return Response({"error": "Email and code are required"}, status=400)
        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            return Response({"error": "Invalid user"}, status=400)
        reset_code = (
            PasswordResetCode.objects.filter(
                user=user, code=code, is_used=False, expires_at__gt=timezone.now()
            )
            .order_by("-created_at")
            .first()
        )
        if not reset_code:
            return Response({"error": "Invalid or expired code"}, status=400)
        return Response({"message": "Code verified"}, status=200)


class SetNewPasswordAPI(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        code = request.data.get("code")
        new_password = request.data.get("new_password")
        print(
            f"[DEBUG] SetNewPasswordAPI called for email: {email}, code: {code}, new_password: {new_password}"
        )
        if not email or not code or not new_password:
            print("[DEBUG] Missing required fields.")
            return Response(
                {"error": "Email, code, and new password are required"}, status=400
            )
        try:
            user = CustomUser.objects.get(email=email)
        except CustomUser.DoesNotExist:
            print("[DEBUG] Invalid user.")
            return Response({"error": "Invalid user"}, status=400)
        reset_code = (
            PasswordResetCode.objects.filter(
                user=user, code=code, is_used=False, expires_at__gt=timezone.now()
            )
            .order_by("-created_at")
            .first()
        )
        if not reset_code:
            print("[DEBUG] Invalid or expired code.")
            return Response({"error": "Invalid or expired code"}, status=400)
        # Prevent using the same password
        if user.check_password(new_password):
            print("[DEBUG] New password matches the old password.")
            return Response(
                {"error": "New password must be different from the old password."},
                status=400,
            )
        user.set_password(new_password)
        user.save()
        print(
            f"[DEBUG] Password updated for user: {user.username} | email: {user.email} | password hash: {user.password}"
        )
        reset_code.is_used = True
        reset_code.save()
        return Response({"message": "Password reset successful"}, status=200)


@api_view(["GET", "PUT"])
@permission_classes([permissions.IsAuthenticated])
def user_profile(request):
    """
    Get or update user profile information
    """
    if request.method == "GET":
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    elif request.method == "PUT":
        # Only allow updating specific fields
        allowed_fields = ["first_name", "last_name", "email", "phone_number"]
        update_data = {
            key: value for key, value in request.data.items() if key in allowed_fields
        }

        # Check if email is being changed to an existing email
        if "email" in update_data and update_data["email"] != request.user.email:
            if (
                CustomUser.objects.filter(email=update_data["email"])
                .exclude(id=request.user.id)
                .exists()
            ):
                return Response(
                    {"error": "A user with this email already exists."}, status=400
                )

        # Update user fields
        for field, value in update_data.items():
            setattr(request.user, field, value)

        try:
            request.user.save()
            serializer = UserSerializer(request.user)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"error": f"Failed to update profile: {str(e)}"}, status=500
            )


@api_view(["PUT"])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    """
    Change user password
    """
    current_password = request.data.get("current_password")
    new_password = request.data.get("new_password")

    if not current_password or not new_password:
        return Response(
            {"error": "Both current password and new password are required."},
            status=400,
        )

    # Verify current password
    if not request.user.check_password(current_password):
        return Response({"error": "Current password is incorrect."}, status=400)

    # Validate new password length
    if len(new_password) < 8:
        return Response(
            {"error": "New password must be at least 8 characters long."}, status=400
        )

    # Ensure new password is different from current
    if request.user.check_password(new_password):
        return Response(
            {"error": "New password must be different from current password."},
            status=400,
        )

    try:
        request.user.set_password(new_password)
        request.user.save()
        return Response({"message": "Password changed successfully."})
    except Exception as e:
        return Response({"error": f"Failed to change password: {str(e)}"}, status=500)
