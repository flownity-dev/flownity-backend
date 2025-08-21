/**
 * Configuration management for token verification
 */

import { ConfigurationError } from './errors.js';

/**
 * Configuration interface for token verification
 */
export interface TokenVerificationConfig {
  cacheTimeout: number;
  requestTimeout: number;
  retryAttempts: number;
  maxCacheSize: number;
  enableDetailedLogging: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: TokenVerificationConfig = {
  cacheTimeout: 300, // 5 minutes
  requestTimeout: 5000, // 5 seconds
  retryAttempts: 2,
  maxCacheSize: 1000,
  enableDetailedLogging: false
};

/**
 * Load configuration from environment variables with validation
 */
export function loadTokenVerificationConfig(): TokenVerificationConfig {
  const config: TokenVerificationConfig = {
    cacheTimeout: getEnvNumber('TOKEN_CACHE_TIMEOUT', DEFAULT_CONFIG.cacheTimeout),
    requestTimeout: getEnvNumber('TOKEN_REQUEST_TIMEOUT', DEFAULT_CONFIG.requestTimeout),
    retryAttempts: getEnvNumber('TOKEN_RETRY_ATTEMPTS', DEFAULT_CONFIG.retryAttempts),
    maxCacheSize: getEnvNumber('TOKEN_MAX_CACHE_SIZE', DEFAULT_CONFIG.maxCacheSize),
    enableDetailedLogging: getEnvBoolean('TOKEN_ENABLE_DETAILED_LOGGING', DEFAULT_CONFIG.enableDetailedLogging)
  };

  // Validate configuration values
  validateConfig(config);

  return config;
}

/**
 * Get environment variable as number with default value
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new ConfigurationError(`Environment variable ${key} must be a valid number, got: ${value}`);
  }

  return parsed;
}

/**
 * Get environment variable as boolean with default value
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) {
    return defaultValue;
  }

  const lowerValue = value.toLowerCase();
  if (lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes') {
    return true;
  }
  if (lowerValue === 'false' || lowerValue === '0' || lowerValue === 'no') {
    return false;
  }

  throw new ConfigurationError(`Environment variable ${key} must be a boolean value (true/false), got: ${value}`);
}

/**
 * Validate configuration values
 */
function validateConfig(config: TokenVerificationConfig): void {
  if (config.cacheTimeout < 0) {
    throw new ConfigurationError('Cache timeout must be non-negative');
  }

  if (config.requestTimeout <= 0) {
    throw new ConfigurationError('Request timeout must be positive');
  }

  if (config.retryAttempts < 0) {
    throw new ConfigurationError('Retry attempts must be non-negative');
  }

  if (config.maxCacheSize <= 0) {
    throw new ConfigurationError('Max cache size must be positive');
  }

  // Warn about potentially problematic values
  if (config.cacheTimeout > 3600) {
    console.warn('Warning: Cache timeout is longer than 1 hour, which may pose security risks');
  }

  if (config.requestTimeout > 30000) {
    console.warn('Warning: Request timeout is longer than 30 seconds, which may cause poor user experience');
  }

  if (config.retryAttempts > 5) {
    console.warn('Warning: More than 5 retry attempts may cause excessive delays');
  }

  if (config.maxCacheSize > 10000) {
    console.warn('Warning: Large cache size may consume significant memory');
  }
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): TokenVerificationConfig {
  return { ...DEFAULT_CONFIG };
}

/**
 * Merge user configuration with defaults
 */
export function mergeConfig(userConfig: Partial<TokenVerificationConfig>): TokenVerificationConfig {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig
  };

  validateConfig(config);
  return config;
}