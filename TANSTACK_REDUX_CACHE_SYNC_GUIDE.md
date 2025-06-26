/\*\*

- TanStack Query & Redux Cache Synchronization - Implementation Guide
-
- This document explains the robust solution implemented to ensure TanStack Query
- cache stays synchronized with Redux mutations, eliminating the need for hard
- refresh after appointment status changes.
  \*/

# PROBLEM ANALYSIS

## Root Cause

Your caching issue occurs because you're using **two separate data management systems**:

1. **TanStack Query** - For data fetching and caching
2. **Redux** - For state mutations (like "Accept" button actions)

When you click "Accept":

- ✅ Redux action succeeds and updates backend
- ✅ Redux may call `refetch()`
- ❌ But TanStack Query cache still contains stale data
- ❌ Normal reload doesn't clear TanStack Query's persistent cache

# SOLUTION IMPLEMENTED

## 1. Unified Cache Invalidation System (`utils/cacheInvalidation.js`)

```javascript
// Main function that invalidates all relevant TanStack Query caches
await invalidateAppointmentCaches(queryClient, {
  userId: user?.id,
  userRole: "therapist",
  appointmentId: 123,
});
```

**Features:**

- Role-based cache invalidation (therapist, driver, operator)
- Status-specific invalidation for different appointment states
- WebSocket integration for real-time updates
- Optimistic updates with automatic rollback on errors

## 2. Enhanced Redux Action Wrapper (`hooks/useEnhancedRedux.js`)

**Before (Your current approach):**

```javascript
const handleAcceptAppointment = async (appointmentId) => {
  await dispatch(therapistConfirm(appointmentId)).unwrap();
  await refetch(); // This doesn't invalidate TanStack Query cache!
};
```

**After (Enhanced approach):**

```javascript
const { acceptAppointment } = useEnhancedTherapistActions();

const handleAcceptAppointment = async (appointmentId) => {
  await acceptAppointment(appointmentId); // Automatically invalidates cache!
};
```

## 3. Component Integration

Updated `TherapistDashboard.jsx` and `DriverDashboard.jsx` to use enhanced actions:

```javascript
// Enhanced Redux actions with automatic TanStack Query cache invalidation
const {
  acceptAppointment: enhancedAcceptAppointment,
  rejectAppointment: enhancedRejectAppointment,
  confirmReadiness: enhancedConfirmReadiness,
  startSession: enhancedStartSession,
  completeSession: enhancedCompleteSession,
  requestPickup: enhancedRequestPickup,
} = useEnhancedTherapistActions();
```

# HOW IT WORKS

## Automatic Cache Invalidation Flow

1. **User clicks "Accept"** → `handleAcceptAppointment()`
2. **Enhanced action wrapper** → `useEnhancedTherapistActions.acceptAppointment()`
3. **Optimistic update** → Immediately show "Accepted" in UI
4. **Redux dispatch** → `therapistConfirm(appointmentId)`
5. **Success callback** → `invalidateAppointmentCaches(queryClient)`
6. **TanStack Query** → Automatically refetches fresh data
7. **UI updates** → Shows real server state

## Error Handling with Rollback

```javascript
try {
  // 1. Apply optimistic update
  optimisticUpdate(queryClient, appointmentId, { status: "accepted" });

  // 2. Execute Redux action
  await dispatch(therapistConfirm(appointmentId));

  // 3. Invalidate cache for fresh data
  await invalidateAppointmentCaches(queryClient);
} catch (error) {
  // 4. Rollback optimistic update on error
  rollbackOptimisticUpdate(queryClient, backupData);
}
```

# WHAT'S INVALIDATED

When you accept an appointment, the system invalidates:

## Core Appointment Data

- `['appointments']` - All appointments
- `['appointments', 'list']` - Main appointment list
- `['appointments', 'today']` - Today's appointments
- `['appointments', 'upcoming']` - Upcoming appointments

## Role-Specific Data

- `['appointments', 'therapist', userId]` - Therapist-specific appointments
- `['dashboard', 'therapist', userId]` - Therapist dashboard data

## Related Data

- `['availability']` - Staff availability (status changes affect availability)
- `['notifications']` - Notifications (status changes trigger notifications)

# BENEFITS

## 1. No More Hard Refresh Required

- TanStack Query cache automatically updates after Redux mutations
- Fresh data loads immediately after actions complete

## 2. Better User Experience

- **Optimistic updates** - UI responds immediately
- **Automatic rollback** - Errors don't leave UI in broken state
- **Smart invalidation** - Only refetches relevant data

## 3. Performance Improvements

- **Selective invalidation** - Only invalidates what changed
- **Request deduplication** - Multiple components can use same data
- **Background updates** - Fresh data loads without user noticing

## 4. Real-time Synchronization

- **WebSocket integration** - Real-time updates trigger cache invalidation
- **Cross-tab sync** - Changes in one tab update other tabs
- **Role-based updates** - Different user roles get appropriate data

# MIGRATION GUIDE

## Step 1: Update Component Imports

```javascript
// Add this import
import { useEnhancedTherapistActions } from "../hooks/useEnhancedRedux";
```

## Step 2: Replace Action Handlers

```javascript
// OLD
const handleAcceptAppointment = async (appointmentId) => {
  await dispatch(therapistConfirm(appointmentId)).unwrap();
  await refetch();
};

// NEW
const { acceptAppointment } = useEnhancedTherapistActions();
const handleAcceptAppointment = async (appointmentId) => {
  await acceptAppointment(appointmentId);
};
```

## Step 3: Remove Manual Cache Management

```javascript
// REMOVE these - no longer needed
await refetch();
await optimizedDataManager.forceRefresh();
queryClient.invalidateQueries();
```

# TESTING

## Verify the Fix Works

1. **Load dashboard** - See pending appointments
2. **Click "Accept"** - Should see immediate UI update
3. **Check "Today's Appointments"** - Should show accepted status immediately
4. **No hard refresh needed** - Normal browser refresh should also show correct state

## Debug if Issues Persist

Add this component to your dashboard for debugging:

```javascript
import { TanStackQueryDebugger } from "../components/TanStackQueryDebugger";

// Add to your JSX
<TanStackQueryDebugger />;
```

This will show:

- Current TanStack Query cache state
- Direct API test results
- Cache invalidation logs

# CONCLUSION

This solution ensures **automatic cache coherence** between Redux mutations and TanStack Query data. You'll no longer need hard refresh after appointment status changes - the cache will automatically stay synchronized.

The implementation provides:

- ✅ **Immediate UI feedback** via optimistic updates
- ✅ **Automatic cache invalidation** after Redux mutations
- ✅ **Error handling** with rollback on failures
- ✅ **Performance optimization** via selective invalidation
- ✅ **Real-time synchronization** with WebSocket integration

Your appointment acceptance flow will now work seamlessly without any manual cache management!
