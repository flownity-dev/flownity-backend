# OAuth Token Verification Middleware

This middleware provides OAuth token verification for Express.js applications, supporting GitHub and Google OAuth tokens.

## Features

- **Multi-Provider Support**: Automatically identifies and verifies GitHub and Google OAuth tokens
- **Flexible Configuration**: Required/optional verification, provider restrictions, custom timeouts
- **Caching**: Built-in memory cache with TTL to reduce API calls
- **Error Handling**: Comprehensive error handling with appropriate HTTP status codes
- **TypeScript Support**: Full type safety with TypeScript interfaces

## Basic Usage

```typescript
import { verifyToken, requireToken, optionalToken } from '../auth/index.js';

// Required token verification (default)
app.get('/api/protected', verifyToken(), (req, res) => {
  // req.tokenUser contains verified user information
  res.json({ user: req.tokenUser });
});

// Optional token verification
app.get('/api/optional', optionalToken(), (req, res) => {
  if (req.tokenUser) {
    res.json({ message: 'Authenticated', user: req.tokenUser });
  } else {
    res.json({ message: 'Anonymous access' });
  }
});
```

## Provider-Specific Verification

```typescript
import { requireGitHubToken, requireGoogleToken } from '../auth/index.js';

// GitHub tokens only
app.get('/api/github', requireGitHubToken(), (req, res) => {
  res.json({ user: req.tokenUser });
});

// Google tokens only
app.get('/api/google', requireGoogleToken(), (req, res) => {
  res.json({ user: req.tokenUser });
});
```

## Configuration Management

### Environment Variables

Configure global defaults using environment variables:

```bash
# Cache timeout in seconds (default: 300)
TOKEN_CACHE_TIMEOUT=600

# Request timeout in milliseconds (default: 5000)
TOKEN_REQUEST_TIMEOUT=3000

# Number of retry attempts (default: 2)
TOKEN_RETRY_ATTEMPTS=3

# Maximum cache size (default: 1000)
TOKEN_MAX_CACHE_SIZE=2000

# Enable detailed logging (default: false)
TOKEN_ENABLE_DETAILED_LOGGING=true
```

### Configuration Loading

```typescript
import { loadTokenVerificationConfig, getDefaultConfig, mergeConfig } from './config.js';

// Load configuration from environment variables
const config = loadTokenVerificationConfig();

// Get default configuration values
const defaults = getDefaultConfig();

// Merge custom configuration with defaults
const customConfig = mergeConfig({
  cacheTimeout: 600,
  requestTimeout: 3000
});
```

### Configuration Validation

All configuration values are validated:

- `cacheTimeout`: Must be non-negative (0 allows unlimited caching)
- `requestTimeout`: Must be positive
- `retryAttempts`: Must be non-negative
- `maxCacheSize`: Must be positive
- `enableDetailedLogging`: Must be a boolean value

Invalid configurations throw `ConfigurationError` with descriptive messages.

### Custom Configuration

Override global defaults for specific middleware instances:

```typescript
app.get('/api/custom', verifyToken({
  required: true,                    // Require token (default: true)
  providers: ['github'],             // Allowed providers (default: ['github', 'google'])
  cacheTimeout: 600,                 // Cache TTL in seconds (uses global default)
  requestTimeout: 3000,              // API request timeout in ms (uses global default)
  retryAttempts: 1                   // Retry attempts (uses global default)
}), (req, res) => {
  res.json({ user: req.tokenUser });
});
```

## Provider Restrictions

You can restrict which OAuth providers are allowed for specific routes:

```typescript
// Only allow GitHub tokens
app.get('/api/github-only', verifyToken({ providers: ['github'] }), handler);

// Only allow Google tokens  
app.get('/api/google-only', verifyToken({ providers: ['google'] }), handler);

// Allow both providers (default behavior)
app.get('/api/both', verifyToken({ providers: ['github', 'google'] }), handler);
```

### Provider Validation

The middleware validates the providers configuration at startup:

- **Valid providers**: Only `'github'` and `'google'` are supported
- **Non-empty array**: At least one provider must be specified
- **No duplicates**: Each provider can only be listed once
- **Array format**: Providers must be provided as an array

Invalid configurations will throw a `ConfigurationError`:

```typescript
// These will throw ConfigurationError at startup:
verifyToken({ providers: [] });                    // Empty array
verifyToken({ providers: ['invalid'] });           // Invalid provider
verifyToken({ providers: ['github', 'github'] });  // Duplicates
verifyToken({ providers: 'github' });              // Not an array
```

## Helper Functions

```typescript
import { getAuthenticatedUser, isAuthenticated } from '../auth/index.js';

app.get('/api/mixed', optionalToken(), (req, res) => {
  const user = getAuthenticatedUser(req);  // Gets user from token or session
  const authenticated = isAuthenticated(req);  // Checks both token and session auth
  
  res.json({ user, authenticated });
});
```

## Token Formats

### GitHub Tokens
- Personal Access Tokens: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
- Server-to-Server Tokens: `ghs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Google Tokens
- OAuth 2.0 Access Tokens: `ya29.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Request Headers

Tokens must be provided in the Authorization header using Bearer format:

```
Authorization: Bearer ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## User Object Structure

The `req.tokenUser` object contains:

```typescript
interface VerifiedUser {
  provider: 'github' | 'google';
  id: string;
  username: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}
```

## Error Handling

The middleware throws specific error types that can be handled by error middleware:

```typescript
app.use((error, req, res, next) => {
  if (error.name === 'TokenVerificationError') {
    return res.status(error.statusCode || 401).json({
      error: error.message,
      provider: error.provider
    });
  }
  
  if (error.name === 'ProviderAPIError') {
    return res.status(503).json({
      error: 'Provider API unavailable',
      provider: error.provider
    });
  }
  
  // Handle other errors...
});
```

## Error Types

- `TokenExtractionError` (401): Missing or invalid Authorization header
- `InvalidTokenFormatError` (400): Malformed token format
- `ProviderIdentificationError` (401): Unable to identify token provider
- `RestrictedProviderError` (403): Provider not allowed by configuration
- `TokenVerificationError` (401): Invalid or expired token
- `ProviderAPIError` (503): Provider API unavailable
- `RequestTimeoutError` (408): Request timeout
- `RateLimitError` (429): Rate limit exceeded
- `ConfigurationError` (500): Invalid middleware configuration

## Caching

The middleware includes built-in caching to reduce API calls:

- Default cache timeout: 5 minutes
- Memory-based storage (cleared on restart)
- Automatic cleanup of expired entries
- Secure cache keys using SHA-256 hashing

## Comprehensive Error Handling

### Error Factory

The `TokenVerificationErrorFactory` provides convenient methods for creating common errors:

```typescript
import { TokenVerificationErrorFactory } from './errors.js';

// Missing authorization header
const error = TokenVerificationErrorFactory.missingAuthHeader();

// Invalid token format
const error = TokenVerificationErrorFactory.invalidAuthHeaderFormat();

// Create error from HTTP status code
const error = TokenVerificationErrorFactory.fromHttpStatus('github', 401);
```

### Advanced Error Logging

Specialized logging with different severity levels and context:

```typescript
import { 
  logTokenVerificationError, 
  logTokenVerificationSuccess,
  logProviderAPICall,
  logCacheOperation 
} from './error-logger.js';

// Log error with context (automatically sanitizes sensitive data)
logTokenVerificationError(error, req, { provider: 'github' });

// Log successful verification
logTokenVerificationSuccess('github', req);

// Log provider API calls for monitoring
logProviderAPICall('github', '/user', 200, 150); // provider, endpoint, status, duration

// Log cache operations
logCacheOperation('hit', 'github'); // operation, provider
```

### Error Mapping

Provider API responses are automatically mapped to appropriate error types:

- **401/403**: Invalid or insufficient permissions → `TokenVerificationError`
- **404**: Invalid token (GitHub specific) → `TokenVerificationError`
- **408**: Request timeout → `RequestTimeoutError`
- **429**: Rate limiting → `RateLimitError`
- **5xx**: Server errors → `ProviderAPIError`

### Configuration Integration

The error handling system automatically uses the global configuration:

```typescript
import { loadTokenVerificationConfig } from './config.js';

const config = loadTokenVerificationConfig();
// Configuration is automatically validated and used by all components
```

### Security Features

- **Data Sanitization**: Sensitive information (tokens, secrets) is automatically redacted from logs
- **User-Friendly Messages**: Error messages are safe for client consumption without exposing system internals
- **Severity-Based Logging**: Different log levels based on error type (client errors vs system errors)
- **Request Context**: Includes request information without sensitive headers
- **Memory Safety**: Cache size limits prevent memory exhaustion

## Integration with Existing Auth System

The token verification middleware can be combined with existing session-based authentication for flexible authentication patterns:

### Hybrid Authentication Routes

```typescript
import { 
  verifyToken, 
  optionalToken, 
  ensureAuthenticatedFlexible,
  addUserToLocalsFlexible 
} from '../auth/index.js';

// Route that accepts both session and token authentication
app.get('/api/profile', 
  optionalToken(), // Try to authenticate with token
  ensureAuthenticatedFlexible, // Ensure user is authenticated via either method
  (req, res) => {
    // User is available from either req.user (session) or req.tokenUser (token)
    const user = req.tokenUser || req.user;
    res.json({ user, authMethod: req.tokenUser ? 'token' : 'session' });
  }
);

// Web route with flexible authentication for templates
app.get('/dashboard', 
  optionalToken(), // Try token authentication first
  addUserToLocalsFlexible, // Add user to template locals from either auth method
  (req, res) => {
    // res.locals.user contains user from either authentication method
    // res.locals.authMethod indicates which method was used
    res.render('dashboard');
  }
);
```

### API-First Routes with Token Authentication

```typescript
// Pure API routes that only accept token authentication
app.use('/api/v1', requireToken()); // All routes under /api/v1 require tokens

app.get('/api/v1/user', (req, res) => {
  res.json({ user: req.tokenUser });
});

app.get('/api/v1/repositories', requireGitHubToken(), (req, res) => {
  // Only GitHub tokens allowed for GitHub-specific endpoints
  res.json({ user: req.tokenUser, repositories: [] });
});
```

### Mixed Authentication Patterns

```typescript
// Different authentication requirements for different route groups
const router = express.Router();

// Public routes (no authentication)
router.get('/public', (req, res) => {
  res.json({ message: 'Public endpoint' });
});

// Optional authentication (enhanced experience if authenticated)
router.get('/enhanced', optionalToken(), (req, res) => {
  if (req.tokenUser) {
    res.json({ message: 'Enhanced experience', user: req.tokenUser });
  } else {
    res.json({ message: 'Basic experience' });
  }
});

// Required authentication (any method)
router.get('/protected', 
  optionalToken(), 
  ensureAuthenticatedFlexible, 
  (req, res) => {
    const user = req.tokenUser || req.user;
    res.json({ message: 'Protected content', user });
  }
);

// Token-only authentication
router.get('/api-only', requireToken(), (req, res) => {
  res.json({ message: 'API-only endpoint', user: req.tokenUser });
});

app.use('/mixed', router);
```

### Route-Specific Provider Restrictions

```typescript
// GitHub-specific API endpoints
app.use('/api/github', requireGitHubToken());
app.get('/api/github/repos', (req, res) => {
  // Only GitHub tokens accepted
  res.json({ user: req.tokenUser, provider: 'github' });
});

// Google-specific API endpoints  
app.use('/api/google', requireGoogleToken());
app.get('/api/google/drive', (req, res) => {
  // Only Google tokens accepted
  res.json({ user: req.tokenUser, provider: 'google' });
});

// Multi-provider with different configurations
app.get('/api/flexible', verifyToken({
  providers: ['github', 'google'],
  cacheTimeout: 600, // 10 minutes for this endpoint
  required: true
}), (req, res) => {
  res.json({ user: req.tokenUser });
});
```

### Error Handling Integration

```typescript
// Enhanced error handling that works with both auth methods
app.use((error, req, res, next) => {
  // Handle token verification errors
  if (error.name === 'TokenVerificationError') {
    return res.status(error.statusCode || 401).json({
      error: error.message,
      provider: error.provider,
      authMethod: 'token'
    });
  }
  
  // Handle session authentication errors
  if (error.name === 'AuthenticationError') {
    return res.status(error.statusCode || 401).json({
      error: error.message,
      authMethod: 'session'
    });
  }
  
  // Handle other errors...
  next(error);
});
```

### Middleware Composition Examples

```typescript
// Compose middleware for different authentication strategies
const requireAnyAuth = [
  optionalToken(), // Try token first
  ensureAuthenticatedFlexible // Ensure some form of authentication
];

const requireTokenAuth = [
  requireToken() // Only accept token authentication
];

const optionalAnyAuth = [
  optionalToken(), // Try token authentication
  addUserToLocalsFlexible // Add user to locals from any auth method
];

// Use composed middleware
app.get('/profile', requireAnyAuth, (req, res) => {
  const user = req.tokenUser || req.user;
  res.json({ user });
});

app.get('/api/data', requireTokenAuth, (req, res) => {
  res.json({ data: [], user: req.tokenUser });
});

app.get('/dashboard', optionalAnyAuth, (req, res) => {
  // res.locals.user and res.locals.isAuthenticated available
  res.render('dashboard');
});
```

## Security Considerations

- Tokens are never logged or stored permanently
- Cache entries are memory-only and cleared on restart
- Provider API calls use HTTPS with certificate validation
- Request timeouts prevent hanging requests
- Sensitive information is not included in error messages
- All error logging automatically sanitizes sensitive data
- Configuration validation prevents insecure settings
- Token authentication takes precedence over session authentication when both are present
- Flexible authentication middleware maintains security while providing convenience