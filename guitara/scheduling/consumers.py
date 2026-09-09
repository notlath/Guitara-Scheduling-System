from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Appointment, Availability, Client
from core.models import CustomUser
from datetime import datetime
import json
import asyncio
import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)


class AppointmentConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.last_heartbeat = None
        self.connection_id = None

    async def connect(self):
        try:
            self.user = self.scope["user"]
            print(
                f"[CONSUMER] Connection attempt from user: {self.user} (authenticated: {self.user.is_authenticated})"
            )

            # Reject connection if user is not authenticated
            if not self.user.is_authenticated:
                print("[CONSUMER] ❌ Rejecting unauthenticated connection")
                await self.close()
                return

            # Generate unique connection ID for this user session
            self.connection_id = f"{self.user.id}_{asyncio.current_task().get_name()}"

            # Global appointment events contain operational PII and are operator-only.
            if self.user.role == "operator":
                await self.channel_layer.group_add("appointments", self.channel_name)
                await self.channel_layer.group_add("operators", self.channel_name)

            # Join user-specific group for targeted notifications
            user_group = f"user_{self.user.id}"
            await self.channel_layer.group_add(user_group, self.channel_name)

            await self.accept()

            # Log connection for monitoring
            logger.info(f"WebSocket connected: User {self.user.id} ({self.user.role})")
            print(
                f"[CONSUMER] ✅ WebSocket connected: User {self.user.id} ({self.user.role})"
            )

            # Send initial data upon connection with caching
            try:
                if self.user.role == "operator":
                    appointments = await self.get_today_appointments_cached()
                else:
                    appointments = await self.get_user_appointments_cached()

                await self.send(
                    text_data=json.dumps(
                        {
                            "type": "initial_data",
                            "appointments": appointments,
                            "connection_id": self.connection_id,
                            "timestamp": datetime.now().isoformat(),
                        }
                    )
                )
                print(
                    f"[CONSUMER] ✅ Initial data sent: {len(appointments)} appointments"
                )
            except Exception as e:
                logger.error(f"Error sending initial data: {e}")
                print(f"[CONSUMER] ❌ Error sending initial data: {e}")
                await self.send(
                    text_data=json.dumps(
                        {"type": "error", "message": "Failed to load initial data"}
                    )
                )
        except Exception as e:
            logger.error(f"Error in WebSocket connect: {e}")
            print(f"[CONSUMER] ❌ Critical error in connect: {e}")
            import traceback

            traceback.print_exc()
            await self.close()

    async def disconnect(self, close_code):
        logger.info(
            f"WebSocket disconnected: User {self.user.id if hasattr(self, 'user') else 'Unknown'}, Code: {close_code}"
        )

        # Leave appointment group
        await self.channel_layer.group_discard("appointments", self.channel_name)
        await self.channel_layer.group_discard("operators", self.channel_name)

        # Leave user-specific group
        if hasattr(self, "user") and self.user.is_authenticated:
            user_group = f"user_{self.user.id}"
            await self.channel_layer.group_discard(user_group, self.channel_name)

    async def send_appointment_update(self, event):
        """Send appointment update to WebSocket"""
        try:
            await self.send(text_data=json.dumps(event["data"]))
            print(f"[CONSUMER] ✅ Sent appointment update: {event['data']['type']}")
        except Exception as e:
            logger.error(f"Error sending appointment update: {e}")

    async def send_notification(self, event):
        """Send notification to WebSocket"""
        try:
            await self.send(text_data=json.dumps(event["data"]))
            print(
                f"[CONSUMER] ✅ Sent notification: {event['data']['notification_type']}"
            )
        except Exception as e:
            logger.error(f"Error sending notification: {e}")

    async def receive(self, text_data):
        """Handle incoming WebSocket messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get("type")

            print(f"[CONSUMER] Received message type: {message_type}")

            if message_type == "heartbeat":
                # Handle heartbeat
                await self.send(
                    text_data=json.dumps(
                        {
                            "type": "heartbeat_response",
                            "timestamp": datetime.now().isoformat(),
                        }
                    )
                )

            elif message_type == "subscribe_to_updates":
                # Handle subscription requests
                update_types = data.get("update_types", [])
                await self._handle_subscription(update_types)

            elif message_type == "get_initial_data":
                # Resend initial data
                await self._send_initial_data()

            else:
                logger.warning(f"Unknown message type: {message_type}")

        except json.JSONDecodeError:
            logger.error("Invalid JSON received")
            await self.send(
                text_data=json.dumps(
                    {"type": "error", "message": "Invalid JSON format"}
                )
            )
        except Exception as e:
            logger.error(f"Error processing received message: {e}")
            await self.send(
                text_data=json.dumps(
                    {"type": "error", "message": "Failed to process message"}
                )
            )

    async def _handle_subscription(self, update_types):
        """Handle subscription to specific update types"""
        try:
            # Join specific groups based on subscription
            for update_type in update_types:
                if update_type == "appointments" and self.user.role == "operator":
                    await self.channel_layer.group_add(
                        "appointments", self.channel_name
                    )
                elif update_type == "notifications":
                    await self.channel_layer.group_add(
                        f"user_{self.user.id}", self.channel_name
                    )

            await self.send(
                text_data=json.dumps(
                    {
                        "type": "subscription_confirmed",
                        "subscribed_to": update_types,
                        "timestamp": datetime.now().isoformat(),
                    }
                )
            )

        except Exception as e:
            logger.error(f"Error handling subscription: {e}")

    async def _send_initial_data(self):
        """Send initial data based on user role and permissions"""
        try:
            if self.user.role == "operator":
                appointments = await self.get_today_appointments_cached()
            else:
                appointments = await self.get_user_appointments_cached()

            await self.send(
                text_data=json.dumps(
                    {
                        "type": "initial_data",
                        "appointments": appointments,
                        "timestamp": datetime.now().isoformat(),
                    }
                )
            )

        except Exception as e:
            logger.error(f"Error sending initial data: {e}")

    async def handle_immediate_message(self, data):
        """Handle messages that need immediate processing"""
        message_type = data.get("type")

        if message_type == "check_availability":
            await self.handle_availability_check(data)
        elif message_type == "request_refresh":
            await self.handle_refresh_request(data)

    async def handle_availability_check(self, data):
        """Optimized availability checking with caching"""
        date_str = data.get("date")
        role = data.get("role")
        specialization = data.get("specialization", None)

        if not date_str or not role:
            await self.send(
                text_data=json.dumps(
                    {"type": "error", "message": "Date and role are required"}
                )
            )
            return

        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()

            # Use cached availability data
            cache_key = f"availability_{role}_{date_str}_{specialization or 'all'}"
            availabilities = cache.get(cache_key)

            if not availabilities:
                if role == "therapist":
                    availabilities = await self.get_available_therapists(
                        date_obj, specialization
                    )
                else:
                    availabilities = await self.get_available_drivers(date_obj)

                # Cache for 5 minutes
                cache.set(cache_key, availabilities, 300)

            await self.send(
                text_data=json.dumps(
                    {
                        "type": "availability_data",
                        "date": date_str,
                        "role": role,
                        "availabilities": availabilities,
                        "cached": cache.get(cache_key) is not None,
                    }
                )
            )

        except ValueError:
            await self.send(
                text_data=json.dumps(
                    {"type": "error", "message": "Invalid date format. Use YYYY-MM-DD"}
                )
            )

    async def handle_refresh_request(self, data):
        """Handle manual refresh requests"""
        try:
            if self.user.role == "operator":
                appointments = await self.get_today_appointments_cached(
                    force_refresh=True
                )
            else:
                appointments = await self.get_user_appointments_cached(
                    force_refresh=True
                )

            await self.send(
                text_data=json.dumps(
                    {
                        "type": "refresh_data",
                        "appointments": appointments,
                        "timestamp": datetime.now().isoformat(),
                    }
                )
            )
        except Exception as e:
            logger.error(f"Error handling refresh: {e}")
            await self.send(
                text_data=json.dumps(
                    {"type": "error", "message": "Failed to refresh data"}
                )
            )

    # Receive message from appointment group
    async def appointment_message(self, event):
        message = event["message"]

        # Filter messages based on user role and permissions
        if await self.should_receive_message(message):
            await self.send(text_data=json.dumps(message))

    async def should_receive_message(self, message):
        """Determine if user should receive this message based on role and permissions"""
        user = self.scope["user"]

        if user.role == "operator":
            return True
        elif user.role == "therapist" and message.get("therapist_id") == user.id:
            return True
        elif user.role == "driver" and message.get("driver_id") == user.id:
            return True

        return False

    # Receive message for user-specific notifications
    async def user_notification(self, event):
        message = event["message"]
        await self.send(text_data=json.dumps(message))

    async def get_today_appointments_cached(self, force_refresh=False):
        """Get today's appointments with caching"""
        cache_key = f"appointments_today_operator"

        if not force_refresh:
            appointments = cache.get(cache_key)
            if appointments:
                return appointments

        appointments = await self.get_today_appointments()
        cache.set(cache_key, appointments, 300)  # Cache for 5 minutes
        return appointments

    async def get_user_appointments_cached(self, force_refresh=False):
        """Get user appointments with caching"""
        cache_key = f"user_appointments_{self.user.id}"

        if not force_refresh:
            appointments = cache.get(cache_key)
            if appointments:
                return appointments

        appointments = await self.get_user_appointments()
        cache.set(cache_key, appointments, 300)  # Cache for 5 minutes
        return appointments

    @database_sync_to_async
    def get_today_appointments(self):
        from django.utils import timezone

        today = timezone.now().date()
        appointments = (
            Appointment.objects.select_related("client", "therapist", "driver")
            .filter(date=today)
            .order_by("start_time")
        )

        appointment_list = []
        for appointment in appointments:
            appt_dict = {
                "id": appointment.id,
                "client": f"{appointment.client.first_name} {appointment.client.last_name}",
                "date": appointment.date.isoformat(),
                "start_time": appointment.start_time.isoformat(),
                "end_time": appointment.end_time.isoformat(),
                "status": appointment.status,
                "payment_status": appointment.payment_status,
                "location": appointment.location,
            }

            if appointment.therapist:
                appt_dict["therapist"] = appointment.therapist.get_full_name()
                appt_dict["therapist_id"] = appointment.therapist.id

            if appointment.driver:
                appt_dict["driver"] = appointment.driver.get_full_name()
                appt_dict["driver_id"] = appointment.driver.id

            appointment_list.append(appt_dict)

        return appointment_list

    @database_sync_to_async
    def get_user_appointments(self):
        from django.utils import timezone

        user = self.scope["user"]
        today = timezone.now().date()

        # Get upcoming appointments for the user with optimized query
        if user.role == "therapist":
            appointments = (
                Appointment.objects.select_related("client", "driver")
                .filter(
                    therapist=user,
                    date__gte=today,
                    status__in=["pending", "confirmed", "in_progress"],
                )
                .order_by("date", "start_time")
            )
        elif user.role == "driver":
            appointments = (
                Appointment.objects.select_related("client", "therapist")
                .filter(
                    driver=user,
                    date__gte=today,
                    status__in=["pending", "confirmed", "in_progress"],
                )
                .order_by("date", "start_time")
            )
        else:
            appointments = Appointment.objects.none()

        appointment_list = []
        for appointment in appointments:
            appt_dict = {
                "id": appointment.id,
                "client": f"{appointment.client.first_name} {appointment.client.last_name}",
                "date": appointment.date.isoformat(),
                "start_time": appointment.start_time.isoformat(),
                "end_time": appointment.end_time.isoformat(),
                "status": appointment.status,
                "payment_status": appointment.payment_status,
                "location": appointment.location,
            }

            if appointment.therapist and user.role != "therapist":
                appt_dict["therapist"] = appointment.therapist.get_full_name()
                appt_dict["therapist_id"] = appointment.therapist.id

            if appointment.driver and user.role != "driver":
                appt_dict["driver"] = appointment.driver.get_full_name()
                appt_dict["driver_id"] = appointment.driver.id

            appointment_list.append(appt_dict)

        return appointment_list

    @database_sync_to_async
    def get_available_therapists(self, date, specialization=None):
        """Get available therapists with optimized query"""
        # Get therapists who are available on the specified date
        therapists = (
            CustomUser.objects.filter(role="therapist", is_active=True)
            .select_related()
            .prefetch_related("availability_set")
        )

        if specialization:
            therapists = therapists.filter(specialization=specialization)

        # Get availability for the date
        availabilities = Availability.objects.filter(
            date=date, user__in=therapists, is_available=True
        ).select_related("user")

        availability_list = []
        for availability in availabilities:
            availability_list.append(
                {
                    "user_id": availability.user.id,
                    "name": availability.user.get_full_name(),
                    "start_time": availability.start_time.isoformat(),
                    "end_time": availability.end_time.isoformat(),
                    "specialization": getattr(
                        availability.user, "specialization", None
                    ),
                }
            )

        return availability_list

    @database_sync_to_async
    def get_available_drivers(self, date):
        """Get available drivers with optimized query"""
        # Get drivers who are available on the specified date
        drivers = CustomUser.objects.filter(
            role="driver", is_active=True
        ).select_related()

        # Get availability for the date
        availabilities = Availability.objects.filter(
            date=date, user__in=drivers, is_available=True
        ).select_related("user")

        availability_list = []
        for availability in availabilities:
            availability_list.append(
                {
                    "user_id": availability.user.id,
                    "name": availability.user.get_full_name(),
                    "start_time": availability.start_time.isoformat(),
                    "end_time": availability.end_time.isoformat(),
                }
            )

        return availability_list
