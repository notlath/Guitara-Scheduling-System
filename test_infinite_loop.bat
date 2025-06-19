@echo off
echo Testing for infinite loop fix...
echo Starting development server to monitor console output...
echo.
echo Look for these patterns in the browser console:
echo 1. "🔄 OperatorDashboard render #" should increment slowly, not rapidly
echo 2. "🔍 OperatorDashboard Debug - Data State:" should not repeat rapidly
echo 3. "🚗 Driver data effect triggered:" should only appear a few times
echo 4. No "🚨 HIGH RENDER COUNT DETECTED" errors should appear
echo.
echo Press Ctrl+C to stop the server when done testing.
echo.
cd /d "%~dp0"
npm run dev
