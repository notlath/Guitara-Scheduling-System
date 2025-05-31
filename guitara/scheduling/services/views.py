from rest_framework import viewsets, permissions, filters, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from django.db import DatabaseError, OperationalError
from registration.models import Service
from .serializers import ServiceSerializer
from .service_data import ServiceData

class ServiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing massage services
    """
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['name', 'is_active']
    search_fields = ['name', 'description']
    
    def get_queryset(self):
        """
        Optionally restricts the returned services to only active ones
        if requested in query parameters
        """
        try:
            queryset = Service.objects.all()
            active_only = self.request.query_params.get('active_only', None)
            if active_only and active_only.lower() == 'true':
                queryset = queryset.filter(is_active=True)
            return queryset
        except (DatabaseError, OperationalError) as e:
            # If database is not available or table doesn't exist, return empty queryset
            # The list action will use the hardcoded data instead
            return Service.objects.none()
    
    def list(self, request, *args, **kwargs):
        """
        Override the default list method to return hardcoded services if DB fails
        """
        try:
            # Try to use the normal list method with database
            return super().list(request, *args, **kwargs)
        except (DatabaseError, OperationalError) as e:
            # If database is not available, use hardcoded services
            services = ServiceData.SERVICES
            
            # Filter by active if requested
            active_only = request.query_params.get('active_only', None)
            if active_only and active_only.lower() == 'true':
                services = [s for s in services if s.get('is_active', True)]
                
            # Filter by name if requested
            name_filter = request.query_params.get('name', None)
            if name_filter:
                services = [s for s in services if name_filter.lower() in s.get('name', '').lower()]
                
            return Response(services)
    
    def retrieve(self, request, *args, **kwargs):
        """
        Override retrieve method to provide hardcoded service by ID if DB fails
        """
        try:
            return super().retrieve(request, *args, **kwargs)
        except (DatabaseError, OperationalError) as e:
            pk = kwargs.get('pk')
            # Find service by ID in hardcoded data
            for service in ServiceData.SERVICES:
                if str(service['id']) == str(pk):
                    return Response(service)
            
            # If service not found, return 404
            return Response(
                {"detail": "Service not found."}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active services"""
        try:
            services = Service.objects.filter(is_active=True)
            serializer = self.get_serializer(services, many=True)
            return Response(serializer.data)
        except (DatabaseError, OperationalError) as e:
            # Return only active services from the hardcoded list
            active_services = [s for s in ServiceData.SERVICES if s.get('is_active', True)]
            return Response(active_services)
