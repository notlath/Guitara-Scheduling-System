from django.urls import path
from .views import (
    RegisterAPI, 
    LoginAPI, 
    LogoutAPI,
    PasswordResetRequestAPI,
    PasswordResetConfirmAPI,
    TwoFactorAuthAPI
)

urlpatterns = [
    # # Operator-only endpoints
    # path('register/', RegisterAPI.as_view(), name='register'),  # Only operators can create accounts
    
    # # General auth endpoints
    # path('login/', LoginAPI.as_view(), name='login'),
    # path('logout/', LogoutAPI.as_view(), name='logout'),
    
    # # Password management
    # path('password-reset/', PasswordResetRequestAPI.as_view(), name='password-reset'),
    # path('password-reset/confirm/', PasswordResetConfirmAPI.as_view(), name='password-reset-confirm'),
    
    # # 2FA (Optional)
    # path('2fa/', TwoFactorAuthAPI.as_view(), name='2fa-verification'),
]