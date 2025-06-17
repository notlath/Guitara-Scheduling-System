from rest_framework import viewsets, status, filters as drf_filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import InventoryItem, UsageLog
from .serializers import InventoryItemSerializer, UsageLogSerializer
from .filters import InventoryItemFilter

class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all()
    serializer_class = InventoryItemSerializer
    filter_backends = [DjangoFilterBackend, drf_filters.SearchFilter, drf_filters.OrderingFilter]
    filterset_class = InventoryItemFilter
    search_fields = ['name', 'category', 'supplier']
    ordering_fields = ['name', 'category', 'current_stock', 'min_stock', 'supplier']

    def get_permissions(self):
        print("InventoryItemViewSet: get_permissions called for method", self.request.method)
        return super().get_permissions()

    @action(detail=True, methods=['post'])
    def restock(self, request, pk=None):
        item = self.get_object()
        amount = int(request.data.get('amount', 0))
        notes = request.data.get('notes', '')
        if amount > 0:
            item.current_stock += amount
            item.save()
            # Create a usage log for restocking
            UsageLog.objects.create(
                item=item,
                quantity_used=amount,  # Always positive
                operator=request.user if request.user.is_authenticated else None,
                action_type='restock',
                notes=notes
            )
            return Response({'status': 'restocked', 'current_stock': item.current_stock})
        return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def deduct(self, request, pk=None):
        item = self.get_object()
        amount = int(request.data.get('amount', 0))
        if 0 < amount <= item.current_stock:
            item.current_stock -= amount
            item.save()
            return Response({'status': 'deducted', 'current_stock': item.current_stock})
        return Response({'error': 'Invalid or insufficient stock'}, status=status.HTTP_400_BAD_REQUEST)

class UsageLogViewSet(viewsets.ModelViewSet):
    queryset = UsageLog.objects.all()
    serializer_class = UsageLogSerializer
