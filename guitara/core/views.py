from rest_framework import generics, permissions
from rest_framework.response import Response
from .models import CustomUser
from .serializers import UserSerializer
from django.utils import timezone

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