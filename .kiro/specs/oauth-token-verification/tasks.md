# Implementation Plan

- [x] 1. Set up core interfaces and types
  - Create TypeScript interfaces for VerifiedUser, TokenVerificationOptions, and provider responses
  - Define Express Request type extensions for user context
  - Create custom error classes for token verification failures
  - _Requirements: 1.1, 1.4, 4.1, 4.2_

- [x] 2. Implement token extraction and validation utilities
  - Create function to extract Bearer tokens from Authorization headers
  - Implement header format validation (Bearer {token} pattern)
  - Add token format validation (non-empty, proper structure)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Create provider identification system
  - Implement ProviderIdentifier class with token pattern matching
  - Add GitHub token pattern recognition (gh[ps]_ prefix)
  - Add Google token pattern recognition (ya29. prefix)
  - Create fallback logic for unknown token formats
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4. Implement caching layer
  - Create TokenCache class with memory-based storage
  - Implement cache get/set operations with TTL support
  - Add automatic cleanup of expired cache entries
  - Create cache key generation using token hashing
  - _Requirements: 5.1, 5.2_

- [x] 5. Create GitHub token verifier
  - Implement GitHubTokenVerifier class with API integration
  - Add HTTP client for GitHub API calls (https://api.github.com/user)
  - Implement user data transformation from GitHub response to VerifiedUser
  - Add error handling for GitHub API responses (401, 403, 404, 500)
  - _Requirements: 3.1, 3.3, 3.4, 4.3, 4.5_

- [x] 6. Create Google token verifier
  - Implement GoogleTokenVerifier class with tokeninfo API integration
  - Add HTTP client for Google tokeninfo endpoint
  - Implement user data transformation from Google response to VerifiedUser
  - Add error handling for Google API responses and token validation
  - _Requirements: 3.2, 3.3, 3.4, 4.3, 4.5_

- [x] 7. Implement HTTP client with retry logic
  - Create HTTPClient class with timeout and retry configuration
  - Implement exponential backoff for failed requests
  - Add request timeout handling (5 second default)
  - Implement retry logic for network failures (2 attempts default)
  - _Requirements: 5.3, 5.4, 5.5_

- [x] 8. Create main token verification middleware
  - Implement verifyToken middleware function with configuration options
  - Integrate token extraction, provider identification, and verification flow
  - Add cache checking before provider API calls
  - Implement user context attachment to request object
  - Add support for required vs optional token verification modes
  - _Requirements: 1.1, 4.1, 4.2, 4.4, 6.1, 6.2, 6.3_

- [x] 9. Add provider restriction functionality
  - Implement provider filtering in middleware configuration
  - Add validation for allowed providers list
  - Create appropriate error responses for restricted providers
  - _Requirements: 6.4, 6.5_

- [x] 10. Implement comprehensive error handling
  - Create TokenVerificationError and ProviderAPIError classes
  - Add error mapping from provider API responses to appropriate HTTP status codes
  - Implement error logging with appropriate detail levels
  - Add user-friendly error messages without exposing sensitive information
  - _Requirements: 3.4, 3.5, 4.5, 5.4, 5.5_

- [x] 11. Add configuration management
  - Create configuration interface for environment variables
  - Implement default values for cache timeout, request timeout, and retry attempts
  - Add configuration validation for required settings
  - Create configuration loading utility with environment variable support
  - _Requirements: 5.1, 5.3, 5.5_

- [x] 12. Add middleware to existing auth system
  - Export verifyToken middleware from auth module
  - Update auth/index.ts to include token verification exports
  - Create example usage documentation for different middleware configurations
  - Add middleware to existing route protection patterns
  - _Requirements: 4.4, 6.1, 6.2, 6.3_