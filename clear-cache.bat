@echo off
echo Clearing cache and restarting development server...

cd royal-care-frontend

echo Stopping any running processes...
taskkill /F /IM node.exe 2>nul

echo Clearing npm cache...
npm cache clean --force

echo Removing node_modules and package-lock.json...
if exist node_modules rmdir /S /Q node_modules
if exist package-lock.json del package-lock.json

echo Reinstalling dependencies...
npm install

echo Starting development server...
npm run dev

pause
