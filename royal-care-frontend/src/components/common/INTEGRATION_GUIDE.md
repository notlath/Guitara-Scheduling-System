# AppointmentForm Integration Guide

## Overview

This guide shows how to integrate the new caching and lazy loading components into your AppointmentForm for optimal performance.

## 1. Import the New Components

```jsx
import { useAppointmentFormCache } from "../../hooks/useAppointmentFormCache";
import LazyClientSearch from "../common/LazyClientSearch";
import CachedTherapistSelect from "../common/CachedTherapistSelect";
import CachedDriverSelect from "../common/CachedDriverSelect";
```

## 2. Initialize the Cache Hook

```jsx
const AppointmentForm = ({ /* props */ }) => {
  // Initialize cache
  const { clientCache, therapistCache, driverCache, clearAllCaches } = useAppointmentFormCache();

  // ... existing state
```

## 3. Replace Client Search Component

Replace the existing `ClientSearchDropdown` with the new `LazyClientSearch`:

```jsx
// OLD - Remove this
<ClientSearchDropdown
  clients={clients}
  selectedClient={formData.client}
  onClientSelect={handleClientSelect}
  error={errors.client}
  disabled={isSubmitting}
/>

// NEW - Add this
<LazyClientSearch
  selectedClient={formData.client}
  onClientSelect={handleClientSelect}
  error={errors.client}
  disabled={isSubmitting}
  placeholder="Search client by name, phone, or email..."
/>
```

## 4. Replace Therapist Selection

Replace the existing therapist selection with the new cached component:

```jsx
// For Single Therapist Selection
<CachedTherapistSelect
  date={formData.date}
  startTime={formData.start_time}
  services={formData.services}
  selectedTherapists={formData.therapist ? [formData.therapist] : []}
  onTherapistSelect={(therapist) => setFormData(prev => ({ ...prev, therapist: therapist.id }))}
  multipleSelection={false}
  error={errors.therapist}
  disabled={isSubmitting}
  loading={fetchingAvailability}
/>

// For Multiple Therapist Selection
<CachedTherapistSelect
  date={formData.date}
  startTime={formData.start_time}
  services={formData.services}
  selectedTherapists={formData.therapists}
  onTherapistSelect={(therapist) => {
    setFormData(prev => ({
      ...prev,
      therapists: [...prev.therapists, therapist]
    }));
  }}
  onTherapistRemove={(therapist) => {
    setFormData(prev => ({
      ...prev,
      therapists: prev.therapists.filter(t => t.id !== therapist.id)
    }));
  }}
  multipleSelection={true}
  error={errors.therapists}
  disabled={isSubmitting}
  loading={fetchingAvailability}
/>
```

## 5. Replace Driver Selection

Replace the existing driver selection with the new cached component:

```jsx
<CachedDriverSelect
  date={formData.date}
  startTime={formData.start_time}
  selectedDriver={formData.driver}
  onDriverSelect={(driver) =>
    setFormData((prev) => ({ ...prev, driver: driver?.id || null }))
  }
  error={errors.driver}
  disabled={isSubmitting}
  loading={fetchingAvailability}
  required={false} // Set to true if driver is required
/>
```

## 6. Update Form Handlers

Add cache clearing when form is reset or cancelled:

```jsx
const handleCancel = useCallback(() => {
  // Clear form data
  setFormData(initialFormState);
  setErrors({});

  // Clear caches to ensure fresh data on next form open
  clearAllCaches();

  // Call parent cancel handler
  onCancel();
}, [clearAllCaches, onCancel]);

const handleSubmitSuccess = useCallback(
  (result) => {
    // Clear caches after successful submission
    clearAllCaches();

    // Call parent success handler
    onSubmitSuccess(result);
  },
  [clearAllCaches, onSubmitSuccess]
);
```

## 7. Add Cache Statistics (Optional - for debugging)

```jsx
// Add this for debugging/monitoring cache performance
const { getCacheStats } = useAppointmentFormCache();

useEffect(() => {
  if (process.env.NODE_ENV === "development") {
    console.log("Cache Stats:", getCacheStats());
  }
}, [getCacheStats]);
```

## 8. Performance Benefits

### Client Search:

- **Lazy Loading**: Only loads 20 clients at a time
- **Infinite Scroll**: Loads more as user scrolls
- **Search Caching**: Caches search results for 5 minutes
- **Debounced Search**: Reduces API calls while typing

### Therapist Selection:

- **Availability Caching**: Caches by date/time/service for 2 minutes
- **Smart Invalidation**: Automatically refreshes when time slots change
- **Reduced API Calls**: Only fetches when necessary

### Driver Selection:

- **Availability Caching**: Caches by date/time for 2 minutes
- **Optional Selection**: Supports "No Driver Required" option
- **Real-time Updates**: Refreshes when availability changes

## 9. Error Handling

The components include comprehensive error handling:

- Network errors with retry buttons
- Loading states with spinners
- Empty states with helpful messages
- Validation errors with clear feedback

## 10. Accessibility Features

All components include:

- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support
- Reduced motion support
- Focus management

## 11. Mobile Responsiveness

The components are fully responsive:

- Touch-friendly controls
- Optimized for small screens
- Adjusted font sizes and spacing
- Improved scroll handling

## Implementation Notes

1. **Gradual Migration**: You can implement these components one at a time
2. **Fallback Support**: The components gracefully handle missing data
3. **Cache Management**: Caches are automatically cleaned up on component unmount
4. **Development Mode**: Additional logging and debugging in development
5. **Production Optimized**: Minimal overhead in production builds

## Testing Recommendations

1. Test with slow networks to verify loading states
2. Test with large datasets to verify pagination
3. Test cache invalidation scenarios
4. Test accessibility with screen readers
5. Test on various mobile devices
