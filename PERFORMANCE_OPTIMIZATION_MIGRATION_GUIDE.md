# usePerformanceOptimization Migration Guide

## 🔄 **Migration Status: HYBRID APPROACH**

The `usePerformanceOptimization` hook has been **updated** to work seamlessly with TanStack Query while preserving essential performance optimizations.

## ✅ **What's Still Included (Essential Performance Hooks)**

These hooks are **still needed** even with TanStack Query:

### **Redux & UI State Optimization**

- ✅ `useOptimizedSelector` - **Critical** for Redux selectors (auth, UI state)
- ✅ `useDebouncedState` - **Essential** for form inputs and search
- ✅ `useStableCallback` - **Important** for preventing re-renders
- ✅ `useOptimizedButtonLoading` - **UI performance** (prevents button spam)
- ✅ `useOptimizedCountdown` - **Timer optimization** for appointments

### **Performance Monitoring**

- ✅ `usePerformanceTracker` - **Enhanced** to work with TanStack Query DevTools
- ✅ `useVirtualList` - **Essential** for large appointment/client lists
- ✅ `useOptimizedSubscription` - **Works well** with WebSocket + TanStack Query

### **Advanced Optimization**

- ✅ `useDeepMemo`, `useSmartMemo`, `useStableValue` - **Memory optimization**
- ✅ `useBatchedUpdates`, `useThrottledEffect` - **Render optimization**
- ✅ `useOptimizedState` - **Complex state management**

## ❌ **What's Been Removed (Replaced by TanStack Query)**

- ❌ `useOptimizedDataFetch` → **Use `useQuery` instead**
- ❌ `usePerformanceDiagnostic` → **Use TanStack Query DevTools**

## 🔧 **Migration Examples**

### **1. Data Fetching (OLD → NEW)**

**Before (useOptimizedDataFetch):**

```javascript
const { data, loading, error } = useOptimizedDataFetch(
  fetchAppointments,
  "appointments",
  [date, userId]
);
```

**After (TanStack Query):**

```javascript
import { useQuery } from "@tanstack/react-query";

const {
  data,
  isLoading: loading,
  error,
} = useQuery({
  queryKey: ["appointments", date, userId],
  queryFn: fetchAppointments,
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

### **2. Performance Hooks (UNCHANGED)**

These continue to work exactly the same:

```javascript
// Redux selector optimization (still needed!)
const user = useOptimizedSelector((state) => state.auth.user);

// Form debouncing (still needed!)
const [searchTerm, setSearchTerm] = useDebouncedState("", 300);

// Button loading states (still needed!)
const { isButtonLoading, createButtonHandler } = useOptimizedButtonLoading();

// Virtual lists for large data (still needed!)
const { visibleItems, totalHeight, onScroll } = useVirtualList(
  appointments,
  400, // container height
  50 // item height
);
```

## 🎯 **Why This Hybrid Approach Works**

### **TanStack Query Handles:**

- ✅ Server state caching
- ✅ Data fetching & mutations
- ✅ Background updates
- ✅ Request deduplication
- ✅ Error & loading states

### **Performance Hooks Handle:**

- ✅ Client state optimization (Redux)
- ✅ UI performance (debouncing, virtual lists)
- ✅ Render optimization (stable callbacks, memoization)
- ✅ Component-level performance monitoring

## 📊 **Components Using Performance Hooks**

Your components can continue using these hooks without changes:

```javascript
// ✅ TherapistDashboard.jsx
const user = useOptimizedSelector((state) => state.auth.user, shallowEqual);

// ✅ OperatorDashboard.jsx
const { isButtonLoading, createButtonHandler } = useOptimizedButtonLoading();
const { countdowns, manageTimer } = useOptimizedCountdown();

// ✅ Calendar.jsx
const schedulingState = useOptimizedSelector(
  (state) => state.scheduling,
  shallowEqual
);

// ✅ AppointmentForm.jsx
const schedulingState = useOptimizedSelector(
  (state) => state.scheduling,
  shallowEqual
);
```

## 🚀 **Best Practices Going Forward**

### **1. Use TanStack Query for Server State**

```javascript
// ✅ DO: Use TanStack Query for API data
const { data: appointments } = useQuery({
  queryKey: ["appointments"],
  queryFn: fetchAppointments,
});
```

### **2. Use Performance Hooks for Client State**

```javascript
// ✅ DO: Use performance hooks for Redux/UI state
const user = useOptimizedSelector((state) => state.auth.user);
const [searchTerm, setSearchTerm] = useDebouncedState("", 300);
```

### **3. Combine Both for Optimal Performance**

```javascript
// ✅ PERFECT: Server state + client state optimization
const { data: appointments, isLoading } = useQuery({
  queryKey: ["appointments"],
  queryFn: fetchAppointments,
});

const user = useOptimizedSelector((state) => state.auth.user);
const [searchTerm, setSearchTerm] = useDebouncedState("", 300);

// Filter with optimized memo
const filteredAppointments = useSmartMemo(() => {
  return appointments?.filter(
    (apt) =>
      apt.therapist === user.id &&
      apt.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );
}, [appointments, user.id, searchTerm]);
```

## 🎉 **Result: Best of Both Worlds**

Your application now has:

- ✅ **TanStack Query** for robust server state management
- ✅ **Performance hooks** for client-side optimization
- ✅ **No breaking changes** to existing components
- ✅ **Enhanced performance** monitoring
- ✅ **Future-proof** architecture

## 📝 **Action Items**

1. ✅ **No immediate changes required** - all components continue working
2. 🔄 **Gradually migrate** data fetching to TanStack Query hooks
3. 📊 **Monitor performance** with updated tracking that includes TanStack Query metrics
4. 🧹 **Eventually remove** unused data fetching logic as you migrate to TanStack Query

---

**Your performance optimization foundation remains strong while gaining the benefits of TanStack Query! 🚀**
