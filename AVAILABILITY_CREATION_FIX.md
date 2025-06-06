# Availability Creation 400 Error - Fix Summary

## Problem Description

When creating staff availability through the AvailabilityManager component, users encountered a **400 Bad Request** error. The frontend would send the availability data to the backend, but the API would reject it.

## Root Cause Analysis

The issue was identified in the data type being sent for the `user` field:

1. **Frontend Issue**: The `selectedStaff` value from the dropdown was being sent as a **string** instead of an **integer**
2. **Backend Expectation**: The Django model's `user` field is a ForeignKey that expects an **integer** (user ID)
3. **Type Mismatch**: The API serializer validation failed because of the type mismatch

### Code Investigation

- **AvailabilityManager.jsx**: Was sending `user: selectedStaff` where `selectedStaff` could be a string
- **Availability Model**: Has `user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)`
- **API Serializer**: Expects integer for foreign key fields

## Solution Implemented

### 1. Data Type Conversion in Frontend

**File**: `royal-care-frontend/src/components/scheduling/AvailabilityManager.jsx`

**Before**:

```javascript
dispatch(
  createAvailability({
    user: selectedStaff, // Could be string from dropdown
    date: newAvailabilityForm.date,
    start_time: newAvailabilityForm.startTime,
    end_time: newAvailabilityForm.endTime,
    is_available: newAvailabilityForm.isAvailable,
  })
);
```

**After**:

```javascript
// Parse and validate staff ID
const staffId = parseInt(selectedStaff, 10);
if (isNaN(staffId)) {
  alert("Invalid staff member selected");
  return;
}

dispatch(
  createAvailability({
    user: staffId, // Now guaranteed to be integer
    date: newAvailabilityForm.date,
    start_time: newAvailabilityForm.startTime,
    end_time: newAvailabilityForm.endTime,
    is_available: newAvailabilityForm.isAvailable,
  })
);
```

### 2. Enhanced Error Handling

**File**: `royal-care-frontend/src/features/scheduling/schedulingSlice.js`

Enhanced the `createAvailability` thunk to provide better error reporting:

```javascript
export const createAvailability = createAsyncThunk(
  "scheduling/createAvailability",
  async (availabilityData, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    console.log("Creating availability with data:", availabilityData);

    try {
      const response = await axios.post(
        `${API_URL}availabilities/`,
        availabilityData,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
        }
      );

      console.log("Availability creation successful:", response.data);
      return response.data;
    } catch (error) {
      console.error("Create availability error:", error.response?.data);
      console.error("Full error:", error);

      let errorMessage = "Could not create availability";

      if (error.response?.data) {
        const data = error.response.data;
        if (data.user && Array.isArray(data.user)) {
          errorMessage = `User field error: ${data.user.join(", ")}`;
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (typeof data === "string") {
          errorMessage = data;
        } else {
          // Try to extract meaningful error from any field
          const firstErrorField = Object.keys(data)[0];
          if (firstErrorField && data[firstErrorField]) {
            errorMessage = `${firstErrorField}: ${
              Array.isArray(data[firstErrorField])
                ? data[firstErrorField].join(", ")
                : data[firstErrorField]
            }`;
          } else {
            errorMessage = JSON.stringify(data);
          }
        }
      }

      return rejectWithValue(errorMessage);
    }
  }
);
```

### 3. Additional Validation

Added validation to ensure:

- Staff member is selected before attempting to create availability
- Staff ID can be successfully parsed as an integer
- Time ranges are valid (end time after start time, minimum 30 minutes)

## Key Changes Made

1. **Type Safety**: Convert `selectedStaff` to integer before sending to API
2. **Validation**: Add validation for staff selection and ID parsing
3. **Error Handling**: Improved error messages for better debugging
4. **Logging**: Added console logging to track data flow and identify issues

## Expected Behavior After Fix

### Success Case

1. User selects staff member from dropdown
2. User sets date, start time, and end time
3. Frontend converts staff ID to integer
4. API accepts the data and creates availability record
5. Success message shown, form resets, availability list refreshes

### Error Cases Handled

- **No staff selected**: Frontend validation prevents submission
- **Invalid staff ID**: Frontend validation catches and shows error
- **Invalid time range**: Frontend validates time ranges
- **API errors**: Better error messages shown to user

## Testing

To test the fix:

1. Log in as an operator or therapist/driver
2. Navigate to Availability Manager
3. Select a staff member (if operator) or use own account (if therapist/driver)
4. Set a future date and valid time range
5. Click "Add Availability"
6. Verify success message and availability appears in list

## Files Modified

- `royal-care-frontend/src/components/scheduling/AvailabilityManager.jsx`
- `royal-care-frontend/src/features/scheduling/schedulingSlice.js`

## Related Issues Fixed

- ✅ 400 Bad Request error when creating availability
- ✅ Poor error reporting for availability creation failures
- ✅ Type mismatch between frontend and backend expectations
- ✅ Missing validation for edge cases

The fix ensures that availability creation works reliably for all user roles while providing clear feedback when errors occur.
