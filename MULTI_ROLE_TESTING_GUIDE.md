# 🧪 Multi-Role Testing Guide

This guide explains how to test different user roles simultaneously in the Guitara Scheduling System.

## 🚀 Quick Start Methods

### Method 1: Browser User Switcher (Recommended for Quick Testing)

A floating widget will appear in the top-right corner during development:

![User Role Switcher Widget](docs/role-switcher.png)

Click any role button to instantly switch users with **real authentication**:

- 👨‍💼 **Operator** - John Operator (operator1)
- 🧘‍♀️ **Therapist** - Jane Therapist (therapist1)
- 🚗 **Driver** - Mike Driver (driver1)
- 🚪 **Logout** - Clear authentication

**✅ Uses Real Tokens**: The switcher now uses the actual login API to get valid Knox authentication tokens, eliminating 401 Unauthorized errors.

### Method 2: Multiple Browser Windows/Profiles

#### Option A: Different Browsers

- **Chrome**: http://localhost:5175 (Operator)
- **Firefox**: http://localhost:5175 (Therapist)
- **Edge**: http://localhost:5175 (Driver)

#### Option B: Chrome Profiles

```bash
# Create separate Chrome instances with different profiles
chrome.exe --user-data-dir="C:\temp\chrome-operator" --new-window
chrome.exe --user-data-dir="C:\temp\chrome-therapist" --new-window
chrome.exe --user-data-dir="C:\temp\chrome-driver" --new-window
```

#### Option C: Incognito/Private Windows

- **Chrome**: Ctrl+Shift+N
- **Firefox**: Ctrl+Shift+P
- **Edge**: Ctrl+Shift+P

### Method 3: Browser Console Commands

Open Developer Tools (F12) and use these commands with **real authentication**:

```javascript
// Switch to Operator (uses real login API)
switchToOperator();

// Switch to Therapist
switchToTherapist();

// Switch to Driver
switchToDriver();

// Show current user info
showCurrentUser();

// Logout
clearAuth();
```

These commands now use the actual backend login API with real Knox tokens.

## 🔧 Test User Accounts

Test users are automatically created in the database with real authentication:

| Role      | Username   | Password    | Name           | Email              |
| --------- | ---------- | ----------- | -------------- | ------------------ |
| Operator  | operator1  | testpass123 | John Operator  | operator@test.com  |
| Therapist | therapist1 | testpass123 | Jane Therapist | therapist@test.com |
| Driver    | driver1    | testpass123 | Mike Driver    | driver@test.com    |

**Setting Up Test Users:**

```bash
# Run this command in the backend to create/update test users
cd guitara
python manage.py create_test_users
```

## 📋 Testing Workflow

### 1. Setup Multiple Sessions

1. Open 3 browser windows/profiles
2. Navigate to http://localhost:5175 in each
3. Use role switcher to set different roles in each window

### 2. Test Cross-Role Interactions

- **Operator**: Create/manage appointments
- **Therapist**: Accept appointments, start sessions
- **Driver**: Accept pickup requests, transport updates

### 3. Real-Time Testing

- Changes in one dashboard should reflect in others
- Test WebSocket synchronization
- Verify notification systems

## 🎯 Common Test Scenarios

### Appointment Flow Testing

1. **Operator Window**: Create new appointment
2. **Therapist Window**: Verify appointment appears, accept it
3. **Driver Window**: Verify pickup request appears
4. **All Windows**: Monitor status updates in real-time

### Multi-User Coordination

1. Multiple therapists accepting same appointment
2. Driver availability and assignment
3. Concurrent session management

## 🛠️ Development Tools

### Role Switcher Component

Located at: `src/components/development/UserRoleSwitcher.jsx`

- Only appears in development mode
- Instant role switching without page refresh
- Persists in localStorage

### Testing Utilities

Located at: `src/utils/testingHelpers.js`

- Console helper functions
- Manual localStorage manipulation
- Quick role switching scripts

## 📱 Mobile Testing

For responsive testing with different roles:

1. Use Chrome DevTools device simulation
2. Set different roles in different device profiles
3. Test touch interactions and mobile layouts

## 🔍 Debugging Tips

### Check Current User

```javascript
// View current user data
console.log(JSON.parse(localStorage.getItem("user")));

// View current token
console.log(localStorage.getItem("knoxToken"));
```

### WebSocket Status

- Check WebSocket connection in Network tab
- Monitor real-time updates between dashboards
- Verify sync events are properly broadcasted

### Redux State

- Use Redux DevTools to monitor state changes
- Track user authentication state
- Debug appointment state synchronization

## ⚠️ Important Notes

- **Development Only**: Role switcher only appears in development mode
- **Local Storage**: User data persists until manually cleared
- **Token Validity**: Test tokens may need backend validation for full functionality
- **Real-Time Updates**: Ensure backend WebSocket server is running for cross-dashboard sync

## 🚀 Production Testing

For production-like testing:

1. Comment out UserRoleSwitcher in App.jsx
2. Use actual login flow with real test accounts
3. Test with actual authentication tokens
4. Verify role-based access controls
