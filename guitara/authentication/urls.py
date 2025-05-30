from django.urls import path
from .views import RegisterAPI, LoginAPI, CheckUsernameAPI

urlpatterns = [
    path('register/', RegisterAPI.as_view(), name='register'),
    path('login/', LoginAPI.as_view(), name='login'),
    path('check-username/', CheckUsernameAPI.as_view(), name='check-username'),
]