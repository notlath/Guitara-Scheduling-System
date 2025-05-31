from rest_framework import serializers
from registration.models import Service

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'name', 'description', 'duration', 'price', 'oil', 'is_active']
