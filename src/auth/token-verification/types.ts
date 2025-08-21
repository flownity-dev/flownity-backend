/**
 * Core types and interfaces for OAuth token verification
 */

import type { Provider, BaseUser } from '../../types/common.js';

// Re-export common types for convenience
export type { Provider, GitHubUserResponse, GoogleTokenInfoResponse } from '../../types/common.js';

// Verified user interface (extends BaseUser)
export interface VerifiedUser extends BaseUser {
  provider: Provider;
}

// Token verification options
export interface TokenVerificationOptions {
  required?: boolean; // Default: true
  providers?: Provider[]; // Default: ['github', 'google']
  cacheTimeout?: number; // Default: 300 seconds (5 minutes)
  requestTimeout?: number; // Default: 5000ms
  retryAttempts?: number; // Default: 2
}

// Cache entry interface (internal to token-cache implementation)
export interface CacheEntry {
  user: VerifiedUser;
  timestamp: number;
  expiresAt: number;
}

// Provider pattern interface
export interface ProviderPattern {
  name: Provider;
  pattern: RegExp;
  priority: number;
}

// HTTP client configuration
export interface HTTPClientConfig {
  timeout: number;
  retries: number;
  retryDelay: number;
}