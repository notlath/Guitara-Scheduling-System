from rest_framework import serializers
from .models import InventoryItem, UsageLog

class InventoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryItem
        fields = '__all__'

class UsageLogSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    unit = serializers.CharField(source='item.unit', read_only=True)

    class Meta:
        model = UsageLog
        fields = '__all__'
        read_only_fields = ('item_name', 'unit')
