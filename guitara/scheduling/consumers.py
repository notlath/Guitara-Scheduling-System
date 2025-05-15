import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Appointment, Notification, Availability, Client
from core.models import CustomUser
from django.utils.timezone import make_aware
from datetime import datetime

class AppointmentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        
        # Reject connection if user is not authenticated
        if not self.user.is_authenticated:
            await self.close()
            return
        
        # Join appointment group
        await self.channel_layer.group_add(
            "appointments",
            self.channel_name
        )
        
        # Join user-specific group for targeted notifications
        user_group = f"user_{self.user.id}"
        await self.channel_layer.group_add(
            user_group,
            self.channel_name
        )
        
        await self.accept()
        
        # Send initial data upon connection
        if self.user.role == 'operator':
            # Operators get all appointments for today
            appointments = await self.get_today_appointments()
        else:
            # Staff get their own upcoming appointments
            appointments = await self.get_user_appointments()
        
        # Send the initial appointments data
        await self.send(text_data=json.dumps({
            'type': 'initial_data',
            'appointments': appointments
        }))
    
    async def disconnect(self, close_code):
        # Leave appointment group
        await self.channel_layer.group_discard(
            "appointments",
            self.channel_name
        )
        
        # Leave user-specific group
        if hasattr(self, 'user') and self.user.is_authenticated:
            user_group = f"user_{self.user.id}"
            await self.channel_layer.group_discard(
                user_group,
                self.channel_name
            )
    
    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type')
        
        # Handle different message types
        if message_type == 'appointment_update':
            appointment_id = text_data_json.get('appointment_id')
            status = text_data_json.get('status')
            
            # Check permissions based on user role
            if not await self.can_update_appointment(appointment_id):
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': "You don't have permission to update this appointment"
                }))
                return
            
            # Update the appointment in the database
            updated = await self.update_appointment_status(appointment_id, status)
            
            if updated:
                # Fetch the updated appointment details from database
                appointment = await self.get_appointment(appointment_id)
                
                # Create notification for relevant users
                await self.create_appointment_notification(
                    appointment_id,
                    'appointment_updated',
                    f"Appointment status updated to {status}"
                )
                
                # Send message to appointment group
                await self.channel_layer.group_send(
                    "appointments",
                    {
                        'type': 'appointment_message',
                        'message': {
                            'type': 'appointment_update',
                            'appointment_id': appointment_id,
                            'status': appointment.status,
                            'date': appointment.date.isoformat(),
                            'start_time': appointment.start_time.isoformat(),
                            'end_time': appointment.end_time.isoformat(),
                            'therapist_id': appointment.therapist_id,
                            'driver_id': appointment.driver_id,
                        }
                    }
                )
            else:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': "Failed to update appointment"
                }))
                
        elif message_type == 'check_availability':
            date_str = text_data_json.get('date')
            role = text_data_json.get('role')
            specialization = text_data_json.get('specialization', None)
            
            if not date_str or not role:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': "Date and role are required"
                }))
                return
            
            try:
                date_obj = datetime.strptime(date_str, '%Y-%m-%d').date()
                
                # Get available staff members
                if role == 'therapist':
                    availabilities = await self.get_available_therapists(
                        date_obj, specialization
                    )
                else:
                    availabilities = await self.get_available_drivers(date_obj)
                
                await self.send(text_data=json.dumps({
                    'type': 'availability_data',
                    'date': date_str,
                    'role': role,
                    'availabilities': availabilities
                }))
            except ValueError:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': "Invalid date format. Use YYYY-MM-DD"
                }))
    
    # Receive message from appointment group
    async def appointment_message(self, event):
        message = event['message']
        
        # Filter messages based on user role
        user = self.scope['user']
        
        if user.role == 'operator':
            # Operators receive all appointment messages
            await self.send(text_data=json.dumps(message))
        elif user.role == 'therapist' and message.get('therapist_id') == user.id:
            # Therapists only receive messages about their appointments
            await self.send(text_data=json.dumps(message))
        elif user.role == 'driver' and message.get('driver_id') == user.id:
            # Drivers only receive messages about their appointments
            await self.send(text_data=json.dumps(message))
    
    # Receive message for user-specific notifications
    async def user_notification(self, event):
        message = event['message']
        await self.send(text_data=json.dumps(message))
    
    @database_sync_to_async
    def get_appointment(self, appointment_id):
        try:
            return Appointment.objects.get(id=appointment_id)
        except Appointment.DoesNotExist:
            return None
    
    @database_sync_to_async
    def update_appointment_status(self, appointment_id, status):
        try:
            appointment = Appointment.objects.get(id=appointment_id)
            
            # Validate the status is one of the allowed choices
            valid_statuses = [choice[0] for choice in Appointment.STATUS_CHOICES]
            if status not in valid_statuses:
                return False
            
            appointment.status = status
            appointment.save()
            return True
        except Appointment.DoesNotExist:
            return False
    
    @database_sync_to_async
    def can_update_appointment(self, appointment_id):
        user = self.scope['user']
        
        try:
            appointment = Appointment.objects.get(id=appointment_id)
            
            # Operators can update any appointment
            if user.role == 'operator':
                return True
            
            # Therapists can only update their own appointments
            if user.role == 'therapist' and appointment.therapist_id == user.id:
                return True
            
            # Drivers can only update their own appointments
            if user.role == 'driver' and appointment.driver_id == user.id:
                return True
            
            return False
        except Appointment.DoesNotExist:
            return False
    
    @database_sync_to_async
    def create_appointment_notification(self, appointment_id, notification_type, message):
        try:
            appointment = Appointment.objects.get(id=appointment_id)
            
            # Create notification for therapist if assigned
            if appointment.therapist:
                Notification.objects.create(
                    user=appointment.therapist,
                    appointment=appointment,
                    notification_type=notification_type,
                    message=message
                )
            
            # Create notification for driver if assigned
            if appointment.driver:
                Notification.objects.create(
                    user=appointment.driver,
                    appointment=appointment,
                    notification_type=notification_type,
                    message=message
                )
            
            # Create notification for operator if assigned
            if appointment.operator:
                Notification.objects.create(
                    user=appointment.operator,
                    appointment=appointment,
                    notification_type=notification_type,
                    message=message
                )
            
            return True
        except Appointment.DoesNotExist:
            return False
    
    @database_sync_to_async
    def get_today_appointments(self):
        from django.utils import timezone
        from django.forms.models import model_to_dict
        
        today = timezone.now().date()
        appointments = Appointment.objects.filter(date=today)
        
        # Convert appointments to dictionary
        appointment_list = []
        for appointment in appointments:
            appt_dict = {
                'id': appointment.id,
                'client': f"{appointment.client.first_name} {appointment.client.last_name}",
                'date': appointment.date.isoformat(),
                'start_time': appointment.start_time.isoformat(),
                'end_time': appointment.end_time.isoformat(),
                'status': appointment.status,
                'payment_status': appointment.payment_status,
                'location': appointment.location,
            }
            
            if appointment.therapist:
                appt_dict['therapist'] = appointment.therapist.get_full_name()
                appt_dict['therapist_id'] = appointment.therapist.id
            
            if appointment.driver:
                appt_dict['driver'] = appointment.driver.get_full_name()
                appt_dict['driver_id'] = appointment.driver.id
            
            appointment_list.append(appt_dict)
        
        return appointment_list
    
    @database_sync_to_async
    def get_user_appointments(self):
        from django.utils import timezone
        from django.db.models import Q
        
        user = self.scope['user']
        today = timezone.now().date()
        
        # Get upcoming appointments for the user
        if user.role == 'therapist':
            appointments = Appointment.objects.filter(
                therapist=user,
                date__gte=today,
                status__in=['pending', 'confirmed', 'in_progress']
            )
        elif user.role == 'driver':
            appointments = Appointment.objects.filter(
                driver=user,
                date__gte=today,
                status__in=['pending', 'confirmed', 'in_progress']
            )
        else:
            appointments = Appointment.objects.none()
        
        # Convert appointments to dictionary
        appointment_list = []
        for appointment in appointments:
            appt_dict = {
                'id': appointment.id,
                'client': f"{appointment.client.first_name} {appointment.client.last_name}",
                'date': appointment.date.isoformat(),
                'start_time': appointment.start_time.isoformat(),
                'end_time': appointment.end_time.isoformat(),
                'status': appointment.status,
                'location': appointment.location,
            }
            
            if appointment.therapist:
                appt_dict['therapist'] = appointment.therapist.get_full_name()
                appt_dict['therapist_id'] = appointment.therapist.id
            
            if appointment.driver:
                appt_dict['driver'] = appointment.driver.get_full_name()
                appt_dict['driver_id'] = appointment.driver.id
            
            appointment_list.append(appt_dict)
        
        return appointment_list
    
    @database_sync_to_async
    def get_available_therapists(self, date, specialization=None):
        from django.db.models import Q
        from django.forms.models import model_to_dict
        
        # Start with therapists who have availability on this date
        query = Q(
            role='therapist',
            availabilities__date=date,
            availabilities__is_available=True
        )
        
        # Add specialization filter if provided
        if specialization:
            query &= Q(specialization__icontains=specialization)
        
        # Get the therapists
        therapists = CustomUser.objects.filter(query).distinct()
        
        # Prepare the response data
        therapist_data = []
        for therapist in therapists:
            # Get availabilities for this therapist on the specified date
            availabilities = Availability.objects.filter(
                user=therapist,
                date=date,
                is_available=True
            )
            
            # Get existing appointments for this therapist on the specified date
            appointments = Appointment.objects.filter(
                therapist=therapist,
                date=date,
                status__in=['pending', 'confirmed', 'in_progress']
            )
            
            # Prepare availability slots
            availability_slots = []
            for slot in availabilities:
                availability_slots.append({
                    'start_time': slot.start_time.isoformat(),
                    'end_time': slot.end_time.isoformat(),
                })
            
            # Prepare appointment slots (to mark as busy)
            busy_slots = []
            for appt in appointments:
                busy_slots.append({
                    'start_time': appt.start_time.isoformat(),
                    'end_time': appt.end_time.isoformat(),
                })
            
            # Add therapist data
            therapist_data.append({
                'id': therapist.id,
                'name': therapist.get_full_name(),
                'specialization': therapist.specialization,
                'massage_pressure': therapist.massage_pressure,
                'availabilities': availability_slots,
                'busy_slots': busy_slots,
            })
        
        return therapist_data
    
    @database_sync_to_async
    def get_available_drivers(self, date):
        from django.forms.models import model_to_dict
        
        # Get drivers who have availability on this date
        drivers = CustomUser.objects.filter(
            role='driver',
            availabilities__date=date,
            availabilities__is_available=True
        ).distinct()
        
        # Prepare the response data
        driver_data = []
        for driver in drivers:
            # Get availabilities for this driver on the specified date
            availabilities = Availability.objects.filter(
                user=driver,
                date=date,
                is_available=True
            )
            
            # Get existing appointments for this driver on the specified date
            appointments = Appointment.objects.filter(
                driver=driver,
                date=date,
                status__in=['pending', 'confirmed', 'in_progress']
            )
            
            # Prepare availability slots
            availability_slots = []
            for slot in availabilities:
                availability_slots.append({
                    'start_time': slot.start_time.isoformat(),
                    'end_time': slot.end_time.isoformat(),
                })
            
            # Prepare appointment slots (to mark as busy)
            busy_slots = []
            for appt in appointments:
                busy_slots.append({
                    'start_time': appt.start_time.isoformat(),
                    'end_time': appt.end_time.isoformat(),
                })
            
            # Add driver data
            driver_data.append({
                'id': driver.id,
                'name': driver.get_full_name(),
                'motorcycle_plate': driver.motorcycle_plate,
                'availabilities': availability_slots,
                'busy_slots': busy_slots,
            })
        
        return driver_data
