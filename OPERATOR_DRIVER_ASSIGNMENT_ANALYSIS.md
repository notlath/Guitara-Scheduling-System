# Operator Driver Assignment Workflow Analysis

## Current Implementation Overview

The operator's driver assignment workflow in the Guitara Scheduling System is designed to handle pickup requests from therapists who have completed their sessions. Here's how it currently works:

## 1. Pickup Request Detection

**Current Process:**

- Therapists request pickup using `handleRequestPickup` or `handleRequestUrgentPickup` in TherapistDashboard
- Status is set to `"pickup_requested"`
- Backend stores the pickup request information

**How Operator Sees Requests:**

```javascript
const pendingPickups = appointments.filter(
  (apt) =>
    apt.status === "completed" && apt.pickup_requested && !apt.assigned_driver
);
```

## 2. Driver Assignment Interface

**Available Information for Each Pickup Request:**

- Therapist name and location
- Session end time
- Waiting time since request
- Urgency level (normal/urgent)
- Zone-based proximity calculations

**Driver Selection Process:**

1. Operator sees list of pending pickup requests
2. System shows available drivers with proximity scores
3. Operator can manually assign driver or mark request as urgent for auto-assignment

## 3. Driver Assignment Logic

**Manual Assignment:**

```javascript
const handleAssignDriverPickup = async (therapistId, driverId) => {
  // Updates appointment with:
  // - status: "driver_assigned_pickup"
  // - driver: driverId
  // - estimated arrival time
  // - broadcast to all parties
};
```

**Urgent Auto-Assignment:**

```javascript
const handleUrgentPickupRequest = async (therapistId) => {
  // Finds nearest available driver
  // Auto-assigns using same logic as manual assignment
};
```

## 4. Status Updates and Real-time Communication

**Backend API Calls:**

- Uses `updateAppointmentStatus` thunk from schedulingSlice
- Also has `assignDriverToPickup` thunk (appears to be alternative implementation)

**Broadcasting:**

- Uses `syncService.broadcast` for real-time updates
- Notifies driver, therapist, and other operators

## 5. Zone-Based Proximity System

**Current Zone Logic:**

```javascript
const ZONE_MAP = {
  north_manila: ["Quezon City", "Caloocan", "Malabon"],
  south_manila: ["Makati", "Taguig", "Paranaque"],
  east_manila: ["Pasig", "Marikina", "Antipolo"],
  west_manila: ["Manila", "Pasay", "Las Pinas"],
  central_manila: ["Mandaluyong", "San Juan", "Sta. Mesa"],
};
```

**Proximity Scoring:**

- Same zone: Score 10 (10-15 min estimated)
- Different zone: Score 5 (20-30+ min estimated)

## 6. Current Issues and Inconsistencies

### Issue 1: Inconsistent Backend API Usage

The system uses two different approaches for driver assignment:

**Method 1 (Currently Used in OperatorDashboard):**

```javascript
await dispatch(
  updateAppointmentStatus({
    id: therapist.appointment_id,
    status: "driver_assigned_pickup",
    driver: driverId, // ✅ Correct field name
    notes: `Driver assigned for pickup - ETA: ${estimatedArrival}`,
  })
);
```

**Method 2 (Available but not used):**

```javascript
await dispatch(
  assignDriverToPickup({
    appointmentId,
    driverId,
    estimatedPickupTime,
  })
);
// This sends: pickup_driver, assigned_driver, status fields
```

### Issue 2: Field Name Inconsistency

- OperatorDashboard uses `driver` field
- assignDriverToPickup uses `pickup_driver` and `assigned_driver` fields
- Need to verify which fields actually exist in the Appointment model

### Issue 3: Driver State Management

```javascript
// Current filter logic may not work correctly:
const pendingPickups = appointments.filter(
  (apt) =>
    apt.status === "completed" && apt.pickup_requested && !apt.assigned_driver // ⚠️ Field name inconsistency
);
```

### Issue 4: Driver Availability Tracking

- Currently uses mock data for driver availability
- Real-time driver status not properly integrated
- No mechanism to track when drivers complete pickups

## 7. Recommended Fixes

### Fix 1: Standardize Driver Field Names

Check the actual Appointment model fields and use consistent naming:

```python
# In models.py - verify these fields exist:
assigned_driver = models.ForeignKey(...)  # or
pickup_driver = models.ForeignKey(...)    # or
driver = models.ForeignKey(...)           # Current usage
```

### Fix 2: Improve Driver Status Tracking

```javascript
// Need real-time driver status updates
const updateDriverStatus = (driverId, status, currentTask) => {
  // Move driver between available/busy lists
  // Update driver's current assignment
};
```

### Fix 3: Consolidate Assignment Methods

Choose one consistent method for driver assignment and remove the other.

### Fix 4: Fix Pickup Request Detection

```javascript
// Ensure consistent field checking:
const pendingPickups = appointments.filter(
  (apt) =>
    apt.status === "pickup_requested" || // ✅ Better status check
    (apt.status === "completed" && apt.pickup_requested)
);
```

## 8. Complete Workflow Steps

**Ideal Flow:**

1. **Therapist completes session** → Status: "completed"
2. **Therapist requests pickup** → Status: "pickup_requested", pickup_requested: true
3. **Operator sees pending request** → In Driver Coordination panel
4. **Operator assigns driver** → Status: "driver_assigned_pickup", driver: driverId
5. **Driver receives notification** → Via WebSocket/real-time updates
6. **Driver accepts/travels** → Status: "driver_en_route"
7. **Driver arrives** → Status: "driver_arrived"
8. **Pickup completed** → Status: "picked_up" or back to "available"

## 9. Testing Recommendations

1. **Test Field Consistency:** Verify all driver-related fields work correctly
2. **Test Real-time Updates:** Ensure all parties receive proper notifications
3. **Test Zone Logic:** Verify proximity calculations work as expected
4. **Test Status Transitions:** Ensure all status changes work properly
5. **Test Edge Cases:** No available drivers, urgent requests, multiple simultaneous requests

## 10. Next Steps

1. Fix field name inconsistencies in the backend model
2. Choose and implement one consistent driver assignment method
3. Implement proper real-time driver status tracking
4. Test the complete end-to-end workflow
5. Add error handling for edge cases
