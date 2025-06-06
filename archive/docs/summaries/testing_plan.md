# Royal Care Frontend - Testing Plan for Applied Fixes

## TEST SCENARIOS

### 1. Authentication & Token Handling

**Test**: Add Availability functionality

- **Expected**: No more 401 Unauthorized errors
- **Steps**:
  1. Login to the application
  2. Navigate to Availability Manager
  3. Click "Add Availability"
  4. Fill form and submit
- **Success Criteria**: Availability is created without authentication errors

### 2. AppointmentForm Data Loading

**Test**: Create appointment from Month View

- **Expected**: Therapist and Driver dropdowns are populated
- **Steps**:
  1. Navigate to Month View/Calendar
  2. Click on a date to create appointment
  3. Check if Therapist dropdown has options
  4. Check if Driver dropdown has options
- **Success Criteria**: Both dropdowns show staff members with proper names

### 3. Form Input Sanitization

**Test**: Normal text input in appointment forms

- **Expected**: Users can type normal text without interference
- **Steps**:
  1. Open appointment form
  2. Type normal text in Location field: "123 Main St, Apt 5B"
  3. Type normal text in Notes field: "Client prefers medium pressure massage"
- **Success Criteria**: Text is preserved exactly as typed (no aggressive sanitization)

### 4. FIDO2 Script Loading

**Test**: Login/Register pages

- **Expected**: No duplicate script errors in console
- **Steps**:
  1. Open browser console
  2. Navigate to Login page
  3. Navigate to Register page
  4. Navigate back to Login page
- **Success Criteria**: No "Duplicate script ID 'fido2-page-script-registration'" errors

## CONSOLE ERROR CHECKS

### Before Testing - Expected Improvements:

1. ❌ "Duplicate script ID 'fido2-page-script-registration'" → ✅ Should be resolved
2. ❌ "401 Unauthorized" for availability creation → ✅ Should be resolved
3. ❌ Driver/Therapist names not loading → ✅ Should be resolved
4. ❌ Aggressive sanitization issues → ✅ Should be resolved

### Remaining Issues to Monitor:

1. 🔄 WebSocket connection errors
2. 🔄 "No available therapists/drivers for selected time"
3. 🔄 fetchAvailableTherapists 400 Bad Request with undefined params
4. 🔄 React rendering errors with error objects

## TECHNICAL VALIDATION

### Code Quality Checks:

- ✅ No linting errors in modified files
- ✅ Consistent token handling across all API calls
- ✅ Proper React hooks usage (useMemo, useEffect)
- ✅ Fallback data available for development

### Performance Checks:

- ✅ Optimized re-renders with useMemo
- ✅ Proper useEffect dependencies
- ✅ No memory leaks from script loading

## POST-TESTING ACTIONS

If tests pass:

1. Document successful resolution of issues
2. Monitor for any new issues
3. Consider additional error handling improvements

If tests fail:

1. Check browser console for specific errors
2. Verify token format in localStorage
3. Check network tab for API call details
4. Review Redux DevTools for state changes

## DEBUGGING TIPS

### If authentication still fails:

- Check localStorage for "knoxToken"
- Verify token format doesn't have double "Token " prefix
- Check backend logs for authentication issues

### If data loading fails:

- Check Redux state for staffMembers array
- Verify fetchStaffMembers is being called
- Check if role filtering is working correctly

### If sanitization causes issues:

- Compare sanitizeFormInput vs sanitizeString behavior
- Test with various input patterns
- Check if specific characters are being stripped unexpectedly
