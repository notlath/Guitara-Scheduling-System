from rest_framework import serializers
from .models import Client, Availability, Appointment, Notification
from registration.models import Service
from core.models import CustomUser
from datetime import datetime, timedelta

class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = '__all__'

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'name', 'description', 'duration', 'price']

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'first_name', 'last_name', 'role', 
                  'specialization', 'massage_pressure', 'license_number', 
                  'motorcycle_plate', 'phone_number']

class AvailabilitySerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = Availability
        fields = '__all__'
        
    def validate(self, data):
        """
        Check that the start time is before the end time and 
        that there are no overlapping availability slots.
        """
        if data.get('start_time') >= data.get('end_time'):
            raise serializers.ValidationError("Start time must be before end time")
        
        # Check for overlapping availability slots
        if self.instance:  # In case of update
            overlapping = Availability.objects.filter(
                user=data.get('user', self.instance.user),
                date=data.get('date', self.instance.date),
                is_available=data.get('is_available', self.instance.is_available)
            ).exclude(pk=self.instance.pk)
        else:  # In case of create
            overlapping = Availability.objects.filter(
                user=data.get('user'),
                date=data.get('date'),
                is_available=data.get('is_available', True)
            )
        
        for slot in overlapping:
            if ((data.get('start_time') <= slot.end_time and 
                 data.get('end_time') >= slot.start_time)):
                raise serializers.ValidationError(
                    "This time slot overlaps with another availability slot"
                )
        
        return data

class AppointmentSerializer(serializers.ModelSerializer):
    client_details = ClientSerializer(source='client', read_only=True)
    therapist_details = UserSerializer(source='therapist', read_only=True)
    driver_details = UserSerializer(source='driver', read_only=True)
    operator_details = UserSerializer(source='operator', read_only=True)
    services_details = ServiceSerializer(source='services', many=True, read_only=True)
    total_duration = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()
    
    class Meta:
        model = Appointment
        fields = '__all__'
        
    def get_total_duration(self, obj):
        """Calculate the total duration of all services in minutes"""
        total_minutes = 0
        for service in obj.services.all():
            if hasattr(service, 'duration'):
                if isinstance(service.duration, timedelta):
                    total_minutes += service.duration.total_seconds() / 60
                else:
                    # If duration is stored as minutes
                    total_minutes += service.duration
        return total_minutes
    
    def get_total_price(self, obj):
        """Calculate the total price of all services"""
        return sum(service.price for service in obj.services.all())
    
    def validate(self, data):
        """
        Validate appointment data, checking for conflicts and availability
        """
        instance = getattr(self, 'instance', None)
        
        # Validate therapist availability and conflicts
        therapist = data.get('therapist', getattr(instance, 'therapist', None) if instance else None)
        if therapist:
            # Check if therapist is available at this time
            date = data.get('date', getattr(instance, 'date', None) if instance else None)
            start_time = data.get('start_time', getattr(instance, 'start_time', None) if instance else None)
            end_time = data.get('end_time', getattr(instance, 'end_time', None) if instance else None)
            
            if date and start_time and end_time:
                # Check for conflicting appointments
                conflicting_query = Appointment.objects.filter(
                    therapist=therapist,
                    date=date,
                    status__in=['pending', 'confirmed', 'in_progress']
                )
                if instance:
                    conflicting_query = conflicting_query.exclude(pk=instance.pk)
                
                for appointment in conflicting_query:
                    if (start_time <= appointment.end_time and 
                        end_time >= appointment.start_time):
                        raise serializers.ValidationError({
                            'therapist': f"Therapist is already booked during this time slot ({appointment.start_time} - {appointment.end_time})"
                        })
                
                # Check if therapist has marked availability
                has_availability = Availability.objects.filter(
                    user=therapist,
                    date=date,
                    start_time__lte=start_time,
                    end_time__gte=end_time,
                    is_available=True
                ).exists()
                
                if not has_availability:
                    raise serializers.ValidationError({
                        'therapist': "Therapist is not available during this time slot"
                    })
        
        # Validate driver availability and conflicts
        driver = data.get('driver', getattr(instance, 'driver', None) if instance else None)
        if driver:
            # Similar checks for driver
            date = data.get('date', getattr(instance, 'date', None) if instance else None)
            start_time = data.get('start_time', getattr(instance, 'start_time', None) if instance else None)
            end_time = data.get('end_time', getattr(instance, 'end_time', None) if instance else None)
            
            if date and start_time and end_time:
                # Check for conflicting appointments
                conflicting_query = Appointment.objects.filter(
                    driver=driver,
                    date=date,
                    status__in=['pending', 'confirmed', 'in_progress']
                )
                if instance:
                    conflicting_query = conflicting_query.exclude(pk=instance.pk)
                
                for appointment in conflicting_query:
                    if (start_time <= appointment.end_time and 
                        end_time >= appointment.start_time):
                        raise serializers.ValidationError({
                            'driver': f"Driver is already booked during this time slot ({appointment.start_time} - {appointment.end_time})"
                        })
                
                # Check if driver has marked availability
                has_availability = Availability.objects.filter(
                    user=driver,
                    date=date,
                    start_time__lte=start_time,
                    end_time__gte=end_time,
                    is_available=True
                ).exists()
                
                if not has_availability:
                    raise serializers.ValidationError({
                        'driver': "Driver is not available during this time slot"
                    })
                    
        return data

class NotificationSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)
    appointment_details = AppointmentSerializer(source='appointment', read_only=True)
    
    class Meta:
        model = Notification
        fields = '__all__'
