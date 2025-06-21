# API Timeout Fix Guide

## Problem

The `ApiDiagnostic` component is showing timeout errors because the Django backend server is not running.

## Error Details

```
❌ API Diagnostic error: AxiosError {message: 'timeout of 10000ms exceeded', name: 'AxiosError', code: 'ECONNABORTED', ...}
```

## Root Cause

The frontend is trying to connect to `http://localhost:8000` but the Django backend server is not running on that port.

## Solution Steps

### 1. Start the Django Backend Server

**Option A: Use the batch script (Windows)**

```cmd
start_backend.bat
```

**Option B: Manual start**

```cmd
cd "c:\Users\USer\Downloads\Guitara-Scheduling-System"
venv\Scripts\activate
cd guitara
python manage.py runserver
```

**Option C: Use the Python development starter**

```cmd
cd "c:\Users\USer\Downloads\Guitara-Scheduling-System"
python start_development.py
```

### 2. Verify Backend is Running

1. Open a web browser
2. Navigate to `http://localhost:8000/`
3. You should see a Django welcome page or API message

### 3. Check the API Diagnostic Panel

1. Refresh the frontend page
2. Look for the blue "🔍 API Diagnostics" panel in the top-left corner
3. It should now show:
   - **Backend Reachable:** Yes
   - **Appointments API:** Working (with appointment count)

### 4. If Still Having Issues

#### Check Port Conflicts

```cmd
netstat -ano | findstr :8000
```

If port 8000 is in use by another process, either:

- Kill the process: `taskkill /PID <process_id> /F`
- Or start Django on a different port: `python manage.py runserver 8001`

#### Check Database

```cmd
cd guitara
python manage.py migrate
python manage.py showmigrations
```

#### Create Test Data (if needed)

```cmd
cd guitara
python manage.py shell
```

Then in the Django shell:

```python
from scheduling.models import Appointment, Client, Therapist
from django.contrib.auth.models import User
from datetime import datetime, timedelta

# Create test data if needed
# (Add sample appointments)
```

## Improved Error Handling

The `ApiDiagnostic` component has been updated to:

1. **Reduce timeout** from 10s to 3s for faster feedback
2. **Better error messages** with specific solutions
3. **Timeout detection** with clear "server not running" messages
4. **Visual improvements** with color-coded error displays

## Expected Results After Fix

### API Diagnostic Panel Should Show:

- **Auth Token:** Present
- **API URL:** http://localhost:8000/api/scheduling/
- **Backend Reachable:** Yes
- **Appointments API:** X appointments found

### OperatorDashboard Should Show:

- Actual appointments instead of "No Appointments"
- Debug panel showing appointment count > 0
- Working API calls in the Network tab

## Next Steps

1. Start the backend server using one of the methods above
2. Refresh the frontend page
3. Check the API Diagnostic panel for success
4. Verify appointments are loading in the OperatorDashboard
5. Remove debug components if everything is working

## Prevention

To avoid this issue in the future:

1. Always start the backend server before the frontend
2. Use the `start_development.py` script to start both servers
3. Check the API Diagnostic panel if you see "No Appointments"
