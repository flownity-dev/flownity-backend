# Logging Utility

This directory contains the enhanced logging utility for the Flownity backend application.

## Features

- **Structured Logging**: JSON-structured logs in production, human-readable in development
- **Categorized Logging**: Different log categories (AUTH, DATABASE, SESSION, OAUTH, SERVER, ERROR)
- **Request Context**: Automatic request and user context inclusion
- **Error Stack Traces**: Full error details with stack traces
- **Development-Friendly**: Colored, formatted output for easy debugging

## Usage

### Basic Logging

```typescript
import { logger, LogCategory } from '../utils/index.js';

// Info logging
logger.info(LogCategory.SERVER, 'Server started', { port: 3000 });

// Error logging with stack trace
logger.error(LogCategory.ERROR, 'Database connection failed', error, { 
  context: 'startup' 
});
```

### Authentication Logging

```typescript
// Authentication events
logger.auth('User login successful', {
  action: 'login',
  success: true,
  userId: user.id,
  githubId: user.githubId,
  username: user.username
});
```

### Database Logging

```typescript
// Database operations
logger.database('User query executed', {
  operation: 'findByGitHubId',
  table: 'users',
  duration: 45,
  rowsAffected: 1
});
```

### Request-Scoped Logging

```typescript
// In Express middleware/routes
const requestLogger = logger.withRequest(req);
requestLogger.auth('Access granted to protected resource', {
  action: 'access_granted',
  resource: req.originalUrl
});
```

## Log Categories

- `AUTH`: Authentication and authorization events
- `DATABASE`: Database operations and queries
- `SESSION`: Session management events
- `OAUTH`: OAuth flow events
- `SERVER`: Server lifecycle events
- `ERROR`: Error conditions and exceptions

## Development vs Production

- **Development**: Colored console output with detailed formatting
- **Production**: JSON-structured logs suitable for log aggregation systems

## Integration

The logging utility is integrated throughout the application:

- Authentication middleware logs access attempts
- Database connection logs all queries and operations
- OAuth flow logs all steps and errors
- Session management logs session lifecycle
- Error handling logs all errors with full context