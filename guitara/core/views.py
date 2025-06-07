from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .models import CustomUser
from .serializers import UserSerializer
from django.utils import timezone
from django.shortcuts import get_object_or_404

class RegisterAPI(generics.GenericAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != 'operator':
            return Response({"error": "Unauthorized"}, status=403)
            
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Set role-based validation
        role = request.data.get('role')
        if role == 'driver' and not request.data.get('motorcycle_plate'):
            return Response(
                {"error": "Drivers require motorcycle plate"}, 
                status=400
            )
            
        if role == 'therapist' and not request.data.get('license_number'):
            return Response(
                {"error": "Therapists require license number"}, 
                status=400
            )
            
        user = serializer.save()
        return Response({
            "user": UserSerializer(user).data,
            "message": "User created successfully"
        })

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def toggle_account_status(request, user_id):
    """Toggle the is_active status of a user account (operator only)"""
    if request.user.role != 'operator':
        return Response({"error": "Unauthorized. Only operators can toggle account status."}, status=403)
    
    try:
        target_user = get_object_or_404(CustomUser, id=user_id)
        
        # Prevent operators from disabling themselves
        if target_user.id == request.user.id:
            return Response({"error": "You cannot disable your own account."}, status=400)
        
        # Prevent disabling other operators
        if target_user.role == 'operator':
            return Response({"error": "Cannot disable operator accounts."}, status=400)
        
        # Toggle the status
        target_user.is_active = not target_user.is_active
        target_user.save()
        
        # Return updated user data
        serializer = UserSerializer(target_user)
        action = "enabled" if target_user.is_active else "disabled"
        
        return Response({
            "message": f"Account {action} successfully",
            "user": serializer.data
        })
        
    except Exception as e:
        return Response({"error": str(e)}, status=500)