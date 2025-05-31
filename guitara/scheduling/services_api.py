from django.http import JsonResponse

def services_list(request):
    """
    Simple view to return hardcoded services without using models
    """
    services = [
        {
            'id': 1,
            'name': 'Shiatsu Massage',
            'description': 'A Japanese technique involving pressure points.',
            'duration': 60,  # 1 hour
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
            'duration': 90,  # 1.5 hours
            'price': 650.00,
            'oil': None,
            'is_active': True
        },
        {
            'id': 6,
            'name': 'Ventosa',
            'description': 'Traditional cupping therapy to relieve muscle tension.',
            'duration': 45,  # 45 minutes
            'price': 450.00,
            'oil': None,
            'is_active': True
        },
        {
            'id': 7,
            'name': 'Hand Massage',
            'description': 'Focused on hands and arms.',
            'duration': 45,  # 45 minutes
            'price': 350.00,
            'oil': None,
            'is_active': True
        },
    ]
    
    return JsonResponse(services, safe=False)
