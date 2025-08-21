/**
 * Configuration validation script
 * This script validates that the configuration system is working correctly
 */

import { loadTokenVerificationConfig, getDefaultConfig, mergeConfig } from './config.js';
import { ConfigurationError } from './errors.js';

/**
 * Test configuration loading and validation
 */
function testConfiguration(): void {
  console.log('Testing token verification configuration...\n');

  try {
    // Test 1: Load default configuration
    console.log('1. Testing default configuration loading:');
    const defaultConfig = getDefaultConfig();
    console.log('   Default config:', defaultConfig);
    console.log('   ✓ Default configuration loaded successfully\n');

    // Test 2: Load configuration from environment
    console.log('2. Testing environment configuration loading:');
    const envConfig = loadTokenVerificationConfig();
    console.log('   Environment config:', envConfig);
    console.log('   ✓ Environment configuration loaded successfully\n');

    // Test 3: Test configuration merging
    console.log('3. Testing configuration merging:');
    const customConfig = mergeConfig({
      cacheTimeout: 600,
      requestTimeout: 3000
    });
    console.log('   Merged config:', customConfig);
    console.log('   ✓ Configuration merging works correctly\n');

    // Test 4: Test validation with valid values
    console.log('4. Testing validation with valid values:');
    const validConfig = mergeConfig({
      cacheTimeout: 300,
      requestTimeout: 5000,
      retryAttempts: 2,
      maxCacheSize: 1000,
      enableDetailedLogging: true
    });
    console.log('   Valid config:', validConfig);
    console.log('   ✓ Valid configuration accepted\n');

    // Test 5: Test validation with invalid values
    console.log('5. Testing validation with invalid values:');
    
    try {
      mergeConfig({ cacheTimeout: -1 });
      console.log('   ✗ Should have thrown error for negative cache timeout');
    } catch (error) {
      if (error instanceof ConfigurationError) {
        console.log('   ✓ Correctly rejected negative cache timeout:', error.message);
      } else {
        console.log('   ✗ Unexpected error type:', error);
      }
    }

    try {
      mergeConfig({ requestTimeout: 0 });
      console.log('   ✗ Should have thrown error for zero request timeout');
    } catch (error) {
      if (error instanceof ConfigurationError) {
        console.log('   ✓ Correctly rejected zero request timeout:', error.message);
      } else {
        console.log('   ✗ Unexpected error type:', error);
      }
    }

    try {
      mergeConfig({ retryAttempts: -1 });
      console.log('   ✗ Should have thrown error for negative retry attempts');
    } catch (error) {
      if (error instanceof ConfigurationError) {
        console.log('   ✓ Correctly rejected negative retry attempts:', error.message);
      } else {
        console.log('   ✗ Unexpected error type:', error);
      }
    }

    try {
      mergeConfig({ maxCacheSize: 0 });
      console.log('   ✗ Should have thrown error for zero max cache size');
    } catch (error) {
      if (error instanceof ConfigurationError) {
        console.log('   ✓ Correctly rejected zero max cache size:', error.message);
      } else {
        console.log('   ✗ Unexpected error type:', error);
      }
    }

    console.log('\n✓ All configuration tests passed!');

  } catch (error) {
    console.error('✗ Configuration test failed:', error);
    process.exit(1);
  }
}

/**
 * Test environment variable parsing
 */
function testEnvironmentVariables(): void {
  console.log('\nTesting environment variable parsing...\n');

  // Save original environment
  const originalEnv = { ...process.env };

  try {
    // Test numeric parsing
    process.env.TOKEN_CACHE_TIMEOUT = '600';
    process.env.TOKEN_REQUEST_TIMEOUT = '3000';
    process.env.TOKEN_RETRY_ATTEMPTS = '3';
    process.env.TOKEN_MAX_CACHE_SIZE = '2000';

    const config = loadTokenVerificationConfig();
    
    if (config.cacheTimeout === 600) {
      console.log('✓ Numeric environment variable parsing works');
    } else {
      console.log('✗ Numeric parsing failed:', config.cacheTimeout);
    }

    // Test boolean parsing
    process.env.TOKEN_ENABLE_DETAILED_LOGGING = 'true';
    const configTrue = loadTokenVerificationConfig();
    
    if (configTrue.enableDetailedLogging === true) {
      console.log('✓ Boolean true parsing works');
    } else {
      console.log('✗ Boolean true parsing failed:', configTrue.enableDetailedLogging);
    }

    process.env.TOKEN_ENABLE_DETAILED_LOGGING = 'false';
    const configFalse = loadTokenVerificationConfig();
    
    if (configFalse.enableDetailedLogging === false) {
      console.log('✓ Boolean false parsing works');
    } else {
      console.log('✗ Boolean false parsing failed:', configFalse.enableDetailedLogging);
    }

    // Test invalid values
    try {
      process.env.TOKEN_CACHE_TIMEOUT = 'invalid';
      loadTokenVerificationConfig();
      console.log('✗ Should have thrown error for invalid numeric value');
    } catch (error) {
      if (error instanceof ConfigurationError) {
        console.log('✓ Correctly rejected invalid numeric value');
      } else {
        console.log('✗ Unexpected error type:', error);
      }
    }

    try {
      process.env.TOKEN_CACHE_TIMEOUT = '300';
      process.env.TOKEN_ENABLE_DETAILED_LOGGING = 'invalid';
      loadTokenVerificationConfig();
      console.log('✗ Should have thrown error for invalid boolean value');
    } catch (error) {
      if (error instanceof ConfigurationError) {
        console.log('✓ Correctly rejected invalid boolean value');
      } else {
        console.log('✗ Unexpected error type:', error);
      }
    }

    console.log('\n✓ All environment variable tests passed!');

  } finally {
    // Restore original environment
    process.env = originalEnv;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testConfiguration();
  testEnvironmentVariables();
}

export { testConfiguration, testEnvironmentVariables };