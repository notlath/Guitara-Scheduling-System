from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import AttendanceRecord, AttendanceSummary
from .serializers import (
    AttendanceRecordSerializer,
    AttendanceCheckInSerializer,
    AttendanceCheckOutSerializer,
    TodayAttendanceStatusSerializer,
    AttendanceSummarySerializer,
)

User = get_user_model()


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def check_in(request):
    """
    Check in the current user for attendance.
    """
    user = request.user
    today = timezone.now().date()
    # Get current time in the configured timezone
    current_datetime = timezone.now()
    current_time = timezone.localtime(current_datetime).time()

    # Debug logging
    print(f"DEBUG - Check-in - Current datetime (UTC): {current_datetime}")
    print(f"DEBUG - Check-in - Current time (local): {current_time}")
    print(
        f"DEBUG - Check-in - Current time formatted: {current_time.strftime('%H:%M:%S')}"
    )

    # Check if user already has an attendance record for today
    attendance_record, created = AttendanceRecord.objects.get_or_create(
        staff_member=user,
        date=today,
        defaults={
            "check_in_time": current_time,
            "is_checked_in": True,
            "status": "pending_approval",
        },
    )

    if not created:
        if attendance_record.check_in_time:
            return Response(
                {
                    "error": "You have already checked in today",
                    "check_in_time": attendance_record.check_in_time,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        else:
            # Update existing record with check-in time
            attendance_record.check_in_time = current_time
            attendance_record.is_checked_in = True
            attendance_record.save()

    # Determine status based on check-in time
    cutoff_time = (
        timezone.now().replace(hour=13, minute=15, second=0, microsecond=0).time()
    )
    if current_time <= cutoff_time:
        attendance_status = "present"
        message = "Checked in successfully - Present"
    else:
        attendance_status = "late"
        message = "Checked in successfully - Late"

    attendance_record.status = attendance_status
    attendance_record.save()

    # Debug logging
    print(f"DEBUG - Check-in - Saved check_in_time: {attendance_record.check_in_time}")

    serializer = TodayAttendanceStatusSerializer(attendance_record)
    response_data = serializer.data
    response_data["message"] = message

    # Debug logging
    print(
        f"DEBUG - Check-in - Serialized check_in_time: {response_data.get('check_in_time')}"
    )

    return Response(response_data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def check_out(request):
    """
    Check out the current user for attendance.
    """
    user = request.user
    today = timezone.now().date()
    # Get current time in the configured timezone
    current_datetime = timezone.now()
    current_time = timezone.localtime(current_datetime).time()

    # Debug logging
    print(f"DEBUG - Current datetime (UTC): {current_datetime}")
    print(f"DEBUG - Current time (local): {current_time}")
    print(f"DEBUG - Current time formatted: {current_time.strftime('%H:%M:%S')}")

    try:
        attendance_record = AttendanceRecord.objects.get(staff_member=user, date=today)
    except AttendanceRecord.DoesNotExist:
        return Response(
            {"error": "No check-in record found for today. Please check in first."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not attendance_record.check_in_time:
        return Response(
            {"error": "You must check in before checking out."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if attendance_record.check_out_time:
        return Response(
            {
                "error": "You have already checked out today",
                "check_out_time": attendance_record.check_out_time,
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    attendance_record.check_out_time = current_time
    attendance_record.is_checked_in = False
    attendance_record.save()  # This will automatically calculate hours_worked

    # Debug logging
    print(f"DEBUG - Saved check_out_time: {attendance_record.check_out_time}")

    serializer = TodayAttendanceStatusSerializer(attendance_record)
    response_data = serializer.data
    response_data["message"] = "Checked out successfully"

    # Debug logging
    print(f"DEBUG - Serialized check_out_time: {response_data.get('check_out_time')}")

    return Response(response_data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def today_status(request):
    """
    Get the current user's attendance status for today.
    """
    user = request.user
    today = timezone.now().date()

    try:
        attendance_record = AttendanceRecord.objects.get(staff_member=user, date=today)
        serializer = TodayAttendanceStatusSerializer(attendance_record)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except AttendanceRecord.DoesNotExist:
        return Response(
            {
                "id": None,
                "date": today,
                "check_in_time": None,
                "check_out_time": None,
                "status": None,
                "is_checked_in": False,
                "approved_at": None,
                "hours_worked": None,
                "notes": "",
            },
            status=status.HTTP_200_OK,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def attendance_records(request):
    """
    Get attendance records. Operators can see all records, staff can see their own.
    """
    user = request.user
    is_operator = user.role == "operator"

    # Get query parameters
    date_filter = request.GET.get("date")
    staff_id = request.GET.get("staff_id")

    # Base queryset - operators see all, staff see only their own
    if is_operator:
        queryset = AttendanceRecord.objects.select_related("staff_member").all()
    else:
        # Non-operators can only see their own records
        queryset = AttendanceRecord.objects.select_related("staff_member").filter(
            staff_member=user
        )

    # Apply filters
    if date_filter:
        try:
            filter_date = timezone.datetime.strptime(date_filter, "%Y-%m-%d").date()
            queryset = queryset.filter(date=filter_date)
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )
    else:
        # Default to today's records
        today = timezone.now().date()
        queryset = queryset.filter(date=today)

    # Only operators can filter by specific staff_id
    if staff_id and is_operator:
        queryset = queryset.filter(staff_member__id=staff_id)

    # Debug logging
    print(f"DEBUG - attendance_records - Query count: {queryset.count()}")
    for record in queryset[:3]:  # Log first 3 records
        print(
            f"DEBUG - Record ID: {record.id}, Staff: {record.staff_member.get_full_name()}, Role: {record.staff_member.role}"
        )

    serializer = AttendanceRecordSerializer(queryset, many=True)

    # Debug serialized data
    print(
        f"DEBUG - Serialized data sample: {serializer.data[:1] if serializer.data else 'No data'}"
    )

    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def approve_attendance(request, attendance_id):
    """
    Approve an attendance record. Only operators can approve.
    """
    user = request.user
    is_operator = user.role == "operator"

    if not is_operator:
        return Response(
            {"error": "Permission denied. Only operators can approve attendance."},
            status=status.HTTP_403_FORBIDDEN,
        )

    try:
        attendance_record = AttendanceRecord.objects.get(id=attendance_id)
    except AttendanceRecord.DoesNotExist:
        return Response(
            {"error": "Attendance record not found."}, status=status.HTTP_404_NOT_FOUND
        )

    if attendance_record.approved_at:
        return Response(
            {"error": "This attendance record has already been approved."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    attendance_record.approved_at = timezone.now()
    attendance_record.approved_by = user
    attendance_record.save()

    serializer = AttendanceRecordSerializer(attendance_record)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def attendance_summary(request):
    """
    Generate attendance summary for a specific date.
    Operators see full summary, staff see limited summary.
    """
    user = request.user
    is_operator = user.role == "operator"

    date_param = request.GET.get("date")
    if date_param:
        try:
            summary_date = timezone.datetime.strptime(date_param, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )
    else:
        summary_date = timezone.now().date()

    if is_operator:
        # Operators get full summary
        # Get or create summary for the date
        summary, created = AttendanceSummary.objects.get_or_create(
            date=summary_date,
            defaults={
                "total_staff": 0,
                "present_count": 0,
                "late_count": 0,
                "absent_count": 0,
                "pending_approval_count": 0,
            },
        )

        # Calculate current stats
        records = AttendanceRecord.objects.filter(date=summary_date)
        staff_count = User.objects.filter(role__in=["therapist", "driver"]).count()

        summary.total_staff = staff_count
        summary.present_count = records.filter(status="present").count()
        summary.late_count = records.filter(status="late").count()
        summary.absent_count = records.filter(status="absent").count()
        summary.pending_approval_count = records.filter(
            status="pending_approval"
        ).count()

        # Calculate absent count (staff without any record)
        staff_with_records = records.values_list("staff_member_id", flat=True)
        all_staff = User.objects.filter(role__in=["therapist", "driver"]).values_list(
            "id", flat=True
        )
        absent_staff_count = len(set(all_staff) - set(staff_with_records))
        summary.absent_count = absent_staff_count

        summary.save()

        serializer = AttendanceSummarySerializer(summary)
        return Response(serializer.data, status=status.HTTP_200_OK)
    else:
        # Non-operators get limited summary (just basic stats)
        # They only see aggregate numbers, not detailed breakdowns
        records = AttendanceRecord.objects.filter(date=summary_date)
        staff_count = User.objects.filter(role__in=["therapist", "driver"]).count()

        summary_data = {
            "date": summary_date,
            "total_staff": staff_count,
            "present_count": records.filter(status="present").count(),
            "late_count": records.filter(status="late").count(),
            "absent_count": records.filter(status="absent").count(),
            "pending_approval_count": records.filter(status="pending_approval").count(),
        }

        return Response(summary_data, status=status.HTTP_200_OK)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_absent(request):
    """
    Mark staff as absent (automated process for staff who didn't check in by deadline).
    """
    user = request.user
    is_operator = user.role == "operator"

    if not is_operator:
        return Response(
            {"error": "Permission denied. Only operators can mark staff as absent."},
            status=status.HTTP_403_FORBIDDEN,
        )

    staff_id = request.data.get("staff_id")
    date_str = request.data.get("date")

    if not staff_id or not date_str:
        return Response(
            {"error": "Both staff_id and date are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        staff_member = User.objects.get(id=staff_id)
        absent_date = timezone.datetime.strptime(date_str, "%Y-%m-%d").date()
    except (User.DoesNotExist, ValueError):
        return Response(
            {"error": "Invalid staff_id or date format."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Create or update attendance record as absent
    attendance_record, created = AttendanceRecord.objects.get_or_create(
        staff_member=staff_member,
        date=absent_date,
        defaults={
            "status": "absent",
            "approved_at": timezone.now(),
            "approved_by": user,
            "notes": "Automatically marked as absent - no check-in by deadline",
        },
    )

    if not created and not attendance_record.check_in_time:
        attendance_record.status = "absent"
        attendance_record.approved_at = timezone.now()
        attendance_record.approved_by = user
        attendance_record.notes = (
            "Automatically marked as absent - no check-in by deadline"
        )
        attendance_record.save()

    serializer = AttendanceRecordSerializer(attendance_record)
    return Response(serializer.data, status=status.HTTP_200_OK)
