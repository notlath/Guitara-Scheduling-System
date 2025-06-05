# Comprehensive Appointment Assignment and Therapist Notification System

## Overview

This document describes the implementation of a comprehensive appointment assignment and therapist notification system with automated timeout handling, rejection management, and operator review capabilities.

## Workflow Description

### 1. Appointment Assignment
- **Operator assigns therapist to appointment**
- Appointment status: `pending`
- Response deadline: 30 minutes from assignment
- Therapist receives real-time notification via WebSocket

### 2. Therapist Response Options

#### Accept Appointment
- Therapist clicks "Accept" button
- Appointment status changes to: `confirmed`
- Response deadline is cleared
- Operator receives notification of acceptance

#### Reject Appointment
- Therapist clicks "Reject" button
- Modal opens requiring rejection reason
- Appointment status changes to: `rejected`
- Rejection record created with reason and timestamp
- Operator receives notification with rejection details

### 3. Operator Review of Rejections

#### Accept Rejection
- Operator reviews rejection reason
- Operator clicks "Accept Rejection"
- Appointment status changes to: `pending` (available for reassignment)
- Therapist sees appointment as: `cancelled`
- System attempts to find new available therapist

#### Deny Rejection
- Operator reviews rejection reason
- Operator clicks "Deny Rejection" 
- Appointment remains: `assigned` to original therapist
- Therapist must still fulfill the appointment despite rejection

### 4. Timeout Handling (30-minute deadline)

#### No Response Within 30 Minutes
- Automated system checks for overdue appointments
- Therapist account is automatically disabled (`is_active = False`)
- Appointment status changes to: `auto_cancelled`
- Operator receives notification of auto-cancellation
- Therapist receives notification of account suspension

#### Approaching Deadline (within 10 minutes)
- Operator dashboard shows warning for appointments approaching deadline
- Real-time countdown display updates every second

### 5. Auto-Reassignment Logic

#### No Available Therapists
- When operator tries to reassign after rejection
- If no therapists available for the time slot
- Appointment automatically changes to: `cancelled`
- Client receives cancellation notification

## Implementation Details

### Backend Components

#### Models (Django)
- **Appointment**: Core appointment model with status tracking
- **AppointmentRejection**: Tracks rejection details and operator review
- **Notification**: Real-time notifications for users

#### Key Fields
```python
# Appointment model
status = models.CharField(choices=[
    ('pending', 'Pending'),
    ('confirmed', 'Confirmed'), 
    ('rejected', 'Rejected'),
    ('cancelled', 'Cancelled'),
    ('auto_cancelled', 'Auto Cancelled'),
    ('completed', 'Completed'),
])
response_deadline = models.DateTimeField()
rejection_reason = models.TextField()
rejected_by = models.ForeignKey(User)
rejected_at = models.DateTimeField()
auto_cancelled_at = models.DateTimeField()
```

#### API Endpoints
- `POST /api/scheduling/appointments/{id}/reject/` - Therapist rejection
- `POST /api/scheduling/appointments/{id}/review_rejection/` - Operator review
- `POST /api/scheduling/appointments/auto_cancel_overdue/` - Manual trigger for timeout processing

#### Management Command
```bash
# Process overdue appointments (typically run via cron every 5 minutes)
python manage.py auto_cancel_overdue

# Dry run to see what would be processed
python manage.py auto_cancel_overdue --dry-run
```

#### WebSocket Events
- `appointment_assigned` - New assignment notification
- `appointment_rejected` - Rejection notification
- `appointment_accepted` - Acceptance notification
- `appointment_auto_cancelled` - Timeout cancellation
- `therapist_disabled` - Account suspension notification

### Frontend Components

#### TherapistDashboard.jsx
**Enhanced Features:**
- Real-time appointment updates via WebSocket
- Accept/Reject buttons with reason modal
- Status-based action buttons
- Integration with RejectionModal component

**Key Functions:**
```javascript
handleAcceptAppointment(appointmentId)
handleRejectAppointment(appointmentId)  // Opens rejection modal
handleRejectionSubmit(rejectionReason)  // Submits rejection with reason
```

#### OperatorDashboard.jsx  
**New Features:**
- **Rejection Review Tab**: Shows pending rejection reviews
- **Timeout Monitoring Tab**: Real-time timeout tracking
- **Auto-Cancel Controls**: Manual trigger for overdue processing

**Key Sections:**
1. **Pending Reviews**: List of rejected appointments awaiting operator decision
2. **Timeout Monitoring**: 
   - Overdue appointments (red, pulsing)
   - Approaching deadline (yellow, countdown timer)
   - Auto-cancel button for manual processing
3. **All Appointments**: Complete appointment history
4. **Notifications**: Real-time notification center

#### RejectionModal.jsx
**Features:**
- Required rejection reason input
- Validation for non-empty reasons
- Cancel/Submit actions
- Integration with Redux actions

### Redux State Management

#### Actions
```javascript
// Therapist actions
rejectAppointment({id, rejectionReason})
updateAppointmentStatus({id, status})

// Operator actions  
reviewRejection({id, reviewDecision, reviewNotes})
autoCancelOverdueAppointments()
fetchNotifications()
```

#### State Structure
```javascript
scheduling: {
  appointments: [],
  notifications: [],
  loading: false,
  error: null
}
```

### CSS Styling

#### Status Indicators
- **Pending**: Yellow background
- **Confirmed**: Green background  
- **Rejected**: Red background
- **Overdue**: Red background with pulsing animation
- **Approaching Deadline**: Yellow background with countdown

#### Visual Enhancements
- Color-coded appointment cards
- Real-time countdown timers
- Responsive design for mobile devices
- Loading states and error handling

## Automated Scheduling

### Cron Job Setup
```bash
# Add to crontab for production deployment
# Process overdue appointments every 5 minutes
*/5 * * * * cd /path/to/project && python manage.py auto_cancel_overdue
```

### Manual Processing
Operators can manually trigger overdue processing through the dashboard interface without waiting for scheduled runs.

## Security Considerations

### Authorization
- Therapists can only reject their own assigned appointments
- Operators can review all rejections
- WebSocket authentication via Django Knox tokens

### Data Validation
- Rejection reasons required and validated
- Status transitions validated server-side
- Deadline calculations server-side to prevent tampering

## Testing Scenarios

### 1. Normal Accept/Reject Flow
1. Create appointment, assign therapist
2. Therapist accepts → status becomes `confirmed`
3. Verify operator notification received

### 2. Rejection and Review Flow  
1. Create appointment, assign therapist
2. Therapist rejects with reason
3. Operator reviews → Accept or Deny
4. Verify final status and notifications

### 3. Timeout Scenario
1. Create appointment, assign therapist
2. Wait 30+ minutes (or modify deadline for testing)
3. Run auto-cancel command
4. Verify therapist disabled and appointment cancelled

### 4. No Available Therapists
1. Create appointment in busy time slot
2. All therapists reject or are unavailable
3. Verify appointment auto-cancels

## Monitoring and Maintenance

### Health Checks
- Monitor overdue appointment processing logs
- Track therapist disable/enable events
- WebSocket connection status monitoring

### Performance Considerations
- Database indexing on `response_deadline` field
- Efficient WebSocket message filtering
- Pagination for large appointment lists

### Backup and Recovery
- Regular database backups including rejection history
- Audit trail for all status changes
- Notification delivery confirmation

## Future Enhancements

### Possible Improvements
1. **Email Notifications**: Backup for WebSocket failures
2. **SMS Alerts**: Critical timeout notifications
3. **Advanced Analytics**: Rejection pattern analysis
4. **Therapist Availability**: Auto-disable based on rejection frequency
5. **Client Communication**: Automatic updates on assignment changes
6. **Mobile App**: Native mobile notifications

### Scalability Considerations
- Redis for WebSocket scaling
- Celery for background task processing
- Load balancing for high-traffic scenarios

## Configuration

### Environment Variables
```env
# WebSocket settings
CHANNEL_LAYER_BACKEND=channels_redis.core.RedisChannelLayer
CHANNEL_LAYER_HOST=redis://localhost:6379

# Notification settings  
DEFAULT_RESPONSE_TIMEOUT_MINUTES=30
DEADLINE_WARNING_MINUTES=10

# Auto-cancel settings
AUTO_CANCEL_ENABLED=true
AUTO_DISABLE_THERAPISTS=true
```

This comprehensive system provides robust appointment management with automated failsafes, ensuring optimal service delivery while minimizing manual oversight requirements.
