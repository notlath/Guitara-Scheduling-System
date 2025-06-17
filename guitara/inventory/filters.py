from django_filters import rest_framework as filters
from .models import InventoryItem

class InventoryItemFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr='icontains')
    category = filters.CharFilter(lookup_expr='icontains')
    supplier = filters.CharFilter(lookup_expr='icontains')

    class Meta:
        model = InventoryItem
        fields = ['name', 'category', 'supplier']
