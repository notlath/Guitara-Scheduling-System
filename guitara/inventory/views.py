from rest_framework import viewsets, status, filters as drf_filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import InventoryItem, UsageLog
from .serializers import InventoryItemSerializer, UsageLogSerializer
from .filters import InventoryItemFilter
from .permissions import IsAdminOrReadOnly
from django.shortcuts import get_object_or_404


class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all()
    serializer_class = InventoryItemSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [
        DjangoFilterBackend,
        drf_filters.SearchFilter,
        drf_filters.OrderingFilter,
    ]
    filterset_class = InventoryItemFilter
    search_fields = ["name", "category", "supplier"]
    ordering_fields = ["name", "category", "current_stock", "min_stock", "supplier"]
    ordering = ["name"]

    def get_permissions(self):
        print(
            "InventoryItemViewSet: get_permissions called for method",
            self.request.method,
        )
        return super().get_permissions()

    @action(detail=True, methods=["post"])
    def restock(self, request, pk=None):
        item = self.get_object()
        amount = int(request.data.get("amount", 0))
        notes = request.data.get("notes", "")
        if amount > 0:
            item.current_stock += amount
            item.save()
            # Create a usage log for restocking
            usage_log = UsageLog.objects.create(
                item=item,
                quantity_used=amount,  # Always positive
                operator=request.user if request.user.is_authenticated else None,
                action_type="restock",
                notes=notes,
            )
            
            # Add to unified system logs
            try:
                from .logging_middleware import log_inventory_usage
                log_inventory_usage(
                    inventory_item=item,
                    quantity=amount,
                    user=request.user if request.user.is_authenticated else None,
                    action_type="restock",
                    notes=notes
                )
            except Exception as log_error:
                print(f"Failed to create system log for inventory restock: {log_error}")
            return Response(
                {"status": "restocked", "current_stock": item.current_stock}
            )
        return Response({"error": "Invalid amount"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def deduct(self, request, pk=None):
        item = self.get_object()
        amount = int(request.data.get("amount", 0))
        if 0 < amount <= item.current_stock:
            item.current_stock -= amount
            item.save()
            return Response({"status": "deducted", "current_stock": item.current_stock})
        return Response(
            {"error": "Invalid or insufficient stock"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    @action(detail=True, methods=["post"])
    def update_material_status(self, request, pk=None):
        """Update material status after service completion"""
        item = self.get_object()
        is_empty = request.data.get("is_empty", False)
        quantity = int(request.data.get("quantity", 1))
        notes = request.data.get("notes", "")

        try:
            if is_empty:
                # Move from in_use to empty
                if item.move_to_empty(quantity):
                    # Log the status change
                    usage_log = UsageLog.objects.create(
                        item=item,
                        quantity_used=quantity,
                        operator=(
                            request.user if request.user.is_authenticated else None
                        ),
                        action_type="empty",
                        notes=f"Material marked as empty after service. {notes}".strip(),
                    )
                    
                    # Add to unified system logs
                    try:
                        from .logging_middleware import log_inventory_usage
                        log_inventory_usage(
                            inventory_item=item,
                            quantity=quantity,
                            user=request.user if request.user.is_authenticated else None,
                            action_type="empty",
                            notes=notes
                        )
                    except Exception as log_error:
                        print(f"Failed to create system log for inventory empty: {log_error}")
                    return Response(
                        {
                            "status": "moved_to_empty",
                            "current_stock": item.current_stock,
                            "in_use": item.in_use,
                            "empty": item.empty,
                        }
                    )
                else:
                    return Response(
                        {"error": "Insufficient in_use quantity"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                # Return from in_use back to current_stock (material still usable)
                if quantity <= item.in_use:
                    item.in_use -= quantity
                    item.current_stock += quantity
                    item.save()

                    # Log the status change
                    usage_log = UsageLog.objects.create(
                        item=item,
                        quantity_used=quantity,
                        operator=(
                            request.user if request.user.is_authenticated else None
                        ),
                        action_type="returned",
                        notes=f"Material returned to stock after service. {notes}".strip(),
                    )
                    
                    # Add to unified system logs
                    try:
                        from .logging_middleware import log_inventory_usage
                        log_inventory_usage(
                            inventory_item=item,
                            quantity=quantity,
                            user=request.user if request.user.is_authenticated else None,
                            action_type="returned",
                            notes=notes
                        )
                    except Exception as log_error:
                        print(f"Failed to create system log for inventory return: {log_error}")
                    return Response(
                        {
                            "status": "returned_to_stock",
                            "current_stock": item.current_stock,
                            "in_use": item.in_use,
                            "empty": item.empty,
                        }
                    )
                else:
                    return Response(
                        {"error": "Insufficient in_use quantity"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

        except Exception as e:
            return Response(
                {"error": f"Failed to update material status: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def refill_from_empty(self, request, pk=None):
        """Refill items from empty containers back to current stock"""
        item = self.get_object()
        amount = int(request.data.get("amount", 0))
        notes = request.data.get("notes", "")

        if amount <= 0:
            return Response(
                {"error": "Invalid amount"}, status=status.HTTP_400_BAD_REQUEST
            )

        if amount > item.empty:
            return Response(
                {"error": "Not enough empty containers to refill"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            if item.refill_from_empty(amount):
                # Create a usage log for refilling from empty
                usage_log = UsageLog.objects.create(
                    item=item,
                    quantity_used=amount,
                    operator=request.user if request.user.is_authenticated else None,
                    action_type="restock",
                    notes=f"Refilled from empty containers. {notes}".strip(),
                )
                
                # Add to unified system logs
                try:
                    from .logging_middleware import log_inventory_usage
                    log_inventory_usage(
                        inventory_item=item,
                        quantity=amount,
                        user=request.user if request.user.is_authenticated else None,
                        action_type="restock",
                        notes=f"Refilled from empty containers. {notes}"
                    )
                except Exception as log_error:
                    print(f"Failed to create system log for refill from empty: {log_error}")
                return Response(
                    {
                        "status": "refilled_from_empty",
                        "current_stock": item.current_stock,
                        "empty": item.empty,
                        "message": f"Successfully refilled {amount} {item.unit} from empty containers",
                    }
                )
            else:
                return Response(
                    {"error": "Failed to refill from empty"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as e:
            return Response(
                {"error": f"Failed to refill from empty: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["get"])
    def appointment_usage(self, request, pk=None):
        """Get appointment usage history for this inventory item"""
        try:
            item = self.get_object()
            # Import here to avoid circular imports
            from scheduling.models import AppointmentMaterial

            # Get recent appointment material usage for this item
            usage_records = (
                AppointmentMaterial.objects.filter(inventory_item=item)
                .select_related("appointment", "appointment__client")
                .order_by("-appointment__date", "-appointment__start_time")[:20]
            )

            usage_data = []
            for usage in usage_records:
                usage_data.append(
                    {
                        "appointment_id": usage.appointment.id,
                        "client_name": (
                            f"{usage.appointment.client.first_name} {usage.appointment.client.last_name}"
                            if usage.appointment.client
                            else "Unknown"
                        ),
                        "date": usage.appointment.date,
                        "service": usage.appointment.services,
                        "quantity_used": float(usage.quantity_used),
                        "usage_type": usage.usage_type,
                        "returned": usage.returned,
                        "returned_at": usage.returned_at,
                    }
                )

            return Response(usage_data, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Error fetching appointment usage: {e}")
            return Response(
                {"error": "Failed to fetch usage data"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# Force reload of views
class UsageLogViewSet(viewsets.ModelViewSet):
    queryset = UsageLog.objects.all().order_by('-timestamp')
    serializer_class = UsageLogSerializer
    filter_backends = [DjangoFilterBackend, drf_filters.OrderingFilter]
    filterset_fields = ['action_type', 'item']
    ordering_fields = ['timestamp']
    
    def perform_create(self, serializer):
        """Add custom logging when creating usage logs"""
        # Save the usage log normally
        usage_log = serializer.save()
        
        # Add to unified system logs
        try:
            from .logging_middleware import log_inventory_usage
            log_inventory_usage(
                inventory_item=usage_log.item,
                quantity=usage_log.quantity_used,
                user=usage_log.operator,
                action_type=usage_log.action_type,
                notes=usage_log.notes
            )
        except Exception as log_error:
            print(f"Failed to create system log for usage log: {log_error}")
