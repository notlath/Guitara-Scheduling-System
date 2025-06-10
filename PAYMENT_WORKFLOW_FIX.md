# Payment Workflow Fix

## Issue

The therapist is getting a 404 error when clicking "Request Payment" because the frontend is trying to access `/api/scheduling/appointments/14/request_payment/` but the backend endpoint is `/api/scheduling/appointments/14/mark-awaiting-payment/`.

## Root Cause

This appears to be a browser caching issue where the frontend JavaScript is using an old version of the code.

## Solution

### 1. Clear Browser Cache

The user should:

1. **Hard refresh the page**: Press `Ctrl+F5` (or `Cmd+Shift+R` on Mac)
2. **Clear browser cache**: Go to Developer Tools > Application > Storage > Clear Site Data
3. **Restart the frontend development server**:
   ```bash
   cd royal-care-frontend
   # Kill the current Vite server (Ctrl+C)
   npm run dev
   ```

### 2. Verify Workflow Implementation

The correct workflow should be:

1. **Session In Progress** → "Request Payment" button

   - Frontend calls: `POST /api/scheduling/appointments/{id}/mark-awaiting-payment/`
   - Backend sets status: `"awaiting_payment"`

2. **Awaiting Payment** → Operator dashboard shows payment verification

   - Operator can mark as paid via: `POST /api/scheduling/appointments/{id}/mark_completed/`
   - Backend sets status: `"payment_completed"`

3. **Payment Completed** → "Complete Session" button for therapist

   - Frontend calls: `POST /api/scheduling/appointments/{id}/complete_appointment/`
   - Backend sets status: `"completed"`

4. **Completed** → "Request Pickup" button for therapist
   - Frontend calls: `POST /api/scheduling/appointments/{id}/request_pickup/`
   - Backend sets status: `"pickup_requested"`

### 3. Frontend Code Verification

The current frontend code in `schedulingSlice.js` is correct:

```javascript
export const requestPayment = createAsyncThunk(
  "scheduling/requestPayment",
  async (appointmentId, { rejectWithValue }) => {
    const token = localStorage.getItem("knoxToken");
    if (!token) return rejectWithValue("Authentication required");

    try {
      const response = await axios.post(
        `${API_URL}appointments/${appointmentId}/mark-awaiting-payment/`,
        {},
        {
          headers: { Authorization: `Token ${token}` },
        }
      );
      // ...
    }
  }
);
```

### 4. Backend Endpoints Verification

The backend endpoints exist in `views.py`:

- ✅ `mark_awaiting_payment` - Sets status to "awaiting_payment"
- ✅ `mark_completed` - Sets status to "payment_completed"
- ✅ `complete_appointment` - Sets status to "completed"
- ✅ `request_pickup` - Sets status to "pickup_requested"

## Next Steps

1. Clear browser cache and restart frontend server
2. Test the payment workflow again
3. If the issue persists, check browser Network tab to see what URL is actually being called
4. Verify that the operator dashboard can mark payments as completed
