# Calendar Client Labels Testing Guide

## Overview

This guide provides comprehensive testing scenarios for the enhanced color-coded client labels feature in both Therapist and Driver dashboards.

## Pre-Testing Setup

### 1. Test Data Requirements

Ensure your test environment has appointments with various statuses:

- Multiple appointments on the same day (to test overflow handling)
- Appointments with different statuses representing each workflow stage
- Both single and multi-therapist appointments
- Appointments with and without drivers assigned

### 2. Access Requirements

- Login credentials for both Therapist and Driver roles
- Appointments scheduled for current and future dates
- Active appointments in different workflow stages

## Testing Scenarios

### A. Therapist Dashboard Calendar Testing

#### 1. **Basic Functionality Test**

- Navigate to Therapist Dashboard
- Click "Calendar View" tab
- Verify calendar displays with current month view
- Check that client labels appear on days with appointments

#### 2. **Therapist Status Color Verification**

Test each status color mapping:

**🟠 Pending Status (Orange)**

- Verify appointments with `pending` status show orange labels
- Tooltip should display "Status: pending"

**🔵 Confirmed Status (Blue)**

- Test `confirmed`, `therapist_confirmed`, `driver_confirmed` statuses
- All should display blue labels
- Tooltips should show respective status names

**🟣 Active/Transport Status (Purple)**

- Test `in_progress`, `journey`, `journey_started`, `arrived` statuses
- Test `pickup_requested`, `driver_assigned_pickup`, `return_journey` statuses
- All should display purple labels

**🟢 Session/Treatment Status (Green)**

- Test `dropped_off`, `session_in_progress` statuses
- Test `awaiting_payment`, `payment_requested` statuses
- All should display green labels

**✅ Completed Status (Light Green)**

- Test `completed`, `payment_completed`, `transport_completed` statuses
- All should display light green labels

**🔴 Cancelled/Rejected Status (Red)**

- Test `cancelled`, `rejected`, `auto_cancelled` statuses
- All should display red labels

#### 3. **Therapist-Specific Legend Test**

- Verify status legend shows "Therapist View"
- Check legend descriptions are appropriate for therapist workflow:
  - "Pending/Awaiting Confirmation"
  - "Confirmed/Ready to Proceed"
  - "Session/Treatment"
  - "Session Completed"
  - "Cancelled/Rejected"

### B. Driver Dashboard Calendar Testing

#### 1. **Basic Functionality Test**

- Navigate to Driver Dashboard
- Click "Calendar View" tab
- Verify calendar displays with current month view
- Check that client labels appear on days with transport assignments

#### 2. **Driver Status Color Verification**

Test each status color mapping:

**🟠 Pending/Awaiting Assignment (Orange)**

- Test `pending`, `therapist_confirmed`, `pickup_requested` statuses
- Should display orange labels
- Tooltips should show appropriate status

**🔵 Confirmed/Ready to Drive (Blue)**

- Test `confirmed`, `driver_confirmed` statuses
- Should display blue labels

**🟣 Active Transport/Pickup (Purple)**

- Test `in_progress`, `journey`, `journey_started` statuses
- Test `driving_to_location`, `arrived`, `at_location` statuses
- Test `dropped_off`, `driver_assigned_pickup`, `return_journey` statuses
- Test `picking_up_therapists`, `transporting_group`, `therapist_dropped_off` statuses
- All should display purple labels

**✅ Transport Completed (Light Green)**

- Test `driver_transport_completed`, `transport_completed`, `completed` statuses
- Should display light green labels

**🔴 Cancelled/Rejected (Red)**

- Test `cancelled`, `rejected` statuses
- Should display red labels

#### 3. **Driver-Specific Legend Test**

- Verify status legend shows "Driver View"
- Check legend descriptions are appropriate for driver workflow:
  - "Pending/Awaiting Assignment"
  - "Confirmed/Ready to Drive"
  - "Active Transport/Pickup"
  - "Transport Completed"
  - "Cancelled/Rejected"

### C. Common Functionality Testing

#### 1. **Multiple Appointments Per Day**

- Test days with 2 appointments: both client names should display
- Test days with 3+ appointments: 2 names plus "+X more" indicator
- Verify "+X more" shows correct count

#### 2. **Tooltip Functionality**

- Hover over each client label
- Verify tooltip shows: "[Client Name] - Status: [human readable status]"
- Check that underscores in status names are replaced with spaces

#### 3. **Responsive Design**

- Test on different screen sizes
- Verify labels remain readable and properly positioned
- Check that legend remains accessible

#### 4. **Date Navigation**

- Navigate between months using arrow buttons
- Verify client labels update correctly for each month
- Test that labels appear for past and future dates

#### 5. **Context Switching**

- Switch between different tabs in each dashboard
- Return to Calendar View
- Verify labels persist and display correctly

## Edge Cases Testing

### 1. **No Appointments**

- Navigate to months/dates with no appointments
- Verify no client labels appear
- Check that calendar still functions normally

### 2. **Long Client Names**

- Test with very long client names
- Verify text truncation or wrapping works properly
- Check tooltip shows full name

### 3. **Unknown Status**

- If possible, test with a status not in the mapping
- Should display default styling (accent color)
- Tooltip should show the actual status

### 4. **Network Issues**

- Test with slow/interrupted network
- Verify graceful degradation
- Check that cached data still shows labels

## Performance Testing

### 1. **Large Dataset**

- Test with many appointments across multiple months
- Verify calendar remains responsive
- Check that label rendering is efficient

### 2. **Real-time Updates**

- If WebSocket is active, test status changes
- Verify labels update in real-time
- Check that colors change appropriately

## Accessibility Testing

### 1. **Color Contrast**

- Verify all status colors meet accessibility standards
- Test with colorblind simulation tools
- Check that status information is available via tooltips

### 2. **Keyboard Navigation**

- Test calendar navigation with keyboard
- Verify labels are accessible via keyboard
- Check that tooltips work with keyboard focus

## Bug Reporting

### Common Issues to Watch For:

1. **Color Mismatches**: Status not matching expected color
2. **Missing Labels**: Client names not appearing when appointments exist
3. **Incorrect Context**: Wrong legend or colors for dashboard type
4. **Tooltip Issues**: Missing or incorrect tooltip information
5. **Performance**: Slow rendering or unresponsive interface
6. **Overflow Problems**: Incorrect "+X more" counts

### Reporting Format:

```
**Bug Title**: [Brief description]
**Dashboard**: Therapist/Driver
**Status**: [Appointment status being tested]
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Steps to Reproduce**: [Detailed steps]
**Screenshots**: [If applicable]
```

## Success Criteria

The implementation passes testing when:

- ✅ All status colors display correctly for each dashboard context
- ✅ Client names appear properly formatted on calendar days
- ✅ Tooltips provide accurate status information
- ✅ Legends are context-appropriate and helpful
- ✅ Overflow handling works for multiple appointments
- ✅ Performance remains acceptable with realistic data loads
- ✅ Responsive design works across different screen sizes
- ✅ No console errors or warnings appear during normal usage

## Post-Testing Validation

After successful testing:

1. Document any discovered edge cases
2. Update status mappings if new statuses are found
3. Consider additional UX improvements based on testing feedback
4. Verify integration with existing appointment workflows
