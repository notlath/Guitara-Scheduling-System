from django.urls import path
from .views import RegisterTherapistAPI, RegisterDriverAPI, RegisterOperatorAPI, RegisterServiceAPI, RegisterMaterialAPI

urlpatterns = [
    path('register/therapist/', RegisterTherapistAPI.as_view(), name='register-therapist'),
    path('register/driver/', RegisterDriverAPI.as_view(), name='register-driver'),
    path('register/operator/', RegisterOperatorAPI.as_view(), name='register-operator'),
    path('register/service/', RegisterServiceAPI.as_view(), name='register-service'),
    path('register/material/', RegisterMaterialAPI.as_view(), name='register-material'),
]
