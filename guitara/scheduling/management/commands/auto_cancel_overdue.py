from django.core.management.base import BaseCommand
from django.utils import timezone
from scheduling.models import Appointment, Notification
from django.db import transaction
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Auto-cancel appointments that are overdue (30+ minutes without response) and disable therapists'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without actually making changes',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        if dry_run:
            self.stdout.write(self.style.WARNING('Running in DRY RUN mode - no changes will be made'))
        
        # Find overdue pending appointments
        overdue_appointments = Appointment.objects.filter(
            status="pending",
            response_deadline__lt=timezone.now()
        ).select_related('therapist', 'operator', 'client')
        
        if not overdue_appointments.exists():
            self.stdout.write(self.style.SUCCESS('No overdue appointments found'))
            return
        
        cancelled_count = 0
        disabled_therapists = []
        
        for appointment in overdue_appointments:
            self.stdout.write(
                f'Processing overdue appointment {appointment.id} for {appointment.client} '
                f'assigned to {appointment.therapist.get_full_name() if appointment.therapist else "Unknown"}'
            )
            
            if not dry_run:
                with transaction.atomic():
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
                        
                        self.stdout.write(
                            self.style.WARNING(f'Disabled therapist: {appointment.therapist.get_full_name()}')
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
            else:
                self.stdout.write(f'Would cancel appointment {appointment.id}')
                if appointment.therapist and appointment.therapist.is_active:
                    self.stdout.write(f'Would disable therapist: {appointment.therapist.get_full_name()}')
                cancelled_count += 1
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'DRY RUN: Would have cancelled {cancelled_count} appointments')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully cancelled {cancelled_count} overdue appointments and '
                    f'disabled {len(disabled_therapists)} therapists'
                )
            )
            
            # Log the action
            logger.info(
                f'Auto-cancelled {cancelled_count} overdue appointments. '
                f'Disabled therapists: {[t.get_full_name() for t in disabled_therapists]}'
            )