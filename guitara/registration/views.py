import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.http import JsonResponse
from .supabase_client import get_supabase_client, safe_supabase_operation, init_supabase
from .serializers import (
    TherapistSerializer,
    DriverSerializer,
    OperatorSerializer,
    ClientSerializer,
    ServiceSerializer,
    MaterialSerializer,
    CompleteRegistrationSerializer,
)
from core.models import CustomUser
from core.storage_service import storage_service
from .models import RegistrationMaterial
from .serializers import RegistrationMaterialSerializer

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
        # Pagination parameters - Set to 12 items per page for production use
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 12))
        offset = (page - 1) * page_size

        # Get total count first
        count_result = (
            supabase.table("registration_therapist")
            .select("*", count="exact")
            .execute()
        )
        total_count = count_result.count if hasattr(count_result, "count") else 0

        # Get paginated data
        result = (
            supabase.table("registration_therapist")
            .select("*")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        if getattr(result, "error", None):
            return Response({"error": str(result.error)}, status=500)
        data = result.data if hasattr(result, "data") else []

        # Fetch phone_number from CustomUser for each therapist
        from core.models import CustomUser

        for therapist in data:
            username = therapist.get("username")
            phone_number = None
            try:
                user = CustomUser.objects.get(username=username)
                phone_number = user.phone_number
            except CustomUser.DoesNotExist:
                phone_number = None
            therapist["phone_number"] = phone_number

        # Calculate pagination metadata
        import math

        total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1
        has_next = page < total_pages
        has_previous = page > 1

        # Return DRF-style paginated response
        return Response(
            {
                "count": total_count,
                "total_pages": total_pages,
                "current_page": page,
                "page_size": page_size,
                "has_next": has_next,
                "has_previous": has_previous,
                "next": f"?page={page + 1}&page_size={page_size}" if has_next else None,
                "previous": (
                    f"?page={page - 1}&page_size={page_size}" if has_previous else None
                ),
                "results": data,
            }
        )

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
                # Always create or update CustomUser after Supabase insert
                user, created = CustomUser.objects.update_or_create(
                    username=data["username"],
                    defaults={
                        "email": data["email"],
                        "first_name": first_name,
                        "last_name": last_name,
                        "role": "therapist",
                        "specialization": data.get("specialization"),
                        "massage_pressure": data.get("pressure"),
                        "is_active": True,
                    },
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
                        # Fallback: Store in local Django database (already done above)
                        return Response(
                            {
                                "message": "Therapist registered successfully (stored locally due to database connectivity issues)",
                                "fallback": True,
                                "user_id": user.id,
                            },
                            status=status.HTTP_201_CREATED,
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
                    {
                        "message": "Therapist registered successfully",
                        "user_id": user.id,
                    },
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
        supabase = get_supabase_client()
        if not supabase:
            return Response({"error": "Supabase client not available"}, status=500)
        # Pagination parameters - Set to 12 items per page for production use
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 12))
        offset = (page - 1) * page_size

        # Get total count first
        def count_operation():
            return (
                supabase.table("registration_driver")
                .select("*", count="exact")
                .execute()
            )

        count_result, count_error = safe_supabase_operation(count_operation, timeout=10)
        total_count = (
            count_result.count if count_result and hasattr(count_result, "count") else 0
        )

        def operation():
            # Revert to select all fields
            return (
                supabase.table("registration_driver")
                .select("*")
                .range(offset, offset + page_size - 1)
                .execute()
            )

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

        # Fetch phone_number from CustomUser for each driver
        from core.models import CustomUser

        for driver in data:
            username = driver.get("username")
            phone_number = None
            try:
                user = CustomUser.objects.get(username=username)
                phone_number = user.phone_number
            except CustomUser.DoesNotExist:
                phone_number = None
            driver["phone_number"] = phone_number

        # Calculate pagination metadata
        import math

        total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1
        has_next = page < total_pages
        has_previous = page > 1

        # Return DRF-style paginated response
        return Response(
            {
                "count": total_count,
                "total_pages": total_pages,
                "current_page": page,
                "page_size": page_size,
                "has_next": has_next,
                "has_previous": has_previous,
                "next": f"?page={page + 1}&page_size={page_size}" if has_next else None,
                "previous": (
                    f"?page={page - 1}&page_size={page_size}" if has_previous else None
                ),
                "results": data,
            }
        )

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
                # Always create or update CustomUser after Supabase insert
                user, created = CustomUser.objects.update_or_create(
                    username=data["username"],
                    defaults={
                        "email": data["email"],
                        "first_name": data["first_name"],
                        "last_name": data["last_name"],
                        "role": "driver",
                        "is_active": True,
                    },
                )
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
                    {"message": "Driver registered successfully", "user_id": user.id},
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
        # Pagination parameters - Set to 12 items per page for production use
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 12))
        offset = (page - 1) * page_size

        # Get total count first
        count_result = (
            supabase.table("registration_operator").select("*", count="exact").execute()
        )
        total_count = count_result.count if hasattr(count_result, "count") else 0

        # Get paginated data
        result = (
            supabase.table("registration_operator")
            .select("*")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        if getattr(result, "error", None):
            return Response({"error": str(result.error)}, status=500)
        data = result.data if hasattr(result, "data") else []

        # Optimize: bulk fetch CustomUser phone numbers
        from core.models import CustomUser

        usernames = [op.get("username") for op in data if op.get("username")]
        users = CustomUser.objects.filter(username__in=usernames)
        user_map = {u.username: u.phone_number for u in users}
        for operator in data:
            username = operator.get("username")
            operator["phone_number"] = user_map.get(username)

        # Calculate pagination metadata
        import math

        total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1
        has_next = page < total_pages
        has_previous = page > 1

        # Return DRF-style paginated response
        return Response(
            {
                "count": total_count,
                "total_pages": total_pages,
                "current_page": page,
                "page_size": page_size,
                "has_next": has_next,
                "has_previous": has_previous,
                "next": f"?page={page + 1}&page_size={page_size}" if has_next else None,
                "previous": (
                    f"?page={page - 1}&page_size={page_size}" if has_previous else None
                ),
                "results": data,
            }
        )

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
                # Always create or update CustomUser after Supabase insert
                try:
                    logger.warning(
                        f"Attempting to create/update CustomUser for operator: username={data['username']}, email={data['email']}, first_name={data['first_name']}, last_name={data['last_name']}, role=operator"
                    )
                    user, created = CustomUser.objects.update_or_create(
                        username=data["username"],
                        defaults={
                            "email": data["email"],
                            "first_name": data["first_name"],
                            "last_name": data["last_name"],
                            "role": "operator",
                            "is_active": True,
                        },
                    )
                except Exception as cu_error:
                    import traceback

                    logger.error(
                        f"CustomUser creation failed for operator: {cu_error}\nTraceback: {traceback.format_exc()}"
                    )
                    # Check for unique constraint errors
                    cu_error_str = str(cu_error).lower()
                    if (
                        "unique constraint" in cu_error_str
                        or "unique violation" in cu_error_str
                        or "already exists" in cu_error_str
                    ):
                        if "email" in cu_error_str:
                            return Response(
                                {
                                    "error": "An operator with this email already exists (CustomUser)."
                                },
                                status=400,
                            )
                        if "username" in cu_error_str:
                            return Response(
                                {
                                    "error": "An operator with this username already exists (CustomUser)."
                                },
                                status=400,
                            )
                        return Response(
                            {
                                "error": "An operator with this information already exists (CustomUser)."
                            },
                            status=400,
                        )
                    if "role" in cu_error_str or "null" in cu_error_str:
                        return Response(
                            {
                                "error": "Operator registration failed: missing required field (role or other)."
                            },
                            status=400,
                        )
                    return Response(
                        {"error": f"CustomUser creation failed: {cu_error}"}, status=500
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
                    {"message": "Operator registered successfully", "user_id": user.id},
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

        # Pagination parameters - Set to 12 items per page for production use
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 12))
        offset = (page - 1) * page_size

        # Get total count
        total_count = Client.objects.count()

        # Get paginated data
        clients = Client.objects.all().order_by("id")[offset : offset + page_size]

        # Map to frontend table fields
        data = []
        for client in clients:
            data.append(
                {
                    "first_name": client.first_name,
                    "last_name": client.last_name,
                    "email": client.email or "",
                    "phone_number": client.phone_number,
                    "address": client.address,
                    "notes": client.notes or "",
                    "created_at": client.created_at.isoformat() if client.created_at else "",
                }
            )

        # Calculate pagination metadata
        import math

        total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1
        has_next = page < total_pages
        has_previous = page > 1

        # Return DRF-style paginated response
        return Response(
            {
                "count": total_count,
                "total_pages": total_pages,
                "current_page": page,
                "page_size": page_size,
                "has_next": has_next,
                "has_previous": has_previous,
                "next": f"?page={page + 1}&page_size={page_size}" if has_next else None,
                "previous": (
                    f"?page={page - 1}&page_size={page_size}" if has_previous else None
                ),
                "results": data,
            }
        )

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
                    {
                        "message": "Client registered successfully",
                        "id": client.id,
                        "client": {
                            "id": client.id,
                            "first_name": client.first_name,
                            "last_name": client.last_name,
                            "email": client.email,
                            "phone_number": client.phone_number,
                            "address": client.address,
                        },
                    },
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
        # Pagination parameters - Set to 12 items per page for production use
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 12))
        offset = (page - 1) * page_size

        # Get total count first
        count_result = (
            supabase.table("registration_material").select("*", count="exact").execute()
        )
        total_count = count_result.count if hasattr(count_result, "count") else 0

        # Fetch paginated materials from Supabase
        result = (
            supabase.table("registration_material")
            .select("*")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        if getattr(result, "error", None):
            return Response({"error": str(result.error)}, status=500)
        data = result.data if hasattr(result, "data") else []

        # Calculate pagination metadata
        import math

        total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1
        has_next = page < total_pages
        has_previous = page > 1

        # Return DRF-style paginated response
        return Response(
            {
                "count": total_count,
                "total_pages": total_pages,
                "current_page": page,
                "page_size": page_size,
                "has_next": has_next,
                "has_previous": has_previous,
                "next": f"?page={page + 1}&page_size={page_size}" if has_next else None,
                "previous": (
                    f"?page={page - 1}&page_size={page_size}" if has_previous else None
                ),
                "results": data,
            }
        )

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
        # Prioritize local Django database first since it has the material associations
        data = []

        try:
            from registration.models import Service, Material

            # Pagination parameters - Set to 12 items per page for production use
            page = int(request.query_params.get("page", 1))
            page_size = int(request.query_params.get("page_size", 12))
            offset = (page - 1) * page_size

            # Get total count
            total_count = Service.objects.count()

            # Use prefetch_related for optimized query
            services = (
                Service.objects.prefetch_related("materials")
                .all()
                .order_by("id")[offset : offset + page_size]
            )

            for service in services:
                # Get materials for this service using the foreign key relationship
                materials = service.materials.all()
                materials_list = [
                    {
                        "id": mat.id,
                        "name": mat.name,
                        "description": mat.description,
                        "stock_quantity": mat.stock_quantity,
                    }
                    for mat in materials
                ]

                data.append(
                    {
                        "id": service.id,
                        "name": service.name,
                        "description": service.description,
                        "duration": service.duration,  # Already in minutes
                        "price": float(service.price),
                        "oil": service.oil,
                        "is_active": service.is_active,
                        "materials": materials_list,  # This ensures materials are included
                    }
                )

            logger.info(f"Fetched {len(data)} services from local Django database")

            # Calculate pagination metadata
            import math

            total_pages = math.ceil(total_count / page_size) if total_count > 0 else 1
            has_next = page < total_pages
            has_previous = page > 1

            # Return DRF-style paginated response
            return Response(
                {
                    "count": total_count,
                    "total_pages": total_pages,
                    "current_page": page,
                    "page_size": page_size,
                    "has_next": has_next,
                    "has_previous": has_previous,
                    "next": (
                        f"?page={page + 1}&page_size={page_size}" if has_next else None
                    ),
                    "previous": (
                        f"?page={page - 1}&page_size={page_size}"
                        if has_previous
                        else None
                    ),
                    "results": data,
                }
            )

        except Exception as e:
            logger.error(f"Local services fetch failed: {e}")

            # Fallback: Try Supabase if local fails
            supabase = get_supabase_client()
            if supabase:
                try:
                    # Pagination parameters
                    page = int(request.query_params.get("page", 1))
                    page_size = int(request.query_params.get("page_size", 100))
                    offset = (page - 1) * page_size

                    # Get total count first
                    count_result = (
                        supabase.table("registration_service")
                        .select("*", count="exact")
                        .execute()
                    )
                    total_count = (
                        count_result.count if hasattr(count_result, "count") else 0
                    )

                    # Fetch from Supabase
                    result = (
                        supabase.table("registration_service")
                        .select("*")
                        .range(offset, offset + page_size - 1)
                        .execute()
                    )
                    if not getattr(result, "error", None):
                        data = result.data if hasattr(result, "data") else []

                        # Try to fetch materials for Supabase services
                        service_ids = [svc["id"] for svc in data]
                        if service_ids:
                            try:
                                materials_result = (
                                    supabase.table("registration_material_service")
                                    .select("*")
                                    .in_("service_id", service_ids)
                                    .execute()
                                )
                                materials_data = (
                                    materials_result.data
                                    if materials_result
                                    and hasattr(materials_result, "data")
                                    else []
                                )

                                # Group materials by service_id
                                from collections import defaultdict

                                mats_by_service = defaultdict(list)
                                for mat in materials_data:
                                    mats_by_service[mat["service_id"]].append(
                                        {
                                            "name": mat.get("material_name", ""),
                                            "description": mat.get(
                                                "material_description", ""
                                            ),
                                        }
                                    )

                                # Attach materials to each service
                                for svc in data:
                                    svc["materials"] = mats_by_service.get(
                                        svc["id"], []
                                    )
                            except Exception as mat_error:
                                logger.warning(
                                    f"Failed to fetch materials from Supabase: {mat_error}"
                                )
                                # Set empty materials for all services
                                for svc in data:
                                    svc["materials"] = []

                        logger.info(f"Fetched {len(data)} services from Supabase")

                        # Calculate pagination metadata for Supabase fallback
                        import math

                        total_pages = (
                            math.ceil(total_count / page_size) if total_count > 0 else 1
                        )
                        has_next = page < total_pages
                        has_previous = page > 1

                        # Return DRF-style paginated response
                        return Response(
                            {
                                "count": total_count,
                                "total_pages": total_pages,
                                "current_page": page,
                                "page_size": page_size,
                                "has_next": has_next,
                                "has_previous": has_previous,
                                "next": (
                                    f"?page={page + 1}&page_size={page_size}"
                                    if has_next
                                    else None
                                ),
                                "previous": (
                                    f"?page={page - 1}&page_size={page_size}"
                                    if has_previous
                                    else None
                                ),
                                "results": data,
                            }
                        )
                except Exception as e:
                    logger.warning(f"Supabase services fetch failed: {e}")
                    return Response(
                        {
                            "error": "Failed to fetch services from both local and Supabase databases"
                        },
                        status=500,
                    )

        # If everything fails, return empty paginated response
        return Response(
            {
                "count": 0,
                "total_pages": 1,
                "current_page": 1,
                "page_size": 100,
                "has_next": False,
                "has_previous": False,
                "next": None,
                "previous": None,
                "results": [],
            }
        )

    def post(self, request):
        serializer = ServiceSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            inserted_data, error = insert_into_table(
                "registration_service",
                {
                    "name": data["name"],
                    "description": data["description"],
                    "duration": data["duration"],
                    "price": float(data["price"]),
                    "materials": data.get("materials", []),
                },
            )
            if error:
                return Response({"error": error}, status=status.HTTP_400_BAD_REQUEST)
            return Response(
                {"message": "Service registered successfully"},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CompleteRegistrationAPIView(APIView):
    """
    API endpoint for therapists/drivers to complete their registration by providing email, phone number, and password.
    """

    def post(self, request):
        from django.contrib.auth.hashers import make_password

        serializer = CompleteRegistrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        email = serializer.validated_data["email"]
        phone_number = serializer.validated_data["phone_number"]
        password = serializer.validated_data["password"]
        try:
            user = CustomUser.objects.get(email=email)
            user.phone_number = phone_number
            user.set_password(password)
            user.save()
            return Response(
                {"message": "Registration completed successfully."},
                status=status.HTTP_200_OK,
            )
        except CustomUser.DoesNotExist:
            return Response(
                {"error": "No user found with this email."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as exc:
            import traceback

            print("[DEBUG] Registration Exception:", exc)
            traceback.print_exc()
            return Response(
                {
                    "error": f"Failed to complete registration: {exc}",
                    "trace": traceback.format_exc(),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["POST"])
@permission_classes([AllowAny])
def check_email_exists(request):
    """
    Check if an email is registered and eligible for registration completion.
    Returns {exists: true/false, eligible: true/false, role: ...}
    """
    email = request.data.get("email", "").strip().lower()
    if not email:
        return Response(
            {"exists": False, "eligible": False, "error": "No email provided."},
            status=400,
        )
    user = CustomUser.objects.filter(email__iexact=email).first()
    if user:
        # Eligible if user has no password set (i.e., not completed registration)
        eligible = not user.has_usable_password() or user.password in (None, "", "!")
        return Response(
            {
                "exists": True,
                "eligible": eligible,
                "role": user.role,
                "first_name": user.first_name,
                "last_name": user.last_name,
            }
        )
    return Response({"exists": False, "eligible": False})


@method_decorator(csrf_exempt, name="dispatch")
class ProfilePhotoUploadView(APIView):
    """
    API endpoint for uploading profile photos
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """
        Upload a profile photo for the authenticated user
        """
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Check if file was uploaded
        if "photo" not in request.FILES:
            return Response(
                {"error": "No photo file provided"}, status=status.HTTP_400_BAD_REQUEST
            )

        photo_file = request.FILES["photo"]  # Validate file size (5MB limit)
        if photo_file.size > 5 * 1024 * 1024:
            return Response(
                {"error": "File too large. Maximum size is 5MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate file type
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
        if photo_file.content_type not in allowed_types:
            return Response(
                {"error": "Invalid file type. Please use JPEG, PNG, or WebP."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Upload to Supabase Storage or local storage as fallback
            logger.info(
                f"Attempting to upload profile photo for user {request.user.id}"
            )
            photo_url = storage_service.upload_profile_photo(
                user_id=request.user.id, image_file=photo_file, filename=photo_file.name
            )

            if not photo_url:
                logger.error(
                    f"Storage service returned None for user {request.user.id}"
                )
                return Response(
                    {
                        "error": "Failed to upload photo to storage. Please check server logs for details."
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

            # Update user's profile_photo_url in database
            request.user.profile_photo_url = photo_url
            request.user.save(update_fields=["profile_photo_url"])

            logger.info(
                f"Profile photo updated for user {request.user.id}: {photo_url}"
            )

            return Response(
                {
                    "success": True,
                    "photo_url": photo_url,
                    "message": "Profile photo uploaded successfully",
                },
                status=status.HTTP_200_OK,
            )

        except ValueError as e:
            # Image processing errors
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Profile photo upload failed for user {request.user.id}: {e}")
            return Response(
                {"error": "Failed to upload profile photo"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def delete(self, request):
        """
        Delete the profile photo for the authenticated user
        """
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            # Delete from Supabase Storage
            success = storage_service.delete_profile_photo(user_id=request.user.id)

            if success:
                # Clear profile_photo_url in database
                request.user.profile_photo_url = None
                request.user.save(update_fields=["profile_photo_url"])

                logger.info(f"Profile photo deleted for user {request.user.id}")

                return Response(
                    {"success": True, "message": "Profile photo deleted successfully"},
                    status=status.HTTP_200_OK,
                )
            else:
                return Response(
                    {"error": "Failed to delete photo from storage"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        except Exception as e:
            logger.error(
                f"Profile photo deletion failed for user {request.user.id}: {e}"
            )
            return Response(
                {"error": "Failed to delete profile photo"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@method_decorator(csrf_exempt, name="dispatch")
class UserProfileView(APIView):
    """
    API endpoint for getting user profile data
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        Get the current user's profile data
        """
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = request.user
        profile_data = {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "role": user.role,
            "profile_photo_url": user.profile_photo_url,
            "phone_number": user.phone_number,
            "specialization": user.specialization,
            "massage_pressure": user.massage_pressure,
        }

        return Response(profile_data, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name="dispatch")
class UserProfileUpdateView(APIView):
    """
    API endpoint for updating user profile fields
    """

    permission_classes = [IsAuthenticated]

    def patch(self, request):
        """
        Update specific profile fields for the authenticated user
        """
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            # Get the fields to update from request data
            update_fields = {}

            # Handle profile photo URL update
            if "profile_photo_url" in request.data:
                update_fields["profile_photo_url"] = request.data["profile_photo_url"]

            # Handle other profile fields as needed
            allowed_fields = [
                "profile_photo_url",
                "first_name",
                "last_name",
                "phone_number",
                "two_factor_enabled",
            ]
            for field in allowed_fields:
                if field in request.data:
                    update_fields[field] = request.data[field]

            if not update_fields:
                return Response(
                    {"error": "No valid fields provided for update"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Update the user profile
            for field, value in update_fields.items():
                setattr(request.user, field, value)

            request.user.save(update_fields=list(update_fields.keys()))

            logger.info(
                f"Profile updated for user {request.user.id}: {list(update_fields.keys())}"
            )

            return Response(
                {
                    "success": True,
                    "message": "Profile updated successfully",
                    "updated_fields": list(update_fields.keys()),
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            logger.error(f"Profile update failed for user {request.user.id}: {e}")
            return Response(
                {"error": "Failed to update profile"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class RegistrationMaterialWithStockList(APIView):
    def get(self, request, service_id):
        materials = RegistrationMaterial.objects.filter(
            service_id=service_id
        ).select_related("inventory_item")
        serializer = RegistrationMaterialSerializer(materials, many=True)
        return Response(serializer.data)
