from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import json
from .models import Appointment

@receiver(post_save, sender=Appointment)
def appointment_saved(sender, instance, created, **kwargs):
    """Send a WebSocket message when an appointment is created or updated"""
    channel_layer = get_channel_layer()
    
    # Create the message data
    message_data = {
        'appointment_id': instance.id,
        'status': instance.status,
        'date': instance.date.isoformat(),
        'start_time': instance.start_time.isoformat(),
        'end_time': instance.end_time.isoformat(),
        'therapist_id': instance.therapist_id if instance.therapist else None,
        'driver_id': instance.driver_id if instance.driver else None,
    }
    
    # Send to the appointments group
    async_to_sync(channel_layer.group_send)(
        "appointments",
        {
            'type': 'appointment_message',
            'message': {
                'type': 'appointment_create' if created else 'appointment_update',
                **message_data
            }
        }
    )
    
@receiver(post_delete, sender=Appointment)
def appointment_deleted(sender, instance, **kwargs):
    """Send a WebSocket message when an appointment is deleted"""
    channel_layer = get_channel_layer()
    
    async_to_sync(channel_layer.group_send)(
        "appointments",
        {
            'type': 'appointment_message',
            'message': {
                'type': 'appointment_delete',
                'appointment_id': instance.id
            }
        }
    )
