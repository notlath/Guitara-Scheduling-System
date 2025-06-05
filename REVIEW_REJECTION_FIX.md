# Review Rejection Fix Summary

## Issue
When the Operator Dashboard tries to review a rejection (accept/deny), it gets a 400 Bad Request error:
```
"Action must be 'accept' or 'deny'"
```

## Root Cause
**Field Name Mismatch** between frontend and backend:

### Frontend was sending:
```javascript
{
  review_decision: "accept",  // or "deny"
  review_notes: "Some note"
}
```

### Backend was expecting:
```python
response_action = request.data.get("action")   # 'accept' or 'deny'
response_reason = request.data.get("reason", "")
```

## Fix Applied

### 1. Frontend Change (schedulingSlice.js)
**Before:**
```javascript
{ 
  review_decision: reviewDecision,
  review_notes: reviewNotes 
}
```

**After:**
```javascript
{ 
  action: reviewDecision,
  reason: reviewNotes 
}
```

### 2. Backend Improvements (views.py)
- Added debug logging to track request data
- Improved error handling in the review_rejection method
- Fixed indentation issues

## Expected Result
Now when the operator:
1. Clicks "Accept" - sends `{action: "accept", reason: "note"}`
2. Clicks "Deny" - sends `{action: "deny", reason: "note"}`

The backend will properly recognize these actions and:
- **Accept**: Delete the appointment and notify the therapist
- **Deny**: Confirm the appointment and notify the therapist

## Testing
To test the fix:
1. Restart the Django server
2. Navigate to Operator Dashboard
3. Find a rejected appointment
4. Try to review the rejection with a note
5. Check that no 400 error occurs and the action completes successfully
