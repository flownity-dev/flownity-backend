# Error Handling System

This directory contains a comprehensive error handling system for the Flownity backend application.

## Overview

The error handling system provides:
- Custom error classes for different error types
- Centralized error handling middleware
- User-friendly error messages and pages
- Proper HTTP status codes
- Detailed logging for debugging
- Automatic session cleanup for session errors

## Error Classes

### AppError (Base Class)
- Base class for all application errors
- Properties: `statusCode`, `isOperational`, `errorCode`
- Distinguishes between operational and programming errors

### Specific Error Types

1. **OAuthError** - GitHub OAuth authentication failures
2. **DatabaseError** - Database connection and query errors
3. **SessionError** - Session management and validation errors
4. **AuthenticationError** - General authentication failures
5. **ConfigurationError** - Missing or invalid configuration
6. **ValidationError** - Input validation failures

## Error Handling Middleware

### errorHandler
- Global error handling middleware (must be last in chain)
- Handles both JSON API and HTML browser responses
- Provides different error details for development vs production
- Automatically handles session errors with re-authentication

### notFoundHandler
- Handles 404 Not Found errors
- Provides appropriate responses for both API and browser requests

## Error Response Formats

### JSON API Response
```json
{
  "error": "ErrorType",
  "message": "User-friendly error message",
  "statusCode": 500,
  "errorCode": "SPECIFIC_ERROR_CODE",
  "timestamp": "2023-01-01T00:00:00.000Z",
  "path": "/api/endpoint"
}
```

### HTML Browser Response
- User-friendly error pages with styling
- Action buttons (Go Home, Login, Go Back)
- Development mode shows error details
- Consistent branding and design

## Usage Examples

### Throwing Custom Errors
```typescript
import { DatabaseError, ValidationError } from '../errors/index.js';

// Database error
throw new DatabaseError(
  'Failed to connect to database',
  503,
  'DB_CONNECTION_FAILED'
);

// Validation error
throw new ValidationError(
  'Email address is required',
  400,
  'VALIDATION_EMAIL_REQUIRED'
);
```

### Error Handling in Routes
```typescript
app.get('/api/users', async (req, res, next) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    // Error will be handled by global error middleware
    next(error);
  }
});
```

## Session Error Handling

Session errors trigger automatic cleanup:
1. Destroy existing session
2. Clear session cookie
3. Redirect to login with error message
4. For API requests, return JSON with `requiresReauth: true`

## Development Features

### Error Testing Routes (Development Only)
- `/test-errors/database` - Test database error handling
- `/test-errors/oauth` - Test OAuth error handling
- `/test-errors/session` - Test session error handling
- `/test-errors/generic` - Test generic error handling

### Enhanced Logging
- Operational errors logged as warnings
- Programming errors logged as errors with stack traces
- Request context included in logs
- User and session information when available

## Configuration

Error handling behavior can be configured via environment variables:
- `NODE_ENV=development` - Shows detailed error information
- `NODE_ENV=production` - Shows user-friendly messages only

## Best Practices

1. **Use Specific Error Types** - Choose the most appropriate error class
2. **Provide Error Codes** - Include specific error codes for API consumers
3. **User-Friendly Messages** - Write clear, actionable error messages
4. **Log Appropriately** - Use correct log levels for different error types
5. **Handle Async Errors** - Always use `next(error)` in async route handlers
6. **Validate Early** - Catch validation errors before database operations
7. **Clean Up Resources** - Ensure proper cleanup in error scenarios