from rest_framework import serializers
from .models import Therapist, Driver, Operator, Service, Material

class TherapistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Therapist
        fields = ['first_name', 'last_name', 'username', 'email', 'specialization', 'massage_pressure']

class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = ['first_name', 'last_name', 'username', 'email']

class OperatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Operator
        fields = ['first_name', 'last_name', 'username', 'email']

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['name', 'description', 'duration', 'price', 'materials']

class MaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = ['name', 'description']
