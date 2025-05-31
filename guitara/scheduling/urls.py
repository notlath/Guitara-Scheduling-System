from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'clients', views.ClientViewSet, basename='client')
router.register(r'availabilities', views.AvailabilityViewSet, basename='availability')
router.register(r'appointments', views.AppointmentViewSet, basename='appointment')
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'staff', views.StaffViewSet, basename='staff')
router.register(r'services', views.ServiceViewSet, basename='service')

urlpatterns = [
    path('', include(router.urls)),
]
