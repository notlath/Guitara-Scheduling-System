from ..utils.sanitization import sanitize_request_data

class SanitizationMiddleware:
    """
    Middleware to sanitize all incoming request data
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        # Process request before view is called
        if request.method in ['POST', 'PUT', 'PATCH']:
            if hasattr(request, 'POST') and request.POST:
                # Don't modify the original QueryDict, clone it
                request.POST = request.POST.copy()
                sanitized_data = sanitize_request_data(request.POST)
                for key, value in sanitized_data.items():
                    request.POST[key] = value
            
            # Handle JSON data in request body
            if hasattr(request, 'data'):
                request._data = sanitize_request_data(request.data)
        
        response = self.get_response(request)
        return response
