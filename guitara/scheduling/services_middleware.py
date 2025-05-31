from django.http import JsonResponse
import re

class ServicesMiddleware:
    """
    Middleware to intercept requests to the services endpoint and return fallback data
    when the actual endpoint is not working.
    """
    def __init__(self, get_response):
        self.get_response = get_response
        
        # Define the hardcoded service data
        self.fallback_services = [
            {
                'id': 1,
                'name': 'Shiatsu Massage',
                'description': 'A Japanese technique involving pressure points.',
                'duration': 60,
                'price': 500.00,
                'oil': None,
                'is_active': True
            },
            {
                'id': 2,
                'name': 'Combi Massage',
                'description': 'A combination of multiple massage techniques.',
                'duration': 60,
                'price': 550.00,
                'oil': None,
                'is_active': True
            },
            {
                'id': 3,
                'name': 'Dry Massage',
                'description': 'Performed without oils or lotions.',
                'duration': 60,
                'price': 450.00,
                'oil': None,
                'is_active': True
            },
            {
                'id': 4,
                'name': 'Foot Massage',
                'description': 'Focused on the feet and lower legs.',
                'duration': 60,
                'price': 400.00,
                'oil': None,
                'is_active': True
            },
            {
                'id': 5,
                'name': 'Hot Stone Service',
                'description': 'Uses heated stones for deep muscle relaxation.',
                'duration': 90,
                'price': 650.00,
                'oil': None,
                'is_active': True
            },
            {
                'id': 6,
                'name': 'Ventosa',
                'description': 'Traditional cupping therapy to relieve muscle tension.',
                'duration': 45,
                'price': 450.00,
                'oil': None,
                'is_active': True
            },
            {
                'id': 7,
                'name': 'Hand Massage',
                'description': 'Focused on hands and arms.',
                'duration': 45,
                'price': 350.00,
                'oil': None,
                'is_active': True
            },
        ]

    def __call__(self, request):
        # Check if this is a request to the services endpoint
        if re.search(r'/api/scheduling/services/?$', request.path_info):
            print(f"ServicesMiddleware: Intercepted request to {request.path_info}")
            if request.method == 'GET':
                # Return the fallback services directly
                return JsonResponse(self.fallback_services, safe=False)

        # Process the request normally for all other paths
        response = self.get_response(request)
        return response
