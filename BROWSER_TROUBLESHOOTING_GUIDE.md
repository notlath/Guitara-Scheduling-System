# Browser Extension Error Troubleshooting Guide

## Common Issues When Using the Scheduling System

### 1. API Requests Blocked (ERR_BLOCKED_BY_CLIENT)

**Symptoms:**

- Error message: "Your request was blocked by your browser or an extension"
- Console shows: `GET http://localhost:8000/api/scheduling/appointments/ net::ERR_BLOCKED_BY_CLIENT`

**Solutions:**

#### For Brave Browser Users:

1. Click the **Brave Shields** icon (🛡️) in the address bar
2. Set "Block scripts" to **Allow all scripts**
3. Or click "Advanced View" and add an exception for `localhost:8000`
4. Refresh the page

#### For Other Browsers:

1. **Disable ad blockers temporarily:**
   - uBlock Origin: Click icon → Click power button to disable
   - AdBlock Plus: Click icon → "Enabled on this site" to disable
2. **Add to allowlist:**

   - Add `localhost:8000` and your frontend URL to your ad blocker's allowlist
   - Most ad blockers have an "allowlist" or "whitelist" option in settings

3. **Browser extensions:**
   - Disable privacy extensions temporarily
   - Common culprits: Privacy Badger, Ghostery, DuckDuckGo Privacy Essentials

#### Quick Test:

- Try opening the site in an **incognito/private window**
- If it works there, the issue is definitely an extension

### 2. Browser Extension Console Spam

**Symptoms:**

- Hundreds of harmless errors like:
  ```
  Unchecked runtime.lastError: The page keeping the extension port is moved into back/forward cache
  Error: No tab with id: xxxxx
  Frame with ID xxx was removed
  ```

**Solution:**

- These errors are **harmless** and come from browser extensions
- They don't affect the application functionality
- The application now automatically suppresses these console messages
- You can safely ignore them

### 3. Network Connection Issues

**Symptoms:**

- Error: "Unable to connect to the server"
- API requests timeout or fail

**Solutions:**

1. Check your internet connection
2. Verify the backend server is running (`npm run dev` in the backend directory)
3. Check if `localhost:8000` is accessible directly in your browser
4. Try restarting both frontend and backend servers

### 4. Authentication Issues

**Symptoms:**

- "Your session has expired" messages
- Redirected to login page unexpectedly

**Solutions:**

1. Clear browser cache and cookies for the site
2. Log out completely and log back in
3. Check if your token is still valid by refreshing the page

## Developer Mode Setup

If you're running the application in development mode:

1. **Frontend:** `npm run dev` (usually runs on port 3000 or 5173)
2. **Backend:** `npm run dev` or `python manage.py runserver` (usually runs on port 8000)
3. Make sure both are running simultaneously

## Still Having Issues?

1. **Check the browser console** (F12 → Console tab) for specific error messages
2. **Try a different browser** to isolate the issue
3. **Disable all extensions** temporarily
4. **Contact support** with:
   - Your browser name and version
   - Screenshots of any error messages
   - Steps to reproduce the issue

---

_Last updated: December 2024_
