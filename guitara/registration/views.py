import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .supabase_client import get_supabase_client, safe_supabase_operation, init_supabase
from .serializers import (
    TherapistSerializer,
    DriverSerializer,
    OperatorSerializer,
    ClientSerializer,
    ServiceSerializer,
    MaterialSerializer,
)

logger = logging.getLogger(__name__)


def insert_into_table(table_name, data):
    """
    Insert data into Supabase table with timeout handling
    """
    supabase = get_supabase_client()
    if not supabase:
        return None, "Supabase client not available"

    def operation():
        return supabase.table(table_name).insert(data).execute()

    result, error = safe_supabase_operation(operation, timeout=15)

    if error:
        logger.error(f"Supabase operation failed for {table_name}: {error}")
        return None, error

    if not result:
        logger.error(f"No result returned from Supabase for {table_name}")
        return None, "No result returned from database"

    # Check for Supabase errors
    if getattr(result, "error", None):
        logger.error(f"Insert error in {table_name}: {result.error}")
        return None, str(result.error)

    if not result.data or len(result.data) == 0:
        logger.error(f"No data returned after insert into {table_name}")
        return None, "No data returned after insert"

    return result.data, None


class RegisterTherapist(APIView):
    def get(self, request):
        supabase = get_supabase_client()
        # Fetch all therapists from Supabase
        result = supabase.table("registration_therapist").select("*").execute()
        if getattr(result, "error", None):
            return Response({"error": str(result.error)}, status=500)
        data = result.data if hasattr(result, "data") else []
        return Response(data)

    def post(self, request):
        # Debug: log raw incoming data and repr
        logger.warning(f"RAW request.data: {request.data}")
        if "first_name" in request.data or "last_name" in request.data:
            logger.warning(
                f"RAW request.data repr: first_name={repr(request.data.get('first_name'))}, last_name={repr(request.data.get('last_name'))}"
            )

        logger.warning(f"Therapist registration payload: {request.data}")
        serializer = TherapistSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            # Store names as entered (no .title())
            first_name = data["first_name"].strip() if data["first_name"] else ""
            last_name = data["last_name"].strip() if data["last_name"] else ""
            # Debug: log repr to catch invisible chars or slicing
            logger.warning(
                f"Therapist registration validated: first_name={repr(first_name)}, last_name={repr(last_name)}"
            )
            payload = {
                "first_name": first_name,
                "last_name": last_name,
                "username": data["username"],
                "email": data["email"],
                "specialization": data["specialization"],
                "pressure": data["pressure"],
            }
            logger.warning(f"Payload sent to Supabase: {payload}")
            logger.warning(
                f"Payload repr sent to Supabase: {{'first_name': {repr(first_name)}, 'last_name': {repr(last_name)}}}"
            )

            try:
                inserted_data, error = insert_into_table(
                    "registration_therapist", payload
                )
                if error:
                    error_str = str(error).lower()

                    # Handle row-level security policy errors
                    if (
                        "row-level security" in error_str
                        or "42501" in error_str
                        or "violates row-level security policy" in error_str
                    ):
                        logger.warning(
                            f"Supabase RLS policy error, attempting local storage: {error}"
                        )

                        # Fallback: Store in local Django database
                        try:
                            from core.models import CustomUser

                            # Check if user already exists
                            if CustomUser.objects.filter(
                                username=data["username"]
                            ).exists():
                                return Response(
                                    {
                                        "error": "A therapist with this username already exists."
                                    },
                                    status=status.HTTP_400_BAD_REQUEST,
                                )
                            if CustomUser.objects.filter(email=data["email"]).exists():
                                return Response(
                                    {
                                        "error": "A therapist with this email already exists."
                                    },
                                    status=status.HTTP_400_BAD_REQUEST,
                                )

                            # Create user in local database
                            user = CustomUser.objects.create(
                                username=data["username"],
                                email=data["email"],
                                first_name=data["first_name"],
                                last_name=data["last_name"],
                                role="therapist",
                                specialization=data.get("specialization"),
                                massage_pressure=data.get("pressure"),
                                is_active=True,
                            )

                            logger.info(
                                f"Therapist stored locally due to Supabase RLS issues: {user.username}"
                            )
                            return Response(
                                {
                                    "message": "Therapist registered successfully (stored locally due to database connectivity issues)",
                                    "fallback": True,
                                    "user_id": user.id,
                                },
                                status=status.HTTP_201_CREATED,
                            )

                        except Exception as local_error:
                            logger.error(f"Local storage also failed: {local_error}")
                            return Response(
                                {
                                    "error": f"Registration failed: Database access denied and local storage failed: {str(local_error)}"
                                },
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            )

                    # Handle duplicate key errors
                    if (
                        "duplicate key" in error_str
                        or "unique constraint" in error_str
                        or "already exists" in error_str
                    ):
                        if "email" in error_str:
                            return Response(
                                {
                                    "error": "A therapist with this email already exists."
                                },
                                status=status.HTTP_400_BAD_REQUEST,
                            )
                        if "username" in error_str:
                            return Response(
                                {
                                    "error": "A therapist with this username already exists."
                                },
                                status=status.HTTP_400_BAD_REQUEST,
                            )
                        return Response(
                            {
                                "error": "A therapist with this information already exists."
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    return Response(
                        {"error": error}, status=status.HTTP_400_BAD_REQUEST
                    )
                return Response(
                    {"message": "Therapist registered successfully"},
                    status=status.HTTP_201_CREATED,
                )
            except Exception as exc:
                logger.error(
                    f"Exception during therapist registration: {exc}", exc_info=True
                )
                return Response(
                    {"error": f"Internal server error: {exc}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        logger.warning(f"Therapist serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterDriver(APIView):
    def get(self, request):
        # Fetch all drivers from Supabase with timeout handling
        supabase = get_supabase_client()
        if not supabase:
            return Response({"error": "Supabase client not available"}, status=500)

        def operation():
            return supabase.table("registration_driver").select("*").execute()

        result, error = safe_supabase_operation(operation, timeout=10)

        if error:
            logger.error(f"Failed to fetch drivers: {error}")
            return Response(
                {"error": f"Database connection failed: {error}"}, status=500
            )

        if not result:
            return Response({"error": "No response from database"}, status=500)

        if getattr(result, "error", None):
            return Response({"error": str(result.error)}, status=500)

        data = result.data if hasattr(result, "data") else []
        return Response(data)

    def post(self, request):
        logger.warning(f"Driver registration payload: {request.data}")
        serializer = DriverSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            logger.warning(f"Driver registration validated: {data}")

            # Prepare the payload for insertion
            payload = {
                "first_name": data["first_name"],
                "last_name": data["last_name"],
                "username": data["username"],
                "email": data["email"],
            }

            try:
                # Try Supabase first
                inserted_data, error = insert_into_table("registration_driver", payload)

                if error:
                    # Check if it's a timeout/connection error or RLS policy error
                    if (
                        "timeout" in error.lower()
                        or "unreachable" in error.lower()
                        or "connection" in error.lower()
                        or "row-level security" in error.lower()
                        or "42501" in error.lower()
                        or "violates row-level security policy" in error.lower()
                    ):
                        logger.warning(
                            f"Supabase timeout/RLS error, attempting local storage: {error}"
                        )

                        # Fallback: Store in local Django database
                        try:
                            from core.models import CustomUser

                            # Check if user already exists
                            if CustomUser.objects.filter(
                                username=data["username"]
                            ).exists():
                                return Response(
                                    {
                                        "error": "A driver with this username already exists."
                                    },
                                    status=status.HTTP_400_BAD_REQUEST,
                                )
                            if CustomUser.objects.filter(email=data["email"]).exists():
                                return Response(
                                    {
                                        "error": "A driver with this email already exists."
                                    },
                                    status=status.HTTP_400_BAD_REQUEST,
                                )

                            # Create user in local database
                            user = CustomUser.objects.create(
                                username=data["username"],
                                email=data["email"],
                                first_name=data["first_name"],
                                last_name=data["last_name"],
                                role="driver",
                                is_active=True,
                            )

                            logger.info(
                                f"Driver stored locally due to Supabase issues: {user.username}"
                            )
                            return Response(
                                {
                                    "message": "Driver registered successfully (stored locally due to database connectivity issues)",
                                    "fallback": True,
                                    "user_id": user.id,
                                },
                                status=status.HTTP_201_CREATED,
                            )

                        except Exception as local_error:
                            logger.error(f"Local storage also failed: {local_error}")
                            return Response(
                                {
                                    "error": f"Registration failed: Database unreachable and local storage failed: {str(local_error)}"
                                },
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            )

                    # Handle other Supabase errors (like duplicates)
                    error_str = str(error).lower()
                    if (
                        "duplicate key" in error_str
                        or "unique constraint" in error_str
                        or "already exists" in error_str
                    ):
                        if "email" in error_str:
                            return Response(
                                {"error": "A driver with this email already exists."},
                                status=status.HTTP_400_BAD_REQUEST,
                            )
                        if "username" in error_str:
                            return Response(
                                {
                                    "error": "A driver with this username already exists."
                                },
                                status=status.HTTP_400_BAD_REQUEST,
                            )
                        return Response(
                            {"error": "A driver with this information already exists."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    return Response(
                        {"error": error}, status=status.HTTP_400_BAD_REQUEST
                    )

                # Success case
                return Response(
                    {"message": "Driver registered successfully"},
                    status=status.HTTP_201_CREATED,
                )

            except Exception as exc:
                logger.error(
                    f"Exception during driver registration: {exc}", exc_info=True
                )
                return Response(
                    {"error": f"Internal server error: {exc}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        logger.warning(f"Driver serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterOperator(APIView):
    def get(self, request):
        supabase = get_supabase_client()
        if not supabase:
            return Response({"error": "Supabase client not available"}, status=500)
        # Fetch all operators from Supabase
        result = supabase.table("registration_operator").select("*").execute()
        if getattr(result, "error", None):
            return Response({"error": str(result.error)}, status=500)
        data = result.data if hasattr(result, "data") else []
        return Response(data)

    def post(self, request):
        logger.warning(f"Operator registration payload: {request.data}")
        serializer = OperatorSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            logger.warning(f"Operator registration validated: {data}")

            # Prepare the payload for insertion
            payload = {
                "first_name": data["first_name"],
                "last_name": data["last_name"],
                "username": data["username"],
                "email": data["email"],
            }

            try:
                # Try Supabase first
                inserted_data, error = insert_into_table(
                    "registration_operator", payload
                )

                if error:
                    error_str = str(error).lower()

                    # Handle row-level security policy errors and timeouts
                    if (
                        "row-level security" in error_str
                        or "42501" in error_str
                        or "violates row-level security policy" in error_str
                        or "timeout" in error_str
                        or "unreachable" in error_str
                        or "connection" in error_str
                    ):
                        logger.warning(
                            f"Supabase RLS/timeout error, attempting local storage: {error}"
                        )

                        # Fallback: Store in local Django database
                        try:
                            from core.models import CustomUser

                            # Check if user already exists
                            if CustomUser.objects.filter(
                                username=data["username"]
                            ).exists():
                                return Response(
                                    {
                                        "error": "An operator with this username already exists."
                                    },
                                    status=status.HTTP_400_BAD_REQUEST,
                                )
                            if CustomUser.objects.filter(email=data["email"]).exists():
                                return Response(
                                    {
                                        "error": "An operator with this email already exists."
                                    },
                                    status=status.HTTP_400_BAD_REQUEST,
                                )

                            # Create user in local database
                            user = CustomUser.objects.create(
                                username=data["username"],
                                email=data["email"],
                                first_name=data["first_name"],
                                last_name=data["last_name"],
                                role="operator",
                                is_active=True,
                            )

                            logger.info(
                                f"Operator stored locally due to Supabase issues: {user.username}"
                            )
                            return Response(
                                {
                                    "message": "Operator registered successfully (stored locally due to database connectivity issues)",
                                    "fallback": True,
                                    "user_id": user.id,
                                },
                                status=status.HTTP_201_CREATED,
                            )

                        except Exception as local_error:
                            logger.error(f"Local storage also failed: {local_error}")
                            return Response(
                                {
                                    "error": f"Registration failed: Database unreachable and local storage failed: {str(local_error)}"
                                },
                                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            )

                    # Handle duplicate key errors
                    if (
                        "duplicate key" in error_str
                        or "unique constraint" in error_str
                        or "already exists" in error_str
                    ):
                        if "email" in error_str:
                            return Response(
                                {
                                    "error": "An operator with this email already exists."
                                },
                                status=status.HTTP_400_BAD_REQUEST,
                            )
                        if "username" in error_str:
                            return Response(
                                {
                                    "error": "An operator with this username already exists."
                                },
                                status=status.HTTP_400_BAD_REQUEST,
                            )
                        return Response(
                            {
                                "error": "An operator with this information already exists."
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    return Response(
                        {"error": error}, status=status.HTTP_400_BAD_REQUEST
                    )

                # Success case
                return Response(
                    {"message": "Operator registered successfully"},
                    status=status.HTTP_201_CREATED,
                )

            except Exception as exc:
                logger.error(
                    f"Exception during operator registration: {exc}", exc_info=True
                )
                return Response(
                    {"error": f"Internal server error: {exc}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        logger.warning(f"Operator serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterClient(APIView):
    def get(self, request):
        # Fetch all clients from scheduling app
        from scheduling.models import Client

        clients = Client.objects.all()
        # Map to frontend table fields
        data = []
        for client in clients:
            data.append(
                {
                    "Name": f"{client.first_name} {client.last_name}".strip(),
                    "Email": client.email or "-",
                    "Address": client.address,
                    "Contact": client.phone_number,
                    "Notes": client.notes or "-",
                }
            )
        return Response(data)

    def post(self, request):
        logger.warning(f"Client registration payload: {request.data}")
        serializer = ClientSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            logger.warning(f"Client registration validated: {data}")

            try:
                # Store in local Django database (scheduling app)
                from scheduling.models import Client  # Create client in local database

                client = Client.objects.create(
                    first_name=data["first_name"],
                    last_name=data["last_name"],
                    email=data.get("email", ""),
                    phone_number=data["phone_number"],
                    address=data["address"],
                    notes=data.get("notes", ""),
                )

                logger.info(
                    f"Client stored locally: {client.first_name} {client.last_name}"
                )
                return Response(
                    {"message": "Client registered successfully"},
                    status=status.HTTP_201_CREATED,
                )

            except Exception as exc:
                logger.error(
                    f"Exception during client registration: {exc}", exc_info=True
                )
                return Response(
                    {"error": f"Internal server error: {exc}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        logger.warning(f"Client serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterMaterial(APIView):
    def get(self, request):
        supabase = get_supabase_client()
        if not supabase:
            return Response({"error": "Supabase client not available"}, status=500)
        # Fetch all materials from Supabase
        result = supabase.table("registration_material").select("*").execute()
        if getattr(result, "error", None):
            return Response({"error": str(result.error)}, status=500)
        data = result.data if hasattr(result, "data") else []
        return Response(data)

    def post(self, request):
        serializer = MaterialSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            inserted_data, error = insert_into_table(
                "registration_material",
                {"name": data["name"], "description": data["description"]},
            )
            if error:
                return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)
            return Response(
                {"message": "Material registered successfully"},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RegisterService(APIView):
    def get(self, request):
        supabase = get_supabase_client()
        if not supabase:
            return Response({"error": "Supabase client not available"}, status=500)
        # Fetch all services from Supabase
        result = supabase.table("registration_service").select("*").execute()
        if getattr(result, "error", None):
            return Response({"error": str(result.error)}, status=500)
        data = result.data if hasattr(result, "data") else []
        # Fetch materials for all services
        service_ids = [svc["id"] for svc in data]
        materials_result = (
            supabase.table("registration_material_service")
            .select("*")
            .in_("service_id", service_ids)
            .execute()
            if service_ids
            else None
        )
        materials_data = (
            materials_result.data
            if materials_result and hasattr(materials_result, "data")
            else []
        )
        # Group materials by service_id
        from collections import defaultdict

        mats_by_service = defaultdict(list)
        for mat in materials_data:
            mats_by_service[mat["service_id"]].append(
                {
                    "name": mat.get("material_name", ""),
                    "description": mat.get("material_description", ""),
                }
            )
        # Attach materials to each service
        for svc in data:
            svc["materials"] = mats_by_service.get(svc["id"], [])
        return Response(data)

    def post(self, request):
        serializer = ServiceSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            logger.warning(
                f"Service registration: duration={data['duration']} (type={type(data['duration'])})"
            )
            # Accept duration as integer (minutes)
            duration = data["duration"]
            if isinstance(duration, str):
                try:
                    duration_minutes = int(duration)
                except Exception:
                    duration_minutes = 0
            elif isinstance(duration, int):
                duration_minutes = duration
            elif hasattr(duration, "total_seconds"):
                duration_minutes = int(duration.total_seconds() // 60)
            else:
                duration_minutes = 0
            service_data = {
                "name": data["name"],
                "description": data["description"],
                "duration": duration_minutes,
                "price": float(data["price"]),
                "oil": data.get("oil"),
                "is_active": True,
            }
            logger.warning(f"Payload sent to Supabase for service: {service_data}")
            try:
                inserted_service, error = insert_into_table(
                    "registration_service", service_data
                )
                if error:
                    logger.error(f"Supabase insert error: {error}")
                    return Response(
                        {"error": error}, status=status.HTTP_400_BAD_REQUEST
                    )
            except Exception as exc:
                logger.error(f"Exception during Supabase insert: {exc}", exc_info=True)
                return Response(
                    {"error": f"Internal server error: {exc}"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            service_id = inserted_service[0].get("id")
            if not service_id:
                logger.error("Failed to retrieve service ID after insert")
                return Response(
                    {"error": "Failed to retrieve service ID"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            # Insert materials linked to this service, if any
            # PATCH: Use request.data for materials, not serializer.validated_data
            materials = request.data.get("materials", [])
            if isinstance(materials, str):
                import json

                try:
                    materials = json.loads(materials)
                except Exception:
                    materials = []
            if (
                isinstance(materials, list)
                and materials
                and isinstance(materials[0], str)
            ):
                materials = [{"name": m} for m in materials]
            inserted_material_ids = []
            supabase = get_supabase_client()
            if not supabase:
                logger.error("Supabase client not available for material insertion")
                return Response(
                    {"error": "Database client not available"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
            for mat in materials:
                material_data = {
                    "service_id": service_id,
                    "material_name": mat.get("name"),
                    "material_description": mat.get("description", ""),
                }
                inserted_material, error = insert_into_table(
                    "registration_material_service", material_data
                )
                if error:
                    logger.error(
                        f"Material insert failed, rolling back service and materials: {error}"
                    )
                    for mid in inserted_material_ids:
                        supabase.table("registration_material_service").delete().eq(
                            "id", mid
                        ).execute()
                    supabase.table("registration_service").delete().eq(
                        "id", service_id
                    ).execute()
                    return Response(
                        {
                            "error": f"Material insert failed: {error}. Transaction rolled back."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                inserted_material_ids.append(inserted_material[0].get("id"))
            return Response(
                {"message": "Service registered successfully"},
                status=status.HTTP_201_CREATED,
            )
        logger.warning(f"Service serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
