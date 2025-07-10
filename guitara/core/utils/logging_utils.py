"""
Utility functions for creating system logs.
These functions ensure consistent logging across different parts of the application.
"""
import logging
from ..models import SystemLog

logger = logging.getLogger(__name__)

def create_system_log(log_type, description, user_id=None, action_type=None, metadata=None):
    """
    Create a system log entry that works with both Django and Supabase.
    
    Args:
        log_type (str): Type of log ('authentication', 'appointment', 'payment', 'data', 'inventory', etc.)
        description (str): Description of the event
        user_id (int, optional): ID of the user who performed the action
        action_type (str, optional): Type of action ('create', 'update', 'delete', etc.)
        metadata (dict, optional): Additional contextual data in JSON format
        
    Returns:
        SystemLog: The created log instance
    """
    try:
        # Initialize metadata if None
        meta_data = metadata or {}
        
        # Store action_type in metadata since it doesn't exist as a column in Supabase
        if action_type:
            meta_data['action_type'] = action_type
        
        log_entry = SystemLog(
            log_type=log_type,
            description=description,
            user_id=user_id,
            metadata=meta_data
        )
        log_entry.save()
        logger.info(f"System log created: {log_type} - {description}")
        return log_entry
    except Exception as e:
        logger.error(f"Failed to create system log: {str(e)}")
        logger.error(f"Log details: type={log_type}, desc={description}, user={user_id}")
        # Don't raise the exception, as logging should never break the application flow
        return None

def log_authentication_event(action, user_id=None, username=None, user_name=None, success=True, metadata=None):
    """Create authentication log for login/logout events"""
    action_type = action.lower()  # login or logout
    status = "successful" if success else "failed"
    
    # Use full name if available, otherwise fall back to username, then user ID
    if user_name:
        user_str = user_name
    elif username:
        user_str = username
    elif user_id:
        user_str = f"User ID {user_id}"
    else:
        user_str = "Anonymous user"
    
    description = f"{user_str} {status} {action_type}"
    
    # Add any additional data
    meta = metadata or {}
    meta.update({
        "username": username,
        "user_name": user_name,
        "success": success,
    })
    
    return create_system_log(
        log_type="authentication",
        description=description,
        user_id=user_id,
        action_type=action_type,
        metadata=meta
    )

def log_data_event(entity_type, entity_name, action_type, user_id=None, metadata=None):
    """Create data log for CRUD operations on entities"""
    description = f"{action_type.title()} {entity_type}: {entity_name}"
    
    # Add entity details to metadata
    meta = metadata or {}
    meta.update({
        "entity_type": entity_type,
        "entity_name": entity_name,
    })
    
    return create_system_log(
        log_type="data",
        description=description,
        user_id=user_id,
        action_type=action_type,
        metadata=meta
    )

def log_appointment_event(appointment_id, action_type, user_id=None, client_name=None, metadata=None, username=None, materials_list=None):
    """Create appointment log for appointment-related events"""
    # Get operator name for better description
    operator_name = username or "Unknown User"
    client_str = f" for {client_name}" if client_name else ""
    
    # Improved description format based on action type - WITHOUT materials list
    if action_type.lower() == "create" or action_type.lower() == "book":
        description = f"{operator_name} booked an appointment #{appointment_id}{client_str}"
    elif action_type.lower() == "update":
        description = f"{operator_name} updated appointment #{appointment_id}{client_str}"
    elif action_type.lower() == "cancel":
        description = f"{operator_name} cancelled appointment #{appointment_id}{client_str}"
    else:
        description = f"{action_type.title()} appointment #{appointment_id}{client_str} by {operator_name}"
    
    # Add appointment details to metadata
    meta = metadata or {}
    meta.update({
        "appointment_id": appointment_id,
        "client_name": client_name,
        "operator_name": operator_name,
    })
    
    # Add materials information to metadata only, not to description
    if materials_list:
        meta["materials"] = materials_list
        # Format materials list but don't add to description
        materials_str = ", ".join([f"{m['item_name']} ({m['quantity_used']})" for m in materials_list])
        if materials_str:
            meta["materials_summary"] = materials_str
    
    return create_system_log(
        log_type="appointment",
        description=description,
        user_id=user_id,
        action_type=action_type,
        metadata=meta
    )

def log_payment_event(payment_id, action_type, amount=None, user_id=None, metadata=None):
    """Create payment log for payment-related events"""
    amount_str = f" of {amount}" if amount else ""
    description = f"{action_type.title()} payment #{payment_id}{amount_str}"
    
    # Add payment details to metadata
    meta = metadata or {}
    meta.update({
        "payment_id": payment_id,
        "amount": amount,
    })
    
    return create_system_log(
        log_type="payment",
        description=description,
        user_id=user_id,
        action_type=action_type,
        metadata=meta
    )

def log_inventory_event(item_name, action_type, quantity=None, user_id=None, metadata=None, item_id=None):
    """Create inventory log for inventory-related events"""
    # Try to get item name from inventory if not provided
    if (not item_name or item_name == 'Unknown Item') and item_id:
        try:
            from inventory.models import InventoryItem
            inventory_item = InventoryItem.objects.get(id=item_id)
            item_name = inventory_item.name
        except Exception as e:
            logger.error(f"Error fetching inventory item name: {e}")
            if not item_name:
                item_name = f"Item #{item_id}"
    
    # Ensure we have a fallback item name
    if not item_name:
        item_name = f"Item #{item_id}" if item_id else "Unknown Item"
        
    qty_str = f" - {quantity} units" if quantity else ""
    description = f"{action_type.title()} inventory item: {item_name}{qty_str}"
    
    # Add inventory details to metadata
    meta = metadata or {}
    meta.update({
        "item_name": item_name,
        "quantity": quantity,
        "item_id": item_id,
    })
    
    return create_system_log(
        log_type="inventory",
        description=description,
        user_id=user_id,
        action_type=action_type,
        metadata=meta
    )

def format_log_message(action, entity_type=None, entity_name=None, details=None):
    """
    Format log messages consistently across the application.
    
    Args:
        action (str): The action being performed (created, updated, deleted, etc.)
        entity_type (str, optional): The type of entity (appointment, client, material, etc.)
        entity_name (str, optional): The name/identifier of the entity
        details (str, optional): Additional details about the action
        
    Returns:
        str: A consistently formatted log message
    """
    # Capitalize the action
    action = action.capitalize() if action else "Unknown action"
    
    # Format the entity part
    entity_part = ""
    if entity_type:
        entity_part += f"{entity_type}"
        if entity_name:
            entity_part += f" '{entity_name}'"
    
    # Combine parts
    message = action
    if entity_part:
        message += f" {entity_part}"
    if details:
        message += f": {details}"
        
    return message
