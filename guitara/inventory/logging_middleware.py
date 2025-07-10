"""
Middleware for logging inventory events in the unified logs system.
This module adds hooks to ensure all inventory events are logged properly.
"""
import logging
from core.utils.logging_utils import log_inventory_event

logger = logging.getLogger(__name__)

def log_inventory_usage(inventory_item, quantity, user, action_type="usage", notes=None):
    """
    Log inventory usage events in the unified logs system
    
    Args:
        inventory_item: The inventory item being used
        quantity: The quantity being used
        user: The user performing the action
        action_type: The type of action (usage, restock, etc.)
        notes: Additional notes about the usage
    """
    try:
        # Extract item details
        item_name = getattr(inventory_item, 'name', str(inventory_item))
        user_id = getattr(user, 'id', None)
        
        # Create additional metadata
        metadata = {
            'item_id': getattr(inventory_item, 'id', None),
            'current_stock': getattr(inventory_item, 'current_stock', None),
            'username': getattr(user, 'username', None),
            'notes': notes,
        }
        
        # Log the event
        log_inventory_event(
            item_name=item_name,
            action_type=action_type,
            quantity=quantity,
            user_id=user_id,
            metadata=metadata
        )
        
        logger.info(f"Logged inventory {action_type}: {item_name} x{quantity}")
        return True
    except Exception as e:
        logger.error(f"Error logging inventory {action_type}: {str(e)}")
        return False
