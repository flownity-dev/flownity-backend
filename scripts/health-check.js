#!/usr/bin/env node

/**
 * Health check script for monitoring application status
 */

import http from 'http';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

console.log(`🔍 Checking application health at http://${HOST}:${PORT}...`);

const options = {
  hostname: HOST,
  port: PORT,
  path: '/',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  console.log(`✅ Server responded with status: ${res.statusCode}`);
  
  if (res.statusCode === 200) {
    console.log('🎉 Application is healthy!');
    process.exit(0);
  } else {
    console.log('⚠️  Application returned non-200 status');
    process.exit(1);
  }
});

req.on('error', (error) => {
  console.error('❌ Health check failed:', error.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('❌ Health check timed out');
  req.destroy();
  process.exit(1);
});

req.setTimeout(5000);
req.end();