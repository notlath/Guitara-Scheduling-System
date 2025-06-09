from rest_framework import serializers
from django.db import models
import datetime


class ServiceData:
    """
    Hardcoded service data to use when the database is not available
    """

    SERVICES = [
        {
            "id": 1,
            "name": "Shiatsu Massage",
            "description": "A Japanese technique involving pressure points.",
            "duration": 60,  # 1 hour
            "price": 500.00,
            "oil": None,
            "is_active": True,
        },
        {
            "id": 2,
            "name": "Combi Massage",
            "description": "A combination of multiple massage techniques.",
            "duration": 60,
            "price": 400.00,
            "oil": None,
            "is_active": True,
        },
        {
            "id": 3,
            "name": "Dry Massage",
            "description": "Performed without oils or lotions.",
            "duration": 60,
            "price": 500.00,
            "oil": None,
            "is_active": True,
        },
        {
            "id": 4,
            "name": "Foot Massage",
            "description": "Focused on the feet and lower legs.",
            "duration": 60,
            "price": 500.00,
            "oil": None,
            "is_active": True,
        },
        {
            "id": 5,
            "name": "Hot Stone Service",
            "description": "Uses heated stones for deep muscle relaxation.",
            "duration": 90,  # 1.5 hours
            "price": 675.00,
            "oil": None,
            "is_active": True,
        },
        {
            "id": 6,
            "name": "Ventosa",
            "description": "Traditional cupping therapy to relieve muscle tension.",
            "duration": 90,  # 1.5 hours
            "price": 675.00,
            "oil": None,
            "is_active": True,
        },
        {
            "id": 7,
            "name": "Hand Massage",
            "description": "Focused on hands and arms.",
            "duration": 60,
            "price": 400.00,
            "oil": None,
            "is_active": True,
        },
    ]
