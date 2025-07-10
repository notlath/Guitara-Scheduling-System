from django.urls import path
from .views import (
    RegisterAPI,
    LoginAPI,
    LogoutAPI,
    CheckUsernameAPI,
    TwoFactorVerifyAPI,
    RequestPasswordResetAPI,
    VerifyPasswordResetCodeAPI,
    SetNewPasswordAPI,
    VerifyEmailAPI,
    ResendVerificationCodeAPI,
    user_profile,
    change_password,
)

urlpatterns = [
    path("register/", RegisterAPI.as_view(), name="register"),
    path("login/", LoginAPI.as_view(), name="login"),
    path("logout/", LogoutAPI.as_view(), name="logout"),
    path("check-username/", CheckUsernameAPI.as_view(), name="check-username"),
    path("two-factor-verify/", TwoFactorVerifyAPI.as_view(), name="two-factor-verify"),
    path(
        "request-password-reset/",
        RequestPasswordResetAPI.as_view(),
        name="request-password-reset",
    ),
    path(
        "verify-password-reset-code/",
        VerifyPasswordResetCodeAPI.as_view(),
        name="verify-password-reset-code",
    ),
    path("set-new-password/", SetNewPasswordAPI.as_view(), name="set-new-password"),
    path("verify-email/", VerifyEmailAPI.as_view(), name="verify-email"),
    path(
        "resend-verification/",
        ResendVerificationCodeAPI.as_view(),
        name="resend-verification",
    ),
    path("profile/", user_profile, name="user-profile"),
    path("change-password/", change_password, name="change-password"),
]
