"""
Background tasks for the scheduling system.
These tasks improve performance by handling heavy operations asynchronously.
"""

from celery import shared_task
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.utils import timezone
from django.db.models import Q
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, name="scheduling.tasks.process_driver_assignment")
def process_driver_assignment(self, appointment_id):
    """
    Process driver assignment in the background.
    This removes the heavy FIFO logic from the main request cycle.
    """
    try:
        from .models import Appointment
        from core.models import CustomUser

        appointment = Appointment.objects.select_related("client").get(
            id=appointment_id
        )

        # Find next available driver using FIFO logic
        available_drivers = (
            CustomUser.objects.filter(role="driver", is_active=True)
            .exclude(
                driver_appointments__status__in=[
                    "in_progress",
                    "journey",
                    "arrived",
                    "driver_assigned_pickup",
                    "return_journey",
                ],
                driver_appointments__date=appointment.date,
            )
            .order_by("last_available_at")
        )

        if available_drivers.exists():
            driver = available_drivers.first()
            appointment.driver = driver
            appointment.status = "driver_assigned"
            appointment.save()

            # Update driver's last available time
            driver.last_available_at = timezone.now()
            driver.save()

            # Notify via WebSocket
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "appointments",
                {
                    "type": "appointment_message",
                    "message": {
                        "type": "driver_assigned",
                        "appointment_id": appointment_id,
                        "driver_id": driver.id,
                        "driver_name": driver.get_full_name(),
                        "status": appointment.status,
                    },
                },
            )

            logger.info(
                f"Driver {driver.get_full_name()} assigned to appointment {appointment_id}"
            )
            return {"success": True, "driver_id": driver.id}
        else:
            logger.warning(f"No available drivers for appointment {appointment_id}")
            return {"success": False, "error": "No available drivers"}

    except Exception as e:
        logger.error(
            f"Error processing driver assignment for appointment {appointment_id}: {str(e)}"
        )
        return {"success": False, "error": str(e)}


@shared_task(bind=True, name="scheduling.tasks.send_appointment_notifications")
def send_appointment_notifications(self, appointment_id, notification_type, message):
    """
    Send notifications to relevant users asynchronously.
    """
    try:
        from .models import Appointment, Notification

        appointment = Appointment.objects.select_related(
            "client", "therapist", "driver", "operator"
        ).get(id=appointment_id)

        notifications_created = 0

        # Create notification for therapist if assigned
        if appointment.therapist:
            Notification.objects.create(
                user=appointment.therapist,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )
            notifications_created += 1

        # Create notification for driver if assigned
        if appointment.driver:
            Notification.objects.create(
                user=appointment.driver,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )
            notifications_created += 1

        # Create notification for operator if assigned
        if appointment.operator:
            Notification.objects.create(
                user=appointment.operator,
                appointment=appointment,
                notification_type=notification_type,
                message=message,
            )
            notifications_created += 1

        # Notify via WebSocket
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "appointments",
            {
                "type": "notification_broadcast",
                "message": {
                    "type": "new_notification",
                    "appointment_id": appointment_id,
                    "notification_type": notification_type,
                    "message": message,
                },
            },
        )

        logger.info(
            f"Created {notifications_created} notifications for appointment {appointment_id}"
        )
        return {"success": True, "notifications_created": notifications_created}

    except Exception as e:
        logger.error(
            f"Error sending notifications for appointment {appointment_id}: {str(e)}"
        )
        return {"success": False, "error": str(e)}


@shared_task(bind=True, name="scheduling.tasks.cleanup_expired_appointments")
def cleanup_expired_appointments(self):
    """
    Periodic task to cleanup expired appointments.
    Runs every 5 minutes to cancel appointments that have passed their response deadline.
    """
    try:
        from .models import Appointment

        # Find appointments that have expired
        expired_appointments = Appointment.objects.filter(
            status="pending", response_deadline__lt=timezone.now()
        )

        cancelled_count = 0
        for appointment in expired_appointments:
            appointment.status = "cancelled"
            appointment.cancellation_reason = (
                "Auto-cancelled due to expired response deadline"
            )
            appointment.save()

            # Send notification about auto-cancellation
            send_appointment_notifications.delay(
                appointment.id,
                "appointment_cancelled",
                f"Appointment automatically cancelled due to expired response deadline",
            )

            cancelled_count += 1

        if cancelled_count > 0:
            logger.info(f"Auto-cancelled {cancelled_count} expired appointments")

        return {"success": True, "cancelled_count": cancelled_count}

    except Exception as e:
        logger.error(f"Error during expired appointments cleanup: {str(e)}")
        return {"success": False, "error": str(e)}


@shared_task(bind=True, name="scheduling.tasks.sync_appointment_statuses")
def sync_appointment_statuses(self):
    """
    Periodic task to sync appointment statuses.
    Runs every minute to ensure data consistency.
    """
    try:
        from .models import Appointment
        from django.db.models import Q

        # Find appointments that need status updates
        now = timezone.now()

        # Update appointments to 'in_progress' if start time has passed
        appointments_to_start = Appointment.objects.filter(
            status="confirmed", date=now.date(), start_time__lte=now.time()
        )

        started_count = 0
        for appointment in appointments_to_start:
            # Check if it's not too late (within 30 minutes of start time)
            appointment_datetime = datetime.combine(
                appointment.date, appointment.start_time
            )
            appointment_datetime = timezone.make_aware(appointment_datetime)

            if now <= appointment_datetime + timedelta(minutes=30):
                appointment.status = "in_progress"
                appointment.save()
                started_count += 1

        # Notify about status changes
        if started_count > 0:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "appointments",
                {
                    "type": "appointment_message",
                    "message": {
                        "type": "status_sync",
                        "message": f"Updated {started_count} appointments to in_progress",
                    },
                },
            )

            logger.info(f"Updated {started_count} appointments to in_progress status")

        return {"success": True, "started_count": started_count}

    except Exception as e:
        logger.error(f"Error during appointment status sync: {str(e)}")
        return {"success": False, "error": str(e)}


@shared_task(bind=True, name="scheduling.tasks.preload_dashboard_data")
def preload_dashboard_data(self, user_id):
    """
    Preload dashboard data for a specific user.
    This can be triggered when a user logs in to warm up the cache.
    """
    try:
        from .models import Appointment
        from core.models import CustomUser

        user = CustomUser.objects.get(id=user_id)
        today = timezone.now().date()

        # Preload today's appointments
        if user.role == "operator":
            appointments = Appointment.objects.select_related(
                "client", "therapist", "driver"
            ).filter(date=today)
        else:
            appointments = Appointment.objects.select_related(
                "client", "therapist", "driver"
            ).filter(Q(therapist=user) | Q(driver=user), date=today)

        # Convert to list to execute the query
        appointment_list = list(appointments)

        logger.info(
            f"Preloaded {len(appointment_list)} appointments for user {user_id}"
        )
        return {"success": True, "appointments_count": len(appointment_list)}

    except Exception as e:
        logger.error(f"Error preloading dashboard data for user {user_id}: {str(e)}")
        return {"success": False, "error": str(e)}
