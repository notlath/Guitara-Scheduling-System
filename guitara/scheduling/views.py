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
from django.db import models
from django.db.models import Q, F, Prefetch
from datetime import datetime, timedelta, date
from .models import (
    Client,
    Availability,
    Appointment,
    Notification,
    AppointmentRejection,
)
from .pagination import (
    AppointmentsPagination,
    StandardResultsPagination,
    NotificationsPagination,
)
import logging

# Set up logger
logger = logging.getLogger(__name__)

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
    ViewSet for viewing and editing client information with pagination
    """

    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsPagination
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_fields = ["first_name", "last_name", "phone_number"]
    search_fields = ["first_name", "last_name", "phone_number", "email", "address"]
    ordering_fields = ["first_name", "last_name", "created_at"]
    ordering = ["last_name", "first_name"]


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
    ViewSet for managing therapist and driver availability with pagination
    """

    serializer_class = AvailabilitySerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsPagination
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = AvailabilityFilter
    ordering_fields = ["date", "start_time", "end_time", "created_at"]
    ordering = ["-date", "start_time"]

    def get_queryset(self):
        user = self.request.user

        # Optimized queryset with user relationship prefetched
        base_queryset = Availability.objects.select_related("user")

        # Operators can see all availabilities
        if user.role == "operator":
            return base_queryset
        # Therapists and drivers can only see their own availability
        return base_queryset.filter(user=user)

    def list(self, request, *args, **kwargs):
        """Override list to handle filtering by staff_id and date parameters"""
        # Get query parameters
        staff_id = request.query_params.get("staff_id")
        date_str = request.query_params.get("date")  # Start with the base queryset
        queryset = self.filter_queryset(self.get_queryset())

        # Apply additional filtering if parameters are provided
        if staff_id:
            queryset = queryset.filter(user_id=staff_id)

        if date_str:
            try:
                from datetime import datetime, timedelta

                date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()

                # Get availabilities for the requested date
                date_availabilities = queryset.filter(date=date_obj)

                # Also get cross-day availabilities from the previous day that extend into this date
                previous_day = date_obj - timedelta(days=1)
                previous_day_cross_day = queryset.filter(date=previous_day).filter(
                    # Cross-day indicator: start_time > end_time
                    start_time__gt=models.F("end_time"),
                    is_available=True,
                )

                # Combine both querysets
                queryset = date_availabilities.union(previous_day_cross_day)

                # Add a flag to distinguish cross-day availabilities
                for availability in queryset:
                    if (
                        availability.date == previous_day
                        and availability.start_time > availability.end_time
                    ):
                        availability.is_cross_day = True
                        availability.cross_day_note = f"Continues into {date_obj}"
                    else:
                        availability.is_cross_day = False

            except ValueError:
                pass  # Invalid date format, continue without date filtering

        # Serialize and return
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def available_therapists(self, request):
        """Get all available therapists for a given date and time range"""
        from django.db.models import Q

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
        # Handle both same-day and cross-day availability
        from datetime import timedelta

        # Query logic for availability:
        # 1. Same day: Normal case where start_time <= requested_time <= end_time
        # 2. Cross-day: end_time < start_time (spans midnight)
        #    - For times after start_time on same day
        #    - For times before end_time on next day

        # Build availability queries
        same_day_normal = Q(
            availabilities__date=date_obj,
            availabilities__start_time__lte=start_time,
            availabilities__end_time__gte=end_time,
            availabilities__is_available=True,
        ) & Q(
            availabilities__start_time__lte=F(
                "availabilities__end_time"
            )  # Normal (non-cross-day)
        )

        same_day_cross_day = Q(
            availabilities__date=date_obj,
            availabilities__start_time__lte=start_time,
            availabilities__start_time__gt=F(
                "availabilities__end_time"
            ),  # Cross-day indicator
            availabilities__is_available=True,
        )

        # For cross-day availability from previous day (when requesting early morning times)
        previous_day = date_obj - timedelta(days=1)
        previous_day_cross_day = Q(
            availabilities__date=previous_day,
            availabilities__end_time__gte=end_time,
            availabilities__start_time__gt=F(
                "availabilities__end_time"
            ),  # Cross-day indicator
            availabilities__is_available=True,
        )

        available_therapists_query = (
            CustomUser.objects.filter(
                Q(role="therapist")
                & (same_day_normal | same_day_cross_day | previous_day_cross_day)
            )
            .select_related()
            .prefetch_related(
                Prefetch(
                    "availabilities",
                    queryset=Availability.objects.select_related("user"),
                ),
                Prefetch(
                    "therapist_appointments",
                    queryset=Appointment.objects.select_related("client"),
                ),
            )
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
            )  # Exclude therapists who have conflicting appointments (including cross-day conflicts)
        # Normal same-day conflicts
        same_day_conflicts = Q(
            therapist_appointments__date=date_obj,
            therapist_appointments__status__in=["pending", "confirmed", "in_progress"],
        ) & (
            Q(therapist_appointments__start_time__lte=end_time)
            & Q(therapist_appointments__end_time__gte=start_time)
        )

        # Cross-day conflicts (appointments that span midnight)
        cross_day_conflicts = Q(
            therapist_appointments__date=date_obj,
            therapist_appointments__status__in=["pending", "confirmed", "in_progress"],
            therapist_appointments__start_time__gt=F(
                "therapist_appointments__end_time"
            ),  # Cross-day appointment
        ) & Q(therapist_appointments__start_time__lte=start_time)

        # Previous day cross-day conflicts
        previous_day_conflicts = Q(
            therapist_appointments__date=previous_day,
            therapist_appointments__status__in=["pending", "confirmed", "in_progress"],
            therapist_appointments__start_time__gt=F(
                "therapist_appointments__end_time"
            ),  # Cross-day appointment
        ) & Q(therapist_appointments__end_time__gte=end_time)

        conflicting_therapists = CustomUser.objects.filter(
            same_day_conflicts | cross_day_conflicts | previous_day_conflicts
        ).distinct()

        available_therapists = available_therapists_query.exclude(
            pk__in=conflicting_therapists
        )  # Build custom response with availability data
        therapists_data = []
        for therapist in available_therapists:
            # Get the specific availability for this date (current day first, then previous day for cross-day)
            availability = therapist.availabilities.filter(date=date_obj).first()

            # If not found on current day, check previous day for cross-day availability
            if not availability:
                previous_day = date_obj - timedelta(days=1)
                cross_day_availabilities = therapist.availabilities.filter(
                    date=previous_day, is_available=True
                )
                # Check for cross-day manually since we can't use F() in filter here
                for avail in cross_day_availabilities:
                    if avail.start_time > avail.end_time and avail.end_time >= end_time:
                        availability = avail
                        break

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
                # Add cross-day indicator
                "is_cross_day": (
                    (availability and availability.end_time < availability.start_time)
                    if availability
                    else False
                ),
            }
            therapists_data.append(therapist_data)

        return Response(therapists_data)

    @action(detail=False, methods=["get"])
    def available_drivers(self, request):
        """Get all available drivers for a given date and time range"""
        from django.db.models import Q

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
            )

        # Start with drivers who have availability at this time
        # Handle both same-day and cross-day availability
        from datetime import timedelta

        # Query logic for availability:
        # 1. Same day: Normal case where start_time <= requested_time <= end_time
        # 2. Cross-day: end_time < start_time (spans midnight)
        #    - For times after start_time on same day
        #    - For times before end_time on next day
        # Build availability queries
        same_day_normal = Q(
            availabilities__date=date_obj,
            availabilities__start_time__lte=start_time,
            availabilities__end_time__gte=end_time,
            availabilities__is_available=True,
        ) & Q(
            availabilities__start_time__lte=F(
                "availabilities__end_time"
            )  # Normal (non-cross-day)
        )

        same_day_cross_day = Q(
            availabilities__date=date_obj,
            availabilities__start_time__lte=start_time,
            availabilities__start_time__gt=F(
                "availabilities__end_time"
            ),  # Cross-day indicator
            availabilities__is_available=True,
        )

        # For cross-day availability from previous day (when requesting early morning times)
        previous_day = date_obj - timedelta(days=1)
        previous_day_cross_day = Q(
            availabilities__date=previous_day,
            availabilities__end_time__gte=end_time,
            availabilities__start_time__gt=F(
                "availabilities__end_time"
            ),  # Cross-day indicator
            availabilities__is_available=True,
        )

        available_drivers_query = (
            CustomUser.objects.filter(
                Q(role="driver")
                & (same_day_normal | same_day_cross_day | previous_day_cross_day)
            )
            .select_related()
            .prefetch_related(
                Prefetch(
                    "availabilities",
                    queryset=Availability.objects.select_related("user"),
                ),
                Prefetch(
                    "driver_appointments",
                    queryset=Appointment.objects.select_related("client"),
                ),
            )
            .distinct()
        )

        # Exclude drivers who have conflicting appointments (including cross-day conflicts)
        same_day_conflicts = Q(
            driver_appointments__date=date_obj,
            driver_appointments__status__in=["pending", "confirmed", "in_progress"],
        ) & (
            Q(driver_appointments__start_time__lte=end_time)
            & Q(driver_appointments__end_time__gte=start_time)
        )

        # Cross-day conflicts (appointments that span midnight)
        cross_day_conflicts = Q(
            driver_appointments__date=date_obj,
            driver_appointments__status__in=["pending", "confirmed", "in_progress"],
            driver_appointments__start_time__gt=F(
                "driver_appointments__end_time"
            ),  # Cross-day appointment
        ) & Q(driver_appointments__start_time__lte=start_time)

        # Previous day cross-day conflicts
        previous_day_conflicts = Q(
            driver_appointments__date=previous_day,
            driver_appointments__status__in=["pending", "confirmed", "in_progress"],
            driver_appointments__start_time__gt=F(
                "driver_appointments__end_time"
            ),  # Cross-day appointment
        ) & Q(driver_appointments__end_time__gte=end_time)

        conflicting_drivers = CustomUser.objects.filter(
            same_day_conflicts | cross_day_conflicts | previous_day_conflicts
        ).distinct()

        available_drivers = available_drivers_query.exclude(pk__in=conflicting_drivers)

        # Build custom response with availability data
        drivers_data = []
        for driver in available_drivers:
            # Get the specific availability for this date (current day first, then previous day for cross-day)
            availability = driver.availabilities.filter(date=date_obj).first()

            # If not found on current day, check previous day for cross-day availability
            if not availability:
                previous_day = date_obj - timedelta(days=1)
                cross_day_availabilities = driver.availabilities.filter(
                    date=previous_day, is_available=True
                )
                # Check for cross-day manually since we can't use F() in filter here
                for avail in cross_day_availabilities:
                    if avail.start_time > avail.end_time and avail.end_time >= end_time:
                        availability = avail
                        break

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
                # Add cross-day indicator
                "is_cross_day": (
                    (availability and availability.end_time < availability.start_time)
                    if availability
                    else False
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
        from django.db.models import Q

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
    ViewSet for managing appointments/bookings with server-side pagination
    """

    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]  # Restored authentication
    pagination_class = AppointmentsPagination
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = AppointmentFilter
    search_fields = [
        "client__first_name",
        "client__last_name",
        "client__phone_number",
        "location",
    ]
    ordering_fields = ["created_at", "appointment_date", "status"]
    ordering = ["-created_at"]  # Default ordering

    def get_queryset(self):
        from django.db.models import Q, Prefetch

        user = (
            self.request.user
        )  # Optimized base queryset with all necessary relationships prefetched
        base_queryset = Appointment.objects.select_related(
            "client", "therapist", "driver", "operator", "rejected_by"
        ).prefetch_related("services", "therapists", "rejection_details")

        # Operators can see all appointments
        if user.role == "operator":
            return base_queryset

        # Therapists can see their own appointments (both single and multi-therapist)
        elif user.role == "therapist":
            return base_queryset.filter(
                Q(therapist=user) | Q(therapists=user)
            ).distinct()

        # Drivers can see their own appointments
        elif user.role == "driver":
            return base_queryset.filter(driver=user)

        # Other roles can't see any appointments
        return Appointment.objects.none()

    def get_object(self):
        """
        Always fetch the appointment with all related objects to avoid N+1 queries.
        """
        queryset = self.get_queryset()
        # Use the optimized queryset with select_related/prefetch_related
        return queryset.get(pk=self.kwargs["pk"])

    def _get_optimized_appointment(self, pk):
        return (
            Appointment.objects.select_related(
                "client", "therapist", "driver", "operator", "rejected_by"
            )
            .prefetch_related("services", "therapists", "rejection_details")
            .get(pk=pk)
        )

    def perform_create(self, serializer):
        # TODO: Re-enable operator-only restriction after fixing auth
        # Temporarily allow any authenticated user to create appointments
        # if self.request.user.role != "operator":
        #     raise permissions.PermissionDenied("Only operators can create appointments")

        # Debug logging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"=== APPOINTMENT VIEW DEBUG - ENHANCED ===")
        logger.info(f"Request method: {self.request.method}")
        logger.info(f"Request content type: {self.request.content_type}")
        logger.info(f"Request data type: {type(self.request.data)}")
        logger.info(f"Full request data received: {dict(self.request.data)}")
        
        # Check for materials in various forms
        materials_raw = self.request.data.get('materials')
        logger.info(f"Materials in request data (raw): {repr(materials_raw)}")
        logger.info(f"Materials data type: {type(materials_raw)}")
        
        if materials_raw:
            logger.info(f"Materials length: {len(materials_raw) if hasattr(materials_raw, '__len__') else 'N/A'}")
            if isinstance(materials_raw, list):
                for i, material in enumerate(materials_raw):
                    logger.info(f"Material {i}: {material}")
        
        # Check if materials is in the initial data passed to serializer
        if hasattr(serializer, 'initial_data'):
            logger.info(f"Serializer initial_data: {serializer.initial_data}")
            logger.info(f"Materials in serializer initial_data: {serializer.initial_data.get('materials', 'NOT_FOUND')}")
        
        # Check serializer validated data
        if hasattr(serializer, 'validated_data'):
            logger.info(f"Serializer validated_data keys: {list(serializer.validated_data.keys())}")
            materials_validated = serializer.validated_data.get('materials')
            logger.info(f"Materials in validated_data: {repr(materials_validated)}")
        
        # Check if serializer is valid
        logger.info(f"Serializer is_valid: {serializer.is_valid()}")
        if not serializer.is_valid():
            logger.error(f"Serializer errors: {serializer.errors}")

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
                "driver",  # Use main driver field instead of pickup_driver
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

    def destroy(self, request, *args, **kwargs):
        """
        Custom destroy method with proper permission checks
        Only operators can delete appointments
        """
        try:
            instance = self.get_object()
            
            # Only operators can delete appointments
            if request.user.role != "operator":
                return Response(
                    {"error": "Only operators can delete appointments"},
                    status=status.HTTP_403_FORBIDDEN,
                )
            
            # Check if appointment can be deleted (optional business logic)
            if instance.status in ["in_progress", "completed"]:
                return Response(
                    {"error": "Cannot delete appointments that are in progress or completed"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            
            # Perform the deletion
            appointment_id = instance.id
            instance.delete()
            
            return Response(
                {"message": f"Appointment {appointment_id} deleted successfully"},
                status=status.HTTP_204_NO_CONTENT
            )
            
        except Exception as e:
            # Log the error for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error deleting appointment: {str(e)}", exc_info=True)
            
            return Response(
                {"error": "An error occurred while deleting the appointment"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
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

    @action(detail=False, methods=["get"])
    def by_week(self, request):
        """Get all appointments for a specific week"""
        week_start_str = request.query_params.get("week_start")

        if not week_start_str:
            return Response(
                {"error": "week_start parameter is required (YYYY-MM-DD format)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Parse the week start date
            week_start = datetime.strptime(week_start_str, "%Y-%m-%d").date()
            # Calculate week end (6 days later)
            week_end = week_start + timedelta(days=6)
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Filter appointments for the specified week
        appointments = self.filter_queryset(
            self.get_queryset().filter(
                date__gte=week_start,
                date__lte=week_end,
            )
        )

        serializer = self.get_serializer(appointments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel an appointment"""
        appointment = self._get_optimized_appointment(pk)

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

        try:
            from guitara.scheduling.optimized_data_manager import data_manager

            data_manager._invalidate_appointment_caches(
                {
                    "id": appointment.id,
                    "date": appointment.date,
                    "therapist_id": getattr(appointment.therapist, "id", None),
                    "driver_id": getattr(appointment.driver, "id", None),
                }
            )
            data_manager.broadcast_appointment_update(
                {"id": appointment.id, "status": appointment.status},
                update_type="cancelled",
            )
        except (ImportError, AttributeError) as e:
            print(f"⚠️ Warning: Could not import optimized_data_manager: {e}")
            # Continue without cache invalidation - the operation will still succeed
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        """Mark an appointment as completed"""
        appointment = self._get_optimized_appointment(pk)

        # Only the assigned therapist(s), driver or operators can complete appointments
        user = request.user
        is_assigned_therapist = (
            user == appointment.therapist
            or appointment.therapists.filter(id=user.id).exists()
        )

        if (
            user.role != "operator"
            and not is_assigned_therapist
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

        try:
            from guitara.scheduling.optimized_data_manager import data_manager

            data_manager._invalidate_appointment_caches(
                {
                    "id": appointment.id,
                    "date": appointment.date,
                    "therapist_id": getattr(appointment.therapist, "id", None),
                    "driver_id": getattr(appointment.driver, "id", None),
                }
            )
            data_manager.broadcast_appointment_update(
                {"id": appointment.id, "status": appointment.status},
                update_type="completed",
            )
        except (ImportError, AttributeError) as e:
            print(f"⚠️ Warning: Could not import optimized_data_manager: {e}")
            # Continue without cache invalidation - the operation will still succeed
        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        """Therapist or Driver accepts a pending appointment"""
        appointment = self._get_optimized_appointment(pk)

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
        appointment = self._get_optimized_appointment(pk)

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
        appointment.save()
        
        # Move appointment materials from current_stock to in_use
        for material in appointment.appointment_materials.all():
            inventory_item = material.inventory_item
            if inventory_item.move_to_in_use(material.quantity_used):
                # Log the material usage
                from inventory.models import UsageLog
                UsageLog.objects.create(
                    item=inventory_item,
                    quantity_used=material.quantity_used,
                    operator=request.user if request.user.is_authenticated else None,
                    action_type='usage',
                    notes=f'Material moved to in_use for appointment #{appointment.id}'
                )
            else:
                return Response(
                    {"error": f"Insufficient stock for {inventory_item.name}. Required: {material.quantity_used}, Available: {inventory_item.current_stock}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        
        # Create notifications
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
        appointment = self._get_optimized_appointment(pk)

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
        try:
            # Create notification for therapist
            if appointment.therapist and hasattr(appointment.therapist, "id"):
                try:
                    Notification.objects.create(
                        user=appointment.therapist,
                        appointment=appointment,
                        notification_type=notification_type,
                        message=message,
                    )
                    logger.info(
                        f"Created notification for therapist {appointment.therapist.username}"
                    )
                except Exception as e:
                    logger.error(f"Error creating notification for therapist: {e}")

            # Create notification for driver
            if appointment.driver and hasattr(appointment.driver, "id"):
                try:
                    Notification.objects.create(
                        user=appointment.driver,
                        appointment=appointment,
                        notification_type=notification_type,
                        message=message,
                    )
                    logger.info(
                        f"Created notification for driver {appointment.driver.username}"
                    )
                except Exception as e:
                    logger.error(f"Error creating notification for driver: {e}")

            # Create notification for operator
            if appointment.operator and hasattr(appointment.operator, "id"):
                try:
                    Notification.objects.create(
                        user=appointment.operator,
                        appointment=appointment,
                        notification_type=notification_type,
                        message=message,
                    )
                    logger.info(
                        f"Created notification for operator {appointment.operator.username}"
                    )
                except Exception as e:
                    logger.error(f"Error creating notification for operator: {e}")

        except Exception as e:
            logger.error(f"Error in _create_notifications: {e}", exc_info=True)

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

    def _get_next_available_driver_for_pickup(self, appointment):
        """Get the next available driver for pickup using FIFO system"""
        from datetime import date
        from django.db.models import Q

        # Get drivers who are available today and not currently busy
        today = date.today()

        # Find drivers with availability today who are not currently assigned to active appointments
        available_drivers = (
            CustomUser.objects.filter(
                role="driver",
                is_active=True,
                # Have availability today
                availabilities__date=today,
                availabilities__is_available=True,
            )
            .exclude(
                # Exclude drivers who are currently busy with active appointments
                Q(
                    driver_appointments__status__in=[
                        "in_progress",
                        "journey",
                        "arrived",
                        "driver_assigned_pickup",
                        "return_journey",
                    ]
                )
                & Q(driver_appointments__date=today)
            )
            .distinct()
        )

        # Apply FIFO logic - get driver who became available earliest
        if (
            available_drivers.exists()
        ):  # Sort by last_available_at (earliest first) for FIFO
            return available_drivers.order_by("last_available_at").first()

        return None

    def _get_busy_drivers_with_availability(self, appointment_date):
        """Get drivers who are busy but have availability for the given date"""

        # Find drivers who have availability for the date but are currently busy
        busy_drivers = CustomUser.objects.filter(
            role="driver",
            is_active=True,
            # Have availability for the date
            availabilities__date=appointment_date,
            availabilities__is_available=True,
            # But are currently assigned to active appointments
            driver_appointments__status__in=[
                "in_progress",
                "journey",
                "arrived",
                "driver_assigned_pickup",
                "return_journey",
            ],
            driver_appointments__date=appointment_date,
        ).distinct()

        return busy_drivers

    @action(detail=True, methods=["post"])
    def therapist_confirm(self, request, pk=None):
        """Therapist confirms appointment - first step in confirmation process"""
        appointment = self.get_object()

        user = request.user
        # Only the assigned therapist can confirm
        if not user.is_authenticated or not (
            hasattr(user, "role")
            and (user == appointment.therapist or user in appointment.therapists.all())
        ):
            return Response(
                {"error": "You can only confirm your own appointments"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "pending":
            return Response(
                {"error": "Only pending appointments can be confirmed"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if appointment.group_size > 1:
            from .models import TherapistConfirmation
            from django.core.exceptions import ObjectDoesNotExist
            from django.db import transaction

            with transaction.atomic():
                confirmation, created = TherapistConfirmation.objects.get_or_create(
                    appointment=appointment, therapist=user
                )
                if confirmation.confirmed_at:
                    return Response(
                        {"error": "You have already confirmed this appointment"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                confirmation.confirmed_at = timezone.now()
                confirmation.save(update_fields=["confirmed_at"])

                # Efficiently count confirmations
                total_confirmations = TherapistConfirmation.objects.filter(
                    appointment=appointment, confirmed_at__isnull=False
                ).count()

                if total_confirmations >= appointment.group_size:
                    # ALL therapists have confirmed - update appointment status
                    appointment.group_confirmation_complete = True
                    appointment.therapist_confirmed_at = timezone.now()
                    appointment.status = "therapist_confirmed"
                    appointment.save(
                        update_fields=[
                            "group_confirmation_complete",
                            "therapist_confirmed_at",
                            "status",
                            "updated_at",
                        ]
                    )
                    message = "All therapists have confirmed. Waiting for driver confirmation."
                else:
                    remaining = appointment.group_size - total_confirmations
                    appointment.save(update_fields=["updated_at"])
                    self._create_notifications(
                        appointment,
                        "therapist_partial_confirmed",
                        f"Therapist {user.get_full_name()} has confirmed. {remaining} more confirmations needed.",
                    )
                    return Response(
                        {
                            "message": f"Your confirmation recorded. Waiting for {remaining} more therapist(s).",
                            "appointment": self.get_serializer(appointment).data,
                        }
                    )
        else:
            # Single therapist appointment
            appointment.therapist_confirmed_at = timezone.now()
            appointment.status = "therapist_confirmed"
            appointment.save(
                update_fields=["therapist_confirmed_at", "status", "updated_at"]
            )
            message = "Therapist confirmed. Appointment is now visible to the driver."

        self._create_notifications(
            appointment,
            "therapist_confirmed",
            f"Therapist {user.get_full_name()} has confirmed the appointment for {appointment.client} on {appointment.date}.",
        )

        channel_layer = get_channel_layer()
        if channel_layer is not None:
            async_to_sync(channel_layer.group_send)(
                "appointments",
                {
                    "type": "appointment_message",
                    "message": {
                        "type": "therapist_confirmed",
                        "appointment_id": appointment.id,
                        "therapist_id": getattr(user, "id", None),
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
            )  # Driver can only confirm after therapist(s) have confirmed
        if appointment.status != "therapist_confirmed":
            if appointment.status == "pending":
                return Response(
                    {
                        "error": "All therapists must confirm first before driver can confirm"
                    },
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
        appointment.status = "driver_confirmed"  # Driver has confirmed, ready to start
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
        """Driver starts journey to client location (optimized)"""
        # Use optimized queryset to fetch the appointment
        appointment = (
            Appointment.objects.select_related(
                "client", "therapist", "driver", "operator", "rejected_by"
            )
            .prefetch_related("services", "therapists", "rejection_details")
            .get(pk=pk)
        )

        if request.user != appointment.driver:
            return Response(
                {"error": "Only the assigned driver can start the journey"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Debug log for troubleshooting
        print(f"🔍 START JOURNEY DEBUG - Appointment {appointment.id}:")
        print(f"   Current status: {appointment.status}")
        print(f"   Driver: {appointment.driver}")
        print(f"   Therapist accepted: {appointment.therapist_accepted}")
        print(f"   Driver accepted: {appointment.driver_accepted}")
        print(f"   Both parties accepted: {appointment.both_parties_accepted()}")

        # Refresh appointment from database to avoid race conditions
        appointment.refresh_from_db()
        print(f"   Status after refresh: {appointment.status}")

        # Enforce proper authorization flow: allow journey start from "in_progress" or already "journey" status
        # Valid statuses: "in_progress" (after operator starts) or "journey" (already started, can restart)
        if appointment.status not in ["in_progress", "journey"]:
            if appointment.status == "driver_confirmed":
                return Response(
                    {
                        "error": "Operator must start the appointment before journey can begin. Please wait for operator approval."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            elif appointment.status in ["pending", "therapist_confirmed"]:
                return Response(
                    {
                        "error": f"Journey cannot be started from status '{appointment.status}'. Appointment must be in 'in_progress' status (after operator approval)."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            else:
                return Response(
                    {
                        "error": f"Journey cannot be started from current status '{appointment.status}'. Only 'in_progress' status is allowed (current: {appointment.status})."
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Set status to journey - or update journey_started_at if already in journey
        if appointment.status == "journey":
            print(
                f"🔄 Journey already started for appointment {appointment.id}, updating timestamp"
            )
            appointment.journey_started_at = (
                timezone.now()
            )  # Update timestamp for restart
        else:
            print(f"🚀 Starting new journey for appointment {appointment.id}")
            appointment.status = "journey"
            appointment.journey_started_at = timezone.now()

        appointment.save()

        # Create notifications
        journey_message = f"Driver {request.user.get_full_name()} has started the journey to {appointment.client} at {appointment.location}."
        self._create_notifications(
            appointment,
            "journey_started",
            journey_message,
        )

        # Invalidate cache and broadcast update for real-time dashboard sync
        try:
            from guitara.scheduling.optimized_data_manager import data_manager

            data_manager._invalidate_appointment_caches(
                {
                    "id": appointment.id,
                    "date": appointment.date,
                    "therapist_id": getattr(appointment.therapist, "id", None),
                    "driver_id": getattr(appointment.driver, "id", None),
                }
            )
            data_manager.broadcast_appointment_update(
                {"id": appointment.id, "status": appointment.status},
                update_type="journey_started",
            )
        except (ImportError, AttributeError) as e:
            print(f"⚠️ Warning: Could not import optimized_data_manager: {e}")
            # Continue without cache invalidation - the operation will still succeed

        serializer = self.get_serializer(appointment)
        return Response(
            {
                "message": "Journey started successfully. Driving to client location.",
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
        appointment.save()  # Create notifications
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
        """Driver marks therapist(s) as dropped off and completes their transport"""
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
            )  # Update status to dropped_off - therapist can now start session
        appointment.status = "dropped_off"
        appointment.dropped_off_at = timezone.now()
        appointment.save()

        # Mark driver as available for new assignments
        if appointment.driver:
            appointment.driver.last_available_at = timezone.now()
            appointment.driver.save()

        # Create notifications
        self._create_notifications(
            appointment,
            "therapist_dropped_off",
            f"Therapist(s) dropped off at {appointment.client}. Transport completed for driver. Therapist can start session.",
        )

        serializer = self.get_serializer(appointment)
        message = "Therapist(s) dropped off successfully. Transport completed! You are now available for new assignments."
        return Response({"message": message, "appointment": serializer.data})

    @action(detail=True, methods=["post"])
    def start_session(self, request, pk=None):
        """Therapist starts the session (for cases where driver drop-off doesn't auto-start)"""
        appointment = self.get_object()

        # Check if user is authorized to start session
        if (
            request.user != appointment.therapist
            and request.user not in appointment.therapists.all()
        ):
            return Response(
                {"error": "Only assigned therapists can start sessions"},
                status=status.HTTP_403_FORBIDDEN,
            )  # Check if session can be started - only when dropped off at client location
        if appointment.status != "dropped_off":
            return Response(
                {
                    "error": "Session can only be started after being dropped off at client location"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Start the session
        appointment.status = "session_in_progress"
        appointment.session_started_at = timezone.now()
        appointment.save()

        # Create notifications
        self._create_notifications(
            appointment,
            "session_started",
            f"Therapy session for {appointment.client} has been started by {request.user.get_full_name()}.",
        )

        serializer = self.get_serializer(appointment)
        return Response(
            {"message": "Session started successfully.", "appointment": serializer.data}
        )

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
        appointment.save()  # Create notifications
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
        """Operator verifies payment received and marks appointment complete"""
        appointment = self.get_object()

        # Debug logging to track payment amount issue
        print(f"🔍 mark_completed: Request data received: {request.data}")
        print(f"🔍 mark_completed: Appointment ID: {appointment.id}")
        print(
            f"🔍 mark_completed: Current payment_amount in DB: {appointment.payment_amount}"
        )

        # Only operators can verify payments and mark appointments as completed
        if request.user.role != "operator":
            return Response(
                {
                    "error": "Only operators can verify payments and mark appointments complete"
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "awaiting_payment":
            return Response(
                {
                    "error": "Can only verify payment when appointment is awaiting payment"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_method = request.data.get("payment_method", "cash")
        payment_amount = request.data.get("payment_amount", 0)

        # Debug logging for payment amount processing
        print(f"🔍 mark_completed: Extracted payment_method: {payment_method}")
        print(
            f"🔍 mark_completed: Extracted payment_amount: {payment_amount} (type: {type(payment_amount)})"
        )

        # Ensure payment_amount is properly converted to Decimal
        try:
            payment_amount = float(payment_amount) if payment_amount else 0
            print(
                f"🔍 mark_completed: Converted payment_amount to float: {payment_amount}"
            )
        except (ValueError, TypeError) as e:
            print(f"❌ mark_completed: Error converting payment_amount: {e}")
            payment_amount = 0

        appointment.status = "completed"  # Mark as completed after payment
        appointment.payment_status = "paid"
        appointment.payment_method = payment_method
        appointment.payment_amount = payment_amount
        appointment.payment_verified_at = timezone.now()
        appointment.session_end_time = timezone.now()  # Set when session actually ends

        print(
            f"🔍 mark_completed: Before save - appointment.payment_amount: {appointment.payment_amount}"
        )
        appointment.save()
        print(
            f"✅ mark_completed: After save - appointment.payment_amount: {appointment.payment_amount}"
        )

        # Create notifications
        self._create_notifications(
            appointment,
            "payment_verified",
            f"Payment verified by operator. Received {payment_amount} via {payment_method}.",
        )

        serializer = self.get_serializer(appointment)
        return Response(
            {
                "message": f"Payment verified successfully. Received {payment_amount} via {payment_method}.",
                "appointment": serializer.data,
            }
        )

    @action(detail=True, methods=["post"])
    def mark_payment_received(self, request, pk=None):
        """Operator marks payment as received and verifies appointment completion"""
        appointment = self.get_object()

        # Debug logging to track payment amount issue
        print(f"🔍 mark_payment_received: Request data received: {request.data}")
        print(f"🔍 mark_payment_received: Appointment ID: {appointment.id}")
        print(
            f"🔍 mark_payment_received: Current payment_amount in DB: {appointment.payment_amount}"
        )

        # Only operators can verify payments and mark appointments as completed
        if request.user.role != "operator":
            return Response(
                {
                    "error": "Only operators can verify payments and mark appointments complete"
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if appointment.status != "awaiting_payment":
            return Response(
                {
                    "error": "Can only verify payment when appointment is awaiting payment"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        payment_method = request.data.get("payment_method", "cash")
        payment_amount = request.data.get("payment_amount", 0)
        payment_notes = request.data.get("payment_notes", "")

        # Debug logging for payment amount processing
        print(f"🔍 mark_payment_received: Extracted payment_method: {payment_method}")
        print(
            f"🔍 mark_payment_received: Extracted payment_amount: {payment_amount} (type: {type(payment_amount)})"
        )
        print(f"🔍 mark_payment_received: Extracted payment_notes: {payment_notes}")

        # Ensure payment_amount is properly converted to Decimal
        try:
            payment_amount = float(payment_amount) if payment_amount else 0
            print(
                f"🔍 mark_payment_received: Converted payment_amount to float: {payment_amount}"
            )
        except (ValueError, TypeError) as e:
            print(f"❌ mark_payment_received: Error converting payment_amount: {e}")
            payment_amount = 0

        appointment.status = "completed"  # Mark as completed after payment
        appointment.payment_status = "paid"
        appointment.payment_method = payment_method
        appointment.payment_amount = payment_amount
        appointment.payment_verified_at = timezone.now()
        appointment.session_end_time = timezone.now()  # Set when session actually ends
        if payment_notes:
            appointment.notes = (
                appointment.notes + f"\nPayment Notes: {payment_notes}"
                if appointment.notes
                else f"Payment Notes: {payment_notes}"
            )

        print(
            f"🔍 mark_payment_received: Before save - appointment.payment_amount: {appointment.payment_amount}"
        )
        appointment.save()
        print(
            f"✅ mark_payment_received: After save - appointment.payment_amount: {appointment.payment_amount}"
        )

        # Create notifications
        self._create_notifications(
            appointment,
            "payment_verified",
            f"Payment verified by operator. Received {payment_amount} via {payment_method}.",
        )

        serializer = self.get_serializer(appointment)
        response_data = serializer.data
        print(
            f"🔍 mark_payment_received: Serialized response payment_amount: {response_data.get('payment_amount')}"
        )

        return Response(
            {
                "message": f"Payment verified successfully. Received {payment_amount} via {payment_method}.",
                "appointment": response_data,
            }
        )

    @action(detail=True, methods=["post"])
    def request_pickup(self, request, pk=None):
        """Therapist requests pickup after session completion with automatic driver assignment"""
        appointment = self.get_object()

        # Only the assigned therapist(s) can request pickup
        user = request.user
        is_assigned_therapist = (
            user == appointment.therapist
            or appointment.therapists.filter(id=user.id).exists()
        )

        if not is_assigned_therapist:
            return Response(
                {
                    "error": "You don't have permission to request pickup for this appointment"
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        # Appointment must be completed to request pickup
        if appointment.status != "completed":
            return Response(
                {"error": "Pickup can only be requested for completed appointments"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get pickup details from request
        pickup_urgency = request.data.get("pickup_urgency", "normal")
        pickup_notes = request.data.get(
            "pickup_notes", ""
        )  # Step 1: Try to auto-assign an available driver using enhanced FIFO logic
        available_driver = self._get_next_available_driver_for_pickup(appointment)

        if available_driver:
            # Auto-assign the driver and require confirmation
            appointment.status = "driver_assigned_pickup"
            appointment.pickup_urgency = pickup_urgency
            appointment.pickup_notes = pickup_notes
            appointment.pickup_request_time = timezone.now()
            appointment.driver = (
                available_driver  # Use the main driver field for pickup assignment
            )

            # Set estimated pickup time based on urgency
            from datetime import timedelta

            if pickup_urgency == "urgent":
                appointment.estimated_pickup_time = timezone.now() + timedelta(
                    minutes=15
                )
            else:
                appointment.estimated_pickup_time = timezone.now() + timedelta(
                    minutes=20
                )

            appointment.save()

            # Create notifications for driver confirmation requirement
            self._create_notifications(
                appointment,
                "driver_assigned_pickup",
                f"🚖 PICKUP ASSIGNMENT: Driver {available_driver.get_full_name()} automatically assigned for pickup. "
                f"Client: {appointment.client}, Location: {appointment.location}. "
                f"Urgency: {pickup_urgency.upper()}. Driver must CONFIRM to proceed.",
            )

            # Send WebSocket notification to driver
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "appointments",
                {
                    "type": "appointment_message",
                    "message": {
                        "type": "pickup_assignment",
                        "appointment_id": appointment.id,
                        "driver_id": available_driver.id,
                        "urgency": pickup_urgency,
                        "message": "You have been assigned for pickup. Please confirm to proceed.",
                        "status": appointment.status,
                    },
                },
            )

            message = f"✅ Pickup request processed! Driver {available_driver.get_full_name()} automatically assigned and notified. Driver must confirm pickup to proceed."
        else:
            # Step 2: No available drivers - check if there are busy drivers with today's availability
            busy_available_drivers = self._get_busy_drivers_with_availability(
                appointment.date
            )

            if busy_available_drivers:
                # Set status for manual operator assignment from busy drivers
                appointment.status = "pickup_requested"
                appointment.pickup_urgency = pickup_urgency
                appointment.pickup_notes = pickup_notes
                appointment.pickup_request_time = timezone.now()
                appointment.save()

                # Create notifications for operator manual assignment
                self._create_notifications(
                    appointment,
                    "pickup_requested",
                    f"🔄 MANUAL ASSIGNMENT REQUIRED: Pickup requested by therapist for {appointment.client}. "
                    f"Urgency: {pickup_urgency.upper()}. All drivers busy but {len(busy_available_drivers)} drivers available today. "
                    f"Operator must manually assign from Driver Selector.",
                )

                message = f"⚠️ Pickup request sent. All drivers currently busy, but {len(busy_available_drivers)} drivers are available today. Operator will manually assign from Driver Selector."
            else:
                # No drivers available at all for today
                appointment.status = "pickup_requested"
                appointment.pickup_urgency = pickup_urgency
                appointment.pickup_notes = pickup_notes
                appointment.pickup_request_time = timezone.now()
                appointment.save()

                # Create notifications for no drivers available
                self._create_notifications(
                    appointment,
                    "pickup_requested",
                    f"❌ NO DRIVERS AVAILABLE: Pickup requested by therapist for {appointment.client}. "
                    f"Urgency: {pickup_urgency.upper()}. No drivers available today. Operator intervention required.",
                )

                message = "❌ Pickup request sent. No drivers available today. Operator intervention required."

        serializer = self.get_serializer(appointment)
        return Response(
            {
                "message": message,
                "appointment": serializer.data,
                "auto_assigned": available_driver is not None,
                "driver_assigned": (
                    available_driver.get_full_name() if available_driver else None
                ),
            }
        )

    @action(detail=True, methods=["post"])
    def confirm_pickup(self, request, pk=None):
        """Driver confirms pickup assignment"""
        appointment = self.get_object()

        # Only the assigned driver can confirm pickup
        if request.user != appointment.driver:
            return Response(
                {"error": "You can only confirm pickup assignments assigned to you"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Can only confirm pickup when status is driver_assigned_pickup
        if appointment.status != "driver_assigned_pickup":
            return Response(
                {
                    "error": f"Cannot confirm pickup for appointment in {appointment.status} status. Only driver_assigned_pickup appointments can be confirmed."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Update status to return_journey (driver confirmed and is en route for pickup)
        appointment.status = "return_journey"
        appointment.pickup_confirmed_at = timezone.now()
        appointment.save()

        # Create notifications
        self._create_notifications(
            appointment,
            "pickup_confirmed",
            f"✅ Pickup confirmed by driver {request.user.get_full_name()}. "
            f"Driver is now en route to pick up therapist from {appointment.location}.",
        )

        # Send WebSocket notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": "pickup_confirmed",
                    "appointment_id": appointment.id,
                    "driver_id": request.user.id,
                    "therapist_id": (
                        appointment.therapist.id if appointment.therapist else None
                    ),
                    "message": f"Pickup confirmed. Driver en route for pickup.",
                    "status": appointment.status,
                },
            },
        )

        serializer = self.get_serializer(appointment)
        return Response(
            {
                "message": "Pickup confirmed successfully! En route to pick up therapist.",
                "appointment": serializer.data,
            }
        )

    @action(detail=True, methods=["post"])
    def reject_pickup(self, request, pk=None):
        """Driver rejects pickup assignment"""
        appointment = self.get_object()

        # Only the assigned driver can reject pickup
        if request.user != appointment.driver:
            return Response(
                {"error": "You can only reject pickup assignments assigned to you"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Can only reject pickup when status is driver_assigned_pickup
        if appointment.status != "driver_assigned_pickup":
            return Response(
                {
                    "error": f"Cannot reject pickup for appointment in {appointment.status} status"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get rejection reason
        reason = request.data.get("reason", "").strip()
        if not reason:
            return Response(
                {"error": "Rejection reason is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )  # Reset to pickup_requested status for operator reassignment
        appointment.status = "pickup_requested"
        appointment.driver = None  # Remove driver assignment
        # Use notes field for rejection reason since pickup_rejection_reason might not exist
        appointment.pickup_notes = f"REJECTED: {reason}"
        appointment.save()

        # Create notifications
        self._create_notifications(
            appointment,
            "pickup_rejected",
            f"❌ Pickup rejected by driver {request.user.get_full_name()}. "
            f"Reason: {reason}. Reassignment required by operator.",
        )

        # Send WebSocket notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": "pickup_rejected",
                    "appointment_id": appointment.id,
                    "driver_id": request.user.id,
                    "therapist_id": (
                        appointment.therapist.id if appointment.therapist else None
                    ),
                    "message": f"Pickup rejected. Reassignment required.",
                    "reason": reason,
                    "status": appointment.status,
                },
            },
        )

        serializer = self.get_serializer(appointment)
        return Response(
            {
                "message": "Pickup rejected. The appointment will be reassigned to another driver.",
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
            elif appointment.status == "therapist_confirmed":
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

    @action(detail=True, methods=["post"])
    def complete_return_journey(self, request, pk=None):
        """Driver completes return journey after picking up therapist"""
        appointment = self.get_object()

        # Only the assigned driver can complete return journey
        if request.user != appointment.driver:
            return Response(
                {"error": "You can only complete return journeys assigned to you"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Can only complete return journey when status is return_journey
        if appointment.status != "return_journey":
            return Response(
                {
                    "error": f"Cannot complete return journey for appointment in {appointment.status} status"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )  # Mark appointment as fully completed (transport cycle finished)
        appointment.status = "transport_completed"  # Different from session completion
        appointment.return_journey_completed_at = (
            timezone.now()
        )  # Mark when return journey ended
        appointment.save()

        # Update driver status to available
        request.user.current_location = "Available"
        request.user.last_available_at = timezone.now()
        request.user.save()

        # Create notifications
        self._create_notifications(
            appointment,
            "return_journey_completed",
            f"✅ Return journey completed by driver {request.user.get_full_name()}. "
            f"Therapist {appointment.therapist.get_full_name() if appointment.therapist else 'Unknown'} "
            f"has been safely returned from {appointment.location}.",
        )

        # Send WebSocket notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "appointment_message",
                "message": {
                    "type": "return_journey_completed",
                    "appointment_id": appointment.id,
                    "driver_id": request.user.id,
                    "therapist_id": (
                        appointment.therapist.id if appointment.therapist else None
                    ),
                    "message": f"Return journey completed successfully.",
                    "status": appointment.status,
                },
            },
        )

        serializer = self.get_serializer(appointment)
        return Response(
            {
                "message": f"Return journey completed successfully! Therapist safely returned to pickup location.",
                "appointment": serializer.data,
            }
        )

    # Custom paginated endpoints for different appointment views
    @action(detail=False, methods=["get"])
    def rejected(self, request):
        """Get rejected appointments with pagination"""
        queryset = self.filter_queryset(self.get_queryset().filter(status="rejected"))
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def pending(self, request):
        """Get pending appointments with pagination"""
        queryset = self.filter_queryset(self.get_queryset().filter(status="pending"))
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def timeout(self, request):
        """Get timeout appointments with pagination"""
        from django.utils import timezone

        # Appointments that are pending for more than 24 hours
        timeout_threshold = timezone.now() - timedelta(hours=24)
        queryset = self.filter_queryset(
            self.get_queryset().filter(
                status="pending", created_at__lt=timeout_threshold
            )
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def awaiting_payment(self, request):
        """Get appointments awaiting payment with pagination"""
        queryset = self.filter_queryset(
            self.get_queryset().filter(status="awaiting_payment")
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def active_sessions(self, request):
        """Get active session appointments with pagination"""
        queryset = self.filter_queryset(
            self.get_queryset().filter(status="in_progress")
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def pickup_requests(self, request):
        """Get appointments with pickup requests with pagination"""
        queryset = self.filter_queryset(
            self.get_queryset().filter(pickup_requested=True)
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class StaffViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing staff members (therapists, drivers, operators) - OPTIMIZED
    """

    serializer_class = UserSerializer
    filter_backends = [filters.SearchFilter, DjangoFilterBackend]
    search_fields = ["first_name", "last_name", "email", "role"]
    filterset_fields = ["role", "is_active"]

    def get_permissions(self):
        """
        Allow all authenticated users to read staff info, but only operators to modify
        """
        if self.action in ["list", "retrieve", "active_staff"]:
            permission_classes = [permissions.IsAuthenticated]
        else:
            permission_classes = [permissions.IsAuthenticated, IsOperator]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        """Return all staff members - OPTIMIZED"""
        # OPTIMIZATION: Use select_related for any related fields that might be accessed
        # and defer fields that are not commonly needed in list views
        return (
            CustomUser.objects.filter(role__in=["therapist", "driver", "operator"])
            .select_related()
            .defer("password", "last_login")
            .order_by("role", "first_name", "last_name")
        )

    @action(detail=False, methods=["get"])
    def active_staff(self, request):
        """Get only active staff members - OPTIMIZED for common use case"""
        try:
            # OPTIMIZATION: Filter by active status and specific role if provided
            role = request.query_params.get("role")

            queryset = (
                CustomUser.objects.filter(
                    role__in=["therapist", "driver", "operator"], is_active=True
                )
                .select_related()
                .defer("password", "last_login")
                .order_by("role", "first_name", "last_name")
            )

            if role and role in ["therapist", "driver", "operator"]:
                queryset = queryset.filter(role=role)

            # Use the serializer to format the response
            serializer = self.get_serializer(queryset, many=True)

            return Response(
                {
                    "staff": serializer.data,
                    "count": len(serializer.data),
                    "filter": {"role": role, "is_active": True},
                }
            )

        except Exception as e:
            logger.error(f"Error getting active staff: {e}")
            return Response(
                {"error": "Failed to get active staff members"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ServiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing services
    """

    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "description"]

    def get_queryset(self):
        """Return all services"""
        return Service.objects.all()


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notifications with server-side pagination
    """

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = NotificationsPagination
    filter_backends = [
        filters.SearchFilter,
        DjangoFilterBackend,
        filters.OrderingFilter,
    ]
    search_fields = ["message", "notification_type"]
    filterset_fields = ["is_read", "notification_type"]
    ordering_fields = ["created_at", "is_read"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Return notifications for the current user with role-based filtering - OPTIMIZED"""
        try:
            # OPTIMIZATION: Build optimized base queryset with minimal select_related
            # Avoid double-joining on appointment fields that we may not need
            queryset = (
                Notification.objects.filter(user=self.request.user)
                .select_related(
                    "user",
                    "appointment__client",
                    "appointment__therapist",
                    "appointment__driver",
                    "rejection",
                )
                .order_by("-created_at")
                # OPTIMIZATION: Use defer to exclude large text fields we don't need in lists
                .defer("message")  # Load message only when needed
            )

            # Apply role-based filtering with optimized queries
            user_role = getattr(self.request.user, "role", None)

            # TEMPORARY FIX: Disable strict role filtering to show all notifications
            # This is a temporary fix to debug why notifications aren't showing
            logger.info(
                f"🔧 TEMPORARY FIX: Showing all notifications for {user_role} user {self.request.user.username}"
            )

            # Comment out the restrictive filtering for now
            # if user_role == "therapist":
            #     # OPTIMIZATION: Use more specific Q objects to reduce query complexity
            #     queryset = queryset.exclude(
            #         notification_type__in=[
            #             "appointment_auto_cancelled",  # This is sent only to operators
            #         ]
            #     ).filter(
            #         # Only show notifications where the therapist is directly involved
            #         models.Q(appointment__therapist=self.request.user)
            #         | models.Q(appointment__therapists=self.request.user)
            #         | models.Q(appointment__isnull=True)  # General notifications
            #     )

            #     logger.debug(
            #         f"Therapist {self.request.user.username}: Filtered to role-relevant notifications"
            #     )

            # elif user_role == "driver":
            #     # OPTIMIZATION: Use more specific Q objects to reduce query complexity
            #     queryset = queryset.exclude(
            #         notification_type__in=[
            #             "appointment_auto_cancelled",  # Operator-only notifications
            #             "rejection_reviewed",  # Therapist-operator communication
            #             "therapist_disabled",  # Therapist-specific notifications
            #         ]
            #     ).filter(
            #         # Only show notifications where the driver is directly involved
            #         models.Q(appointment__driver=self.request.user)
            #         | models.Q(appointment__isnull=True)  # General notifications
            #     )

            #     logger.debug(
            #         f"Driver {self.request.user.username}: Filtered to role-relevant notifications"
            #     )

            # Operators see all notifications (no additional filtering)
            # This maintains backward compatibility for operators

            # OPTIMIZATION: Only log count in debug mode to avoid extra query
            if logger.isEnabledFor(logging.DEBUG):
                logger.debug(
                    f"NotificationViewSet: Found {queryset.count()} notifications for {user_role} user {self.request.user.username}"
                )

            return queryset

        except Exception as e:
            logger.error(f"NotificationViewSet get_queryset error: {e}", exc_info=True)
            # Return empty queryset if there's an error
            return Notification.objects.none()

    def list(self, request, *args, **kwargs):
        """List notifications with enhanced error handling - OPTIMIZED"""
        try:
            logger.debug(
                f"NotificationViewSet list called for user: {request.user.username}"
            )

            # OPTIMIZATION: Get counts more efficiently with single queries
            try:
                # Use aggregate to get both counts in a single query
                from django.db.models import Count, Case, When, IntegerField

                counts = Notification.objects.filter(user=request.user).aggregate(
                    total_notifications=Count("id"),
                    unread_notifications=Count(
                        Case(When(is_read=False, then=1), output_field=IntegerField())
                    ),
                )
                total_notifications = counts["total_notifications"]
                unread_notifications = counts["unread_notifications"]

                logger.debug(
                    f"User {request.user.username} has {total_notifications} total notifications, {unread_notifications} unread"
                )
            except Exception as count_error:
                logger.warning(f"Error counting notifications: {count_error}")
                total_notifications = 0
                unread_notifications = 0

            # Get the actual queryset
            queryset = self.get_queryset()

            # Apply any filtering
            try:
                # Set up the viewset properly for filtering
                self.format_kwarg = getattr(self, "format_kwarg", None)
                queryset = self.filter_queryset(queryset)
            except Exception as filter_error:
                logger.warning(f"Error filtering queryset: {filter_error}")
                # Use unfiltered queryset if filtering fails
                queryset = self.get_queryset()

            # OPTIMIZATION: Limit queryset to recent notifications if no specific filtering
            # This prevents loading thousands of old notifications
            if not any(
                [
                    request.query_params.get("search"),
                    request.query_params.get("is_read"),
                    request.query_params.get("notification_type"),
                ]
            ):
                # Limit to last 100 notifications for performance
                queryset = queryset[:100]

            # Paginate if needed
            try:
                page = self.paginate_queryset(queryset)
                if page is not None:
                    # Ensure format_kwarg is set for serializer context
                    self.format_kwarg = getattr(self, "format_kwarg", None)
                    serializer = self.get_serializer(page, many=True)
                    return self.get_paginated_response(
                        {
                            "notifications": serializer.data,
                            "unreadCount": unread_notifications,
                        }
                    )
            except Exception as pagination_error:
                logger.warning(
                    f"Pagination error, using full queryset: {pagination_error}"
                )

            # Serialize data with error handling
            try:
                # Ensure format_kwarg is set for serializer context
                self.format_kwarg = getattr(self, "format_kwarg", None)
                serializer = self.get_serializer(queryset, many=True)
                serialized_data = serializer.data

                logger.debug(
                    f"Successfully serialized {len(serialized_data)} notifications"
                )

                return Response(
                    {
                        "notifications": serialized_data,
                        "unreadCount": unread_notifications,
                        "totalCount": total_notifications,
                    }
                )
            except Exception as serialization_error:
                logger.error(
                    f"Serialization error: {serialization_error}", exc_info=True
                )

                # OPTIMIZATION: Simplified error handling - return empty list with error info
                return Response(
                    {
                        "notifications": [],
                        "unreadCount": unread_notifications,
                        "totalCount": total_notifications,
                        "error": "Some notifications could not be loaded",
                        "detail": str(serialization_error),
                    }
                )

        except Exception as e:
            logger.error(f"NotificationViewSet list error: {e}", exc_info=True)
            return Response(
                {
                    "error": "Failed to fetch notifications",
                    "detail": str(e),
                    "notifications": [],
                    "unreadCount": 0,
                    "totalCount": 0,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def mark_as_read(self, request, pk=None):
        """Mark notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({"status": "marked as read"})

    @action(detail=True, methods=["post"])
    def mark_as_unread(self, request, pk=None):
        """Mark notification as unread"""
        notification = self.get_object()
        notification.is_read = False
        notification.save()
        return Response({"status": "marked as unread"})

    @action(detail=False, methods=["get"])
    def debug_all(self, request):
        """Debug endpoint to see all notifications for a user without role filtering"""
        try:
            logger.info(
                f"🔧 DEBUG: Fetching all notifications for user {request.user.username} ({request.user.role})"
            )

            # Get ALL notifications for this user without role filtering
            queryset = Notification.objects.filter(user=request.user).order_by(
                "-created_at"
            )[:50]

            # Log what we found
            total_count = Notification.objects.filter(user=request.user).count()
            unread_count = Notification.objects.filter(
                user=request.user, is_read=False
            ).count()

            logger.info(
                f"🔧 DEBUG: Found {total_count} total notifications, {unread_count} unread for {request.user.username}"
            )

            # Log notification types
            notification_types = list(
                queryset.values_list("notification_type", flat=True).distinct()
            )
            logger.info(f"🔧 DEBUG: Notification types: {notification_types}")

            # Try to serialize
            serializer = self.get_serializer(queryset, many=True)
            serialized_data = serializer.data

            logger.info(
                f"🔧 DEBUG: Successfully serialized {len(serialized_data)} notifications"
            )

            return Response(
                {
                    "notifications": serialized_data,
                    "total_count": total_count,
                    "unread_count": unread_count,
                    "user_role": getattr(request.user, "role", "unknown"),
                    "notification_types": notification_types,
                    "debug": True,
                    "message": "Debug endpoint - no role filtering applied",
                }
            )

        except Exception as e:
            logger.error(f"🔧 DEBUG endpoint error: {e}", exc_info=True)
            return Response(
                {
                    "error": str(e),
                    "notifications": [],
                    "total_count": 0,
                    "unread_count": 0,
                    "debug": True,
                    "message": "Debug endpoint failed",
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"])
    def mark_all_as_read(self, request):
        """Mark all notifications as read for the current user - OPTIMIZED"""
        # OPTIMIZATION: Use bulk_update or raw SQL for better performance
        # when marking many notifications as read
        try:
            count = Notification.objects.filter(
                user=request.user, is_read=False
            ).update(is_read=True)
            logger.debug(
                f"Marked {count} notifications as read for user {request.user.username}"
            )
            return Response({"status": f"marked {count} notifications as read"})
        except Exception as e:
            logger.error(f"Error marking notifications as read: {e}")
            return Response(
                {"error": "Failed to mark notifications as read"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
