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
            ).distinct()  # Drivers can see their own appointments
        elif user.role == "driver":
            return Appointment.objects.filter(
                driver=user
            )  # Other roles can't see any appointments
        return Appointment.objects.none()

    def perform_create(self, serializer):
        # TODO: Re-enable operator-only restriction after fixing auth
        # Temporarily allow any authenticated user to create appointments
        # if self.request.user.role != "operator":
        #     raise permissions.PermissionDenied("Only operators can create appointments")

        # Extract therapists data from request before saving
        therapists_data = self.request.data.get("therapists", [])

        # Set the operator to the current user and save the appointment
        # The services will be handled automatically by the serializer's PrimaryKeyRelatedField
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
        """Therapist confirms appointment - first step in confirmation process"""
        appointment = self.get_object()

        # Only the assigned therapist can confirm
        if (
            request.user != appointment.therapist
            and request.user not in appointment.therapists.all()
        ):
            return Response(
                {"error": "You can only confirm your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "pending":
            return Response(
                {"error": "Only pending appointments can be confirmed"},
                status=status.HTTP_400_BAD_REQUEST,
            )  # Handle multi-therapist appointments
        if appointment.group_size > 1:
            # For multi-therapist appointments, track individual confirmations
            from .models import TherapistConfirmation
            from django.core.exceptions import ObjectDoesNotExist

            # Check if this therapist has already confirmed
            try:
                existing_confirmation = TherapistConfirmation.objects.get(
                    appointment=appointment, therapist=request.user
                )
                if existing_confirmation.confirmed_at:
                    return Response(
                        {"error": "You have already confirmed this appointment"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                else:
                    # Update existing record
                    existing_confirmation.confirmed_at = timezone.now()
                    existing_confirmation.save()
            except ObjectDoesNotExist:
                # Create new confirmation record
                TherapistConfirmation.objects.create(
                    appointment=appointment,
                    therapist=request.user,
                    confirmed_at=timezone.now(),
                )            # Check if all therapists have confirmed
            total_confirmations = TherapistConfirmation.objects.filter(
                appointment=appointment, confirmed_at__isnull=False
            ).count()

            if total_confirmations >= appointment.group_size:
                appointment.group_confirmation_complete = True
                appointment.therapist_confirmed_at = timezone.now()
                appointment.status = "therapist_confirmed"  # Use consistent status name
                message = (
                    "All therapists have confirmed. Waiting for driver confirmation."
                )
            else:
                # Still waiting for other therapists - keep status as pending
                remaining = appointment.group_size - total_confirmations
                message = f"Your confirmation recorded. Waiting for {remaining} more therapist(s)."
                # Don't change appointment status yet, keep it as "pending"        else:
            # Single therapist appointment
            appointment.therapist_confirmed_at = timezone.now()
            appointment.status = "therapist_confirmed"  # Use consistent status name
            message = "Therapist confirmed. Appointment is now visible to the driver."

        appointment.save()

        # Create notifications
        self._create_notifications(
            appointment,
            "therapist_confirmed",
            f"Therapist {request.user.get_full_name()} has confirmed the appointment for {appointment.client} on {appointment.date}.",
        )

        # Send WebSocket notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": "therapist_confirmed",
                    "appointment_id": appointment.id,
                    "therapist_id": request.user.id,
                    "message": message,
                    "status": appointment.status,
                },
            },
        )

        serializer = self.get_serializer(appointment)
        return Response({"message": message, "appointment": serializer.data})

    @action(detail=True, methods=["post"])
    def driver_confirm(self, request, pk=None):
        """Driver confirms appointment - second step in confirmation process"""
        appointment = self.get_object()

        # Only the assigned driver can confirm
        if request.user != appointment.driver:
            return Response(
                {"error": "You can only confirm your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )        # Driver can only confirm after therapist(s) have confirmed
        if appointment.status != "therapist_confirmed":
            if appointment.status == "pending":
                return Response(
                    {"error": "All therapists must confirm first before driver can confirm"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            elif appointment.status == "driver_confirmed":
                return Response(
                    {"error": "Driver has already confirmed this appointment"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            else:
                return Response(
                    {
                        "error": f"Cannot confirm appointment in {appointment.status} status. All therapists must confirm first."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # For multi-therapist appointments, ensure all therapists have confirmed
        if appointment.group_size > 1 and not appointment.group_confirmation_complete:
            return Response(
                {"error": "All therapists must confirm before driver can confirm"},
                status=status.HTTP_400_BAD_REQUEST,
            )  # Driver confirms
        appointment.driver_confirmed_at = timezone.now()
        appointment.status = (
            "driver_confirmed"  # Driver has confirmed, ready for operator to start
        )
        appointment.save()

        # Create notifications
        self._create_notifications(
            appointment,
            "driver_confirmed",
            f"Driver {request.user.get_full_name()} has confirmed the appointment for {appointment.client} on {appointment.date}. Ready to start.",
        )

        # Send WebSocket notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": "driver_confirmed",
                    "appointment_id": appointment.id,
                    "driver_id": request.user.id,
                    "message": "Driver confirmed. Ready to start appointment.",
                    "status": appointment.status,
                },
            },
        )

        serializer = self.get_serializer(appointment)
        return Response(
            {
                "message": "Driver confirmed. Appointment is ready to start.",
                "appointment": serializer.data,
            }
        )

    @action(detail=True, methods=["post"])
    def start_journey(self, request, pk=None):
        """Driver starts journey to client location"""
        appointment = self.get_object()

        if request.user != appointment.driver:
            return Response(
                {"error": "Only the assigned driver can start the journey"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status not in ["driver_confirmed", "in_progress"]:
            return Response(
                {
                    "error": "Journey can only be started when appointment is ready (driver confirmed) or in progress"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "journey"
        appointment.journey_started_at = timezone.now()
        appointment.save()

        # Create notifications
        self._create_notifications(
            appointment,
            "journey_started",
            f"Driver {request.user.get_full_name()} has started the journey to {appointment.client} at {appointment.location}.",
        )

        serializer = self.get_serializer(appointment)
        return Response(
            {
                "message": "Journey started. Driving to client location.",
                "appointment": serializer.data,
            }
        )

    @action(detail=True, methods=["post"])
    def arrive_at_location(self, request, pk=None):
        """Driver marks arrival at client location"""
        appointment = self.get_object()

        if request.user != appointment.driver:
            return Response(
                {"error": "Only the assigned driver can mark arrival"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "journey":
            return Response(
                {"error": "Can only mark arrival when journey is in progress"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "arrived"
        appointment.arrived_at = timezone.now()
        appointment.save()

        # Create notifications
        self._create_notifications(
            appointment,
            "arrived_at_location",
            f"Driver {request.user.get_full_name()} has arrived at {appointment.client}'s location.",
        )

        serializer = self.get_serializer(appointment)
        return Response(
            {"message": "Arrived at client location.", "appointment": serializer.data}
        )

    @action(detail=True, methods=["post"])
    def drop_off_therapist(self, request, pk=None):
        """Driver marks therapist(s) as dropped off"""
        appointment = self.get_object()

        if request.user != appointment.driver:
            return Response(
                {"error": "Only the assigned driver can mark drop off"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "arrived":
            return Response(
                {"error": "Can only drop off when driver has arrived"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update status and automatically start session
        if appointment.group_size > 1:
            appointment.status = "session_in_progress"
            message = "Therapists dropped off. Group session automatically started."
        else:
            appointment.status = "session_in_progress"
            message = "Therapist dropped off. Session automatically started."

        appointment.session_started_at = timezone.now()
        appointment.save()

        # Create notifications
        self._create_notifications(
            appointment,
            "session_started",
            f"Therapy session for {appointment.client} has started automatically after drop-off.",
        )

        serializer = self.get_serializer(appointment)
        return Response({"message": message, "appointment": serializer.data})

    @action(detail=True, methods=["post"])
    def mark_awaiting_payment(self, request, pk=None):
        """Therapist marks session as complete and awaiting payment"""
        appointment = self.get_object()

        # Either the assigned therapist or any therapist in a group can mark payment
        if (
            request.user != appointment.therapist
            and request.user not in appointment.therapists.all()
        ):
            return Response(
                {"error": "Only assigned therapists can mark payment status"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "session_in_progress":
            return Response(
                {"error": "Can only request payment when session is in progress"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "awaiting_payment"
        appointment.payment_initiated_at = timezone.now()
        appointment.save()

        # Create notifications
        self._create_notifications(
            appointment,
            "payment_requested",
            f"Session completed. Payment requested for {appointment.client}.",
        )

        serializer = self.get_serializer(appointment)
        return Response(
            {
                "message": "Session completed. Awaiting payment from client.",
                "appointment": serializer.data,
            }
        )

    @action(detail=True, methods=["post"])
    def mark_completed(self, request, pk=None):
        """Therapist confirms payment received and marks appointment complete"""
        appointment = self.get_object()

        # Either the assigned therapist or any therapist in a group can mark complete
        if (
            request.user != appointment.therapist
            and request.user not in appointment.therapists.all()
        ):
            return Response(
                {"error": "Only assigned therapists can mark appointment complete"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "awaiting_payment":
            return Response(
                {"error": "Can only complete appointment when awaiting payment"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_method = request.data.get("payment_method", "cash")
        payment_amount = request.data.get("payment_amount", 0)

        appointment.status = "completed"
        appointment.payment_status = "paid"
        appointment.payment_amount = payment_amount
        appointment.save()

        # Create notifications
        self._create_notifications(
            appointment,
            "appointment_completed",
            f"Appointment for {appointment.client} completed. Payment received via {payment_method}.",
        )

        serializer = self.get_serializer(appointment)
        return Response(
            {
                "message": f"Appointment completed. Payment received via {payment_method}.",
                "appointment": serializer.data,
            }
        )

    @action(detail=True, methods=["post"])
    def start_appointment(self, request, pk=None):
        """Operator starts appointment after both therapist and driver have confirmed"""
        appointment = self.get_object()

        # Only operators can start appointments
        if not request.user.is_staff and not hasattr(request.user, "is_operator"):
            return Response(
                {"error": "Only operators can start appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Can only start when both parties have confirmed
        if appointment.status != "driver_confirmed":
            if appointment.status == "pending":
                return Response(
                    {
                        "error": "Therapist must confirm first before appointment can be started"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            elif appointment.status == "therapist_confirm":
                return Response(
                    {"error": "Driver must confirm before appointment can be started"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            elif appointment.status == "in_progress":
                return Response(
                    {"error": "Appointment is already in progress"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            else:
                return Response(
                    {
                        "error": f"Cannot start appointment in {appointment.status} status"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Start the appointment
        appointment.status = "in_progress"
        appointment.started_at = timezone.now()
        appointment.save()

        # Create notifications
        self._create_notifications(
            appointment,
            "appointment_started",
            f"Appointment for {appointment.client} on {appointment.date} has been started by operator.",
        )

        # Send WebSocket notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": "appointment_started",
                    "appointment_id": appointment.id,
                    "operator_id": request.user.id,
                    "message": "Appointment started. Ready for service delivery.",
                    "status": appointment.status,
                },
            },
        )

        serializer = self.get_serializer(appointment)
        return Response(
            {
                "message": "Appointment started successfully. Ready for service delivery.",
                "appointment": serializer.data,
            }
        )

    # ...existing code...


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notifications
    """

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["user", "is_read", "notification_type"]

    def get_queryset(self):
        """Users can only see their own notifications"""
        try:
            queryset = Notification.objects.filter(user=self.request.user)
            return queryset
        except Exception as e:
            return Notification.objects.none()

    def list(self, request, *args, **kwargs):
        """Override list to handle errors gracefully"""
        try:
            return super().list(request, *args, **kwargs)
        except Exception as e:
            return Response(
                {"error": "Failed to fetch notifications", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"])
    def mark_all_as_read(self, request):
        """Mark all notifications as read"""
        Notification.objects.filter(user=request.user).update(is_read=True)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"])
    def mark_as_read(self, request, pk=None):
        """Mark a notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def unread_count(self, request):
        """Get the number of unread notifications"""
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({"count": count})

    @action(detail=True, methods=["post"])
    def mark_as_unread(self, request, pk=None):
        """Mark a notification as unread"""
        notification = self.get_object()
        notification.is_read = False
        notification.save()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    @action(detail=False, methods=["delete"])
    def delete_all(self, request):
        """Delete all notifications for the current user"""
        deleted_count = Notification.objects.filter(user=request.user).count()
        Notification.objects.filter(user=request.user).delete()
        return Response(
            {
                "message": f"Deleted {deleted_count} notifications",
                "deleted_count": deleted_count,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["delete"])
    def delete_read(self, request):
        """Delete all read notifications for the current user"""
        deleted_count = Notification.objects.filter(
            user=request.user, is_read=True
        ).count()
        Notification.objects.filter(user=request.user, is_read=True).delete()
        return Response(
            {
                "message": f"Deleted {deleted_count} read notifications",
                "deleted_count": deleted_count,
            },
            status=status.HTTP_200_OK,
        )


class StaffViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for retrieving staff members (therapists and drivers)
    """

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Return only therapists and drivers
        return CustomUser.objects.filter(role__in=["therapist", "driver"]).order_by(
            "first_name"
        )


class ServiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing services
    """

    try:
        queryset = Service.objects.all()
    except Exception as e:
        import logging

        logger = logging.getLogger(__name__)
        logger.warning(f"Could not get Service queryset: {e}")
        queryset = []

    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ["name"]
    search_fields = ["name", "description"]

    def get_queryset(self):
        """
        Override get_queryset to safely handle Service model issues
        """
        try:
            return Service.objects.all()
        except Exception as e:
            import logging

            logger = logging.getLogger(__name__)
            logger.warning(f"Error getting Service queryset: {e}")
            return []

    # Hardcoded service data to use when the API is not available
    FALLBACK_SERVICES = [
        {
            "id": 1,
            "name": "Shiatsu Massage",
            "description": "A Japanese technique involving pressure points.",
            "duration": 60,
            "price": 500.00,
            "oil": None,
            "is_active": True,
        },
        {
            "id": 2,
            "name": "Combi Massage",
            "description": "A combination of multiple massage techniques.",
            "duration": 60,
            "price": 400.00,
            "oil": None,
            "is_active": True,
        },
        {
            "id": 3,
            "name": "Dry Massage",
            "description": "Performed without oils or lotions.",
            "duration": 60,
            "price": 500.00,
            "oil": None,
            "is_active": True,
        },
        {
            "id": 4,
            "name": "Foot Massage",
            "description": "Focused on the feet and lower legs.",
            "duration": 60,
            "price": 500.00,
            "oil": None,
            "is_active": True,
        },
        {
            "id": 5,
            "name": "Hot Stone Service",
            "description": "Uses heated stones for deep muscle relaxation.",
            "duration": 90,
            "price": 675.00,
            "oil": None,
            "is_active": True,
        },
        {
            "id": 6,
            "name": "Ventosa",
            "description": "Traditional cupping therapy to relieve muscle tension.",
            "duration": 90,
            "price": 675.00,
            "oil": None,
            "is_active": True,
        },
        {
            "id": 7,
            "name": "Hand Massage",
            "description": "Focused on hands and arms.",
            "duration": 60,
            "price": 400.00,
            "oil": None,
            "is_active": True,
        },
    ]

    def list(self, request, *args, **kwargs):
        """
        Override the default list method to return hardcoded services if DB fails
        """
        try:
            # Try to use the normal list method with database
            return super().list(request, *args, **kwargs)
        except Exception as e:
            # If database is not available, use hardcoded services
            import logging

            logger = logging.getLogger(__name__)
            logger.error(f"Error fetching services from database: {e}")
            services = self.FALLBACK_SERVICES
            return Response(services)

    @action(detail=False, methods=["get"])
    def active(self, request):
        """Get only active services"""
        try:
            services = Service.objects.filter(is_active=True)
            serializer = self.get_serializer(services, many=True)
            return Response(serializer.data)
        except Exception as e:
            # Return only active services from the hardcoded list
            import logging

            logger = logging.getLogger(__name__)
            logger.error(f"Error fetching active services: {e}")
            active_services = [
                s for s in self.FALLBACK_SERVICES if s.get("is_active", True)
            ]
            return Response(active_services)

    @action(detail=True, methods=["post"])
    def update_status(self, request, pk=None):
        """Update appointment status with strict dual acceptance validation"""
        appointment = self.get_object()
        new_status = request.data.get("status")

        if not new_status:
            return Response(
                {"error": "Status is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Strict validation for status transitions
        current_status = appointment.status

        # Define valid transitions
        valid_transitions = {
            "pending": ["confirmed", "rejected", "cancelled", "auto_cancelled"],
            "confirmed": ["in_progress", "cancelled"],
            "in_progress": ["completed", "cancelled"],
            "completed": [],  # Final state
            "cancelled": [],  # Final state
            "rejected": ["pending"],  # Can be reset by operator
            "auto_cancelled": [],  # Final state
        }

        if new_status not in valid_transitions.get(current_status, []):
            return Response(
                {"error": f"Cannot transition from {current_status} to {new_status}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # DUAL ACCEPTANCE ENFORCEMENT
        if new_status in ["confirmed", "in_progress"]:
            if not appointment.both_parties_accepted():
                pending_parties = appointment.get_pending_acceptances()
                pending_text = ", ".join(pending_parties)
                return Response(
                    {
                        "error": f"Cannot proceed to {new_status}. Both parties must accept first. Still waiting for: {pending_text}",
                        "pending_acceptances": pending_parties,
                        "both_accepted": False,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Role-based permissions
        if new_status == "in_progress":
            # Only therapist can start appointments
            if request.user != appointment.therapist:
                return Response(
                    {"error": "Only the assigned therapist can start appointments"},
                    status=status.HTTP_403_FORBIDDEN,
                )
        elif new_status == "completed":
            # Only therapist or driver can complete appointments
            if (
                request.user != appointment.therapist
                and request.user != appointment.driver
            ):
                return Response(
                    {
                        "error": "Only assigned therapist or driver can complete appointments"
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

        # Update the status
        appointment.status = new_status
        appointment.save()

        # Create appropriate notifications
        if new_status == "confirmed":
            self._create_notifications(
                appointment,
                "appointment_confirmed",
                f"Appointment for {appointment.client} on {appointment.date} is now confirmed. Both therapist and driver have accepted.",
            )
        elif new_status == "in_progress":
            self._create_notifications(
                appointment,
                "appointment_started",
                f"Appointment for {appointment.client} has been started by {appointment.therapist.get_full_name()}.",
            )
        elif new_status == "completed":
            self._create_notifications(
                appointment,
                "appointment_completed",
                f"Appointment for {appointment.client} has been completed.",
            )

        # Send WebSocket notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": f"appointment_{new_status}",
                    "appointment_id": appointment.id,
                    "new_status": new_status,
                    "updated_by_id": request.user.id,
                    "therapist_id": (
                        appointment.therapist.id if appointment.therapist else None
                    ),
                    "driver_id": appointment.driver.id if appointment.driver else None,
                    "operator_id": (
                        appointment.operator.id if appointment.operator else None
                    ),
                    "message": f"Appointment status updated to {new_status}",
                    "both_accepted": appointment.both_parties_accepted(),
                },
            },
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def arrive_at_location(self, request, pk=None):
        """Driver marks arrival at client location"""
        appointment = self.get_object()

        if request.user != appointment.driver:
            return Response(
                {"error": "Only the assigned driver can mark arrival"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "journey":
            return Response(
                {"error": "Can only mark arrival when journey is in progress"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "arrived"
        appointment.arrived_at = timezone.now()
        appointment.save()

        # Create notifications
        self._create_notifications(
            appointment,
            "arrived_at_location",
            f"Driver {request.user.get_full_name()} has arrived at {appointment.client}'s location.",
        )

        serializer = self.get_serializer(appointment)
        return Response(
            {"message": "Arrived at client location.", "appointment": serializer.data}
        )

    @action(detail=True, methods=["post"])
    def drop_off_therapist(self, request, pk=None):
        """Driver marks therapist(s) as dropped off"""
        appointment = self.get_object()

        if request.user != appointment.driver:
            return Response(
                {"error": "Only the assigned driver can mark drop off"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "arrived":
            return Response(
                {"error": "Can only drop off when driver has arrived"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update status and automatically start session
        if appointment.group_size > 1:
            appointment.status = "session_in_progress"
            message = "Therapists dropped off. Group session automatically started."
        else:
            appointment.status = "session_in_progress"
            message = "Therapist dropped off. Session automatically started."

        appointment.session_started_at = timezone.now()
        appointment.save()

        # Create notifications
        self._create_notifications(
            appointment,
            "session_started",
            f"Therapy session for {appointment.client} has started automatically after drop-off.",
        )

        serializer = self.get_serializer(appointment)
        return Response({"message": message, "appointment": serializer.data})

    @action(detail=True, methods=["post"])
    def mark_awaiting_payment(self, request, pk=None):
        """Therapist marks session as complete and awaiting payment"""
        appointment = self.get_object()

        # Either the assigned therapist or any therapist in a group can mark payment
        if (
            request.user != appointment.therapist
            and request.user not in appointment.therapists.all()
        ):
            return Response(
                {"error": "Only assigned therapists can mark payment status"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "session_in_progress":
            return Response(
                {"error": "Can only request payment when session is in progress"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        appointment.status = "awaiting_payment"
        appointment.payment_initiated_at = timezone.now()
        appointment.save()

        # Create notifications
        self._create_notifications(
            appointment,
            "payment_requested",
            f"Session completed. Payment requested for {appointment.client}.",
        )

        serializer = self.get_serializer(appointment)
        return Response(
            {
                "message": "Session completed. Awaiting payment from client.",
                "appointment": serializer.data,
            }
        )

    @action(detail=True, methods=["post"])
    def mark_completed(self, request, pk=None):
        """Therapist confirms payment received and marks appointment complete"""
        appointment = self.get_object()

        # Either the assigned therapist or any therapist in a group can mark complete
        if (
            request.user != appointment.therapist
            and request.user not in appointment.therapists.all()
        ):
            return Response(
                {"error": "Only assigned therapists can mark appointment complete"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "awaiting_payment":
            return Response(
                {"error": "Can only complete appointment when awaiting payment"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_method = request.data.get("payment_method", "cash")
        payment_amount = request.data.get("payment_amount", 0)

        appointment.status = "completed"
        appointment.payment_status = "paid"
        appointment.payment_amount = payment_amount
        appointment.save()

        # Create notifications
        self._create_notifications(
            appointment,
            "appointment_completed",
            f"Appointment for {appointment.client} completed. Payment received via {payment_method}.",
        )

        serializer = self.get_serializer(appointment)
        return Response(
            {
                "message": f"Appointment completed. Payment received via {payment_method}.",
                "appointment": serializer.data,
            }
        )

    @action(detail=True, methods=["post"])
    def start_appointment(self, request, pk=None):
        """Operator starts appointment after both therapist and driver have confirmed"""
        appointment = self.get_object()

        # Only operators can start appointments
        if not request.user.is_staff and not hasattr(request.user, "is_operator"):
            return Response(
                {"error": "Only operators can start appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Can only start when both parties have confirmed
        if appointment.status != "driver_confirmed":
            if appointment.status == "pending":
                return Response(
                    {
                        "error": "Therapist must confirm first before appointment can be started"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            elif appointment.status == "therapist_confirm":
                return Response(
                    {"error": "Driver must confirm before appointment can be started"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            elif appointment.status == "in_progress":
                return Response(
                    {"error": "Appointment is already in progress"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            else:
                return Response(
                    {
                        "error": f"Cannot start appointment in {appointment.status} status"
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Start the appointment
        appointment.status = "in_progress"
        appointment.started_at = timezone.now()
        appointment.save()

        # Create notifications
        self._create_notifications(
            appointment,
            "appointment_started",
            f"Appointment for {appointment.client} on {appointment.date} has been started by operator.",
        )

        # Send WebSocket notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": "appointment_started",
                    "appointment_id": appointment.id,
                    "operator_id": request.user.id,
                    "message": "Appointment started. Ready for service delivery.",
                    "status": appointment.status,
                },
            },
        )

        serializer = self.get_serializer(appointment)
        return Response(
            {
                "message": "Appointment started successfully. Ready for service delivery.",
                "appointment": serializer.data,
            }
        )

    # ...existing code...
