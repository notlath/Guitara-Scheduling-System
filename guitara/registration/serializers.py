from rest_framework import serializers

class TherapistSerializer(serializers.Serializer):
    PRESSURE_CHOICES = (
        ('soft', 'Soft'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    )

    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    username = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    specialization = serializers.CharField(max_length=100)
    pressure = serializers.ChoiceField(choices=PRESSURE_CHOICES) # Dropdown choices

class DriverSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    username = serializers.CharField(max_length=100)
    email = serializers.EmailField()

class OperatorSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    username = serializers.CharField(max_length=100)
    email = serializers.EmailField()

class MaterialInfoSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(max_length=255)

class ServiceSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(max_length=255)
    duration = serializers.IntegerField()  # in minutes
    price = serializers.FloatField()
    oil = serializers.CharField(max_length=100)
    materials = serializers.ListField(
        child=MaterialInfoSerializer(),
        required=False,
        allow_empty=True
    )

class MaterialSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(max_length=255)