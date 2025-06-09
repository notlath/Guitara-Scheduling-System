#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from django.urls import reverse
from scheduling.models import Appointment

# Check if URL pattern exists
try:
    # Test reverse lookup
    url = reverse('appointment-start-session', kwargs={'pk': 1})
    print(f'URL exists: {url}')
except Exception as e:
    print(f'URL reverse failed: {e}')
    
# Check appointments to test with
appointments = Appointment.objects.all()[:3]
for appt in appointments:
    print(f'Appointment {appt.id}: status={appt.status}')
