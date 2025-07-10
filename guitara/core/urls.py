# core/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'system-logs', views.SystemLogViewSet, basename='systemlog')

urlpatterns = [
    path("register/", views.RegisterAPI.as_view(), name="register"),
    path(
        "toggle-account-status/<int:user_id>/",
        views.toggle_account_status,
        name="toggle-account-status",
    ),
    path(
        "check-account-status/", views.check_account_status, name="check-account-status"
    ),
    path("test-no-auth/", views.test_no_auth, name="test-no-auth"),
    # Include the router URLs
    path('', include(router.urls)),
]
