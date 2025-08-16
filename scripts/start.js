#!/usr/bin/env node

/**
 * Production startup script with enhanced error handling and monitoring
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🚀 Starting Flownity Backend in production mode...');

// Ensure production environment
process.env.NODE_ENV = 'production';

// Check if build exists
const distPath = join(projectRoot, 'dist', 'index.js');
if (!existsSync(distPath)) {
  console.error('❌ Build not found. Please run "npm run build" first.');
  process.exit(1);
}

// Check for required environment variables
const requiredEnvVars = [
  'SESSION_SECRET',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'DATABASE_HOST',
  'DATABASE_NAME',
  'DATABASE_USER',
  'DATABASE_PASSWORD'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('Please set these variables before starting the server.');
  process.exit(1);
}

console.log('✅ Environment validation passed');
console.log('🎯 Starting production server...');

// Start the application
const appProcess = spawn('node', ['dist/index.js'], {
  stdio: 'inherit',
  cwd: projectRoot,
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

appProcess.on('error', (error) => {
  console.error('❌ Failed to start application:', error.message);
  process.exit(1);
});

appProcess.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ Application exited with code ${code}`);
    process.exit(code);
  }
  console.log('✅ Application shut down gracefully');
});

// Handle process termination
function cleanup(signal) {
  console.log(`\n🛑 Received ${signal}, shutting down production server...`);
  appProcess.kill(signal);
}

process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));

console.log('🎉 Production server started successfully!');
console.log('⏹️  Press Ctrl+C to stop');