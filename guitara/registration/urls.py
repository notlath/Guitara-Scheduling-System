# urls.py
from django.urls import path
from .views import RegisterTherapist, RegisterDriver, RegisterOperator, RegisterMaterial, RegisterService

urlpatterns = [
    path('register/therapist/', RegisterTherapist.as_view(), name='register_therapist'),
    path('register/driver/', RegisterDriver.as_view(), name='register_driver'),
    path('register/operator/', RegisterOperator.as_view(), name='register_operator'),
    path('register/material/', RegisterMaterial.as_view(), name='register_material'),
    path('register/service/', RegisterService.as_view(), name='register_service'),
]