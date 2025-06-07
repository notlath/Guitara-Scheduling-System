# Rejection Tracking Implementation - Driver vs Therapist Identification

## Overview

This implementation provides a comprehensive solution for the operator dashboard to properly identify and display who (Driver or Therapist) rejected a specific appointment, along with enhanced visual indicators and statistics.

## Problem Solved

**Original Issue**: The operator dashboard couldn't clearly distinguish whether a rejection came from a Driver or a Therapist, making it difficult for operators to understand rejection patterns and make informed decisions.

**Solution**: Enhanced rejection tracking with visual badges, role-based identification, and comprehensive statistics.

## Implementation Details

### 1. Backend Infrastructure (Already in Place)

The backend already had the proper infrastructure:

- `Appointment.rejected_by` field stores the User who rejected
- `rejected_by_details` in serializer includes full user information with role
- WebSocket events include `rejected_by_role` for real-time identification

### 2. Frontend Enhancements

#### A. Enhanced `getRejectedByInfo` Function

**File**: `royal-care-frontend/src/components/OperatorDashboard.jsx`

```javascript
const getRejectedByInfo = (appointment) => {
  if (!appointment.rejected_by_details) {
    return {
      text: "Unknown",
      role: "unknown",
      badgeClass: "rejection-unknown",
    };
  }

  const rejectedBy = appointment.rejected_by_details;
  const name = `${rejectedBy.first_name} ${rejectedBy.last_name}`;

  // Use the role from rejected_by_details for accurate identification
  const role = rejectedBy.role?.toLowerCase();

  switch (role) {
    case "therapist":
      return {
        text: `Therapist: ${name}`,
        role: "therapist",
        badgeClass: "rejection-therapist",
      };
    case "driver":
      return {
        text: `Driver: ${name}`,
        role: "driver",
        badgeClass: "rejection-driver",
      };
    default:
      return {
        text: `${rejectedBy.role || "Staff"}: ${name}`,
        role: rejectedBy.role?.toLowerCase() || "staff",
        badgeClass: "rejection-other",
      };
  }
};
```

**Key Improvements**:

- Uses `rejected_by_details.role` directly instead of comparing IDs
- Returns structured object with text, role, and CSS class
- Handles all edge cases (unknown, other roles)

#### B. Visual Rejection Badges

**Enhancement**: Replaced plain text with styled badges that clearly indicate the rejection source.

```jsx
<div className="rejected-by-info">
  <strong>Rejected By:</strong>{" "}
  <span
    className={`rejection-badge ${getRejectedByInfo(appointment).badgeClass}`}
  >
    {getRejectedByInfo(appointment).text}
  </span>
</div>
```

#### C. Statistics Dashboard

**New Feature**: Added a comprehensive statistics overview showing rejection patterns.

```jsx
<div className="stats-dashboard">
  <div className="stats-card">
    <h4>Rejection Overview</h4>
    <div className="stats-grid">
      <div className="stat-item">
        <span className="stat-number">{rejectionStats.total}</span>
        <span className="stat-label">Total Rejections</span>
      </div>
      <div className="stat-item therapist-stat">
        <span className="stat-number">{rejectionStats.therapist}</span>
        <span className="stat-label">Therapist Rejections</span>
      </div>
      <div className="stat-item driver-stat">
        <span className="stat-number">{rejectionStats.driver}</span>
        <span className="stat-label">Driver Rejections</span>
      </div>
      <div className="stat-item pending-stat">
        <span className="stat-number">{rejectionStats.pending}</span>
        <span className="stat-label">Pending Reviews</span>
      </div>
    </div>
  </div>
</div>
```

### 3. CSS Styling Enhancements

**File**: `royal-care-frontend/src/styles/OperatorDashboard.css`

#### A. Rejection Badges

```css
.rejection-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: relative;
}

.rejection-badge::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 6px;
}

.rejection-therapist {
  background-color: #e3f2fd;
  color: #1565c0;
  border: 1px solid #bbdefb;
}

.rejection-driver {
  background-color: #f3e5f5;
  color: #7b1fa2;
  border: 1px solid #ce93d8;
}
```

#### B. Statistics Dashboard

```css
.stats-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 20px;
  color: white;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
}
```

## Features

### 1. Visual Identification

- **Therapist Rejections**: Blue badge with therapist icon
- **Driver Rejections**: Purple badge with driver icon
- **Unknown/Other**: Gray badge for edge cases

### 2. Statistics Overview

- **Total Rejections**: Overall count across all appointments
- **Therapist Rejections**: Count of therapist-initiated rejections
- **Driver Rejections**: Count of driver-initiated rejections
- **Pending Reviews**: Count of rejections awaiting operator review

### 3. Enhanced UX

- **Color-coded badges** for quick visual identification
- **Responsive design** that works on mobile and desktop
- **Consistent styling** across all appointment views
- **Real-time updates** via WebSocket integration

## Usage

### For Operators

1. **Dashboard Overview**: See statistics showing rejection patterns at a glance
2. **Rejection Reviews**: Easily identify whether a therapist or driver rejected an appointment
3. **All Appointments**: Consistent rejection information across all views
4. **Visual Cues**: Color-coded badges make identification instant

### Example Scenarios

1. **High Therapist Rejections**: Operator can identify if a specific therapist is rejecting too many appointments
2. **Driver Issues**: Quickly spot if drivers are consistently rejecting transport assignments
3. **Pattern Analysis**: Use statistics to understand if rejections are coming from specific roles
4. **Informed Decisions**: Make better reassignment decisions based on who rejected and why

## Testing

### Manual Testing Steps

1. **Login as Therapist** → Reject an appointment → Check operator dashboard shows "Therapist: [Name]" with blue badge
2. **Login as Driver** → Reject an appointment → Check operator dashboard shows "Driver: [Name]" with purple badge
3. **Check Statistics** → Verify counts update correctly for each role
4. **Responsive Test** → Check on mobile devices that badges and stats display properly

### Edge Cases Handled

- **Unknown Rejecter**: Shows "Unknown" with gray badge
- **Missing Data**: Graceful fallback to role information
- **Other Roles**: Handles any future role additions
- **No Rejections**: Statistics show zeros appropriately

## Files Modified

1. **Frontend Components**:

   - `royal-care-frontend/src/components/OperatorDashboard.jsx`

2. **Styling**:

   - `royal-care-frontend/src/styles/OperatorDashboard.css`

3. **Documentation**:
   - `REJECTION_TRACKING_IMPLEMENTATION.md` (this file)

## Future Enhancements

1. **Export Reports**: Add functionality to export rejection statistics
2. **Time-based Analysis**: Show rejection trends over time periods
3. **Individual Performance**: Track rejection rates per person
4. **Notification Filters**: Filter notifications by rejection source
5. **Automated Alerts**: Alert when rejection rates exceed thresholds

## Compatibility

- **React**: Works with existing React component structure
- **Redux**: Integrates with current state management
- **WebSocket**: Compatible with real-time update system
- **Responsive**: Mobile and desktop friendly
- **Accessibility**: Color-blind friendly badge designs

This implementation provides a complete solution for operator dashboard rejection tracking, making it easy to identify who rejected appointments and understand rejection patterns for better operational decisions.
