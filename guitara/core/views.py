import logging
from rest_framework import generics, permissions, viewsets
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import CustomUser, SystemLog
from .serializers import UserSerializer, SystemLogSerializer
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

# Set up logger
logger = logging.getLogger(__name__)


class RegisterAPI(generics.GenericAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != "operator":
            return Response({"error": "Unauthorized"}, status=403)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Set role-based validation
        role = request.data.get("role")
        if role == "driver" and not request.data.get("motorcycle_plate"):
            return Response({"error": "Drivers require motorcycle plate"}, status=400)

        if role == "therapist" and not request.data.get("license_number"):
            return Response({"error": "Therapists require license number"}, status=400)

        user = serializer.save()
        return Response(
            {"user": UserSerializer(user).data, "message": "User created successfully"}
        )


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def toggle_account_status(request, user_id):
    """Toggle the is_active status of a user account (operator only)"""
    if request.user.role != "operator":
        return Response(
            {"error": "Unauthorized. Only operators can toggle account status."},
            status=403,
        )

    try:
        target_user = get_object_or_404(CustomUser, id=user_id)

        # Prevent operators from disabling themselves
        if target_user.id == request.user.id:
            return Response(
                {"error": "You cannot disable your own account."}, status=400
            )

        # Prevent disabling other operators
        if target_user.role == "operator":
            return Response({"error": "Cannot disable operator accounts."}, status=400)

        # Toggle the status
        target_user.is_active = not target_user.is_active
        target_user.save()

        # Return updated user data
        serializer = UserSerializer(target_user)
        action = "enabled" if target_user.is_active else "disabled"

        return Response(
            {"message": f"Account {action} successfully", "user": serializer.data}
        )

    except Exception as e:
        return Response({"error": str(e)}, status=500)


@api_view(["POST"])
def check_account_status(request):
    """Check if a user account is active (no authentication required for polling)"""
    username = request.data.get("username")

    if not username:
        return Response({"error": "Username is required"}, status=400)

    try:
        # Try to find user by username or email
        user = None
        try:
            user = CustomUser.objects.get(username=username)
        except CustomUser.DoesNotExist:
            try:
                user = CustomUser.objects.get(email=username)
            except CustomUser.DoesNotExist:
                return Response({"error": "Account not found"}, status=404)

        return Response(
            {
                "username": user.username,
                "is_active": user.is_active,
                "message": (
                    "Active account" if user.is_active else "Account is disabled"
                ),
            }
        )

    except Exception as e:
        return Response({"error": str(e)}, status=500)


class SystemLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing system logs (read-only)"""
    queryset = SystemLog.objects.all()
    serializer_class = SystemLogSerializer
    permission_classes = [IsAuthenticated]  # Re-enable authentication
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['log_type']  # Removed action_type as it's now in metadata
    ordering = ['-timestamp']  # Default sorting by newest logs first
    ordering_fields = ['timestamp', 'id']
    
    # Import the logs-specific pagination class
    from scheduling.pagination import LogsResultsPagination
    pagination_class = LogsResultsPagination
    
    def get_queryset(self):
        queryset = super().get_queryset()
        log_type = self.request.query_params.get('log_type', None)
        action_type = self.request.query_params.get('action_type', None)
        
        # Log the request parameters for debugging
        logger.debug(f"SystemLogViewSet query params: log_type={log_type}, action_type={action_type}")
        
        if log_type:
            # Handle multiple log_types separated by comma (for Authentication tab)
            if ',' in log_type:
                log_types = [t.strip() for t in log_type.split(',')]
                queryset = queryset.filter(log_type__in=log_types)
                logger.debug(f"Filtering by multiple log_types: {log_types}")
            else:
                queryset = queryset.filter(log_type=log_type)
                logger.debug(f"Filtering by single log_type: {log_type}")
            
        if action_type:
            # Since action_type is now stored in metadata, we need to filter differently
            # This is a simplified approach that doesn't use JSONField filtering for better compatibility
            filtered_logs = []
            for log in queryset:
                if log.metadata and log.metadata.get('action_type') == action_type:
                    filtered_logs.append(log.id)
            queryset = queryset.filter(id__in=filtered_logs)
        
        # Don't slice here - let pagination handle limiting
        # The [:limit] was causing the "Cannot reorder a query once a slice has been taken" error
        return queryset
        
    def retrieve(self, request, *args, **kwargs):
        """Override retrieve method to add error handling"""
        try:
            return super().retrieve(request, *args, **kwargs)
        except Exception as e:
            logger.error(f"Error retrieving system log: {str(e)}")
            return Response({"error": "Log not found or inaccessible"}, status=404)

# Test endpoint to verify API is working without authentication
@api_view(['GET'])
@permission_classes([AllowAny])
def test_no_auth(request):
    """Test endpoint that requires no authentication"""
    return Response({
        'message': 'Test endpoint working without authentication',
        'logs_count': SystemLog.objects.count()
    })
