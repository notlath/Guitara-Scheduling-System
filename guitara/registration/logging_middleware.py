"""
Middleware for logging registration events in the unified logs system.
This module adds hooks to ensure all data registration events are logged properly.
"""
import logging
from functools import wraps

from core.utils.logging_utils import log_data_event

logger = logging.getLogger(__name__)

def log_data_creation(entity_type):
    """
    Decorator for logging data creation events.
    
    Usage:
    @log_data_creation('therapist')
    def create_therapist(request, data):
        # Function logic here
    
    Args:
        entity_type (str): The type of entity being created (therapist, client, etc.)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(request, *args, **kwargs):
            # Get the original result
            result = func(request, *args, **kwargs)
            
            # Extract entity name from result if possible
            entity_name = None
            user_id = None
            
            try:
                # Check if result is a response object with data
                if hasattr(result, 'data'):
                    data = result.data
                    # Try to get entity name from common fields
                    if isinstance(data, dict):
                        entity_name = (
                            data.get('full_name') or 
                            data.get('name') or 
                            data.get('username') or 
                            data.get('id')
                        )
                
                # Get the user ID from the request
                if hasattr(request, 'user') and hasattr(request.user, 'id'):
                    user_id = request.user.id
                    
                # Create the log entry
                if entity_name:
                    log_data_event(
                        entity_type=entity_type,
                        entity_name=entity_name,
                        action_type="create",
                        user_id=user_id,
                        metadata={
                            'data': data if isinstance(data, dict) else str(data)[:100],
                            'username': getattr(request.user, 'username', None),
                        }
                    )
                    logger.info(f"Logged creation of {entity_type}: {entity_name}")
                else:
                    logger.warning(f"Could not extract entity name for {entity_type} log")
            except Exception as e:
                logger.error(f"Error logging {entity_type} creation: {str(e)}")
                
            return result
        return wrapper
    return decorator


def log_registration_events(request, entity_type, entity_name, action_type="create"):
    """
    Utility function to manually log registration events.
    
    Args:
        request: The request object
        entity_type (str): The type of entity (therapist, client, etc.)
        entity_name (str): The name of the entity
        action_type (str): The action type (create, update, delete, etc.)
    """
    try:
        user_id = request.user.id if hasattr(request, 'user') and hasattr(request.user, 'id') else None
        
        log_data_event(
            entity_type=entity_type,
            entity_name=entity_name,
            action_type=action_type,
            user_id=user_id,
            metadata={
                'username': getattr(request.user, 'username', None),
                'ip_address': request.META.get('REMOTE_ADDR'),
            }
        )
        return True
    except Exception as e:
        logger.error(f"Error logging {entity_type} {action_type}: {str(e)}")
        return False
