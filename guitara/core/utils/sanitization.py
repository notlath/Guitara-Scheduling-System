import re
import html
import bleach

def sanitize_string(input_string):
    """
    Sanitizes a string input to prevent XSS attacks and SQL injection
    """
    if input_string is None:
        return None
    
    # Use bleach to clean HTML
    allowed_tags = []  # No HTML tags allowed
    allowed_attributes = {}  # No HTML attributes allowed
    cleaned_text = bleach.clean(
        input_string,
        tags=allowed_tags,
        attributes=allowed_attributes,
        strip=True
    )
    
    # Also escape HTML entities
    escaped_text = html.escape(cleaned_text)
    
    # Remove SQL injection patterns
    sql_patterns = [
        r'(\b(select|insert|update|delete|drop|alter|create|truncate|replace|exec|union)\b)', 
        r'(\b(from|where|having|--)\b)',
        r'(;\s*--)',  # SQL comment injection
        r'(\/\*|\*\/)',  # SQL block comment markers
    ]
    
    for pattern in sql_patterns:
        escaped_text = re.sub(pattern, '', escaped_text, flags=re.IGNORECASE)
    
    return escaped_text

def sanitize_object(obj):
    """
    Recursively sanitizes all string values in an object or dictionary
    """
    if isinstance(obj, str):
        return sanitize_string(obj)
    elif isinstance(obj, list):
        return [sanitize_object(item) for item in obj]
    elif isinstance(obj, dict):
        return {key: sanitize_object(value) for key, value in obj.items()}
    else:
        return obj

def sanitize_model(model_instance, exclude_fields=None):
    """
    Sanitizes all character fields in a Django model instance
    """
    if exclude_fields is None:
        exclude_fields = []
        
    for field in model_instance._meta.fields:
        if field.name in exclude_fields:
            continue
            
        if field.get_internal_type() in ['CharField', 'TextField']:
            value = getattr(model_instance, field.name)
            if value:
                sanitized_value = sanitize_string(value)
                setattr(model_instance, field.name, sanitized_value)
    
    return model_instance

def sanitize_request_data(request_data):
    """
    Sanitizes all request data (POST, PUT, etc.)
    """
    sanitized_data = {}
    # Fields to skip sanitization for (preserve exactly as entered)
    skip_fields = ['password', 'token', 'csrfmiddlewaretoken', 'first_name', 'last_name']
    for key, value in request_data.items():
        # Skip sanitizing certain fields
        if key in skip_fields:
            sanitized_data[key] = value
            continue
        if isinstance(value, str):
            sanitized_data[key] = sanitize_string(value)
        else:
            sanitized_data[key] = value
    return sanitized_data
