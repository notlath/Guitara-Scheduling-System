from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from .health_check import health_check, simple_health

router = DefaultRouter()
router.register(r"clients", views.ClientViewSet, basename="client")
router.register(r"availabilities", views.AvailabilityViewSet, basename="availability")
router.register(r"appointments", views.AppointmentViewSet, basename="appointment")
router.register(r"notifications", views.NotificationViewSet, basename="notification")
router.register(r"staff", views.StaffViewSet, basename="staff")
router.register(r"services", views.ServiceViewSet, basename="service")

urlpatterns = [
    path("", include(router.urls)),
    # Additional health check endpoints for debugging
    path("health/", health_check, name="scheduling_health_check"),
    path("ping/", simple_health, name="simple_health_check"),
]
