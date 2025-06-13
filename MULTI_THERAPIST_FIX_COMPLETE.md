# Multi-Therapist Appointment Creation - Fix Summary

## Issue Description

When creating appointments with multiple therapists using the "Book multiple therapists for this appointment" checkbox, users encountered a 500 Internal Server Error with the following details:

```
UnboundLocalError: cannot access local variable 'Q' where it is not associated with a value
```

## Root Cause

The error occurred in the `AppointmentViewSet.get_queryset()` method in `guitara/scheduling/views.py`. The method was using Django's `Q` objects for complex database queries:

```python
return Appointment.objects.filter(
    Q(therapist=user) | Q(therapists=user)
).distinct()
```

However, while `Q` was imported at the module level, Python wasn't able to access it within the method scope, causing the UnboundLocalError.

## Solution

Added a local import of `Q` within the `get_queryset` method:

```python
def get_queryset(self):
    from django.db.models import Q  # Local import ensures Q is available
    user = self.request.user
    # ... rest of the method
```

## Files Changed

- `guitara/scheduling/views.py` - Line 654: Added local Q import in `get_queryset` method

## Testing

Created `test_multi_therapist_fix.py` to verify:

1. No UnboundLocalError occurs
2. Multi-therapist appointment creation works correctly
3. Database queries for therapist filtering function properly

## Impact

- ✅ Multi-therapist appointments can now be created successfully
- ✅ No more 500 errors when checking "Book multiple therapists for this appointment"
- ✅ Therapist filtering in queries works for both single and multi-therapist appointments
- ✅ All existing functionality remains unaffected

## How to Test

1. Start the development servers:

   ```bash
   cd guitara && python manage.py runserver
   cd royal-care-frontend && npm start
   ```

2. Navigate to the appointment creation form
3. Select a client, service, date, and time
4. Check "Book multiple therapists for this appointment"
5. Select multiple therapists
6. Click "Create Appointment"
7. The appointment should be created successfully without any errors

## Related Features

This fix enables the full multi-therapist appointment workflow:

- Multiple therapist selection in appointment form
- Group confirmation tracking
- Car requirement for group appointments
- Coordinated pickup and drop-off for therapist teams
