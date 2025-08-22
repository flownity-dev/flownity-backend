#!/usr/bin/env node

/**
 * Simple JWT testing script
 * Tests JWT token generation and verification
 */

import { generateToken, verifyToken } from '../dist/auth/jwt.js';

// Mock user data for testing
const mockUser = {
  id: 1,
  providerId: '12345',
  provider: 'github',
  username: 'testuser',
  displayName: 'Test User',
  email: 'test@example.com',
  firstName: null,
  lastName: null,
  profilePictureUrl: null,
  fullName: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

console.log('🧪 JWT Testing Script');
console.log('====================\n');

try {
  // Test token generation
  console.log('1. Testing JWT token generation...');
  const token = generateToken(mockUser);
  console.log('✅ Token generated successfully');
  console.log(`📄 Token: ${token.substring(0, 50)}...\n`);

  // Test token verification
  console.log('2. Testing JWT token verification...');
  const decoded = verifyToken(token);
  console.log('✅ Token verified successfully');
  console.log('📋 Decoded payload:', {
    userId: decoded.userId,
    username: decoded.username,
    provider: decoded.provider,
    exp: new Date(decoded.exp * 1000).toISOString()
  });

  console.log('\n🎉 All JWT tests passed!');
} catch (error) {
  console.error('❌ JWT test failed:', error.message);
  process.exit(1);
}