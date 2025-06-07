# core/urls.py
from django.urls import path
from . import views

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
    # Add your core app endpoints here later
    # Example:
    # path('bookings/', views.BookingList.as_view(), name='booking-list'),
]
