# Multi-Therapist Booking Fix

## Issue

When trying to book appointments with multiple therapists, the frontend was throwing a "Missing required fields" error during form submission, even though all required data was present.

## Root Cause

The issue was in the frontend validation logic in `AppointmentForm.jsx`. The validation was checking for the presence of the `therapist` field even in multi-therapist bookings, where the `therapist` field should be `null` and the data should be in the `therapists` array.

### Specific Problems

1. **Line 820-828**: The validation logic was requiring `!finalAppointmentData.therapist` to be false, which would always fail for multi-therapist appointments where `therapist` is intentionally set to `null`.

2. **Lines 703-725**: Additional "fix" logic was trying to convert the `therapist` field to a number even when it should remain `null` for multi-therapist appointments.

3. **Lines 762-784**: Final verification logic was trying to convert `therapist` from array to integer without checking if this was a multi-therapist appointment.

## Solution

Updated the validation and data sanitization logic in `AppointmentForm.jsx` to properly handle both single and multi-therapist appointments:

### 1. Fixed Validation Logic

```javascript
// For multi-therapist appointments, either therapist OR therapists array should be present
const hasTherapist = finalAppointmentData.therapist ||
  (Array.isArray(finalAppointmentData.therapists) && finalAppointmentData.therapists.length > 0);

if (
  !finalAppointmentData.client ||
  !hasTherapist ||
  // ... other required fields
) {
  // validation error
}
```

### 2. Fixed Data Sanitization

```javascript
// Only try to fix therapist field for single therapist appointments
if (
  !formData.multipleTherapists &&
  typeof sanitizedFormData.therapist !== "number"
) {
  // fix therapist field
} else if (formData.multipleTherapists) {
  // Ensure therapist is null for multi-therapist appointments
  sanitizedFormData.therapist = null;
}
```

### 3. Fixed Final Verification

```javascript
// For single therapist appointments, ensure therapist is an integer
if (
  !formData.multipleTherapists &&
  Array.isArray(finalAppointmentData.therapist)
) {
  // convert from array to integer
} else if (formData.multipleTherapists) {
  // For multi-therapist appointments, ensure therapist is null
  finalAppointmentData.therapist = null;
}
```

## Backend Compatibility

The backend was already properly configured to handle multi-therapist appointments:

- The `therapist` field in the `Appointment` model has `null=True`, so it's not required
- The `perform_create` method in `AppointmentViewSet` properly handles the `therapists` array:
  ```python
  therapists_data = self.request.data.get("therapists", [])
  appointment = serializer.save(operator=self.request.user)
  if therapists_data:
      appointment.therapists.set(therapists_data)
  ```

## Testing

After implementing this fix:

1. ✅ Single therapist appointments should continue to work as before
2. ✅ Multi-therapist appointments should now properly validate and submit
3. ✅ The form should correctly send `therapist: null` and `therapists: [1, 2, 3]` for multi-therapist bookings
4. ✅ The backend should accept and process multi-therapist bookings correctly

## Files Modified

- `royal-care-frontend/src/components/scheduling/AppointmentForm.jsx`
  - Fixed validation logic (lines ~825-835)
  - Fixed data sanitization logic (lines ~703-730)
  - Fixed final verification logic (lines ~762-790)

## Next Steps

1. Test multi-therapist booking end-to-end
2. Verify that dashboards properly display multi-therapist appointments
3. Test coordination workflow with multiple therapists and drivers
4. Ensure notification system works correctly for multi-therapist bookings
