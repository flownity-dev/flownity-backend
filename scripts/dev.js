#!/usr/bin/env node

/**
 * Development startup script with enhanced error handling and hot reloading
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🚀 Starting Flownity Backend in development mode...');
console.log('📁 Project root:', projectRoot);

// Environment setup
process.env.NODE_ENV = 'development';

// Function to spawn a process with proper error handling
function spawnProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    cwd: projectRoot,
    ...options
  });

  child.on('error', (error) => {
    console.error(`❌ Failed to start ${command}:`, error.message);
    process.exit(1);
  });

  return child;
}

// Initial build
console.log('🔨 Building TypeScript...');
const buildProcess = spawnProcess('npm', ['run', 'build']);

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Initial build failed');
    process.exit(1);
  }

  console.log('✅ Initial build completed');
  console.log('👀 Starting file watchers...');

  // Start TypeScript compiler in watch mode
  const tscWatch = spawnProcess('npx', ['tsc', '-w'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Start nodemon to watch compiled files
  const nodemonProcess = spawnProcess('npx', ['nodemon'], {
    stdio: 'inherit'
  });

  // Handle TypeScript compiler output
  tscWatch.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Found 0 errors')) {
      console.log('✅ TypeScript compilation successful');
    } else if (output.includes('error TS')) {
      console.log('❌ TypeScript compilation errors detected');
    }
  });

  tscWatch.stderr.on('data', (data) => {
    console.error('TypeScript compiler error:', data.toString());
  });

  // Handle process termination
  function cleanup() {
    console.log('\n🛑 Shutting down development server...');
    tscWatch.kill();
    nodemonProcess.kill();
    process.exit(0);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  console.log('🎉 Development server is running!');
  console.log('📝 Edit files in src/ to see changes');
  console.log('🌐 Server will be available at http://localhost:3000');
  console.log('⏹️  Press Ctrl+C to stop');
});