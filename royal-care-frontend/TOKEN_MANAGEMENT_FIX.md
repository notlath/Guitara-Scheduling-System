# Token Management Fix

## Overview

This update addresses issues with token management across different tabs that was causing authentication errors. The problem occurred because tokens were being stored under different key names (`knoxToken`, `token`, and `authToken`) in localStorage, resulting in authentication failures when running multiple tabs with different user accounts.

## Changes Made

1. **Centralized Token Management**: Created a new `tokenManager.js` utility to handle all token operations consistently.

2. **Unified Token Storage**: Standardized all token access through the centralized manager while maintaining backward compatibility.

3. **Cross-Tab Synchronization**: Added a `LoginWrapper` component to help manage authentication state across tabs.

4. **Token Migration**: Implemented automatic migration of tokens stored under legacy keys.

## How to Use

### For Developers

1. Always use the `tokenManager.js` utilities for token operations:

```javascript
import {
  getToken,
  setToken,
  removeToken,
  hasValidToken,
} from "../utils/tokenManager";

// Getting token
const token = getToken();

// Setting token
setToken(myToken);

// Removing token
removeToken();

// Checking if token exists
if (hasValidToken()) {
  // do something
}
```

2. Never access localStorage directly for token operations:

```javascript
// DON'T DO THIS ANYMORE
const token = localStorage.getItem("knoxToken");
```

### For Users Experiencing Issues

If you're still experiencing authentication issues across tabs:

1. Clear your browser's localStorage by opening the Developer Tools (F12), going to the Application tab, then Storage > Local Storage, and clicking "Clear All".

2. Log out of all tabs and close them.

3. Open a new tab and log in again.

## Technical Details

- The primary token key is now `knoxToken`
- For backward compatibility, tokens are also stored under `token` and `authToken`
- The `LoginWrapper` component helps synchronize tokens across tabs
- Error messages should now provide more clarity about authentication issues

## Known Limitations

- Different user sessions in different tabs may still cause unexpected behavior in some cases
- WebSocket connections will still use the user's token from when the connection was established
