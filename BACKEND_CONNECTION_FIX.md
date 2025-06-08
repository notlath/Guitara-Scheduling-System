# Backend Connection Fix - Django Server Startup Issue

## Problem

The frontend was showing `net::ERR_CONNECTION_REFUSED` errors because the Django backend server couldn't start due to syntax errors in `serializers.py`.

## Root Cause

There were several syntax and import errors in `guitara/scheduling/serializers.py`:

1. **Syntax Error (Line 247)**: Missing newline between `.exists()` and `if not has_availability:`
2. **Import Error**: Missing `Q` import from `django.db.models`
3. **Reference Error**: Using `User` instead of `CustomUser` in multiple places

## Fixes Applied

### 1. Fixed Syntax Error

**Before:**

```python
).exists()                if not has_availability:
```

**After:**

```python
).exists()

if not has_availability:
```

### 2. Added Missing Import

**Added to imports:**

```python
from django.db.models import Q
```

### 3. Fixed Model References

**Before:**

```python
models.Q(therapist=therapist) | models.Q(therapists=therapist)
User.objects.get(id=therapist_id, role="therapist")
except User.DoesNotExist:
```

**After:**

```python
Q(therapist=therapist) | Q(therapists=therapist)
CustomUser.objects.get(id=therapist_id, role="therapist")
except CustomUser.DoesNotExist:
```

## How to Start the Servers

### Option 1: Manual Start (Recommended for debugging)

1. **Start Django Backend:**

   ```cmd
   cd guitara
   python manage.py runserver
   ```

2. **Start React Frontend** (in a new terminal):
   ```cmd
   cd royal-care-frontend
   npm run dev
   ```

### Option 2: Use the Development Script

```cmd
python start_development.py
```

### Option 3: Use VS Code Tasks

The frontend development server task is already configured. For backend, you can run:

```cmd
cd guitara && python manage.py runserver
```

## Verification

After starting both servers, you should see:

- **Django Backend**: Running on `http://localhost:8000`
- **React Frontend**: Running on `http://localhost:5173`

The frontend console errors should disappear, and you should be able to:

- ✅ Load the scheduling dashboard
- ✅ Create appointments (both single and multi-therapist)
- ✅ View availability data
- ✅ Test the driver-therapist coordination workflow

## Next Steps

1. Start both servers using one of the methods above
2. Navigate to `http://localhost:5173` in your browser
3. Test multi-therapist booking functionality
4. Verify that the "Missing required fields" error is resolved
5. Test the full coordination workflow with drivers and therapists

## Files Modified

- `guitara/scheduling/serializers.py` - Fixed syntax and import errors

The frontend multi-therapist booking fix from the previous issue should now work correctly once both servers are running.
