#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🏠 Royal Care Scheduling System - Frontend Build Test');
console.log('=======================================================');

const frontendPath = path.join(__dirname, 'royal-care-frontend');

console.log('📦 Running npm build in frontend directory...');
console.log('Path:', frontendPath);

const buildProcess = spawn('npm', ['run', 'build'], {
  cwd: frontendPath,
  stdio: 'inherit',
  shell: true
});

buildProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Frontend build completed successfully!');
    console.log('🎉 All import/export issues appear to be resolved.');
  } else {
    console.log('\n❌ Frontend build failed with code:', code);
    console.log('🔧 Check the output above for specific error details.');
  }
});

buildProcess.on('error', (error) => {
  console.error('❌ Error running build:', error.message);
});
