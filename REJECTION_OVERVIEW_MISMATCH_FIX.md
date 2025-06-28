# 🔧 Rejection Overview Mismatch Fix - RESOLVED

## Issue Identified

**Problem**: OperatorDashboard shows "1 rejection exists" in the Rejection Overview statistics, but when clicking on the "Rejected Appointments" tab, it shows "No rejected appointments to review".

## Root Cause

**Logic Flaw in Statistics Calculation**:

The `tabStats` calculation for rejection statistics was only computed when `currentView === "rejected"`, but the Rejection Overview was displayed regardless of the current tab. This created a disconnect where:

1. **Statistics Display**: Always visible, showing rejection counts
2. **Statistics Calculation**: Only active when on the "rejected" tab
3. **Rejected Appointments List**: Queried from backend API `/scheduling/appointments/rejected/`

## Solution Applied

### 1. **Separated Rejection Statistics Query**

**File**: `royal-care-frontend/src/components/OperatorDashboard.jsx`

**Added new dedicated query for rejection statistics:**

```javascript
// ✅ SEPARATE QUERY: Always fetch rejection statistics for the overview
const rejectionStatsQuery = useQuery({
  queryKey: ["operator", "rejection-stats"],
  queryFn: async () => {
    const token = getToken();
    if (!token) throw new Error("Authentication required");
    return await enhancedFetch(
      `${getBaseURL()}/scheduling/appointments/rejected/?page=1&page_size=100`
    );
  },
  staleTime: 30 * 1000, // Cache for 30 seconds
  cacheTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  refetchOnWindowFocus: true,
});
```

### 2. **Fixed Statistics Calculation**

**Before (❌ BROKEN):**

```javascript
const tabStats = useMemo(() => {
  if (!tabData || currentView !== "rejected") {
    return {
      rejectionStats: { total: 0, therapist: 0, driver: 0, pending: 0 },
    };
  }
  // Only calculated when on rejected tab
}, [tabData, currentView]);
```

**After (✅ FIXED):**

```javascript
const tabStats = useMemo(() => {
  // Get rejection statistics from the dedicated rejection stats query
  const rejectedData = rejectionStatsQuery.data
    ? Array.isArray(rejectionStatsQuery.data)
      ? rejectionStatsQuery.data
      : rejectionStatsQuery.data?.results || []
    : [];
  // Always calculated regardless of current tab
}, [rejectionStatsQuery.data]);
```

## Expected Behavior After Fix

### Before Fix:

1. User sees "1 rejection" in overview (from cached/stale data)
2. User clicks "Rejected Appointments" tab
3. Shows "No rejected appointments to review" (fresh API call returns empty)
4. **Mismatch between overview and list**

### After Fix:

1. Overview always uses the same data source as the rejected appointments list
2. Both the overview statistics and the rejected appointments list query the same API endpoint
3. **Consistent data across overview and detailed list**

## Impact

This fix ensures:

- ✅ **Consistent rejection statistics** - Overview and list use the same data source
- ✅ **Always up-to-date counts** - Statistics query runs independently of current tab
- ✅ **Proper cache management** - 30-second stale time for statistics, 5-minute cache time
- ✅ **No more confusion** - What you see in overview matches what you see in the list

## Testing

To verify the fix works:

1. **Reject an appointment** (from Therapist Dashboard)
2. **Check OperatorDashboard overview** - Should show "1" in total rejections
3. **Click "Rejected Appointments" tab** - Should show the rejected appointment in the list
4. **Both should be consistent** - Same count, same data

## Notes

- The fix maintains separate queries for the detailed rejected appointments view (with pagination) and the overview statistics
- Statistics are cached for 30 seconds to balance performance with freshness
- The rejected appointments tab still uses its own paginated query for performance when viewing the detailed list
