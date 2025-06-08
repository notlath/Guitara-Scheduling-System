# Multi-Therapist Booking Feature - Testing Guide

## Overview

The Royal Care Home Service Massage system now supports booking multiple therapists for a single appointment. This feature enables clients to book team-based massage sessions while maintaining all existing coordination and notification functionality.

## Frontend Implementation

### AppointmentForm.jsx Changes

✅ **IMPLEMENTED:**

- Added checkbox to toggle between single and multi-therapist booking
- Dynamic UI that shows either single therapist dropdown or multi-select therapist list
- Updated form validation to handle both modes
- Enhanced form submission to send appropriate data structure to backend
- Proper error handling and user guidance text

### Dashboard Updates

#### OperatorDashboard.jsx

✅ **IMPLEMENTED:**

- Helper functions to display therapist information (single or multiple)
- Smart acceptance status display for multi-therapist appointments
- Updated all appointment displays to show team information
- Added CSS styles for multi-therapist display

#### TherapistDashboard.jsx

✅ **IMPLEMENTED:**

- Updated appointment filtering to include multi-therapist appointments
- Enhanced acceptance logic to handle therapist teams
- Team member display showing other therapists in group appointments
- Updated action buttons to work with multi-therapist acceptance

## Backend Implementation

### Models (guitara/scheduling/models.py)

✅ **IMPLEMENTED:**

- Added `therapists` ManyToManyField to Appointment model
- Maintains backward compatibility with existing `therapist` field
- Database migration completed successfully

### Serializers (guitara/scheduling/serializers.py)

✅ **IMPLEMENTED:**

- Added `therapists_details` field to provide full therapist information
- Supports both single and multiple therapist data structures
- Backward compatible with existing API consumers

### Views (guitara/scheduling/views.py)

✅ **IMPLEMENTED:**

- Updated `get_queryset` to handle multi-therapist filtering
- Enhanced `perform_create` to save multiple therapists
- Maintains API compatibility for existing single-therapist bookings

## Testing Instructions

### 1. Manual UI Testing

#### Test Multi-Therapist Booking Flow:

1. Open the appointment form
2. Check the "Book multiple therapists" checkbox
3. Verify the UI switches from single dropdown to multi-select
4. Select multiple therapists using Ctrl+click (Cmd+click on Mac)
5. Fill out other required fields
6. Submit the form
7. Check browser console for debug output showing multi-therapist data

#### Test Single Therapist Flow (Regression Test):

1. Ensure the checkbox is unchecked
2. Select a single therapist from dropdown
3. Complete the booking normally
4. Verify existing functionality still works

### 2. Dashboard Testing

#### OperatorDashboard:

1. Navigate to operator dashboard
2. Look for appointments with multiple therapists
3. Verify team display shows all therapist names
4. Check acceptance status indicators for partial/full team acceptance

#### TherapistDashboard:

1. Log in as a therapist who is part of a multi-therapist appointment
2. Verify appointment appears in their list
3. Check that team member information is displayed
4. Test accept/reject functionality

### 3. Backend API Testing

#### Create Multi-Therapist Appointment:

```json
POST /api/appointments/
{
  "client": 1,
  "services": [1],
  "therapists": [1, 2, 3],
  "date": "2025-06-08",
  "start_time": "10:00",
  "location": "123 Main St",
  "notes": "Team massage session"
}
```

#### Verify Response Structure:

```json
{
  "id": 1,
  "therapists": [1, 2, 3],
  "therapists_details": [
    { "id": 1, "first_name": "John", "last_name": "Doe" },
    { "id": 2, "first_name": "Jane", "last_name": "Smith" },
    { "id": 3, "first_name": "Bob", "last_name": "Wilson" }
  ],
  "therapists_accepted": [false, false, false]
  // ... other fields
}
```

### 4. Coordination & Notification Testing

#### Driver Assignment:

1. Create multi-therapist appointment
2. Test driver assignment for team transport
3. Verify driver dashboard shows group pickup information
4. Test dynamic reassignment with multiple therapists

#### Notifications:

1. Create multi-therapist appointment
2. Verify all therapists receive notifications
3. Test acceptance notifications for partial team acceptance
4. Check operator notifications for team coordination

## Known Considerations

### Database Migration

- Migration adds `therapists` ManyToMany field
- Existing appointments remain unchanged (using single `therapist` field)
- New appointments can use either single or multi-therapist approach

### Backward Compatibility

- All existing API endpoints continue to work
- Single therapist appointments use legacy `therapist` field
- Multi-therapist appointments populate `therapists` field
- Frontend handles both data structures gracefully

### Performance Notes

- Multi-therapist queries include additional joins for therapist details
- Consider query optimization for large therapist teams
- Frontend renders efficiently with helper functions

## Debug Output

The AppointmentForm includes comprehensive debug logging:

- Form data structure before submission
- Sanitized data sent to API
- Multi-therapist specific information
- Error handling and validation messages

Check browser console for detailed multi-therapist booking information.

## CSS Styling

### Multi-Therapist Specific Styles:

- `.therapists-list` - Container for multiple therapist display
- `.therapist-item` - Individual therapist in team
- `.therapist-team` - Team member information box
- `.acceptance-indicator.partial` - Partial team acceptance styling
- `.multi-select` - Enhanced multi-select styling

## Future Enhancements

### Potential Improvements:

1. Real-time team coordination status
2. Advanced scheduling for therapist availability conflicts
3. Team-based pricing calculations
4. Enhanced notification grouping for teams
5. Therapist skill/specialization matching for teams

## Error Handling

### Frontend Validation:

- At least one therapist required in multi-therapist mode
- Proper error display for multi-select field
- Clear user guidance for multi-selection

### Backend Validation:

- Validates therapist availability for all team members
- Handles conflicts gracefully
- Provides detailed error messages for team booking issues
