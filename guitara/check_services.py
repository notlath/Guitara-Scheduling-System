#!/usr/bin/env python
import os
import sys
import django

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from registration.models import Service


def check_services():
    services = Service.objects.all()
    print(f"Service count: {services.count()}")
    for service in services:
        print(f"  - ID: {service.id}, Name: {service.name}")


if __name__ == "__main__":
    check_services()
