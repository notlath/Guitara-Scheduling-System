from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.generics import GenericAPIView
from .models import Therapist, Driver, Operator, Service, Material
from .serializers import TherapistSerializer, DriverSerializer, OperatorSerializer, ServiceSerializer, MaterialSerializer

class RegisterTherapistAPI(GenericAPIView):
    serializer_class = TherapistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != 'operator':
            return Response({"error": "Unauthorized"}, status=403)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Therapist registered successfully"}, status=status.HTTP_201_CREATED)

class RegisterDriverAPI(GenericAPIView):
    serializer_class = DriverSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != 'operator':
            return Response({"error": "Unauthorized"}, status=403)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Driver registered successfully"}, status=status.HTTP_201_CREATED)

class RegisterOperatorAPI(GenericAPIView):
    serializer_class = OperatorSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != 'operator':
            return Response({"error": "Unauthorized"}, status=403)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Operator registered successfully"}, status=status.HTTP_201_CREATED)

class RegisterServiceAPI(GenericAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != 'operator':
            return Response({"error": "Unauthorized"}, status=403)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Service registered successfully"}, status=status.HTTP_201_CREATED)

class RegisterMaterialAPI(GenericAPIView):
    serializer_class = MaterialSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if request.user.role != 'operator':
            return Response({"error": "Unauthorized"}, status=403)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Material registered successfully"}, status=status.HTTP_201_CREATED)