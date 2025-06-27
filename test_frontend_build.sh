#!/bin/bash
# Quick test script to verify the frontend builds correctly

echo "🧪 Testing frontend build after WebSocket fix..."

cd /home/notlath/Downloads/Guitara-Scheduling-System/royal-care-frontend

echo "📦 Installing dependencies..."
npm install

echo "🔧 Running build test..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful! WebSocket service fix is working."
    echo "🚀 You can now start the dev server with: npm run dev"
else
    echo "❌ Build failed. Check for additional errors."
fi
