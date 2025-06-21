# 🚀 TanStack Query Migration Guide

## ✅ **What We've Implemented**

### Phase 1: Core Infrastructure

- ✅ Installed `@tanstack/react-query` and `@tanstack/react-query-devtools`
- ✅ Set up QueryClient with optimized configuration for real-time scheduling
- ✅ Created query key factory for consistent caching
- ✅ Added QueryClient provider to main.jsx

### Phase 2: Query Hooks

- ✅ **useAppointmentQueries.js** - Replaces appointment data fetching
- ✅ **useAvailabilityQueries.js** - Replaces complex availability logic
- ✅ **useStaticDataQueries.js** - Replaces clients, services, staff fetching

### Phase 3: Example Components

- ✅ **AppointmentFormTanStack.jsx** - Clean form with TanStack Query
- ✅ **TherapistDashboardTanStack.jsx** - Dashboard example

## 🎯 **Key Benefits Achieved**

### 1. **Simplified AppointmentForm**

**Before (650+ lines):**

```javascript
// Complex manual caching and debouncing
useEffect(() => {
  if (!isFormReady || !availabilityParams.start_time || /*...*/) return;

  const timeoutId = setTimeout(() => {
    // Complex availability fetching logic
    // 50+ lines of manual cache management
  }, 500);

  return () => clearTimeout(timeoutId);
}, [/* 8 dependencies */]);
```

**After (400 lines):**

```javascript
// Simple, declarative data fetching
const { availableTherapists, availableDrivers, isLoadingAvailability } =
  useFormAvailability(formData);
```

### 2. **Optimistic Updates**

**Before:**

```javascript
// Manual state management after mutations
await dispatch(createAppointment(data));
await optimizedDataManager.forceRefresh(["appointments", "todayAppointments"]);
```

**After:**

```javascript
// Automatic optimistic updates
const createMutation = useCreateAppointment();
await createMutation.mutateAsync(appointmentData);
// UI updates immediately, rolls back on error
```

### 3. **Background Refetching**

**Before:**

```javascript
// Manual polling with complex intervals
this.pollingInterval = setInterval(() => {
  if (this.subscribers.size > 0 && isValidToken()) {
    this.fetchNeededData();
  }
}, this.getOptimizedPollingInterval());
```

**After:**

```javascript
// Automatic background refetching
const { data } = useQuery({
  queryKey: ["appointments"],
  queryFn: fetchAppointments,
  refetchInterval: 5 * 60 * 1000, // Auto-refetch every 5 minutes
  refetchOnWindowFocus: true, // Refetch when user returns
});
```

## 📋 **Migration Checklist**

### ✅ **Completed**

- [x] Install TanStack Query
- [x] Set up QueryClient with real-time optimizations
- [x] Create query hooks for appointments
- [x] Create availability checking hooks
- [x] Create static data hooks (clients, services, staff)
- [x] Example: AppointmentForm migration
- [x] Example: TherapistDashboard migration

### 🔄 **Next Steps (Recommended Order)**

#### **High Impact (Immediate):**

1. **Replace AppointmentForm**

   ```javascript
   // In SchedulingDashboard.jsx, replace:
   import AppointmentForm from "./AppointmentForm";
   // With:
   import AppointmentForm from "./AppointmentFormTanStack";
   ```

2. **Replace Dashboard Data Fetching**

   ```javascript
   // Replace in TherapistDashboard.jsx:
   import { useOptimizedDashboardData } from "../../hooks/useOptimizedData";
   // With:
   import { useDashboardData } from "../../hooks/useAppointmentQueries";

   // Replace:
   const { myAppointments, loading } = useOptimizedDashboardData(
     "therapistDashboard",
     "therapist"
   );
   // With:
   const { appointments: myAppointments, isLoading: loading } =
     useDashboardData("therapist", user?.id);
   ```

#### **Medium Impact:**

3. **Replace Client Search**

   ```javascript
   // Replace LazyClientSearch with:
   const { clients } = useClientSearch(searchTerm);
   ```

4. **Replace Static Data Fetching**
   ```javascript
   // Replace manual dispatches with:
   const { clients, services, staffMembers } = useFormStaticData();
   ```

#### **Low Risk (Gradual):**

5. **Replace OperatorDashboard**
6. **Replace DriverDashboard**
7. **Migrate WebSocket integration**

## 🔌 **WebSocket Integration**

Your existing WebSocket service can easily integrate with TanStack Query:

```javascript
// In your WebSocket message handler
useEffect(() => {
  const handleAppointmentUpdate = (data) => {
    // Update cache directly
    queryClient.setQueryData(["appointments"], (old) =>
      old?.map((apt) => (apt.id === data.id ? { ...apt, ...data } : apt))
    );

    // Or invalidate to refetch
    queryClient.invalidateQueries(["appointments"]);
  };

  websocket.on("appointment_update", handleAppointmentUpdate);
}, []);
```

## ⚡ **Performance Improvements**

### **Cache Efficiency**

- **Before:** 15+ separate cache configurations with manual TTL management
- **After:** Unified cache with smart invalidation

### **Request Deduplication**

- **Before:** Manual request tracking with `requestsInFlight` Map
- **After:** Automatic deduplication built-in

### **Background Updates**

- **Before:** Complex polling with activity-based intervals
- **After:** Smart background refetching with window focus detection

### **Memory Management**

- **Before:** Manual cleanup with `cleanupStaleCache()`
- **After:** Automatic garbage collection with `gcTime`

## 🧪 **Testing the Migration**

### **Dev Tools**

- Open React Query DevTools (bottom of screen)
- Monitor query states, cache contents, and network requests
- See real-time cache updates and invalidations

### **Verification Steps**

1. **AppointmentForm:** Availability should load automatically when date/time/service selected
2. **Dashboard:** Data should load immediately and update in background
3. **Network Tab:** Should see fewer redundant requests
4. **WebSocket Updates:** Cache should update without full page refresh

## 🔄 **Rollback Plan**

If issues arise, simply:

1. Revert import statements to original components
2. Keep TanStack Query installed for gradual migration
3. Your existing optimizedDataManager remains functional

## 📊 **Expected Results**

### **Code Reduction**

- AppointmentForm: 650+ lines → 400 lines (38% reduction)
- Dashboard hooks: 200+ lines → 50 lines (75% reduction)
- Cache management: 600+ lines → 0 lines (eliminated)

### **Performance**

- **Faster initial loads** (better caching)
- **Fewer network requests** (smart deduplication)
- **Better UX** (optimistic updates)
- **Real-time sync** (easier WebSocket integration)

### **Developer Experience**

- **Simpler debugging** (DevTools)
- **Less boilerplate** (declarative queries)
- **Better error handling** (built-in retry logic)
- **Easier testing** (mock queries)

---

**Ready to proceed?** Start with replacing the AppointmentForm component to see immediate benefits!
