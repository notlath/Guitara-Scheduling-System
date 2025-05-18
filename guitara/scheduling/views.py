from rest_framework import viewsets, permissions, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, DateFilter, TimeFilter, CharFilter
from .models import Client, Availability, Appointment, Notification
from .serializers import (
    ClientSerializer,
    AvailabilitySerializer,
    AppointmentSerializer,
    NotificationSerializer,
    UserSerializer,
    ServiceSerializer
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
    filterset_fields = ['first_name', 'last_name', 'phone_number']
    search_fields = ['first_name', 'last_name', 'phone_number', 'email', 'address']

class AvailabilityFilter(FilterSet):
    date_after = DateFilter(field_name="date", lookup_expr="gte")
    date_before = DateFilter(field_name="date", lookup_expr="lte")

    class Meta:
        model = Availability
        fields = {
            'user': ['exact'],
            'date': ['exact'],
            'is_available': ['exact'],
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
        if user.role == 'operator':
            return Availability.objects.all()
        # Therapists and drivers can only see their own availability
        return Availability.objects.filter(user=user)

    @action(detail=False, methods=['get'])
    def available_therapists(self, request):
        """Get all available therapists for a given date and time range"""
        date_str = request.query_params.get('date')
        start_time_str = request.query_params.get('start_time')
        end_time_str = request.query_params.get('end_time')
        specialization = request.query_params.get('specialization')
        massage_pressure = request.query_params.get('massage_pressure')

        if not all([date_str, start_time_str, end_time_str]):
            return Response(
                {"error": "Date, start time and end time are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
            start_time = datetime.strptime(start_time_str, '%H:%M').time()
            end_time = datetime.strptime(end_time_str, '%H:%M').time()
        except ValueError:
            return Response(
                {"error": "Invalid date or time format. Use YYYY-MM-DD for date and HH:MM for time"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Start with therapists who have availability at this time
        available_therapists_query = CustomUser.objects.filter(
            role='therapist',
            availabilities__date=date_obj,
            availabilities__start_time__lte=start_time,
            availabilities__end_time__gte=end_time,
            availabilities__is_available=True
        ).distinct()

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
        conflicting_therapists = CustomUser.objects.filter(
            therapist_appointments__date=date_obj,
            therapist_appointments__status__in=['pending', 'confirmed', 'in_progress'],
        ).filter(
            Q(therapist_appointments__start_time__lte=end_time) &
            Q(therapist_appointments__end_time__gte=start_time)
        ).distinct()

        available_therapists = available_therapists_query.exclude(
            pk__in=conflicting_therapists
        )

        serializer = UserSerializer(available_therapists, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def available_drivers(self, request):
        """Get all available drivers for a given date and time range"""
        date_str = request.query_params.get('date')
        start_time_str = request.query_params.get('start_time')
        end_time_str = request.query_params.get('end_time')

        if not all([date_str, start_time_str, end_time_str]):
            return Response(
                {"error": "Date, start time and end time are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
            start_time = datetime.strptime(start_time_str, '%H:%M').time()
            end_time = datetime.strptime(end_time_str, '%H:%M').time()
        except ValueError:
            return Response(
                {"error": "Invalid date or time format. Use YYYY-MM-DD for date and HH:MM for time"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Start with drivers who have availability at this time
        available_drivers_query = CustomUser.objects.filter(
            role='driver',
            availabilities__date=date_obj,
            availabilities__start_time__lte=start_time,
            availabilities__end_time__gte=end_time,
            availabilities__is_available=True
        ).distinct()

        # Exclude drivers who have conflicting appointments
        conflicting_drivers = CustomUser.objects.filter(
            driver_appointments__date=date_obj,
            driver_appointments__status__in=['pending', 'confirmed', 'in_progress'],
        ).filter(
            Q(driver_appointments__start_time__lte=end_time) &
            Q(driver_appointments__end_time__gte=start_time)
        ).distinct()

        available_drivers = available_drivers_query.exclude(
            pk__in=conflicting_drivers
        )

        serializer = UserSerializer(available_drivers, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Create multiple availability slots at once"""
        if not request.user.is_authenticated:
            return Response(status=status.HTTP_401_UNAUTHORIZED)

        user_id = request.data.get('user_id', request.user.id)
        if request.user.role == 'operator' or str(request.user.id) == str(user_id):
            date_str = request.data.get('date')
            slots = request.data.get('slots', [])

            if not date_str or not slots:
                return Response(
                    {"error": "Date and slots are required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {"error": "Invalid date format. Use YYYY-MM-DD"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user = CustomUser.objects.get(id=user_id)
            if user.role not in ['therapist', 'driver']:
                return Response(
                    {"error": "Only therapists and drivers can have availability slots"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            created_slots = []
            errors = []

            for slot in slots:
                try:
                    start_time_str = slot.get('start_time')
                    end_time_str = slot.get('end_time')
                    is_available = slot.get('is_available', True)

                    start_time = datetime.strptime(start_time_str, '%H:%M').time()
                    end_time = datetime.strptime(end_time_str, '%H:%M').time()

                    if start_time >= end_time:
                        errors.append(f"Start time {start_time} must be before end time {end_time}")
                        continue

                    # Check for overlapping slots
                    overlapping = Availability.objects.filter(
                        user=user,
                        date=date_obj,
                        is_available=is_available
                    )

                    has_overlap = False
                    for existing_slot in overlapping:
                        if (start_time <= existing_slot.end_time and
                            end_time >= existing_slot.start_time):
                            errors.append(f"Time slot {start_time}-{end_time} overlaps with existing slot")
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
                        is_available=is_available
                    )

                    created_slots.append(availability)

                except ValueError as e:
                    errors.append(f"Invalid time format in slot: {e}")
                except Exception as e:
                    errors.append(f"Error creating slot: {e}")

            # Serialize created slots
            serializer = self.get_serializer(created_slots, many=True)

            response_data = {
                'created_slots': serializer.data,
                'errors': errors
            }

            return Response(response_data, status=status.HTTP_201_CREATED if created_slots else status.HTTP_400_BAD_REQUEST)
        else:
            return Response(
                {"error": "You can only manage your own availability"},
                status=status.HTTP_403_FORBIDDEN
            )

class AppointmentFilter(FilterSet):
    date_after = DateFilter(field_name="date", lookup_expr="gte")
    date_before = DateFilter(field_name="date", lookup_expr="lte")
    start_time_after = TimeFilter(field_name="start_time", lookup_expr="gte")
    start_time_before = TimeFilter(field_name="start_time", lookup_expr="lte")
    client_name = CharFilter(method='filter_client_name')

    def filter_client_name(self, queryset, name, value):
        return queryset.filter(
            Q(client__first_name__icontains=value) |
            Q(client__last_name__icontains=value)
        )

    class Meta:
        model = Appointment
        fields = {
            'status': ['exact', 'in'],
            'payment_status': ['exact', 'in'],
            'therapist': ['exact'],
            'driver': ['exact'],
            'operator': ['exact'],
            'date': ['exact'],
        }

class AppointmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing appointments/bookings
    """
    serializer_class = AppointmentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_class = AppointmentFilter
    search_fields = ['client__first_name', 'client__last_name', 'client__phone_number', 'location']

    def get_queryset(self):
        user = self.request.user

        # Operators can see all appointments
        if user.role == 'operator':
            return Appointment.objects.all()

        # Therapists can see their own appointments
        elif user.role == 'therapist':
            return Appointment.objects.filter(therapist=user)

        # Drivers can see their own appointments
        elif user.role == 'driver':
            return Appointment.objects.filter(driver=user)

        # Other roles can't see any appointments
        return Appointment.objects.none()

    def perform_create(self, serializer):
        # Ensure only operators can create appointments
        if self.request.user.role != 'operator':
            raise permissions.PermissionDenied("Only operators can create appointments")

        # Set the operator to the current user
        serializer.save(operator=self.request.user)

    def perform_update(self, serializer):
        # Ensure only operators can update appointments or staff can update specific fields
        user = self.request.user
        instance = self.get_object()

        if user.role == 'operator':
            # Operators can update any field
            serializer.save()
        elif user.role == 'therapist' and instance.therapist == user:
            # Therapists can only update the status
            serializer.save(updated_fields=['status'])
        elif user.role == 'driver' and instance.driver == user:
            # Drivers can only update the status
            serializer.save(updated_fields=['status'])
        else:
            raise permissions.PermissionDenied("You don't have permission to update this appointment")

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get all appointments for today"""
        today = date.today()
        appointments = self.filter_queryset(self.get_queryset().filter(date=today))
        serializer = self.get_serializer(appointments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Get all upcoming appointments for the next 7 days"""
        today = date.today()
        week_later = today + timedelta(days=7)

        appointments = self.filter_queryset(
            self.get_queryset().filter(
                date__gte=today,
                date__lte=week_later,
                status__in=['pending', 'confirmed']
            )
        )

        serializer = self.get_serializer(appointments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an appointment"""
        appointment = self.get_object()

        # Only operators, the assigned therapist, or driver can cancel appointments
        user = request.user
        if (user.role != 'operator' and
            user != appointment.therapist and
            user != appointment.driver):
            return Response(
                {"error": "You don't have permission to cancel this appointment"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Update appointment status
        appointment.status = 'cancelled'
        appointment.save()

        # Create notifications for all involved parties
        self._create_notifications(
            appointment,
            'appointment_cancelled',
            f"Appointment for {appointment.client} on {appointment.date} at {appointment.start_time} has been cancelled."
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark an appointment as completed"""
        appointment = self.get_object()

        # Only the assigned therapist, driver or operators can complete appointments
        user = request.user
        if (user.role != 'operator' and
            user != appointment.therapist and
            user != appointment.driver):
            return Response(
                {"error": "You don't have permission to complete this appointment"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Update appointment status
        appointment.status = 'completed'
        appointment.save()

        # Create notifications for all involved parties
        self._create_notifications(
            appointment,
            'appointment_updated',
            f"Appointment for {appointment.client} on {appointment.date} at {appointment.start_time} has been completed."
        )

        serializer = self.get_serializer(appointment)
        return Response(serializer.data)

    def _create_notifications(self, appointment, notification_type, message):
        """Helper method to create notifications for all involved parties"""
        # Create notification for therapist
        if appointment.therapist:
            Notification.objects.create(
                user=appointment.therapist,
                appointment=appointment,
                notification_type=notification_type,
                message=message
            )

        # Create notification for driver
        if appointment.driver:
            Notification.objects.create(
                user=appointment.driver,
                appointment=appointment,
                notification_type=notification_type,
                message=message
            )

        # Create notification for operator
        if appointment.operator:
            Notification.objects.create(
                user=appointment.operator,
                appointment=appointment,
                notification_type=notification_type,
                message=message
            )

        # Send WebSocket notification
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                'type': 'appointment_message',
                'message': {
                    'type': notification_type,
                    'appointment_id': appointment.id,
                    'message': message
                }
            }
        )

class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing notifications
    """
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['user', 'is_read', 'notification_type']

    def get_queryset(self):
        # Users can only see their own notifications
        return Notification.objects.filter(user=self.request.user)

    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Mark all notifications as read"""
        Notification.objects.filter(user=request.user).update(is_read=True)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Mark a notification as read"""
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get the number of unread notifications"""
        count = Notification.objects.filter(user=request.user, is_read=False).count()
        return Response({'count': count})
