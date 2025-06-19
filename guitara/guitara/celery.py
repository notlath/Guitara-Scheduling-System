"""
Celery configuration for Guitara Scheduling System.
This enables background task processing for improved performance.
"""

import os
from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")

app = Celery("guitara")

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Configure Celery with Redis backend
app.conf.update(
    broker_url="redis://127.0.0.1:6379/0",
    result_backend="redis://127.0.0.1:6379/0",
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Manila",
    enable_utc=True,
    # Performance optimizations
    worker_prefetch_multiplier=4,
    task_acks_late=True,
    worker_disable_rate_limits=True,
    # Routing for different queues
    task_routes={
        "scheduling.tasks.process_driver_assignment": {"queue": "high_priority"},
        "scheduling.tasks.send_appointment_notifications": {"queue": "notifications"},
        "scheduling.tasks.cleanup_expired_appointments": {"queue": "maintenance"},
    },
    # Beat schedule for periodic tasks
    beat_schedule={
        "cleanup-expired-appointments": {
            "task": "scheduling.tasks.cleanup_expired_appointments",
            "schedule": 300.0,  # Every 5 minutes
        },
        "sync-appointment-statuses": {
            "task": "scheduling.tasks.sync_appointment_statuses",
            "schedule": 60.0,  # Every 1 minute
        },
    },
)


@app.task(bind=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
