@echo off
REM Fix React Version Conflicts and Service Worker Issues
REM Run this script to resolve the reported issues

echo 🔧 Fixing React Version Conflicts and Service Worker Issues...

REM Navigate to the frontend directory
cd /d "%~dp0"

REM Clear npm cache
echo 🧹 Clearing npm cache...
call npm cache clean --force

REM Remove node_modules and package-lock.json
echo 🗑️ Removing node_modules and package-lock.json...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

REM Reinstall dependencies
echo 📦 Reinstalling dependencies...
call npm install

REM Clear browser cache for service worker
echo 🌐 Clearing browser cache is recommended...
echo Please clear your browser cache and hard refresh (Ctrl+Shift+R)

REM Restart development server
echo 🚀 Starting development server...
call npm run dev

echo ✅ Fix complete! The application should now run without React hook errors.
echo.
echo If you still see errors:
echo 1. Clear your browser cache completely
echo 2. Restart your VS Code editor
echo 3. Try opening the app in an incognito/private browser window

pause
