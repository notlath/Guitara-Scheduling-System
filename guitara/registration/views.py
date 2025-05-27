import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .supabase_client import supabase
from .serializers import TherapistSerializer, DriverSerializer, OperatorSerializer, ServiceSerializer, MaterialSerializer

logger = logging.getLogger(__name__)

def insert_into_table(table_name, data):
    result = supabase.table(table_name).insert(data).execute()
    if result.error:
        logger.error(f"Insert error in {table_name}: {result.error}")
        return None, str(result.error)
    if not result.data or len(result.data) == 0:
        logger.error(f"No data returned after insert into {table_name}")
        return None, 'No data returned after insert'
    return result.data, None

class RegisterTherapist(APIView):
    def post(self, request):
        serializer = TherapistSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            inserted_data, error = insert_into_table('registration_therapist', {
                'first_name': data['first_name'],
                'last_name': data['last_name'],
                'username': data['username'],
                'email': data['email'],
                'specialization': data['specialization'],
                'pressure': data['pressure']
            })
            if error:
                return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'message': 'Therapist registered successfully'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class RegisterDriver(APIView):
    def post(self, request):
        serializer = DriverSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            inserted_data, error = insert_into_table('registration_driver', {
                'first_name': data['first_name'],
                'last_name': data['last_name'],
                'username': data['username'],
                'email': data['email']
            })
            if error:
                return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'message': 'Driver registered successfully'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class RegisterOperator(APIView):
    def post(self, request):
        serializer = OperatorSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            inserted_data, error = insert_into_table('registration_operator', {
                'first_name': data['first_name'],
                'last_name': data['last_name'],
                'username': data['username'],
                'email': data['email']
            })
            if error:
                return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'message': 'Operator registered successfully'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class RegisterMaterial(APIView):
    def post(self, request):
        serializer = MaterialSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            inserted_data, error = insert_into_table('registration_material', {
                'name': data['name'],
                'description': data['description']
            })
            if error:
                return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'message': 'Material registered successfully'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class RegisterService(APIView):
    def post(self, request):
        serializer = ServiceSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            service_data = {
                'name': data['name'],
                'description': data['description'],
                'duration': data['duration'],
                'price': data['price'],
                'oil': data['oil']
            }

            # Insert the service first
            inserted_service, error = insert_into_table('registration_service', service_data)
            if error:
                return Response({'error': error}, status=status.HTTP_400_BAD_REQUEST)

            service_id = inserted_service[0].get('id')
            if not service_id:
                logger.error("Failed to retrieve service ID after insert")
                return Response({'error': 'Failed to retrieve service ID'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Insert materials linked to this service, if any
            materials = data.get('materials', [])
            inserted_material_ids = []

            for mat in materials:
                material_data = {
                    'service_id': service_id,
                    'material_name': mat.get('name'),
                    'material_description': mat.get('description')
                }
                inserted_material, error = insert_into_table('registration_material_service', material_data)
                if error:
                    logger.error(f"Material insert failed, rolling back service and materials: {error}")

                    # Rollback: Delete inserted materials linked to service
                    for mid in inserted_material_ids:
                        supabase.table('registration_material_service').delete().eq('id', mid).execute()

                    # Rollback: Delete the inserted service
                    supabase.table('registration_service').delete().eq('id', service_id).execute()

                    return Response({'error': f"Material insert failed: {error}. Transaction rolled back."},
                                    status=status.HTTP_400_BAD_REQUEST)

                inserted_material_ids.append(inserted_material[0].get('id'))

            return Response({'message': 'Service registered successfully'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
