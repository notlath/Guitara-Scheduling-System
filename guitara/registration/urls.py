# urls.py
from django.urls import path
from .views import (
    RegisterTherapist,
    RegisterDriver,
    RegisterOperator,
    RegisterClient,
    RegisterMaterial,
    RegisterService,
    CompleteRegistrationAPIView,
    check_email_exists,
    ProfilePhotoUploadView,
    UserProfileView,
    UserProfileUpdateView,
)

urlpatterns = [
    path("register/therapist/", RegisterTherapist.as_view(), name="register_therapist"),
    path("register/driver/", RegisterDriver.as_view(), name="register_driver"),
    path("register/operator/", RegisterOperator.as_view(), name="register_operator"),
    path("register/client/", RegisterClient.as_view(), name="register_client"),
    path("register/material/", RegisterMaterial.as_view(), name="register_material"),
    path("register/service/", RegisterService.as_view(), name="register_service"),
    path(
        "complete-registration/",
        CompleteRegistrationAPIView.as_view(),
        name="complete_registration",
    ),
    path("check-email/", check_email_exists, name="check_email"),
    path(
        "profile/photo/", ProfilePhotoUploadView.as_view(), name="profile_photo_upload"
    ),
    path("profile/", UserProfileView.as_view(), name="user_profile"),
    path(
        "profile/update/", UserProfileUpdateView.as_view(), name="user_profile_update"
    ),
]
