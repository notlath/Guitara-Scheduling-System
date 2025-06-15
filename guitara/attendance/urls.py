from django.urls import path
from . import views

urlpatterns = [
    # Check-in/Check-out endpoints
    path("check-in/", views.check_in, name="attendance_check_in"),
    path("check-out/", views.check_out, name="attendance_check_out"),
    path("today-status/", views.today_status, name="attendance_today_status"),
    # Operator endpoints
    path("records/", views.attendance_records, name="attendance_records"),
    path(
        "approve/<int:attendance_id>/",
        views.approve_attendance,
        name="approve_attendance",
    ),
    path("summary/", views.attendance_summary, name="attendance_summary"),
    path("mark-absent/", views.mark_absent, name="mark_absent"),
]
