# urls.py
from django.urls import path
from .views import RegisterTherapist, RegisterDriver, RegisterOperator, RegisterMaterial, RegisterService, CompleteRegistrationAPIView, check_email_exists

urlpatterns = [
    path('register/therapist/', RegisterTherapist.as_view(), name='register_therapist'),
    path('register/driver/', RegisterDriver.as_view(), name='register_driver'),
    path('register/operator/', RegisterOperator.as_view(), name='register_operator'),
    path('register/material/', RegisterMaterial.as_view(), name='register_material'),
    path('register/service/', RegisterService.as_view(), name='register_service'),
    path('complete-registration/', CompleteRegistrationAPIView.as_view(), name='complete_registration'),
    path('check-email/', check_email_exists, name='check_email'),
]