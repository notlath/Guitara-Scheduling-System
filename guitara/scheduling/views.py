from rest_framework import viewsets, permissions, filters, status, serializers
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import (
    DjangoFilterBackend,
    FilterSet,
    DateFilter,
    TimeFilter,
    CharFilter,
)
from .models import Client, Availability, Appointment, Notification
from registration.models import Driver

try:
    from registration.models import Service
except ImportError:
    # Create a fallback Service class if import fails
    import logging

    logger = logging.getLogger(__name__)
    logger.warning("Could not import Service model, using mock class")
    from django.db import models

    class Service:
        """Mock Service class for fallback when the real model can't be imported"""

        objects = type("MockManager", (), {"all": lambda: []})()

        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

        class Meta:
            app_label = "registration"


from .serializers import (
    ClientSerializer,
    AvailabilitySerializer,
    AppointmentSerializer,
    NotificationSerializer,
    UserSerializer,
    ServiceSerializer,
)
from core.permissions import IsOperator
from core.models import CustomUser
from django.db.models import Q, F
from datetime import datetime, timedelta, date
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


class ClientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing client information
    """

    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["first_name", "last_name", "phone_number"]
    search_fields = ["first_name", "last_name", "phone_number", "email", "address"]


class AvailabilityFilter(FilterSet):
    date_after = DateFilter(field_name="date", lookup_expr="gte")
    date_before = DateFilter(field_name="date", lookup_expr="lte")

    class Meta:
        model = Availability
        fields = {
            "user": ["exact"],
            "date": ["exact"],
            "is_available": ["exact"],
        }


class AvailabilityViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing therapist and driver availability
    """

    serializer_class = AvailabilitySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_class = AvailabilityFilter

    def get_queryset(self):
        user = self.request.user
        # Operators can see all availabilities
        if user.role == "operator":
            return Availability.objects.all()
        # Therapists and drivers can only see their own availability
        return Availability.objects.filter(user=user)

    @action(detail=False, methods=["get"])
    def available_therapists(self, request):
        """Get all available therapists for a given date and time range"""
        date_str = request.query_params.get("date")
        start_time_str = request.query_params.get("start_time")
        end_time_str = request.query_params.get("end_time")
        specialization = request.query_params.get("specialization")
        massage_pressure = request.query_params.get("massage_pressure")

        if not all([date_str, start_time_str, end_time_str]):
            return Response(
                {"error": "Date, start time and end time are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
            start_time = datetime.strptime(start_time_str, "%H:%M").time()
            end_time = datetime.strptime(end_time_str, "%H:%M").time()
        except ValueError:
            return Response(
                {
                    "error": "Invalid date or time format. Use YYYY-MM-DD for date and HH:MM for time"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )  # Start with therapists who have availability at this time
        available_therapists_query = (
            CustomUser.objects.filter(
                role="therapist",
                availabilities__date=date_obj,
                availabilities__start_time__lte=start_time,
                availabilities__end_time__gte=end_time,
                availabilities__is_available=True,
            )
            .select_related()
            .prefetch_related("availabilities")
            .distinct()
        )

        # Filter by specialization if provided
        if specialization:
            available_therapists_query = available_therapists_query.filter(
                specialization__icontains=specialization
            )

        # Filter by massage pressure if provided
        if massage_pressure:
            available_therapists_query = available_therapists_query.filter(
                massage_pressure__icontains=massage_pressure
            )

        # Exclude therapists who have conflicting appointments
        conflicting_therapists = (
            CustomUser.objects.filter(
                therapist_appointments__date=date_obj,
                therapist_appointments__status__in=[
                    "pending",
                    "confirmed",
                    "in_progress",
                ],
            )
            .filter(
                Q(therapist_appointments__start_time__lte=end_time)
                & Q(therapist_appointments__end_time__gte=start_time)
            )
            .distinct()
        )

        available_therapists = available_therapists_query.exclude(
            pk__in=conflicting_therapists
        )

        # Build custom response with availability data
        therapists_data = []
        for therapist in available_therapists:
            # Get the specific availability for this date
            availability = therapist.availabilities.filter(date=date_obj).first()

            therapist_data = {
                "id": therapist.id,
                "first_name": therapist.first_name,
                "last_name": therapist.last_name,
                "email": therapist.email,
                "role": therapist.role,
                "specialization": getattr(therapist, "specialization", ""),
                "massage_pressure": getattr(therapist, "massage_pressure", ""),
                # Add availability data
                "start_time": (
                    availability.start_time.strftime("%H:%M") if availability else None
                ),
                "end_time": (
                    availability.end_time.strftime("%H:%M") if availability else None
                ),
                "is_available": availability.is_available if availability else False,
                "availability_date": (
                    availability.date.strftime("%Y-%m-%d") if availability else None
                ),
            }
            therapists_data.append(therapist_data)

        return Response(therapists_data)

    @action(detail=False, methods=["get"])
    def available_drivers(self, request):
        """Get all available drivers for a given date and time range"""
        date_str = request.query_params.get("date")
        start_time_str = request.query_params.get("start_time")
        end_time_str = request.query_params.get("end_time")

        if not all([date_str, start_time_str, end_time_str]):
            return Response(
                {"error": "Date, start time and end time are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
            start_time = datetime.strptime(start_time_str, "%H:%M").time()
            end_time = datetime.strptime(end_time_str, "%H:%M").time()
        except ValueError:
            return Response(
                {
                    "error": "Invalid date or time format. Use YYYY-MM-DD for date and HH:MM for time"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )  # Start with drivers who have availability at this time
        available_drivers_query = (
            CustomUser.objects.filter(
                role="driver",
                availabilities__date=date_obj,
                availabilities__start_time__lte=start_time,
                availabilities__end_time__gte=end_time,
                availabilities__is_available=True,
            )
            .select_related()
            .prefetch_related("availabilities")
            .distinct()
        )

        # Exclude drivers who have conflicting appointments
        conflicting_drivers = (
            CustomUser.objects.filter(
                driver_appointments__date=date_obj,
                driver_appointments__status__in=["pending", "confirmed", "in_progress"],
            )
            .filter(
                Q(driver_appointments__start_time__lte=end_time)
                & Q(driver_appointments__end_time__gte=start_time)
            )
            .distinct()
        )

        available_drivers = available_drivers_query.exclude(pk__in=conflicting_drivers)

        # Build custom response with availability data
        drivers_data = []
        for driver in available_drivers:
            # Get the specific availability for this date
            availability = driver.availabilities.filter(date=date_obj).first()

            driver_data = {
                "id": driver.id,
                "first_name": driver.first_name,
                "last_name": driver.last_name,
                "email": driver.email,
                "role": driver.role,
                "motorcycle_plate": getattr(driver, "motorcycle_plate", ""),
                # Add availability data
                "start_time": (
                    availability.start_time.strftime("%H:%M") if availability else None
                ),
                "end_time": (
                    availability.end_time.strftime("%H:%M") if availability else None
                ),
                "is_available": availability.is_available if availability else False,
                "availability_date": (
                    availability.date.strftime("%Y-%m-%d") if availability else None
                ),
            }
            drivers_data.append(driver_data)

        return Response(drivers_data)

    @action(detail=False, methods=["post"])
    def bulk_create(self, request):
        """Create multiple availability slots at once"""
        if not request.user.is_authenticated:
            return Response(status=status.HTTP_401_UNAUTHORIZED)

        user_id = request.data.get("user_id", request.user.id)
        if request.user.role == "operator" or str(request.user.id) == str(user_id):
            date_str = request.data.get("date")
            slots = request.data.get("slots", [])

            if not date_str or not slots:
                return Response(
                    {"error": "Date and slots are required"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                return Response(
                    {"error": "Invalid date format. Use YYYY-MM-DD"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = CustomUser.objects.get(id=user_id)
            if user.role not in ["therapist", "driver"]:
                return Response(
                    {
                        "error": "Only therapists and drivers can have availability slots"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            created_slots = []
            errors = []

            for slot in slots:
                try:
                    start_time_str = slot.get("start_time")
                    end_time_str = slot.get("end_time")
                    is_available = slot.get("is_available", True)

                    start_time = datetime.strptime(start_time_str, "%H:%M").time()
                    end_time = datetime.strptime(end_time_str, "%H:%M").time()

                    if start_time >= end_time:
                        errors.append(
                            f"Start time {start_time} must be before end time {end_time}"
                        )
                        continue

                    # Check for overlapping slots
                    overlapping = Availability.objects.filter(
                        user=user, date=date_obj, is_available=is_available
                    )

                    has_overlap = False
                    for existing_slot in overlapping:
                        if (
                            start_time <= existing_slot.end_time
                            and end_time >= existing_slot.start_time
                        ):
                            errors.append(
                                f"Time slot {start_time}-{end_time} overlaps with existing slot"
                            )
                            has_overlap = True
                            break

                    if has_overlap:
                        continue

                    # Create the availability slot
                    availability = Availability.objects.create(
                        user=user,
                        date=date_obj,
                        start_time=start_time,
                        end_time=end_time,
                        is_available=is_available,
                    )

                    created_slots.append(availability)

                except ValueError as e:
                    errors.append(f"Invalid time format in slot: {e}")
                except Exception as e:
                    errors.append(f"Error creating slot: {e}")

            # Serialize created slots
            serializer = self.get_serializer(created_slots, many=True)

            response_data = {"created_slots": serializer.data, "errors": errors}

            return Response(
                response_data,
                status=(
                    status.HTTP_201_CREATED
                    if created_slots
                    else status.HTTP_400_BAD_REQUEST
                ),
            )
        else:
            return Response(
                {"error": "You can only manage your own availability"},
                status=status.HTTP_403_FORBIDDEN,
            )

    def perform_create(self, serializer):
        """
        Override perform_create to add validation for disabled accounts
        """
        user = self.request.user

        # Get the target user for availability creation
        target_user = serializer.validated_data.get("user")

        # If no user specified in data, use the requesting user
        if not target_user:
            target_user = user
            serializer.validated_data["user"] = user

        # Check if target user account is disabled
        if not target_user.is_active:
            from rest_framework.exceptions import ValidationError

            raise ValidationError(
                f"Cannot create availability for {target_user.first_name} {target_user.last_name}. "
                "This staff account is currently disabled. Please contact an administrator to reactivate the account."
            )

        # Check if requesting user has permission to create availability for target user
        if user.role == "operator":
            # Operators can create availability for anyone (if account is active)
            pass
        elif target_user != user:
            # Non-operators can only create availability for themselves
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("You can only manage your own availability")

        # Proceed with creation
        serializer.save()


class AppointmentFilter(FilterSet):
    date_after = DateFilter(field_name="date", lookup_expr="gte")
    date_before = DateFilter(field_name="date", lookup_expr="lte")
    start_time_after = TimeFilter(field_name="start_time", lookup_expr="gte")
    start_time_before = TimeFilter(field_name="start_time", lookup_expr="lte")
    client_name = CharFilter(method="filter_client_name")

    def filter_client_name(self, queryset, name, value):
        return queryset.filter(
            Q(client__first_name__icontains=value)
            | Q(client__last_name__icontains=value)
        )

    class Meta:
        model = Appointment
        fields = {
            "status": ["exact", "in"],
            "payment_status": ["exact", "in"],
            "therapist": ["exact"],
            "driver": ["exact"],
            "operator": ["exact"],
            "date": ["exact"],
        }


class AppointmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing appointments/bookings
    """

    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_class = AppointmentFilter
    search_fields = [
        "client__first_name",
        "client__last_name",
        "client__phone_number",
        "location",
    ]

    def get_queryset(self):
        user = self.request.user

        # Operators can see all appointments
        if user.role == "operator":
            return Appointment.objects.all()

        # Therapists can see their own appointments (both single and multi-therapist)
        elif user.role == "therapist":
            from django.db.models import Q

            return Appointment.objects.filter(
                Q(therapist=user) | Q(therapists=user)
            ).distinct()

        # Drivers can see their own appointments
        elif user.role == "driver":
            return Appointment.objects.filter(driver=user)

        # Other roles can't see any appointments
        return Appointment.objects.none()

    def perform_create(self, serializer):
        # Ensure only operators can create appointments
        if self.request.user.role != "operator":
            raise permissions.PermissionDenied("Only operators can create appointments")

        # Extract therapists data from request if present
        therapists_data = self.request.data.get(
            "therapists", []
        )  # Set the operator to the current user and save the appointment
        appointment = serializer.save(operator=self.request.user)

        # Handle multiple therapists if provided
        if therapists_data:
            appointment.therapists.set(therapists_data)
            appointment.save()

    def perform_update(self, serializer):
        # Ensure only operators can update appointments or staff can update specific fields
        user = self.request.user
        instance = self.get_object()

        if user.role == "operator":
            # Operators can update any field
            serializer.save()
        elif user.role == "therapist" and (
            instance.therapist == user or user in instance.therapists.all()
        ):
            # Therapists can update status and related fields
            allowed_fields = [
                "status",
                "pickup_requested",
                "pickup_request_time",
                "pickup_urgency",
                "session_end_time",
            ]
            update_data = {
                field: self.request.data[field]
                for field in allowed_fields
                if field in self.request.data
            }
            if update_data:
                for field, value in update_data.items():
                    setattr(instance, field, value)
                instance.save(update_fields=list(update_data.keys()))
            else:
                raise serializers.ValidationError("No valid fields provided for update")
        elif user.role == "driver" and instance.driver == user:
            # Drivers can update status and driver-related fields
            allowed_fields = [
                "status",
                "driver_available_for_next",
                "drop_off_location",
                "drop_off_timestamp",
                "pickup_started_at",
                "all_therapists_picked_up_at",
                "estimated_pickup_time",
                "pickup_driver",
                "assignment_type",
            ]
            update_data = {
                field: self.request.data[field]
                for field in allowed_fields
                if field in self.request.data
            }
            if update_data:
                for field, value in update_data.items():
                    setattr(instance, field, value)
                instance.save(update_fields=list(update_data.keys()))
            else:
                raise serializers.ValidationError("No valid fields provided for update")
        else:
            raise permissions.PermissionDenied(
                "You don't have permission to update this appointment"
            )

    @action(detail=False, methods=["get"])
    def today(self, request):
        """Get all appointments for today"""
        today = date.today()
        appointments = self.filter_queryset(self.get_queryset().filter(date=today))
        serializer = self.get_serializer(appointments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def upcoming(self, request):
        """Get all upcoming appointments for the next 7 days"""
        today = date.today()
        week_later = today + timedelta(days=7)

        appointments = self.filter_queryset(
            self.get_queryset().filter(
                date__gte=today,
                date__lte=week_later,
                status__in=["pending", "confirmed"],
            )
        )

        serializer = self.get_serializer(appointments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel an appointment"""
        appointment = self.get_object()

        # Only operators, the assigned therapist, or driver can cancel appointments
        user = request.user
        if (
            user.role != "operator"
            and user != appointment.therapist
            and user != appointment.driver
        ):
            return Response(
                {"error": "You don't have permission to cancel this appointment"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Update appointment status
        appointment.status = "cancelled"
        appointment.save()

        # Create notifications for all involved parties
        self._create_notifications(
            appointment,
            "appointment_cancelled",
            f"Appointment for {appointment.client} on {appointment.date} at {appointment.start_time} has been cancelled.",
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Mark an appointment as completed"""
        appointment = self.get_object()

        # Only the assigned therapist, driver or operators can complete appointments
        user = request.user
        if (
            user.role != "operator"
            and user != appointment.therapist
            and user != appointment.driver
        ):
            return Response(
                {"error": "You don't have permission to complete this appointment"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Update appointment status
        appointment.status = "completed"
        appointment.save()  # Create notifications for all involved parties
        self._create_notifications(
            appointment,
            "appointment_updated",
            f"Appointment for {appointment.client} on {appointment.date} at {appointment.start_time} has been completed.",
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        """Therapist or Driver accepts a pending appointment"""
        appointment = self.get_object()

        # Only the assigned therapist or driver can accept
        if request.user != appointment.therapist and request.user != appointment.driver:
            return Response(
                {"error": "You can only accept your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "pending":
            return Response(
                {"error": "Only pending appointments can be accepted"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Determine who is accepting
        is_therapist = request.user == appointment.therapist
        is_driver = request.user == appointment.driver  # Update acceptance status
        if is_therapist:
            appointment.therapist_accepted = True
            appointment.therapist_accepted_at = timezone.now()
            accepter_role = "Therapist"
        elif is_driver:
            appointment.driver_accepted = True
            appointment.driver_accepted_at = timezone.now()
            accepter_role = "Driver"

        # Save the appointment first to persist the acceptance
        appointment.save()

        # Check if both parties have now accepted - ONLY change status if BOTH have accepted
        both_accepted = appointment.both_parties_accepted()

        if both_accepted:
            # Both parties have accepted - change status to confirmed
            appointment.status = "confirmed"
            appointment.save()

            # Create notification that appointment is fully confirmed
            self._create_notifications(
                appointment,
                "appointment_confirmed",
                f"Appointment for {appointment.client} on {appointment.date} is now confirmed. Both therapist and driver have accepted.",
            )

            message_type = "appointment_confirmed"
            message_text = f"Appointment fully confirmed - both parties accepted"
        else:
            # Only partial acceptance - appointment remains pending
            pending_parties = appointment.get_pending_acceptances()
            pending_text = ", ".join(pending_parties)

            self._create_notifications(
                appointment,
                "appointment_partial_acceptance",
                f"{accepter_role} {request.user.get_full_name()} has accepted the appointment for {appointment.client} on {appointment.date}. Still waiting for: {pending_text}",
            )

            message_type = "appointment_partial_acceptance"
            message_text = f"{accepter_role} accepted - waiting for {pending_text}"

        appointment.save()

        # Send WebSocket notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": message_type,
                    "appointment_id": appointment.id,
                    "accepted_by_id": request.user.id,
                    "accepted_by_role": accepter_role,
                    "therapist_id": (
                        appointment.therapist.id if appointment.therapist else None
                    ),
                    "driver_id": appointment.driver.id if appointment.driver else None,
                    "operator_id": (
                        appointment.operator.id if appointment.operator else None
                    ),
                    "message": message_text,
                    "both_accepted": appointment.both_parties_accepted(),
                },
            },
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Therapist starts an appointment"""
        appointment = self.get_object()

        # Only the assigned therapist can start
        if request.user != appointment.therapist:
            return Response(
                {"error": "You can only start your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "confirmed":
            return Response(
                {"error": "Only confirmed appointments can be started"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Additional check: ensure both parties have actually accepted
        if not appointment.both_parties_accepted():
            pending_parties = appointment.get_pending_acceptances()
            pending_text = ", ".join(pending_parties)
            return Response(
                {
                    "error": f"Cannot start appointment. Still waiting for acceptance from: {pending_text}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "in_progress"
        appointment.save()  # Create notifications
        self._create_notifications(
            appointment,
            "appointment_started",
            f"Appointment for {appointment.client} has been started by {appointment.therapist.get_full_name()}.",
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Therapist or Driver rejects an appointment with a reason"""
        appointment = self.get_object()

        # Only the assigned therapist or driver can reject
        if request.user != appointment.therapist and request.user != appointment.driver:
            return Response(
                {"error": "You can only reject your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "pending":
            return Response(
                {"error": "Only pending appointments can be rejected"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rejection_reason = request.data.get("rejection_reason")

        if not rejection_reason or not rejection_reason.strip():
            return Response(
                {"error": "Rejection reason is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create rejection record
        from .models import AppointmentRejection

        rejection = AppointmentRejection.objects.create(
            appointment=appointment,
            rejection_reason=rejection_reason.strip(),
            rejected_by=request.user,
        )  # Update appointment status and reset acceptance flags
        appointment.status = "rejected"
        appointment.rejection_reason = rejection_reason.strip()
        appointment.rejected_by = request.user
        appointment.rejected_at = timezone.now()

        # Reset acceptance status since someone rejected
        appointment.therapist_accepted = False
        appointment.therapist_accepted_at = None
        appointment.driver_accepted = False
        appointment.driver_accepted_at = None

        appointment.save()  # Create notification for operator
        if appointment.operator:
            # Determine the role of the user who rejected
            rejecter_role = (
                "Therapist" if request.user == appointment.therapist else "Driver"
            )
            notification_message = f"{rejecter_role} {request.user.get_full_name()} has rejected the appointment for {appointment.client} on {appointment.date}. Reason: {rejection_reason}"

            Notification.objects.create(
                user=appointment.operator,
                appointment=appointment,
                rejection=rejection,
                notification_type="appointment_rejected",
                message=notification_message,
            )  # Send WebSocket notification
        channel_layer = get_channel_layer()
        rejecter_role = (
            "Therapist" if request.user == appointment.therapist else "Driver"
        )
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": "appointment_rejected",
                    "appointment_id": appointment.id,
                    "rejection_id": rejection.id,
                    "rejected_by_id": request.user.id,
                    "rejected_by_role": rejecter_role,
                    "therapist_id": (
                        appointment.therapist.id if appointment.therapist else None
                    ),
                    "driver_id": appointment.driver.id if appointment.driver else None,
                    "operator_id": (
                        appointment.operator.id if appointment.operator else None
                    ),
                    "message": f"Appointment rejected by {rejecter_role} {request.user.get_full_name()}",
                },
            },
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def review_rejection(self, request, pk=None):
        """Operator reviews a rejection - can accept or deny the reason"""
        appointment = self.get_object()
        # Only operators can review rejections
        if request.user.role != "operator":
            return Response(
                {"error": "Only operators can review rejections"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "rejected":
            return Response(
                {"error": "Only rejected appointments can be reviewed"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response_action = request.data.get("action")  # 'accept' or 'deny'
        response_reason = request.data.get("reason", "")

        if response_action not in ["accept", "deny"]:
            return Response(
                {"error": "Action must be 'accept' or 'deny'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            rejection = appointment.rejection_details
            if not rejection:
                return Response(
                    {"error": "No rejection details found for this appointment"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except AppointmentRejection.DoesNotExist:
            return Response(
                {"error": "No rejection details found for this appointment"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update rejection record
        rejection.operator_response = (
            "accepted" if response_action == "accept" else "denied"
        )
        rejection.operator_response_reason = response_reason
        rejection.reviewed_by = request.user
        rejection.reviewed_at = timezone.now()
        rejection.save()

        if response_action == "accept":
            # Delete the appointment if operator accepts the rejection reason
            appointment_client = appointment.client
            appointment_date = appointment.date
            appointment_time = appointment.start_time
            therapist = appointment.therapist

            # Create notification for therapist
            if therapist:
                Notification.objects.create(
                    user=therapist,
                    appointment=appointment,
                    rejection=rejection,
                    notification_type="rejection_reviewed",
                    message=f"Operator has accepted your rejection reason. The appointment for {appointment_client} on {appointment_date} has been cancelled.",
                )

            # Delete the appointment
            appointment.delete()

            return Response(
                {
                    "message": "Rejection accepted. Appointment has been deleted.",
                    "action": "deleted",
                }
            )
        else:
            # If operator denies the rejection, push the appointment through
            appointment.status = "confirmed"
            appointment.save()

            # Create notification for therapist
            if appointment.therapist:
                Notification.objects.create(
                    user=appointment.therapist,
                    appointment=appointment,
                    rejection=rejection,
                    notification_type="rejection_reviewed",
                    message=f"Operator has denied your rejection reason. The appointment for {appointment.client} on {appointment.date} is confirmed and must proceed.",
                )

            # Send WebSocket notification
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "appointments",
                {
                    "type": "appointment_message",
                    "message": {
                        "type": "rejection_denied",
                        "appointment_id": appointment.id,
                        "therapist_id": (
                            appointment.therapist.id if appointment.therapist else None
                        ),
                        "message": f"Appointment rejection denied - appointment confirmed",
                    },
                },
            )

            serializer = self.get_serializer(appointment)
            return Response(
                {
                    "message": "Rejection denied. Appointment has been confirmed.",
                    "action": "confirmed",
                    "appointment": serializer.data,
                }
            )

    @action(detail=False, methods=["post"])
    def auto_cancel_overdue(self, request):
        """Auto-cancel appointments that are overdue (30+ minutes without response)"""
        # Only operators can trigger this action
        if request.user.role != "operator":
            return Response(
                {"error": "Only operators can auto-cancel overdue appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Find overdue pending appointments
        overdue_appointments = Appointment.objects.filter(
            status="pending", response_deadline__lt=timezone.now()
        )

        cancelled_count = 0
        disabled_therapists = []

        for appointment in overdue_appointments:
            # Auto-cancel the appointment
            appointment.status = "auto_cancelled"
            appointment.auto_cancelled_at = timezone.now()
            appointment.save()

            # Disable the therapist (set is_active to False)
            if appointment.therapist and appointment.therapist.is_active:
                appointment.therapist.is_active = False
                appointment.therapist.save()
                disabled_therapists.append(appointment.therapist)

                # Create notification for therapist
                Notification.objects.create(
                    user=appointment.therapist,
                    appointment=appointment,
                    notification_type="therapist_disabled",
                    message=f"Your account has been disabled due to not responding to appointment for {appointment.client} within 30 minutes. Please contact administration.",
                )

            # Create notification for operator
            if appointment.operator:
                Notification.objects.create(
                    user=appointment.operator,
                    appointment=appointment,
                    notification_type="appointment_auto_cancelled",
                    message=f"Appointment for {appointment.client} on {appointment.date} was auto-cancelled due to no response from therapist {appointment.therapist.get_full_name() if appointment.therapist else 'Unknown'}.",
                )

            cancelled_count += 1

        return Response(
            {
                "message": f"Auto-cancelled {cancelled_count} overdue appointments",
                "cancelled_count": cancelled_count,
                "disabled_therapists": [t.get_full_name() for t in disabled_therapists],
            }
        )

    def _create_notifications(self, appointment, notification_type, message):
        """Helper method to create notifications for all involved parties"""
        # Create notification for therapist
        if appointment.therapist:
            Notification.objects.create(
                user=appointment.therapist,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )

        # Create notification for driver
        if appointment.driver:
            Notification.objects.create(
                user=appointment.driver,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )

        # Create notification for operator
        if appointment.operator:
            Notification.objects.create(
                user=appointment.operator,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )

        # Send WebSocket notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": notification_type,
                    "appointment_id": appointment.id,
                    "message": message,
                },
            },
        )

    @action(detail=True, methods=["post"])
    def therapist_confirm(self, request, pk=None):
        """Therapist confirms the appointment (enhanced workflow)"""
        appointment = self.get_object()

        # Only the assigned therapist can confirm
        if request.user != appointment.therapist:
            return Response(
                {"error": "You can only confirm your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not appointment.can_therapist_confirm():
            return Response(
                {"error": "Appointment cannot be confirmed by therapist at this time"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "therapist_confirm"
        appointment.therapist_confirmed_at = timezone.now()
        
        # For group appointments, check if all therapists have confirmed
        if appointment.group_size > 1:
            appointment.update_group_confirmation_status()
            if appointment.group_confirmation_complete:
                # All therapists confirmed, ready for driver confirmation
                self._create_notifications(
                    appointment,
                    "group_confirmation_complete",
                    f"All therapists have confirmed the group appointment for {appointment.client} on {appointment.date}. Waiting for driver confirmation.",
                )
        
        appointment.save()

        self._create_notifications(
            appointment,
            "therapist_confirmed",
            f"Therapist {request.user.get_full_name()} confirmed appointment for {appointment.client} on {appointment.date}.",
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def driver_confirm(self, request, pk=None):
        """Driver confirms the appointment (enhanced workflow)"""
        appointment = self.get_object()

        # Only the assigned driver can confirm
        if request.user != appointment.driver:
            return Response(
                {"error": "You can only confirm your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not appointment.can_driver_confirm():
            return Response(
                {"error": "Driver cannot confirm this appointment yet. Waiting for therapist confirmation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "driver_confirm"
        appointment.driver_confirmed_at = timezone.now()
        appointment.save()

        self._create_notifications(
            appointment,
            "driver_confirmed",
            f"Driver {request.user.get_full_name()} confirmed appointment for {appointment.client} on {appointment.date}. Ready to start journey.",
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Therapist starts an appointment"""
        appointment = self.get_object()

        # Only the assigned therapist can start
        if request.user != appointment.therapist:
            return Response(
                {"error": "You can only start your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "confirmed":
            return Response(
                {"error": "Only confirmed appointments can be started"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Additional check: ensure both parties have actually accepted
        if not appointment.both_parties_accepted():
            pending_parties = appointment.get_pending_acceptances()
            pending_text = ", ".join(pending_parties)
            return Response(
                {
                    "error": f"Cannot start appointment. Still waiting for acceptance from: {pending_text}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "in_progress"
        appointment.save()  # Create notifications
        self._create_notifications(
            appointment,
            "appointment_started",
            f"Appointment for {appointment.client} has been started by {appointment.therapist.get_full_name()}.",
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Therapist or Driver rejects an appointment with a reason"""
        appointment = self.get_object()

        # Only the assigned therapist or driver can reject
        if request.user != appointment.therapist and request.user != appointment.driver:
            return Response(
                {"error": "You can only reject your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "pending":
            return Response(
                {"error": "Only pending appointments can be rejected"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rejection_reason = request.data.get("rejection_reason")

        if not rejection_reason or not rejection_reason.strip():
            return Response(
                {"error": "Rejection reason is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create rejection record
        from .models import AppointmentRejection

        rejection = AppointmentRejection.objects.create(
            appointment=appointment,
            rejection_reason=rejection_reason.strip(),
            rejected_by=request.user,
        )  # Update appointment status and reset acceptance flags
        appointment.status = "rejected"
        appointment.rejection_reason = rejection_reason.strip()
        appointment.rejected_by = request.user
        appointment.rejected_at = timezone.now()

        # Reset acceptance status since someone rejected
        appointment.therapist_accepted = False
        appointment.therapist_accepted_at = None
        appointment.driver_accepted = False
        appointment.driver_accepted_at = None

        appointment.save()  # Create notification for operator
        if appointment.operator:
            # Determine the role of the user who rejected
            rejecter_role = (
                "Therapist" if request.user == appointment.therapist else "Driver"
            )
            notification_message = f"{rejecter_role} {request.user.get_full_name()} has rejected the appointment for {appointment.client} on {appointment.date}. Reason: {rejection_reason}"

            Notification.objects.create(
                user=appointment.operator,
                appointment=appointment,
                rejection=rejection,
                notification_type="appointment_rejected",
                message=notification_message,
            )  # Send WebSocket notification
        channel_layer = get_channel_layer()
        rejecter_role = (
            "Therapist" if request.user == appointment.therapist else "Driver"
        )
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": "appointment_rejected",
                    "appointment_id": appointment.id,
                    "rejection_id": rejection.id,
                    "rejected_by_id": request.user.id,
                    "rejected_by_role": rejecter_role,
                    "therapist_id": (
                        appointment.therapist.id if appointment.therapist else None
                    ),
                    "driver_id": appointment.driver.id if appointment.driver else None,
                    "operator_id": (
                        appointment.operator.id if appointment.operator else None
                    ),
                    "message": f"Appointment rejected by {rejecter_role} {request.user.get_full_name()}",
                },
            },
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def review_rejection(self, request, pk=None):
        """Operator reviews a rejection - can accept or deny the reason"""
        appointment = self.get_object()
        # Only operators can review rejections
        if request.user.role != "operator":
            return Response(
                {"error": "Only operators can review rejections"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "rejected":
            return Response(
                {"error": "Only rejected appointments can be reviewed"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response_action = request.data.get("action")  # 'accept' or 'deny'
        response_reason = request.data.get("reason", "")

        if response_action not in ["accept", "deny"]:
            return Response(
                {"error": "Action must be 'accept' or 'deny'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            rejection = appointment.rejection_details
            if not rejection:
                return Response(
                    {"error": "No rejection details found for this appointment"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except AppointmentRejection.DoesNotExist:
            return Response(
                {"error": "No rejection details found for this appointment"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update rejection record
        rejection.operator_response = (
            "accepted" if response_action == "accept" else "denied"
        )
        rejection.operator_response_reason = response_reason
        rejection.reviewed_by = request.user
        rejection.reviewed_at = timezone.now()
        rejection.save()

        if response_action == "accept":
            # Delete the appointment if operator accepts the rejection reason
            appointment_client = appointment.client
            appointment_date = appointment.date
            appointment_time = appointment.start_time
            therapist = appointment.therapist

            # Create notification for therapist
            if therapist:
                Notification.objects.create(
                    user=therapist,
                    appointment=appointment,
                    rejection=rejection,
                    notification_type="rejection_reviewed",
                    message=f"Operator has accepted your rejection reason. The appointment for {appointment_client} on {appointment_date} has been cancelled.",
                )

            # Delete the appointment
            appointment.delete()

            return Response(
                {
                    "message": "Rejection accepted. Appointment has been deleted.",
                    "action": "deleted",
                }
            )
        else:
            # If operator denies the rejection, push the appointment through
            appointment.status = "confirmed"
            appointment.save()

            # Create notification for therapist
            if appointment.therapist:
                Notification.objects.create(
                    user=appointment.therapist,
                    appointment=appointment,
                    rejection=rejection,
                    notification_type="rejection_reviewed",
                    message=f"Operator has denied your rejection reason. The appointment for {appointment.client} on {appointment.date} is confirmed and must proceed.",
                )

            # Send WebSocket notification
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "appointments",
                {
                    "type": "appointment_message",
                    "message": {
                        "type": "rejection_denied",
                        "appointment_id": appointment.id,
                        "therapist_id": (
                            appointment.therapist.id if appointment.therapist else None
                        ),
                        "message": f"Appointment rejection denied - appointment confirmed",
                    },
                },
            )

            serializer = self.get_serializer(appointment)
            return Response(
                {
                    "message": "Rejection denied. Appointment has been confirmed.",
                    "action": "confirmed",
                    "appointment": serializer.data,
                }
            )

    @action(detail=False, methods=["post"])
    def auto_cancel_overdue(self, request):
        """Auto-cancel appointments that are overdue (30+ minutes without response)"""
        # Only operators can trigger this action
        if request.user.role != "operator":
            return Response(
                {"error": "Only operators can auto-cancel overdue appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Find overdue pending appointments
        overdue_appointments = Appointment.objects.filter(
            status="pending", response_deadline__lt=timezone.now()
        )

        cancelled_count = 0
        disabled_therapists = []

        for appointment in overdue_appointments:
            # Auto-cancel the appointment
            appointment.status = "auto_cancelled"
            appointment.auto_cancelled_at = timezone.now()
            appointment.save()

            # Disable the therapist (set is_active to False)
            if appointment.therapist and appointment.therapist.is_active:
                appointment.therapist.is_active = False
                appointment.therapist.save()
                disabled_therapists.append(appointment.therapist)

                # Create notification for therapist
                Notification.objects.create(
                    user=appointment.therapist,
                    appointment=appointment,
                    notification_type="therapist_disabled",
                    message=f"Your account has been disabled due to not responding to appointment for {appointment.client} within 30 minutes. Please contact administration.",
                )

            # Create notification for operator
            if appointment.operator:
                Notification.objects.create(
                    user=appointment.operator,
                    appointment=appointment,
                    notification_type="appointment_auto_cancelled",
                    message=f"Appointment for {appointment.client} on {appointment.date} was auto-cancelled due to no response from therapist {appointment.therapist.get_full_name() if appointment.therapist else 'Unknown'}.",
                )

            cancelled_count += 1

        return Response(
            {
                "message": f"Auto-cancelled {cancelled_count} overdue appointments",
                "cancelled_count": cancelled_count,
                "disabled_therapists": [t.get_full_name() for t in disabled_therapists],
            }
        )

    def _create_notifications(self, appointment, notification_type, message):
        """Helper method to create notifications for all involved parties"""
        # Create notification for therapist
        if appointment.therapist:
            Notification.objects.create(
                user=appointment.therapist,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )

        # Create notification for driver
        if appointment.driver:
            Notification.objects.create(
                user=appointment.driver,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )

        # Create notification for operator
        if appointment.operator:
            Notification.objects.create(
                user=appointment.operator,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )

        # Send WebSocket notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": notification_type,
                    "appointment_id": appointment.id,
                    "message": message,
                },
            },
        )

    @action(detail=True, methods=["post"])
    def therapist_confirm(self, request, pk=None):
        """Therapist confirms the appointment (enhanced workflow)"""
        appointment = self.get_object()

        # Only the assigned therapist can confirm
        if request.user != appointment.therapist:
            return Response(
                {"error": "You can only confirm your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not appointment.can_therapist_confirm():
            return Response(
                {"error": "Appointment cannot be confirmed by therapist at this time"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "therapist_confirm"
        appointment.therapist_confirmed_at = timezone.now()
        
        # For group appointments, check if all therapists have confirmed
        if appointment.group_size > 1:
            appointment.update_group_confirmation_status()
            if appointment.group_confirmation_complete:
                # All therapists confirmed, ready for driver confirmation
                self._create_notifications(
                    appointment,
                    "group_confirmation_complete",
                    f"All therapists have confirmed the group appointment for {appointment.client} on {appointment.date}. Waiting for driver confirmation.",
                )
        
        appointment.save()

        self._create_notifications(
            appointment,
            "therapist_confirmed",
            f"Therapist {request.user.get_full_name()} confirmed appointment for {appointment.client} on {appointment.date}.",
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def driver_confirm(self, request, pk=None):
        """Driver confirms the appointment (enhanced workflow)"""
        appointment = self.get_object()

        # Only the assigned driver can confirm
        if request.user != appointment.driver:
            return Response(
                {"error": "You can only confirm your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not appointment.can_driver_confirm():
            return Response(
                {"error": "Driver cannot confirm this appointment yet. Waiting for therapist confirmation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "driver_confirm"
        appointment.driver_confirmed_at = timezone.now()
        appointment.save()

        self._create_notifications(
            appointment,
            "driver_confirmed",
            f"Driver {request.user.get_full_name()} confirmed appointment for {appointment.client} on {appointment.date}. Ready to start journey.",
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Therapist starts an appointment"""
        appointment = self.get_object()

        # Only the assigned therapist can start
        if request.user != appointment.therapist:
            return Response(
                {"error": "You can only start your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "confirmed":
            return Response(
                {"error": "Only confirmed appointments can be started"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Additional check: ensure both parties have actually accepted
        if not appointment.both_parties_accepted():
            pending_parties = appointment.get_pending_acceptances()
            pending_text = ", ".join(pending_parties)
            return Response(
                {
                    "error": f"Cannot start appointment. Still waiting for acceptance from: {pending_text}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "in_progress"
        appointment.save()  # Create notifications
        self._create_notifications(
            appointment,
            "appointment_started",
            f"Appointment for {appointment.client} has been started by {appointment.therapist.get_full_name()}.",
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Therapist or Driver rejects an appointment with a reason"""
        appointment = self.get_object()

        # Only the assigned therapist or driver can reject
        if request.user != appointment.therapist and request.user != appointment.driver:
            return Response(
                {"error": "You can only reject your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "pending":
            return Response(
                {"error": "Only pending appointments can be rejected"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rejection_reason = request.data.get("rejection_reason")

        if not rejection_reason or not rejection_reason.strip():
            return Response(
                {"error": "Rejection reason is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create rejection record
        from .models import AppointmentRejection

        rejection = AppointmentRejection.objects.create(
            appointment=appointment,
            rejection_reason=rejection_reason.strip(),
            rejected_by=request.user,
        )  # Update appointment status and reset acceptance flags
        appointment.status = "rejected"
        appointment.rejection_reason = rejection_reason.strip()
        appointment.rejected_by = request.user
        appointment.rejected_at = timezone.now()

        # Reset acceptance status since someone rejected
        appointment.therapist_accepted = False
        appointment.therapist_accepted_at = None
        appointment.driver_accepted = False
        appointment.driver_accepted_at = None

        appointment.save()  # Create notification for operator
        if appointment.operator:
            # Determine the role of the user who rejected
            rejecter_role = (
                "Therapist" if request.user == appointment.therapist else "Driver"
            )
            notification_message = f"{rejecter_role} {request.user.get_full_name()} has rejected the appointment for {appointment.client} on {appointment.date}. Reason: {rejection_reason}"

            Notification.objects.create(
                user=appointment.operator,
                appointment=appointment,
                rejection=rejection,
                notification_type="appointment_rejected",
                message=notification_message,
            )  # Send WebSocket notification
        channel_layer = get_channel_layer()
        rejecter_role = (
            "Therapist" if request.user == appointment.therapist else "Driver"
        )
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": "appointment_rejected",
                    "appointment_id": appointment.id,
                    "rejection_id": rejection.id,
                    "rejected_by_id": request.user.id,
                    "rejected_by_role": rejecter_role,
                    "therapist_id": (
                        appointment.therapist.id if appointment.therapist else None
                    ),
                    "driver_id": appointment.driver.id if appointment.driver else None,
                    "operator_id": (
                        appointment.operator.id if appointment.operator else None
                    ),
                    "message": f"Appointment rejected by {rejecter_role} {request.user.get_full_name()}",
                },
            },
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def review_rejection(self, request, pk=None):
        """Operator reviews a rejection - can accept or deny the reason"""
        appointment = self.get_object()
        # Only operators can review rejections
        if request.user.role != "operator":
            return Response(
                {"error": "Only operators can review rejections"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "rejected":
            return Response(
                {"error": "Only rejected appointments can be reviewed"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response_action = request.data.get("action")  # 'accept' or 'deny'
        response_reason = request.data.get("reason", "")

        if response_action not in ["accept", "deny"]:
            return Response(
                {"error": "Action must be 'accept' or 'deny'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            rejection = appointment.rejection_details
            if not rejection:
                return Response(
                    {"error": "No rejection details found for this appointment"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except AppointmentRejection.DoesNotExist:
            return Response(
                {"error": "No rejection details found for this appointment"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update rejection record
        rejection.operator_response = (
            "accepted" if response_action == "accept" else "denied"
        )
        rejection.operator_response_reason = response_reason
        rejection.reviewed_by = request.user
        rejection.reviewed_at = timezone.now()
        rejection.save()

        if response_action == "accept":
            # Delete the appointment if operator accepts the rejection reason
            appointment_client = appointment.client
            appointment_date = appointment.date
            appointment_time = appointment.start_time
            therapist = appointment.therapist

            # Create notification for therapist
            if therapist:
                Notification.objects.create(
                    user=therapist,
                    appointment=appointment,
                    rejection=rejection,
                    notification_type="rejection_reviewed",
                    message=f"Operator has accepted your rejection reason. The appointment for {appointment_client} on {appointment_date} has been cancelled.",
                )

            # Delete the appointment
            appointment.delete()

            return Response(
                {
                    "message": "Rejection accepted. Appointment has been deleted.",
                    "action": "deleted",
                }
            )
        else:
            # If operator denies the rejection, push the appointment through
            appointment.status = "confirmed"
            appointment.save()

            # Create notification for therapist
            if appointment.therapist:
                Notification.objects.create(
                    user=appointment.therapist,
                    appointment=appointment,
                    rejection=rejection,
                    notification_type="rejection_reviewed",
                    message=f"Operator has denied your rejection reason. The appointment for {appointment.client} on {appointment.date} is confirmed and must proceed.",
                )

            # Send WebSocket notification
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "appointments",
                {
                    "type": "appointment_message",
                    "message": {
                        "type": "rejection_denied",
                        "appointment_id": appointment.id,
                        "therapist_id": (
                            appointment.therapist.id if appointment.therapist else None
                        ),
                        "message": f"Appointment rejection denied - appointment confirmed",
                    },
                },
            )

            serializer = self.get_serializer(appointment)
            return Response(
                {
                    "message": "Rejection denied. Appointment has been confirmed.",
                    "action": "confirmed",
                    "appointment": serializer.data,
                }
            )

    @action(detail=False, methods=["post"])
    def auto_cancel_overdue(self, request):
        """Auto-cancel appointments that are overdue (30+ minutes without response)"""
        # Only operators can trigger this action
        if request.user.role != "operator":
            return Response(
                {"error": "Only operators can auto-cancel overdue appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Find overdue pending appointments
        overdue_appointments = Appointment.objects.filter(
            status="pending", response_deadline__lt=timezone.now()
        )

        cancelled_count = 0
        disabled_therapists = []

        for appointment in overdue_appointments:
            # Auto-cancel the appointment
            appointment.status = "auto_cancelled"
            appointment.auto_cancelled_at = timezone.now()
            appointment.save()

            # Disable the therapist (set is_active to False)
            if appointment.therapist and appointment.therapist.is_active:
                appointment.therapist.is_active = False
                appointment.therapist.save()
                disabled_therapists.append(appointment.therapist)

                # Create notification for therapist
                Notification.objects.create(
                    user=appointment.therapist,
                    appointment=appointment,
                    notification_type="therapist_disabled",
                    message=f"Your account has been disabled due to not responding to appointment for {appointment.client} within 30 minutes. Please contact administration.",
                )

            # Create notification for operator
            if appointment.operator:
                Notification.objects.create(
                    user=appointment.operator,
                    appointment=appointment,
                    notification_type="appointment_auto_cancelled",
                    message=f"Appointment for {appointment.client} on {appointment.date} was auto-cancelled due to no response from therapist {appointment.therapist.get_full_name() if appointment.therapist else 'Unknown'}.",
                )

            cancelled_count += 1

        return Response(
            {
                "message": f"Auto-cancelled {cancelled_count} overdue appointments",
                "cancelled_count": cancelled_count,
                "disabled_therapists": [t.get_full_name() for t in disabled_therapists],
            }
        )

    def _create_notifications(self, appointment, notification_type, message):
        """Helper method to create notifications for all involved parties"""
        # Create notification for therapist
        if appointment.therapist:
            Notification.objects.create(
                user=appointment.therapist,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )

        # Create notification for driver
        if appointment.driver:
            Notification.objects.create(
                user=appointment.driver,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )

        # Create notification for operator
        if appointment.operator:
            Notification.objects.create(
                user=appointment.operator,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )

        # Send WebSocket notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": notification_type,
                    "appointment_id": appointment.id,
                    "message": message,
                },
            },
        )

    @action(detail=True, methods=["post"])
    def therapist_confirm(self, request, pk=None):
        """Therapist confirms the appointment (enhanced workflow)"""
        appointment = self.get_object()

        # Only the assigned therapist can confirm
        if request.user != appointment.therapist:
            return Response(
                {"error": "You can only confirm your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not appointment.can_therapist_confirm():
            return Response(
                {"error": "Appointment cannot be confirmed by therapist at this time"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "therapist_confirm"
        appointment.therapist_confirmed_at = timezone.now()
        
        # For group appointments, check if all therapists have confirmed
        if appointment.group_size > 1:
            appointment.update_group_confirmation_status()
            if appointment.group_confirmation_complete:
                # All therapists confirmed, ready for driver confirmation
                self._create_notifications(
                    appointment,
                    "group_confirmation_complete",
                    f"All therapists have confirmed the group appointment for {appointment.client} on {appointment.date}. Waiting for driver confirmation.",
                )
        
        appointment.save()

        self._create_notifications(
            appointment,
            "therapist_confirmed",
            f"Therapist {request.user.get_full_name()} confirmed appointment for {appointment.client} on {appointment.date}.",
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def driver_confirm(self, request, pk=None):
        """Driver confirms the appointment (enhanced workflow)"""
        appointment = self.get_object()

        # Only the assigned driver can confirm
        if request.user != appointment.driver:
            return Response(
                {"error": "You can only confirm your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not appointment.can_driver_confirm():
            return Response(
                {"error": "Driver cannot confirm this appointment yet. Waiting for therapist confirmation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "driver_confirm"
        appointment.driver_confirmed_at = timezone.now()
        appointment.save()

        self._create_notifications(
            appointment,
            "driver_confirmed",
            f"Driver {request.user.get_full_name()} confirmed appointment for {appointment.client} on {appointment.date}. Ready to start journey.",
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Therapist starts an appointment"""
        appointment = self.get_object()

        # Only the assigned therapist can start
        if request.user != appointment.therapist:
            return Response(
                {"error": "You can only start your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "confirmed":
            return Response(
                {"error": "Only confirmed appointments can be started"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Additional check: ensure both parties have actually accepted
        if not appointment.both_parties_accepted():
            pending_parties = appointment.get_pending_acceptances()
            pending_text = ", ".join(pending_parties)
            return Response(
                {
                    "error": f"Cannot start appointment. Still waiting for acceptance from: {pending_text}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "in_progress"
        appointment.save()  # Create notifications
        self._create_notifications(
            appointment,
            "appointment_started",
            f"Appointment for {appointment.client} has been started by {appointment.therapist.get_full_name()}.",
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Therapist or Driver rejects an appointment with a reason"""
        appointment = self.get_object()

        # Only the assigned therapist or driver can reject
        if request.user != appointment.therapist and request.user != appointment.driver:
            return Response(
                {"error": "You can only reject your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "pending":
            return Response(
                {"error": "Only pending appointments can be rejected"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rejection_reason = request.data.get("rejection_reason")

        if not rejection_reason or not rejection_reason.strip():
            return Response(
                {"error": "Rejection reason is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create rejection record
        from .models import AppointmentRejection

        rejection = AppointmentRejection.objects.create(
            appointment=appointment,
            rejection_reason=rejection_reason.strip(),
            rejected_by=request.user,
        )  # Update appointment status and reset acceptance flags
        appointment.status = "rejected"
        appointment.rejection_reason = rejection_reason.strip()
        appointment.rejected_by = request.user
        appointment.rejected_at = timezone.now()

        # Reset acceptance status since someone rejected
        appointment.therapist_accepted = False
        appointment.therapist_accepted_at = None
        appointment.driver_accepted = False
        appointment.driver_accepted_at = None

        appointment.save()  # Create notification for operator
        if appointment.operator:
            # Determine the role of the user who rejected
            rejecter_role = (
                "Therapist" if request.user == appointment.therapist else "Driver"
            )
            notification_message = f"{rejecter_role} {request.user.get_full_name()} has rejected the appointment for {appointment.client} on {appointment.date}. Reason: {rejection_reason}"

            Notification.objects.create(
                user=appointment.operator,
                appointment=appointment,
                rejection=rejection,
                notification_type="appointment_rejected",
                message=notification_message,
            )  # Send WebSocket notification
        channel_layer = get_channel_layer()
        rejecter_role = (
            "Therapist" if request.user == appointment.therapist else "Driver"
        )
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": "appointment_rejected",
                    "appointment_id": appointment.id,
                    "rejection_id": rejection.id,
                    "rejected_by_id": request.user.id,
                    "rejected_by_role": rejecter_role,
                    "therapist_id": (
                        appointment.therapist.id if appointment.therapist else None
                    ),
                    "driver_id": appointment.driver.id if appointment.driver else None,
                    "operator_id": (
                        appointment.operator.id if appointment.operator else None
                    ),
                    "message": f"Appointment rejected by {rejecter_role} {request.user.get_full_name()}",
                },
            },
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def review_rejection(self, request, pk=None):
        """Operator reviews a rejection - can accept or deny the reason"""
        appointment = self.get_object()
        # Only operators can review rejections
        if request.user.role != "operator":
            return Response(
                {"error": "Only operators can review rejections"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "rejected":
            return Response(
                {"error": "Only rejected appointments can be reviewed"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response_action = request.data.get("action")  # 'accept' or 'deny'
        response_reason = request.data.get("reason", "")

        if response_action not in ["accept", "deny"]:
            return Response(
                {"error": "Action must be 'accept' or 'deny'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            rejection = appointment.rejection_details
            if not rejection:
                return Response(
                    {"error": "No rejection details found for this appointment"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except AppointmentRejection.DoesNotExist:
            return Response(
                {"error": "No rejection details found for this appointment"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update rejection record
        rejection.operator_response = (
            "accepted" if response_action == "accept" else "denied"
        )
        rejection.operator_response_reason = response_reason
        rejection.reviewed_by = request.user
        rejection.reviewed_at = timezone.now()
        rejection.save()

        if response_action == "accept":
            # Delete the appointment if operator accepts the rejection reason
            appointment_client = appointment.client
            appointment_date = appointment.date
            appointment_time = appointment.start_time
            therapist = appointment.therapist

            # Create notification for therapist
            if therapist:
                Notification.objects.create(
                    user=therapist,
                    appointment=appointment,
                    rejection=rejection,
                    notification_type="rejection_reviewed",
                    message=f"Operator has accepted your rejection reason. The appointment for {appointment_client} on {appointment_date} has been cancelled.",
                )

            # Delete the appointment
            appointment.delete()

            return Response(
                {
                    "message": "Rejection accepted. Appointment has been deleted.",
                    "action": "deleted",
                }
            )
        else:
            # If operator denies the rejection, push the appointment through
            appointment.status = "confirmed"
            appointment.save()

            # Create notification for therapist
            if appointment.therapist:
                Notification.objects.create(
                    user=appointment.therapist,
                    appointment=appointment,
                    rejection=rejection,
                    notification_type="rejection_reviewed",
                    message=f"Operator has denied your rejection reason. The appointment for {appointment.client} on {appointment.date} is confirmed and must proceed.",
                )

            # Send WebSocket notification
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "appointments",
                {
                    "type": "appointment_message",
                    "message": {
                        "type": "rejection_denied",
                        "appointment_id": appointment.id,
                        "therapist_id": (
                            appointment.therapist.id if appointment.therapist else None
                        ),
                        "message": f"Appointment rejection denied - appointment confirmed",
                    },
                },
            )

            serializer = self.get_serializer(appointment)
            return Response(
                {
                    "message": "Rejection denied. Appointment has been confirmed.",
                    "action": "confirmed",
                    "appointment": serializer.data,
                }
            )

    @action(detail=False, methods=["post"])
    def auto_cancel_overdue(self, request):
        """Auto-cancel appointments that are overdue (30+ minutes without response)"""
        # Only operators can trigger this action
        if request.user.role != "operator":
            return Response(
                {"error": "Only operators can auto-cancel overdue appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Find overdue pending appointments
        overdue_appointments = Appointment.objects.filter(
            status="pending", response_deadline__lt=timezone.now()
        )

        cancelled_count = 0
        disabled_therapists = []

        for appointment in overdue_appointments:
            # Auto-cancel the appointment
            appointment.status = "auto_cancelled"
            appointment.auto_cancelled_at = timezone.now()
            appointment.save()

            # Disable the therapist (set is_active to False)
            if appointment.therapist and appointment.therapist.is_active:
                appointment.therapist.is_active = False
                appointment.therapist.save()
                disabled_therapists.append(appointment.therapist)

                # Create notification for therapist
                Notification.objects.create(
                    user=appointment.therapist,
                    appointment=appointment,
                    notification_type="therapist_disabled",
                    message=f"Your account has been disabled due to not responding to appointment for {appointment.client} within 30 minutes. Please contact administration.",
                )

            # Create notification for operator
            if appointment.operator:
                Notification.objects.create(
                    user=appointment.operator,
                    appointment=appointment,
                    notification_type="appointment_auto_cancelled",
                    message=f"Appointment for {appointment.client} on {appointment.date} was auto-cancelled due to no response from therapist {appointment.therapist.get_full_name() if appointment.therapist else 'Unknown'}.",
                )

            cancelled_count += 1

        return Response(
            {
                "message": f"Auto-cancelled {cancelled_count} overdue appointments",
                "cancelled_count": cancelled_count,
                "disabled_therapists": [t.get_full_name() for t in disabled_therapists],
            }
        )

    def _create_notifications(self, appointment, notification_type, message):
        """Helper method to create notifications for all involved parties"""
        # Create notification for therapist
        if appointment.therapist:
            Notification.objects.create(
                user=appointment.therapist,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )

        # Create notification for driver
        if appointment.driver:
            Notification.objects.create(
                user=appointment.driver,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )

        # Create notification for operator
        if appointment.operator:
            Notification.objects.create(
                user=appointment.operator,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )

        # Send WebSocket notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": notification_type,
                    "appointment_id": appointment.id,
                    "message": message,
                },
            },
        )

    @action(detail=True, methods=["post"])
    def therapist_confirm(self, request, pk=None):
        """Therapist confirms the appointment (enhanced workflow)"""
        appointment = self.get_object()

        # Only the assigned therapist can confirm
        if request.user != appointment.therapist:
            return Response(
                {"error": "You can only confirm your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not appointment.can_therapist_confirm():
            return Response(
                {"error": "Appointment cannot be confirmed by therapist at this time"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "therapist_confirm"
        appointment.therapist_confirmed_at = timezone.now()
        
        # For group appointments, check if all therapists have confirmed
        if appointment.group_size > 1:
            appointment.update_group_confirmation_status()
            if appointment.group_confirmation_complete:
                # All therapists confirmed, ready for driver confirmation
                self._create_notifications(
                    appointment,
                    "group_confirmation_complete",
                    f"All therapists have confirmed the group appointment for {appointment.client} on {appointment.date}. Waiting for driver confirmation.",
                )
        
        appointment.save()

        self._create_notifications(
            appointment,
            "therapist_confirmed",
            f"Therapist {request.user.get_full_name()} confirmed appointment for {appointment.client} on {appointment.date}.",
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def driver_confirm(self, request, pk=None):
        """Driver confirms the appointment (enhanced workflow)"""
        appointment = self.get_object()

        # Only the assigned driver can confirm
        if request.user != appointment.driver:
            return Response(
                {"error": "You can only confirm your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not appointment.can_driver_confirm():
            return Response(
                {"error": "Driver cannot confirm this appointment yet. Waiting for therapist confirmation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "driver_confirm"
        appointment.driver_confirmed_at = timezone.now()
        appointment.save()

        self._create_notifications(
            appointment,
            "driver_confirmed",
            f"Driver {request.user.get_full_name()} confirmed appointment for {appointment.client} on {appointment.date}. Ready to start journey.",
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Therapist starts an appointment"""
        appointment = self.get_object()

        # Only the assigned therapist can start
        if request.user != appointment.therapist:
            return Response(
                {"error": "You can only start your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "confirmed":
            return Response(
                {"error": "Only confirmed appointments can be started"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Additional check: ensure both parties have actually accepted
        if not appointment.both_parties_accepted():
            pending_parties = appointment.get_pending_acceptances()
            pending_text = ", ".join(pending_parties)
            return Response(
                {
                    "error": f"Cannot start appointment. Still waiting for acceptance from: {pending_text}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "in_progress"
        appointment.save()  # Create notifications
        self._create_notifications(
            appointment,
            "appointment_started",
            f"Appointment for {appointment.client} has been started by {appointment.therapist.get_full_name()}.",
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Therapist or Driver rejects an appointment with a reason"""
        appointment = self.get_object()

        # Only the assigned therapist or driver can reject
        if request.user != appointment.therapist and request.user != appointment.driver:
            return Response(
                {"error": "You can only reject your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "pending":
            return Response(
                {"error": "Only pending appointments can be rejected"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rejection_reason = request.data.get("rejection_reason")

        if not rejection_reason or not rejection_reason.strip():
            return Response(
                {"error": "Rejection reason is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create rejection record
        from .models import AppointmentRejection

        rejection = AppointmentRejection.objects.create(
            appointment=appointment,
            rejection_reason=rejection_reason.strip(),
            rejected_by=request.user,
        )  # Update appointment status and reset acceptance flags
        appointment.status = "rejected"
        appointment.rejection_reason = rejection_reason.strip()
        appointment.rejected_by = request.user
        appointment.rejected_at = timezone.now()

        # Reset acceptance status since someone rejected
        appointment.therapist_accepted = False
        appointment.therapist_accepted_at = None
        appointment.driver_accepted = False
        appointment.driver_accepted_at = None

        appointment.save()  # Create notification for operator
        if appointment.operator:
            # Determine the role of the user who rejected
            rejecter_role = (
                "Therapist" if request.user == appointment.therapist else "Driver"
            )
            notification_message = f"{rejecter_role} {request.user.get_full_name()} has rejected the appointment for {appointment.client} on {appointment.date}. Reason: {rejection_reason}"

            Notification.objects.create(
                user=appointment.operator,
                appointment=appointment,
                rejection=rejection,
                notification_type="appointment_rejected",
                message=notification_message,
            )  # Send WebSocket notification
        channel_layer = get_channel_layer()
        rejecter_role = (
            "Therapist" if request.user == appointment.therapist else "Driver"
        )
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": "appointment_rejected",
                    "appointment_id": appointment.id,
                    "rejection_id": rejection.id,
                    "rejected_by_id": request.user.id,
                    "rejected_by_role": rejecter_role,
                    "therapist_id": (
                        appointment.therapist.id if appointment.therapist else None
                    ),
                    "driver_id": appointment.driver.id if appointment.driver else None,
                    "operator_id": (
                        appointment.operator.id if appointment.operator else None
                    ),
                    "message": f"Appointment rejected by {rejecter_role} {request.user.get_full_name()}",
                },
            },
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def review_rejection(self, request, pk=None):
        """Operator reviews a rejection - can accept or deny the reason"""
        appointment = self.get_object()
        # Only operators can review rejections
        if request.user.role != "operator":
            return Response(
                {"error": "Only operators can review rejections"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "rejected":
            return Response(
                {"error": "Only rejected appointments can be reviewed"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response_action = request.data.get("action")  # 'accept' or 'deny'
        response_reason = request.data.get("reason", "")

        if response_action not in ["accept", "deny"]:
            return Response(
                {"error": "Action must be 'accept' or 'deny'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            rejection = appointment.rejection_details
            if not rejection:
                return Response(
                    {"error": "No rejection details found for this appointment"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except AppointmentRejection.DoesNotExist:
            return Response(
                {"error": "No rejection details found for this appointment"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update rejection record
        rejection.operator_response = (
            "accepted" if response_action == "accept" else "denied"
        )
        rejection.operator_response_reason = response_reason
        rejection.reviewed_by = request.user
        rejection.reviewed_at = timezone.now()
        rejection.save()

        if response_action == "accept":
            # Delete the appointment if operator accepts the rejection reason
            appointment_client = appointment.client
            appointment_date = appointment.date
            appointment_time = appointment.start_time
            therapist = appointment.therapist

            # Create notification for therapist
            if therapist:
                Notification.objects.create(
                    user=therapist,
                    appointment=appointment,
                    rejection=rejection,
                    notification_type="rejection_reviewed",
                    message=f"Operator has accepted your rejection reason. The appointment for {appointment_client} on {appointment_date} has been cancelled.",
                )

            # Delete the appointment
            appointment.delete()

            return Response(
                {
                    "message": "Rejection accepted. Appointment has been deleted.",
                    "action": "deleted",
                }
            )
        else:
            # If operator denies the rejection, push the appointment through
            appointment.status = "confirmed"
            appointment.save()

            # Create notification for therapist
            if appointment.therapist:
                Notification.objects.create(
                    user=appointment.therapist,
                    appointment=appointment,
                    rejection=rejection,
                    notification_type="rejection_reviewed",
                    message=f"Operator has denied your rejection reason. The appointment for {appointment.client} on {appointment.date} is confirmed and must proceed.",
                )

            # Send WebSocket notification
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "appointments",
                {
                    "type": "appointment_message",
                    "message": {
                        "type": "rejection_denied",
                        "appointment_id": appointment.id,
                        "therapist_id": (
                            appointment.therapist.id if appointment.therapist else None
                        ),
                        "message": f"Appointment rejection denied - appointment confirmed",
                    },
                },
            )

            serializer = self.get_serializer(appointment)
            return Response(
                {
                    "message": "Rejection denied. Appointment has been confirmed.",
                    "action": "confirmed",
                    "appointment": serializer.data,
                }
            )

    @action(detail=False, methods=["post"])
    def auto_cancel_overdue(self, request):
        """Auto-cancel appointments that are overdue (30+ minutes without response)"""
        # Only operators can trigger this action
        if request.user.role != "operator":
            return Response(
                {"error": "Only operators can auto-cancel overdue appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Find overdue pending appointments
        overdue_appointments = Appointment.objects.filter(
            status="pending", response_deadline__lt=timezone.now()
        )

        cancelled_count = 0
        disabled_therapists = []

        for appointment in overdue_appointments:
            # Auto-cancel the appointment
            appointment.status = "auto_cancelled"
            appointment.auto_cancelled_at = timezone.now()
            appointment.save()

            # Disable the therapist (set is_active to False)
            if appointment.therapist and appointment.therapist.is_active:
                appointment.therapist.is_active = False
                appointment.therapist.save()
                disabled_therapists.append(appointment.therapist)

                # Create notification for therapist
                Notification.objects.create(
                    user=appointment.therapist,
                    appointment=appointment,
                    notification_type="therapist_disabled",
                    message=f"Your account has been disabled due to not responding to appointment for {appointment.client} within 30 minutes. Please contact administration.",
                )

            # Create notification for operator
            if appointment.operator:
                Notification.objects.create(
                    user=appointment.operator,
                    appointment=appointment,
                    notification_type="appointment_auto_cancelled",
                    message=f"Appointment for {appointment.client} on {appointment.date} was auto-cancelled due to no response from therapist {appointment.therapist.get_full_name() if appointment.therapist else 'Unknown'}.",
                )

            cancelled_count += 1

        return Response(
            {
                "message": f"Auto-cancelled {cancelled_count} overdue appointments",
                "cancelled_count": cancelled_count,
                "disabled_therapists": [t.get_full_name() for t in disabled_therapists],
            }
        )

    def _create_notifications(self, appointment, notification_type, message):
        """Helper method to create notifications for all involved parties"""
        # Create notification for therapist
        if appointment.therapist:
            Notification.objects.create(
                user=appointment.therapist,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )

        # Create notification for driver
        if appointment.driver:
            Notification.objects.create(
                user=appointment.driver,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )

        # Create notification for operator
        if appointment.operator:
            Notification.objects.create(
                user=appointment.operator,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )

        # Send WebSocket notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": notification_type,
                    "appointment_id": appointment.id,
                    "message": message,
                },
            },
        )

    @action(detail=True, methods=["post"])
    def therapist_confirm(self, request, pk=None):
        """Therapist confirms the appointment (enhanced workflow)"""
        appointment = self.get_object()

        # Only the assigned therapist can confirm
        if request.user != appointment.therapist:
            return Response(
                {"error": "You can only confirm your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not appointment.can_therapist_confirm():
            return Response(
                {"error": "Appointment cannot be confirmed by therapist at this time"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "therapist_confirm"
        appointment.therapist_confirmed_at = timezone.now()
        
        # For group appointments, check if all therapists have confirmed
        if appointment.group_size > 1:
            appointment.update_group_confirmation_status()
            if appointment.group_confirmation_complete:
                # All therapists confirmed, ready for driver confirmation
                self._create_notifications(
                    appointment,
                    "group_confirmation_complete",
                    f"All therapists have confirmed the group appointment for {appointment.client} on {appointment.date}. Waiting for driver confirmation.",
                )
        
        appointment.save()

        self._create_notifications(
            appointment,
            "therapist_confirmed",
            f"Therapist {request.user.get_full_name()} confirmed appointment for {appointment.client} on {appointment.date}.",
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def driver_confirm(self, request, pk=None):
        """Driver confirms the appointment (enhanced workflow)"""
        appointment = self.get_object()

        # Only the assigned driver can confirm
        if request.user != appointment.driver:
            return Response(
                {"error": "You can only confirm your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not appointment.can_driver_confirm():
            return Response(
                {"error": "Driver cannot confirm this appointment yet. Waiting for therapist confirmation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "driver_confirm"
        appointment.driver_confirmed_at = timezone.now()
        appointment.save()

        self._create_notifications(
            appointment,
            "driver_confirmed",
            f"Driver {request.user.get_full_name()} confirmed appointment for {appointment.client} on {appointment.date}. Ready to start journey.",
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Therapist starts an appointment"""
        appointment = self.get_object()

        # Only the assigned therapist can start
        if request.user != appointment.therapist:
            return Response(
                {"error": "You can only start your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "confirmed":
            return Response(
                {"error": "Only confirmed appointments can be started"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Additional check: ensure both parties have actually accepted
        if not appointment.both_parties_accepted():
            pending_parties = appointment.get_pending_acceptances()
            pending_text = ", ".join(pending_parties)
            return Response(
                {
                    "error": f"Cannot start appointment. Still waiting for acceptance from: {pending_text}"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "in_progress"
        appointment.save()  # Create notifications
        self._create_notifications(
            appointment,
            "appointment_started",
            f"Appointment for {appointment.client} has been started by {appointment.therapist.get_full_name()}.",
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Therapist or Driver rejects an appointment with a reason"""
        appointment = self.get_object()

        # Only the assigned therapist or driver can reject
        if request.user != appointment.therapist and request.user != appointment.driver:
            return Response(
                {"error": "You can only reject your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "pending":
            return Response(
                {"error": "Only pending appointments can be rejected"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        rejection_reason = request.data.get("rejection_reason")

        if not rejection_reason or not rejection_reason.strip():
            return Response(
                {"error": "Rejection reason is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create rejection record
        from .models import AppointmentRejection

        rejection = AppointmentRejection.objects.create(
            appointment=appointment,
            rejection_reason=rejection_reason.strip(),
            rejected_by=request.user,
        )  # Update appointment status and reset acceptance flags
        appointment.status = "rejected"
        appointment.rejection_reason = rejection_reason.strip()
        appointment.rejected_by = request.user
        appointment.rejected_at = timezone.now()

        # Reset acceptance status since someone rejected
        appointment.therapist_accepted = False
        appointment.therapist_accepted_at = None
        appointment.driver_accepted = False
        appointment.driver_accepted_at = None

        appointment.save()  # Create notification for operator
        if appointment.operator:
            # Determine the role of the user who rejected
            rejecter_role = (
                "Therapist" if request.user == appointment.therapist else "Driver"
            )
            notification_message = f"{rejecter_role} {request.user.get_full_name()} has rejected the appointment for {appointment.client} on {appointment.date}. Reason: {rejection_reason}"

            Notification.objects.create(
                user=appointment.operator,
                appointment=appointment,
                rejection=rejection,
                notification_type="appointment_rejected",
                message=notification_message,
            )  # Send WebSocket notification
        channel_layer = get_channel_layer()
        rejecter_role = (
            "Therapist" if request.user == appointment.therapist else "Driver"
        )
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": "appointment_rejected",
                    "appointment_id": appointment.id,
                    "rejection_id": rejection.id,
                    "rejected_by_id": request.user.id,
                    "rejected_by_role": rejecter_role,
                    "therapist_id": (
                        appointment.therapist.id if appointment.therapist else None
                    ),
                    "driver_id": appointment.driver.id if appointment.driver else None,
                    "operator_id": (
                        appointment.operator.id if appointment.operator else None
                    ),
                    "message": f"Appointment rejected by {rejecter_role} {request.user.get_full_name()}",
                },
            },
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def review_rejection(self, request, pk=None):
        """Operator reviews a rejection - can accept or deny the reason"""
        appointment = self.get_object()
        # Only operators can review rejections
        if request.user.role != "operator":
            return Response(
                {"error": "Only operators can review rejections"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "rejected":
            return Response(
                {"error": "Only rejected appointments can be reviewed"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        response_action = request.data.get("action")  # 'accept' or 'deny'
        response_reason = request.data.get("reason", "")

        if response_action not in ["accept", "deny"]:
            return Response(
                {"error": "Action must be 'accept' or 'deny'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            rejection = appointment.rejection_details
            if not rejection:
                return Response(
                    {"error": "No rejection details found for this appointment"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except AppointmentRejection.DoesNotExist:
            return Response(
                {"error": "No rejection details found for this appointment"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update rejection record
        rejection.operator_response = (
            "accepted" if response_action == "accept" else "denied"
        )
        rejection.operator_response_reason = response_reason
        rejection.reviewed_by = request.user
        rejection.reviewed_at = timezone.now()
        rejection.save()

        if response_action == "accept":
            # Delete the appointment if operator accepts the rejection reason
            appointment_client = appointment.client
            appointment_date = appointment.date
            appointment_time = appointment.start_time
            therapist = appointment.therapist

            # Create notification for therapist
            if therapist:
                Notification.objects.create(
                    user=therapist,
                    appointment=appointment,
                    rejection=rejection,
                    notification_type="rejection_reviewed",
                    message=f"Operator has accepted your rejection reason. The appointment for {appointment_client} on {appointment_date} has been cancelled.",
                )

            # Delete the appointment
            appointment.delete()

            return Response(
                {
                    "message": "Rejection accepted. Appointment has been deleted.",
                    "action": "deleted",
                }
            )
        else:
            # If operator denies the rejection, push the appointment through
            appointment.status = "confirmed"
            appointment.save()

            # Create notification for therapist
            if appointment.therapist:
                Notification.objects.create(
                    user=appointment.therapist,
                    appointment=appointment,
                    rejection=rejection,
                    notification_type="rejection_reviewed",
                    message=f"Operator has denied your rejection reason. The appointment for {appointment.client} on {appointment.date} is confirmed and must proceed.",
                )

            # Send WebSocket notification
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "appointments",
                {
                    "type": "appointment_message",
                    "message": {
                        "type": "rejection_denied",
                        "appointment_id": appointment.id,
                        "therapist_id": (
                            appointment.therapist.id if appointment.therapist else None
                        ),
                        "message": f"Appointment rejection denied - appointment confirmed",
                    },
                },
            )

            serializer = self.get_serializer(appointment)
            return Response(
                {
                    "message": "Rejection denied. Appointment has been confirmed.",
                    "action": "confirmed",
                    "appointment": serializer.data,
                }
            )

    @action(detail=False, methods=["post"])
    def auto_cancel_overdue(self, request):
        """Auto-cancel appointments that are overdue (30+ minutes without response)"""
        # Only operators can trigger this action
        if request.user.role != "operator":
            return Response(
                {"error": "Only operators can auto-cancel overdue appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Find overdue pending appointments
        overdue_appointments = Appointment.objects.filter(
            status="pending", response_deadline__lt=timezone.now()
        )

        cancelled_count = 0
        disabled_therapists = []

        for appointment in overdue_appointments:
            # Auto-cancel the appointment
            appointment.status = "auto_cancelled"
            appointment.auto_cancelled_at = timezone.now()
            appointment.save()

            # Disable the therapist (set is_active to False)
            if appointment.therapist and appointment.therapist.is_active:
                appointment.therapist.is_active = False
                appointment.therapist.save()
                disabled_therapists.append(appointment.therapist)

                # Create notification for therapist
                Notification.objects.create(
                    user=appointment.therapist,
                    appointment=appointment,
                    notification_type="therapist_disabled",
                    message=f"Your account has been disabled due to not responding to appointment for {appointment.client} within 30 minutes. Please contact administration.",
                )

            # Create notification for operator
            if appointment.operator:
                Notification.objects.create(
                    user=appointment.operator,
                    appointment=appointment,
                    notification_type="appointment_auto_cancelled",
                    message=f"Appointment for {appointment.client} on {appointment.date} was auto-cancelled due to no response from therapist {appointment.therapist.get_full_name() if appointment.therapist else 'Unknown'}.",
                )

            cancelled_count += 1

        return Response(
            {
                "message": f"Auto-cancelled {cancelled_count} overdue appointments",
                "cancelled_count": cancelled_count,
                "disabled_therapists": [t.get_full_name() for t in disabled_therapists],
            }
        )

    def _create_notifications(self, appointment, notification_type, message):
        """Helper method to create notifications for all involved parties"""
        # Create notification for therapist
        if appointment.therapist:
            Notification.objects.create(
                user=appointment.therapist,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )

        # Create notification for driver
        if appointment.driver:
            Notification.objects.create(
                user=appointment.driver,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )

        # Create notification for operator
        if appointment.operator:
            Notification.objects.create(
                user=appointment.operator,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )

        # Send WebSocket notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": notification_type,
                    "appointment_id": appointment.id,
                    "message": message,
                },
            },
        )

    @action(detail=True, methods=["post"])
    def therapist_confirm(self, request, pk=None):
        """Therapist confirms the appointment (enhanced workflow)"""
        appointment = self.get_object()

        # Only the assigned therapist can confirm
        if request.user != appointment.therapist:
            return Response(
                {"error": "You can only confirm your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not appointment.can_therapist_confirm():
            return Response(
                {"error": "Appointment cannot be confirmed by therapist at this time"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "therapist_confirm"
        appointment.therapist_confirmed_at = timezone.now()
        
        # For group appointments, check if all therapists have confirmed
        if appointment.group_size > 1:
            appointment.update_group_confirmation_status()
            if appointment.group_confirmation_complete:
                # All therapists confirmed, ready for driver confirmation
                self._create_notifications(
                    appointment,
                    "group_confirmation_complete",
                    f"All therapists have confirmed the group appointment for {appointment.client} on {appointment.date}. Waiting for driver confirmation.",
                )
        
        appointment.save()

        self._create_notifications(
            appointment,
            "therapist_confirmed",
            f"Therapist {request.user.get_full_name()} confirmed appointment for {appointment.client} on {appointment.date}.",
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def driver_confirm(self, request, pk=None):
        """Driver confirms the appointment (enhanced workflow)"""
        appointment = self.get_object()

        # Only the assigned driver can confirm
        if request.user != appointment.driver:
            return Response(
                {"error": "You can only confirm your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not appointment.can_driver_confirm():
            return Response(
                {"error": "Driver cannot confirm this appointment yet. Waiting for therapist confirmation."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "driver_confirm"
        appointment.driver_confirmed_at = timezone.now()
        appointment.save()

        self._create_notifications(
            appointment,
            "driver_confirmed",
            f"Driver {request.user.get_full_name()} confirmed appointment for {appointment.client} on {appointment.date}. Ready to start journey.",
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def start(self, request, pk=None):
        """Driver starts the journey to client location"""
        appointment = self.get_object()

        # Only the assigned driver can start journey
        if request.user != appointment.driver:
            return Response(
                {"error": "Only the assigned driver can start the journey"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if appointment is in correct status for journey start
        if appointment.status not in ['confirmed', 'driver_assigned']:
            return Response(
                {"error": f"Cannot start journey. Current status: {appointment.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            appointment.start_journey()
            appointment.save()
            
            # Send notification to client and therapists
            self.send_journey_started_notification(appointment)
            
            serializer = self.get_serializer(appointment)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=["post"])
    def arrive_at_location(self, request, pk=None):
        """Driver marks arrival at client location"""
        appointment = self.get_object()

        # Only the assigned driver can mark arrival
        if request.user != appointment.driver:
            return Response(
                {"error": "Only the assigned driver can mark arrival"},
                status=status.HTTP_403_FORBIDDEN
            )

        if appointment.status != 'journey_in_progress':
            return Response(
                {"error": f"Cannot mark arrival. Current status: {appointment.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            appointment.arrive_at_location()
            appointment.save()
            
            # Send notification to client and therapists
            self.send_arrival_notification(appointment)
            
            serializer = self.get_serializer(appointment)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=["post"])
    def start_session_with_progress_tracking(self, request, pk=None):
        """Start therapy session with progress tracking"""
        appointment = self.get_object()
        
        # Only therapists can start sessions
        if not hasattr(request.user, 'therapist'):
            return Response(
                {"error": "Only therapists can start sessions"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if user is assigned to this appointment
        if request.user.therapist not in appointment.therapists.all():
            return Response(
                {"error": "You are not assigned to this appointment"},
                status=status.HTTP_403_FORBIDDEN
            )

        if appointment.status != 'arrived':
            return Response(
                {"error": f"Cannot start session. Current status: {appointment.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            appointment.start_session()
            appointment.save()
            
            # Send notification to driver and client
            self.send_session_started_notification(appointment)
            
            serializer = self.get_serializer(appointment)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=["post"])
    def complete_session(self, request, pk=None):
        """Complete therapy session and trigger payment/pickup flow"""
        appointment = self.get_object()
        
        # Only therapists can complete sessions
        if not hasattr(request.user, 'therapist'):
            return Response(
                {"error": "Only therapists can complete sessions"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if user is assigned to this appointment
        if request.user.therapist not in appointment.therapists.all():
            return Response(
                {"error": "You are not assigned to this appointment"},
                status=status.HTTP_403_FORBIDDEN
            )

        if appointment.status != 'session_in_progress':
            return Response(
                {"error": f"Cannot complete session. Current status: {appointment.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            appointment.complete_session()
            appointment.save()
            
            # Send notification for payment processing
            self.send_session_completed_notification(appointment)
            
            serializer = self.get_serializer(appointment)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=["post"])
    def process_payment(self, request, pk=None):
        """Process payment for completed session"""
        appointment = self.get_object()
        
        # Only operators or the client can process payment
        if not (hasattr(request.user, 'operator') or request.user == appointment.client):
            return Response(
                {"error": "Only operators or clients can process payment"},
                status=status.HTTP_403_FORBIDDEN
            )

        if appointment.status != 'session_completed':
            return Response(
                {"error": f"Cannot process payment. Current status: {appointment.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            payment_amount = request.data.get('amount')
            payment_method = request.data.get('payment_method', 'cash')
            
            appointment.process_payment(payment_amount, payment_method)
            appointment.save()
            
            # Trigger automatic pickup driver assignment
            pickup_result = self.auto_assign_pickup_driver_helper(appointment)
            
            # Send notification for payment processed and pickup assignment
            self.send_payment_processed_notification(appointment, pickup_result)
            
            serializer = self.get_serializer(appointment)
            return Response({
                'appointment': serializer.data,
                'pickup_assignment': pickup_result
            })
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=["post"])
    def auto_assign_pickup_driver(self, request, pk=None):
        """Manually trigger automatic pickup driver assignment"""
        appointment = self.get_object()
        
        # Only operators can trigger manual pickup assignment
        if not hasattr(request.user, 'operator'):
            return Response(
                {"error": "Only operators can assign pickup drivers"},
                status=status.HTTP_403_FORBIDDEN
            )

        if appointment.status not in ['payment_processed', 'awaiting_pickup']:
            return Response(
                {"error": f"Cannot assign pickup driver. Current status: {appointment.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            assignment_result = self.auto_assign_pickup_driver_helper(appointment)
            
            serializer = self.get_serializer(appointment)
            return Response({
                'appointment': serializer.data,
                'assignment_result': assignment_result
            })
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    def auto_assign_pickup_driver_helper(self, appointment):
        """Helper method for automatic pickup driver assignment"""
        from django.utils import timezone
        
        # Determine required vehicle type based on group size
        required_vehicle_type = appointment.get_required_vehicle_type()
        
        # Find available drivers with correct vehicle type
        available_drivers = Driver.objects.filter(
            is_available=True,
            vehicle_type=required_vehicle_type,
            available_since__isnull=False
        ).order_by('available_since')  # Assign to driver available longest
        
        if not available_drivers.exists():
            # No drivers available - mark for urgent assignment
            appointment.status = 'awaiting_pickup'
            appointment.pickup_urgency = 'urgent'
            appointment.save()
            
            return {
                'success': False,
                'reason': f'No {required_vehicle_type} drivers available',
                'action': 'marked_urgent'
            }
        
        # Assign the driver who has been available longest
        selected_driver = available_drivers.first()
        appointment.pickup_driver = selected_driver
        appointment.status = 'pickup_assigned'
        appointment.save()
        
        # Mark driver as unavailable
        selected_driver.is_available = False
        selected_driver.available_since = None
        selected_driver.save()
        
        # Send notification to pickup driver
        self.send_pickup_assignment_notification(appointment)
        
        return {
            'success': True,
            'driver': {
                'id': selected_driver.id,
                'name': f"{selected_driver.user.first_name} {selected_driver.user.last_name}",
                'vehicle_type': selected_driver.vehicle_type
            },
            'assignment_time': timezone.now().isoformat()
        }

    @action(detail=True, methods=["post"])
    def start_pickup(self, request, pk=None):
        """Pickup driver starts journey to client location"""
        appointment = self.get_object()

        # Only the assigned pickup driver can start pickup
        if request.user != appointment.pickup_driver:
            return Response(
                {"error": "Only the assigned pickup driver can start pickup"},
                status=status.HTTP_403_FORBIDDEN
            )

        if appointment.status != 'pickup_assigned':
            return Response(
                {"error": f"Cannot start pickup. Current status: {appointment.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            appointment.start_pickup()
            appointment.save()
            
            # Send notification to client and therapists
            self.send_pickup_started_notification(appointment)
            
            serializer = self.get_serializer(appointment)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=["post"])
    def complete_appointment(self, request, pk=None):
        """Complete the entire appointment workflow"""
        appointment = self.get_object()

        # Only the pickup driver can complete the appointment
        if request.user != appointment.pickup_driver:
            return Response(
                {"error": "Only the pickup driver can complete the appointment"},
                status=status.HTTP_403_FORBIDDEN
            )

        if appointment.status != 'pickup_in_progress':
            return Response(
                {"error": f"Cannot complete appointment. Current status: {appointment.status}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            appointment.complete_appointment()
            appointment.save()
            
            # Send completion notification to all parties
            self.send_appointment_completed_notification(appointment)
            
            serializer = self.get_serializer(appointment)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=["get"])
    def get_workflow_status(self, request):
        """Get comprehensive workflow status for all appointments"""
        if not hasattr(request.user, 'operator'):
            return Response(
                {"error": "Only operators can view workflow status"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get appointments by status for workflow monitoring
        workflow_data = {
            'pending_confirmation': Appointment.objects.filter(status='booked').count(),
            'confirmed_awaiting_driver': Appointment.objects.filter(status='confirmed').count(),
            'driver_assigned': Appointment.objects.filter(status='driver_assigned').count(),
            'journey_in_progress': Appointment.objects.filter(status='journey_in_progress').count(),
            'arrived': Appointment.objects.filter(status='arrived').count(),
            'session_in_progress': Appointment.objects.filter(status='session_in_progress').count(),
            'session_completed': Appointment.objects.filter(status='session_completed').count(),
            'payment_processed': Appointment.objects.filter(status='payment_processed').count(),
            'awaiting_pickup': Appointment.objects.filter(status='awaiting_pickup').count(),
            'pickup_assigned': Appointment.objects.filter(status='pickup_assigned').count(),
            'pickup_in_progress': Appointment.objects.filter(status='pickup_in_progress').count(),
            'completed': Appointment.objects.filter(status='completed').count(),
            'cancelled': Appointment.objects.filter(status='cancelled').count(),
        }
        
        # Get urgent assignments needing attention
        urgent_pickups = Appointment.objects.filter(
            status='awaiting_pickup',
            pickup_urgency='urgent'
        )
        
        # Get group appointments needing coordination
        group_appointments = Appointment.objects.filter(
            appointment_type='group',
            status__in=['booked', 'confirmed']
        )
        
        return Response({
            'workflow_status': workflow_data,
            'urgent_pickups': AppointmentSerializer(urgent_pickups, many=True).data,
            'group_coordination_needed': AppointmentSerializer(group_appointments, many=True).data,
            'timestamp': timezone.now().isoformat()
        })

    # Notification helper methods
    def send_journey_started_notification(self, appointment):
        """Send notification when driver starts journey"""
        # Implementation depends on your notification system
        pass
    
    def send_arrival_notification(self, appointment):
        """Send notification when driver arrives"""
        pass
    
    def send_session_started_notification(self, appointment):
        """Send notification when session starts"""
        pass
    
    def send_session_completed_notification(self, appointment):
        """Send notification when session is completed"""
        pass
    
    def send_payment_processed_notification(self, appointment, pickup_result):
        """Send notification when payment is processed"""
        pass
    
    def send_pickup_assignment_notification(self, appointment):
        """Send notification to pickup driver"""
        pass
    
    def send_pickup_started_notification(self, appointment):
        """Send notification when pickup starts"""
        pass
    
    def send_appointment_completed_notification(self, appointment):
        """Send notification when appointment is completed"""
        pass