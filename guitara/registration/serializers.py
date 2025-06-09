from rest_framework import serializers
from .models import Service, Material

# These references are causing circular import issues - removing them
# Service = Service
# Material = Material


class TherapistSerializer(serializers.Serializer):
    PRESSURE_CHOICES = (
        ("soft", "Soft"),
        ("medium", "Medium"),
        ("hard", "Hard"),
    )

    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    username = serializers.CharField(max_length=100)
    email = serializers.EmailField()
    specialization = serializers.CharField(max_length=100)
    pressure = serializers.ChoiceField(choices=PRESSURE_CHOICES)  # Dropdown choices


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


class ServiceSerializer(serializers.ModelSerializer):
    materials = MaterialInfoSerializer(
        many=True, required=False, read_only=True, source="materials.all"
    )
    duration = serializers.SerializerMethodField()

    def get_duration(self, obj):
        """Convert duration timedelta to minutes for frontend compatibility"""
        if obj.duration:
            return int(obj.duration.total_seconds() / 60)
        return 60  # Default to 60 minutes

    class Meta:
        # Import inside the class to avoid circular import issues
        from .models import Service as ServiceModel

        model = ServiceModel
        fields = ["id", "name", "description", "duration", "price", "oil", "materials"]


class MaterialSerializer(serializers.ModelSerializer):
    class Meta:
        # Import inside the class to avoid circular import issues
        from .models import Material as MaterialModel

        model = MaterialModel
        fields = ["id", "name", "description", "service"]
