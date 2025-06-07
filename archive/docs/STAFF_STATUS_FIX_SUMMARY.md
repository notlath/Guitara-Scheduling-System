# Staff Account Status Fix Summary

## Date: June 7, 2025

## Issue Identified

The AvailabilityManager component was showing all staff accounts as "[DISABLED]" even when they were active. This appears to be caused by incorrect evaluation of the `is_active` field.

## Root Cause Analysis

### Potential Causes:

1. **Data Type Mismatch**: The `is_active` field might be coming as a string instead of boolean
2. **API Serialization**: The Django REST framework might be serializing the boolean differently
3. **Frontend Logic**: The boolean evaluation logic might be incorrect

### Investigation Steps:

1. Added debug logging to see actual data structure
2. Enhanced boolean evaluation to handle multiple data types
3. Created test script to verify API responses directly

## Fix Implementation

### 1. Enhanced Boolean Evaluation

Updated the frontend logic to handle various data types for `is_active`:

```javascript
// Robust boolean evaluation
const isActive =
  staff.is_active === true ||
  staff.is_active === "true" ||
  staff.is_active === 1;
```

### 2. Debug Logging

Added comprehensive logging to understand data structure:

- Log all staff members when fetched
- Log selected staff data with type information
- Direct API call test to compare Redux vs direct response

### 3. Normalized Data Handling

Updated `handleStaffChange` to normalize the `is_active` field:

```javascript
const normalizedStaffData = {
  ...staffData,
  is_active:
    staffData.is_active === true ||
    staffData.is_active === "true" ||
    staffData.is_active === 1,
};
```

## Files Modified

### 1. `AvailabilityManager.jsx`

- **Lines 45-57**: Added debug logging for staff members data
- **Lines 348-371**: Enhanced boolean evaluation in dropdown rendering
- **Lines 88-102**: Updated `handleStaffChange` with data normalization
- **Lines 333-349**: Added debug logging to filtered staff members

### 2. Created Debug Scripts

- **`debug_staff_data.py`**: Backend API testing script
- Tests actual API responses and data types

## Expected Behavior After Fix

### ✅ **Correct Display**

- Active staff members: "John Doe (therapist)"
- Disabled staff members: "Jane Smith (therapist) [DISABLED]"

### ✅ **Proper Functionality**

- Warning only appears for actually disabled accounts
- Enable/disable button works correctly
- Form prevention only for actually disabled accounts

### 🔍 **Debug Information**

- Console logs show actual data structure
- Type information for `is_active` field
- Comparison between Redux and direct API responses

## Testing Steps

### 1. Frontend Testing

1. Open browser console
2. Navigate to `/dashboard/availability`
3. Check console logs for debug information
4. Verify staff dropdown shows correct status

### 2. Backend Testing

Run the debug script:

```bash
python archive/scripts/database/debug_staff_data.py
```

### 3. Manual Verification

1. Create a test account
2. Disable it using the toggle button
3. Verify it shows "[DISABLED]" in dropdown
4. Re-enable and verify "[DISABLED]" disappears

## Fallback Options

If the issue persists, consider:

1. **Backend Fix**: Ensure `is_active` is properly serialized as boolean
2. **Alternative Field**: Use a different field for status checking
3. **Manual API Call**: Replace Redux with direct API calls for staff data

## Next Steps

1. Test the enhanced boolean evaluation
2. Review debug console output
3. Run backend debug script if needed
4. Remove debug logging once issue is resolved

---

**Status**: 🔧 **In Progress**  
**Priority**: 🔴 **High** (UX Issue)  
**Type**: 🐛 **Bug Fix**
