#!/bin/bash

# Fix React Version Conflicts and Service Worker Issues
# Run this script to resolve the reported issues

echo "🔧 Fixing React Version Conflicts and Service Worker Issues..."

# Navigate to the frontend directory
cd "$(dirname "$0")"

# Clear npm cache
echo "🧹 Clearing npm cache..."
npm cache clean --force

# Remove node_modules and package-lock.json
echo "🗑️ Removing node_modules and package-lock.json..."
rm -rf node_modules
rm -f package-lock.json

# Reinstall dependencies
echo "📦 Reinstalling dependencies..."
npm install

# Clear browser cache for service worker
echo "🌐 Clearing browser cache is recommended..."
echo "Please clear your browser cache and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)"

# Restart development server
echo "🚀 Restarting development server..."
npm run dev

echo "✅ Fix complete! The application should now run without React hook errors."
echo ""
echo "If you still see errors:"
echo "1. Clear your browser cache completely"
echo "2. Restart your VS Code editor"
echo "3. Try opening the app in an incognito/private browser window"
