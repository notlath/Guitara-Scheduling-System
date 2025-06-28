# 🔧 Appointment Rejection Fix - RESOLVED

## Issue Description

When rejecting an appointment, the error occurred:

```
❌ schedulingSlice: API Reject Appointment Error: {
  url: 'https://...app/api/scheduling/appointments/undefined/reject/',
  status: 500
}
```

The appointment ID was showing as `undefined` in the API URL, causing a 500 server error.

## Root Cause

**Parameter mismatch between `useInstantUpdates.js` and `schedulingSlice.js`:**

- `useInstantUpdates.js` was calling the Redux action with: `{ appointmentId, rejectionReason }`
- `schedulingSlice.js` rejectAppointment action expects: `{ id, rejectionReason }`

This caused the appointment ID to be `undefined` when constructing the API URL.

## Solution Applied

**File:** `royal-care-frontend/src/hooks/useInstantUpdates.js`

**Before (❌ BROKEN):**

```javascript
reduxAction: rejectAppointment({ appointmentId, rejectionReason }),
```

**After (✅ FIXED):**

```javascript
reduxAction: rejectAppointment({ id: appointmentId, rejectionReason }),
```

## Verification

- ✅ Build test passed
- ✅ Parameter transformation verified
- ✅ Consistent with other similar actions in `useEnhancedRedux.js`

## Expected Result

The appointment rejection will now work correctly:

- **Before:** `appointments/undefined/reject/` → 500 error
- **After:** `appointments/123/reject/` → successful rejection

## Impact

This fix resolves the rejection functionality for:

- ✅ Therapist Dashboard rejection
- ✅ Driver Dashboard rejection (uses same hook)
- ✅ Any component using `useTherapistInstantActions` or `useDriverInstantActions`

## Notes

- The other Redux actions (`therapistConfirm`, `confirmPickup`, `startJourney`) correctly use `appointmentId` as a single parameter
- Only `rejectAppointment` required the `{ id, rejectionReason }` object format
- The `useEnhancedRedux.js` hooks already had the correct parameter mapping
