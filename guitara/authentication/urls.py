from django.urls import path
from .views import RegisterAPI, LoginAPI, LogoutAPI, PasswordResetRequestAPI, PasswordResetConfirmAPI, TwoFactorAuthAPI

urlpatterns = [
    path('register/', RegisterAPI.as_view(), name='register'),
    path('login/', LoginAPI.as_view(), name='login'),
]