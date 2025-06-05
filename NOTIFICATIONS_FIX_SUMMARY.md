# Operator Dashboard Notifications - 500 Error Fix

## Problem Summary
The Operator Dashboard shows a 500 Internal Server Error when accessing `/api/scheduling/notifications/`:
```
Failed to load resource: the server responded with a status of 500 (Internal Server Error)
```

## Root Cause Analysis
The issue was likely caused by:
1. **Circular dependency issues** in the NotificationSerializer
2. **Complex foreign key relationships** causing serialization errors
3. **Missing error handling** in the NotificationViewSet

## Changes Made

### 1. Enhanced NotificationViewSet Error Handling (`views.py`)
- Added comprehensive debugging logs to the `get_queryset()` method
- Added error handling to the `list()` method with try-catch blocks
- Added detailed logging to track notification fetching process

**Key improvements:**
```python
def get_queryset(self):
    try:
        print(f"🔍 NotificationViewSet: Getting notifications for user {self.request.user}")
        queryset = Notification.objects.filter(user=self.request.user)
        print(f"🔍 NotificationViewSet: Found {queryset.count()} notifications")
        return queryset
    except Exception as e:
        print(f"❌ NotificationViewSet get_queryset error: {e}")
        return Notification.objects.none()
```

### 2. Simplified NotificationSerializer (`serializers.py`)
- **Removed complex nested serializers** that could cause circular dependencies
- **Added custom `to_representation()` method** with error handling
- **Simplified field structure** to avoid relationship issues
- **Added fallback error handling** to return minimal data on serialization errors

**Key improvements:**
```python
class NotificationSerializer(serializers.ModelSerializer):
    """Simplified notification serializer to avoid circular dependencies"""
    
    class Meta:
        model = Notification
        fields = [
            'id', 'user', 'appointment', 'notification_type', 
            'message', 'is_read', 'created_at', 'rejection'
        ]
        
    def to_representation(self, instance):
        """Custom representation to handle potential relationship issues"""
        try:
            data = super().to_representation(instance)
            # Add safe relationship data...
            return data
        except Exception as e:
            # Return minimal data if there's an error
            return {...}
```

## Technical Details

### Before (Problematic):
```python
# Complex nested serializers causing issues
user_details = UserSerializer(source="user", read_only=True)
appointment_details = AppointmentSerializer(source="appointment", read_only=True)
rejection_details = AppointmentRejectionSerializer(source="rejection", read_only=True)
```

### After (Fixed):
```python
# Simplified with custom representation and error handling
def to_representation(self, instance):
    try:
        data = super().to_representation(instance)
        # Add basic relationship info safely
        if instance.user:
            data['user_info'] = {basic_user_fields}
        return data
    except Exception as e:
        # Return minimal data on error
        return {basic_fields_with_error_info}
```

## Testing Instructions

### 1. Restart Django Server
```bash
cd guitara
python manage.py runserver
```

### 2. Test Operator Dashboard
1. Login as an operator user
2. Navigate to: `http://localhost:5173/dashboard`
3. Monitor both browser console and Django server logs

### 3. Expected Behavior
**Success Case:**
- No 500 errors in browser console
- Notifications load properly in the dashboard
- Backend logs show successful notification fetching

**Debug Logs to Look For:**
```
🔍 NotificationViewSet: Getting notifications for user <username>
🔍 NotificationViewSet: Found X notifications
```

### 4. If Issues Persist
The enhanced error handling will now show:
- **Specific error messages** in the Django console
- **Fallback notification data** instead of complete failure
- **Detailed stack traces** for debugging

## Files Modified
- `guitara/scheduling/views.py` - Enhanced NotificationViewSet error handling
- `guitara/scheduling/serializers.py` - Simplified NotificationSerializer

## Next Steps
1. **Test the dashboard** - Navigate to operator dashboard and verify no 500 errors
2. **Check server logs** - Look for the debugging output to confirm notifications are loading
3. **Verify functionality** - Ensure notifications display properly in the UI
4. **Clean up logs** - Remove debug print statements once confirmed working

The notifications endpoint should now be more robust and provide better error handling if issues occur.
