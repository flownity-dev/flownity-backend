# Requirements Document

## Introduction

This feature implements middleware that verifies OAuth tokens on every request by validating them directly with the OAuth providers (GitHub and Google). Unlike session-based authentication, this middleware will extract tokens from request headers, identify the provider, and verify the token's validity with the respective OAuth provider's API. This enables stateless authentication suitable for API clients and mobile applications.

## Requirements

### Requirement 1

**User Story:** As an API client, I want to authenticate using OAuth tokens in request headers, so that I can access protected endpoints without maintaining server-side sessions.

#### Acceptance Criteria

1. WHEN a client sends a request with an Authorization header THEN the system SHALL extract the token from the header
2. WHEN the Authorization header format is "Bearer {token}" THEN the system SHALL parse the token correctly
3. WHEN no Authorization header is present THEN the system SHALL return a 401 Unauthorized response
4. WHEN tnhe Authorizatio header format is invalid THEN the system SHALL return a 400 Bad Request response
5. IF the token is malformed or empty THEN the system SHALL return a 401 Unauthorized response

### Requirement 2

**User Story:** As a system, I want to automatically identify the OAuth provider from the token, so that I can route verification requests to the correct provider API.

#### Acceptance Criteria

1. WHEN receiving a GitHub token THEN the system SHALL identify it as a GitHub token and use GitHub's API for verification
2. WHEN receiving a Google token THEN the system SHALL identify it as a Google token and use Google's API for verification
3. WHEN the token format doesn't match known providers THEN the system SHALL return a 401 Unauthorized response with provider identification error
4. WHEN token provider identification fails THEN the system SHALL log the error and return appropriate response
5. IF multiple provider patterns match THEN the system SHALL attempt verification in priority order (GitHub first, then Google)

### Requirement 3

**User Story:** As a system administrator, I want tokens to be verified with the actual OAuth provider, so that I can ensure only valid, non-revoked tokens are accepted.

#### Acceptance Criteria

1. WHEN verifying a GitHub token THEN the system SHALL call GitHub's user API endpoint to validate the token
2. WHEN verifying a Google token THEN the system SHALL call Google's tokeninfo endpoint to validate the token
3. WHEN the provider API confirms token validity THEN the system SHALL extract user information and continue request processing
4. WHEN the provider API returns an error THEN the system SHALL return a 401 Unauthorized response
5. IF the provider API is unavailable THEN the system SHALL return a 503 Service Unavailable response

### Requirement 4

**User Story:** As a developer, I want user information to be available in request context after token verification, so that I can access authenticated user data in route handlers.

#### Acceptance Criteria

1. WHEN a token is successfully verified THEN the system SHALL attach user information to the request object
2. WHEN user information is attached THEN it SHALL include provider type, user ID, username, and email (if available)
3. WHEN subsequent middleware runs THEN it SHALL have access to the verified user information
4. WHEN route handlers execute THEN they SHALL be able to access req.user with complete user context
5. IF user information extraction fails THEN the system SHALL log the error and return a 401 Unauthorized response

### Requirement 5

**User Story:** As a system administrator, I want proper error handling and caching for token verification, so that the system performs efficiently and handles failures gracefully.

#### Acceptance Criteria

1. WHEN the same token is verified multiple times THEN the system SHALL cache verification results for a short period (5 minutes)
2. WHEN cached verification exists THEN the system SHALL use cached results instead of calling provider APIs
3. WHEN provider API calls fail due to network issues THEN the system SHALL retry up to 2 times with exponential backoff
4. WHEN all retries fail THEN the system SHALL return a 503 Service Unavailable response
5. IF verification takes longer than 5 seconds THEN the system SHALL timeout and return a 408 Request Timeout response

### Requirement 6

**User Story:** As a developer, I want flexible middleware configuration, so that I can apply token verification selectively to different routes and handle different authentication requirements.

#### Acceptance Criteria

1. WHEN configuring middleware THEN the system SHALL allow optional vs required token verification modes
2. WHEN in optional mode and no token is provided THEN the system SHALL continue without user context
3. WHEN in required mode and no token is provided THEN the system SHALL return a 401 Unauthorized response
4. WHEN configuring provider restrictions THEN the system SHALL allow limiting verification to specific providers
5. IF provider restrictions are set and token is from unauthorized provider THEN the system SHALL return a 403 Forbidden response