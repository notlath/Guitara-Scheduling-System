"""
WebSocket Event Handlers for Real-Time Appointment Updates
Handles all appointment-related WebSocket events and broadcasting
"""

import json
import logging
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
from .models import Appointment, Notification
from core.models import CustomUser

logger = logging.getLogger(__name__)
channel_layer = get_channel_layer()


class AppointmentWebSocketHandler:
    """Handles all appointment-related WebSocket events"""

    @staticmethod
    def get_user_groups(user_id, user_role):
        """Get all groups a user should belong to"""
        groups = [
            f"user_{user_id}",  # User-specific group
            "appointments",  # Global appointments group
        ]

        # Role-specific groups
        if user_role == "operator":
            groups.append("operators")
        elif user_role == "therapist":
            groups.append("therapists")
        elif user_role == "driver":
            groups.append("drivers")

        return groups

    @staticmethod
    def broadcast_appointment_created(appointment):
        """Broadcast when a new appointment is created"""
        try:
            event_data = {
                "type": "appointment_created",
                "appointment": AppointmentWebSocketHandler._serialize_appointment(
                    appointment
                ),
                "timestamp": timezone.now().isoformat(),
                "created_by": (
                    appointment.created_by.id if appointment.created_by else None
                ),
            }

            # Broadcast to all appointment listeners
            async_to_sync(channel_layer.group_send)(
                "appointments", {"type": "send_appointment_update", "data": event_data}
            )

            # Send targeted notifications to assigned therapists
            if appointment.therapists.exists():
                for therapist in appointment.therapists.all():
                    async_to_sync(channel_layer.group_send)(
                        f"user_{therapist.id}",
                        {
                            "type": "send_appointment_update",
                            "data": {
                                **event_data,
                                "type": "new_appointment_assigned",
                                "message": f"New appointment assigned to you on {appointment.date}",
                            },
                        },
                    )

            # Send to assigned driver
            if appointment.driver:
                async_to_sync(channel_layer.group_send)(
                    f"user_{appointment.driver.id}",
                    {
                        "type": "send_appointment_update",
                        "data": {
                            **event_data,
                            "type": "new_pickup_assigned",
                            "message": f"New pickup assignment on {appointment.date}",
                        },
                    },
                )

            logger.info(f"Broadcasted appointment creation: {appointment.id}")

        except Exception as e:
            logger.error(f"Error broadcasting appointment creation: {e}")

    @staticmethod
    def broadcast_appointment_updated(appointment, updated_fields=None):
        """Broadcast when an appointment is updated"""
        try:
            event_data = {
                "type": "appointment_updated",
                "appointment": AppointmentWebSocketHandler._serialize_appointment(
                    appointment
                ),
                "updated_fields": updated_fields or [],
                "timestamp": timezone.now().isoformat(),
            }

            # Broadcast to all appointment listeners
            async_to_sync(channel_layer.group_send)(
                "appointments", {"type": "send_appointment_update", "data": event_data}
            )

            # Handle status-specific updates
            if "status" in (updated_fields or []):
                AppointmentWebSocketHandler._handle_status_change(
                    appointment, event_data
                )

            logger.info(f"Broadcasted appointment update: {appointment.id}")

        except Exception as e:
            logger.error(f"Error broadcasting appointment update: {e}")

    @staticmethod
    def broadcast_appointment_deleted(appointment_id, deleted_by_user_id):
        """Broadcast when an appointment is deleted"""
        try:
            event_data = {
                "type": "appointment_deleted",
                "appointment_id": appointment_id,
                "deleted_by": deleted_by_user_id,
                "timestamp": timezone.now().isoformat(),
            }

            async_to_sync(channel_layer.group_send)(
                "appointments", {"type": "send_appointment_update", "data": event_data}
            )

            logger.info(f"Broadcasted appointment deletion: {appointment_id}")

        except Exception as e:
            logger.error(f"Error broadcasting appointment deletion: {e}")

    @staticmethod
    def broadcast_therapist_response(appointment, therapist, accepted):
        """Broadcast when a therapist accepts/rejects an appointment"""
        try:
            action = "accepted" if accepted else "rejected"
            event_data = {
                "type": "therapist_response",
                "appointment": AppointmentWebSocketHandler._serialize_appointment(
                    appointment
                ),
                "therapist_id": therapist.id,
                "therapist_name": f"{therapist.first_name} {therapist.last_name}",
                "action": action,
                "timestamp": timezone.now().isoformat(),
            }

            # Notify operators
            async_to_sync(channel_layer.group_send)(
                "operators", {"type": "send_appointment_update", "data": event_data}
            )

            # Notify other therapists assigned to the same appointment
            for other_therapist in appointment.therapists.exclude(id=therapist.id):
                async_to_sync(channel_layer.group_send)(
                    f"user_{other_therapist.id}",
                    {
                        "type": "send_appointment_update",
                        "data": {
                            **event_data,
                            "message": f"Therapist {therapist.first_name} {action} the appointment",
                        },
                    },
                )

            logger.info(f"Broadcasted therapist response: {appointment.id} - {action}")

        except Exception as e:
            logger.error(f"Error broadcasting therapist response: {e}")

    @staticmethod
    def _handle_status_change(appointment, base_event_data):
        """Handle specific status changes with targeted notifications"""
        status = appointment.status

        status_messages = {
            "confirmed": "Appointment confirmed and ready",
            "driver_confirmed": "Driver confirmed - appointment starting soon",
            "in_progress": "Appointment is now in progress",
            "completed": "Appointment completed successfully",
            "cancelled": "Appointment has been cancelled",
            "awaiting_payment": "Appointment completed - awaiting payment",
        }

        if status in status_messages:
            # Send to client
            if appointment.client:
                async_to_sync(channel_layer.group_send)(
                    f"user_{appointment.client.id}",
                    {
                        "type": "send_appointment_update",
                        "data": {
                            **base_event_data,
                            "type": "status_notification",
                            "message": status_messages[status],
                        },
                    },
                )

    @staticmethod
    def _serialize_appointment(appointment):
        """Serialize appointment data for WebSocket transmission"""
        try:
            return {
                "id": appointment.id,
                "client_id": appointment.client.id if appointment.client else None,
                "client_name": (
                    f"{appointment.client.first_name} {appointment.client.last_name}"
                    if appointment.client
                    else None
                ),
                "therapists": [
                    {
                        "id": t.id,
                        "name": f"{t.first_name} {t.last_name}",
                        "phone": t.phone_number,
                    }
                    for t in appointment.therapists.all()
                ],
                "driver": (
                    {
                        "id": appointment.driver.id,
                        "name": f"{appointment.driver.first_name} {appointment.driver.last_name}",
                        "phone": appointment.driver.phone_number,
                    }
                    if appointment.driver
                    else None
                ),
                "date": appointment.date.isoformat() if appointment.date else None,
                "start_time": (
                    appointment.start_time.isoformat()
                    if appointment.start_time
                    else None
                ),
                "end_time": (
                    appointment.end_time.isoformat() if appointment.end_time else None
                ),
                "status": appointment.status,
                "location": appointment.location,
                "services": (
                    [
                        {
                            "id": s.id,
                            "name": s.name,
                            "price": float(s.price) if s.price else 0,
                        }
                        for s in appointment.services.all()
                    ]
                    if hasattr(appointment, "services")
                    else []
                ),
                "total_amount": (
                    float(appointment.total_amount)
                    if hasattr(appointment, "total_amount") and appointment.total_amount
                    else 0
                ),
                "created_at": (
                    appointment.created_at.isoformat()
                    if hasattr(appointment, "created_at") and appointment.created_at
                    else None
                ),
                "updated_at": (
                    appointment.updated_at.isoformat()
                    if hasattr(appointment, "updated_at") and appointment.updated_at
                    else None
                ),
            }
        except Exception as e:
            logger.error(f"Error serializing appointment {appointment.id}: {e}")
            return {"id": appointment.id, "error": "Serialization failed"}


class NotificationWebSocketHandler:
    """Handles notification-related WebSocket events"""

    @staticmethod
    def send_notification(user_id, notification_type, title, message, data=None):
        """Send a real-time notification to a specific user"""
        try:
            notification_data = {
                "type": "notification",
                "notification_type": notification_type,
                "title": title,
                "message": message,
                "data": data or {},
                "timestamp": timezone.now().isoformat(),
            }

            async_to_sync(channel_layer.group_send)(
                f"user_{user_id}",
                {"type": "send_notification", "data": notification_data},
            )

            logger.info(f"Sent notification to user {user_id}: {notification_type}")

        except Exception as e:
            logger.error(f"Error sending notification: {e}")

    @staticmethod
    def broadcast_system_notification(
        notification_type, title, message, target_roles=None
    ):
        """Broadcast a system-wide notification"""
        try:
            notification_data = {
                "type": "system_notification",
                "notification_type": notification_type,
                "title": title,
                "message": message,
                "timestamp": timezone.now().isoformat(),
            }

            if target_roles:
                for role in target_roles:
                    async_to_sync(channel_layer.group_send)(
                        f"{role}s",
                        {"type": "send_notification", "data": notification_data},
                    )
            else:
                async_to_sync(channel_layer.group_send)(
                    "appointments",
                    {"type": "send_notification", "data": notification_data},
                )

            logger.info(f"Broadcasted system notification: {notification_type}")

        except Exception as e:
            logger.error(f"Error broadcasting system notification: {e}")
