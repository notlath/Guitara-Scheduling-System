"""
Django Signals for Real-Time WebSocket Updates
Automatically broadcasts WebSocket events when appointments are created, updated, or deleted
"""
from django.db.models.signals import post_save, post_delete, m2m_changed
from django.dispatch import receiver, Signal
from .models import Appointment, Notification
from .websocket_handlers import AppointmentWebSocketHandler, NotificationWebSocketHandler
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Appointment)
def appointment_saved(sender, instance, created, **kwargs):
    """Handle appointment creation and updates"""
    try:
        if created:
            # New appointment created
            AppointmentWebSocketHandler.broadcast_appointment_created(instance)
            
            # Create notifications for assigned users
            if instance.therapists.exists():
                for therapist in instance.therapists.all():
                    NotificationWebSocketHandler.send_notification(
                        user_id=therapist.id,
                        notification_type="appointment_assigned",
                        title="New Appointment Assigned",
                        message=f"You have been assigned to an appointment on {instance.date}",
                        data={"appointment_id": instance.id}
                    )
            
            if instance.driver:
                NotificationWebSocketHandler.send_notification(
                    user_id=instance.driver.id,
                    notification_type="pickup_assigned", 
                    title="New Pickup Assignment",
                    message=f"You have been assigned a pickup on {instance.date}",
                    data={"appointment_id": instance.id}
                )
                
        else:
            # Existing appointment updated
            # Track what fields changed (you can enhance this with field tracking)
            updated_fields = getattr(instance, '_updated_fields', [])
            AppointmentWebSocketHandler.broadcast_appointment_updated(instance, updated_fields)
            
            # Send status-specific notifications
            if hasattr(instance, '_status_changed') and instance._status_changed:
                status_notifications = {
                    "confirmed": ("Appointment Confirmed", "Your appointment has been confirmed"),
                    "driver_confirmed": ("Driver En Route", "Your driver is on the way"),
                    "in_progress": ("Appointment Started", "Your appointment is now in progress"),
                    "completed": ("Appointment Completed", "Your appointment has been completed"),
                    "cancelled": ("Appointment Cancelled", "Your appointment has been cancelled"),
                    "awaiting_payment": ("Payment Required", "Please proceed with payment"),
                }
                
                if instance.status in status_notifications:
                    title, message = status_notifications[instance.status]
                    if instance.client:
                        NotificationWebSocketHandler.send_notification(
                            user_id=instance.client.id,
                            notification_type="status_update",
                            title=title,
                            message=message,
                            data={"appointment_id": instance.id, "status": instance.status}
                        )
                        
    except Exception as e:
        logger.error(f"Error in appointment_saved signal: {e}")


@receiver(post_delete, sender=Appointment)
def appointment_deleted(sender, instance, **kwargs):
    """Handle appointment deletion"""
    try:
        AppointmentWebSocketHandler.broadcast_appointment_deleted(
            appointment_id=instance.id,
            deleted_by_user_id=getattr(instance, '_deleted_by', None)
        )
        
        # Notify affected users
        affected_users = []
        if instance.client:
            affected_users.append(instance.client.id)
        if instance.therapists.exists():
            affected_users.extend([t.id for t in instance.therapists.all()])
        if instance.driver:
            affected_users.append(instance.driver.id)
            
        for user_id in affected_users:
            NotificationWebSocketHandler.send_notification(
                user_id=user_id,
                notification_type="appointment_cancelled",
                title="Appointment Cancelled",
                message=f"Your appointment on {instance.date} has been cancelled",
                data={"appointment_id": instance.id}
            )
            
    except Exception as e:
        logger.error(f"Error in appointment_deleted signal: {e}")


@receiver(m2m_changed, sender=Appointment.therapists.through)
def therapist_assignment_changed(sender, instance, action, pk_set, **kwargs):
    """Handle therapist assignment changes"""
    try:
        if action == "post_add" and pk_set:
            # Therapists added to appointment
            from core.models import CustomUser
            for therapist_id in pk_set:
                try:
                    therapist = CustomUser.objects.get(id=therapist_id)
                    NotificationWebSocketHandler.send_notification(
                        user_id=therapist_id,
                        notification_type="appointment_assigned",
                        title="New Appointment Assignment",
                        message=f"You have been assigned to an appointment on {instance.date}",
                        data={"appointment_id": instance.id}
                    )
                except CustomUser.DoesNotExist:
                    logger.warning(f"Therapist {therapist_id} not found during assignment")
                    
        elif action == "post_remove" and pk_set:
            # Therapists removed from appointment
            for therapist_id in pk_set:
                NotificationWebSocketHandler.send_notification(
                    user_id=therapist_id,
                    notification_type="appointment_unassigned",
                    title="Appointment Assignment Removed",
                    message=f"You have been removed from the appointment on {instance.date}",
                    data={"appointment_id": instance.id}
                )
                
    except Exception as e:
        logger.error(f"Error in therapist_assignment_changed signal: {e}")


@receiver(post_save, sender=Notification)
def notification_created(sender, instance, created, **kwargs):
    """Handle new notification creation"""
    if created:
        try:
            NotificationWebSocketHandler.send_notification(
                user_id=instance.user.id,
                notification_type=instance.notification_type,
                title=instance.title,
                message=instance.message,
                data={
                    "notification_id": instance.id,
                    "related_object_id": instance.related_object_id,
                    "is_read": instance.is_read,
                }
            )
        except Exception as e:
            logger.error(f"Error in notification_created signal: {e}")


# Custom signal for therapist responses
therapist_response_signal = Signal()

@receiver(therapist_response_signal)
def handle_therapist_response(sender, appointment, therapist, accepted, **kwargs):
    """Handle therapist acceptance/rejection responses"""
    try:
        AppointmentWebSocketHandler.broadcast_therapist_response(
            appointment=appointment,
            therapist=therapist,
            accepted=accepted
        )
        
        # Update appointment status if needed
        if accepted:
            # Check if all therapists have responded
            total_therapists = appointment.therapists.count()
            accepted_therapists = sum(1 for t in appointment.therapists.all() 
                                    if getattr(t, 'has_accepted', False))
            
            if accepted_therapists == total_therapists:
                appointment.status = "confirmed"
                appointment.save()
                
    except Exception as e:
        logger.error(f"Error handling therapist response: {e}")
