from rest_framework import serializers
from .models import Service, Material, RegistrationMaterial

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


class ClientSerializer(serializers.Serializer):
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone_number = serializers.CharField(max_length=20)
    address = serializers.CharField()
    notes = serializers.CharField(required=False, allow_blank=True)


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


class CompleteRegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=20)
    password = serializers.CharField(write_only=True, min_length=8)

    def validate_email(self, value):
        from core.models import CustomUser

        user = CustomUser.objects.filter(email=value).first()
        if not user:
            raise serializers.ValidationError("No user found with this email.")
        # Only allow if user has no usable password
        if user.has_usable_password() and user.password not in (None, "", "!"):
            raise serializers.ValidationError(
                "This email has already completed registration."
            )
        return value

    def validate_password(self, value):
        # You can add more password validation here if needed
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters.")
        return value


class RegistrationMaterialSerializer(serializers.ModelSerializer):
    # Include the current stock from the related inventory item
    current_stock = serializers.SerializerMethodField()

    def get_current_stock(self, obj):
        """Get current stock from the related inventory item"""
        try:
            if obj.inventory_item:
                # Use only() to fetch only the current_stock field to avoid missing column issues
                from inventory.models import InventoryItem

                inventory_item = (
                    InventoryItem.objects.only("current_stock")
                    .filter(id=obj.inventory_item_id)
                    .first()
                )
                if inventory_item:
                    return inventory_item.current_stock
            return obj.stock_quantity or 0  # Fallback to registration material stock
        except Exception as e:
            # Log the error but don't break the API response
            import logging

            logger = logging.getLogger(__name__)
            logger.warning(f"Error getting current_stock for material {obj.id}: {e}")
            return obj.stock_quantity or 0  # Safe fallback

    class Meta:
        model = RegistrationMaterial
        fields = "__all__"
