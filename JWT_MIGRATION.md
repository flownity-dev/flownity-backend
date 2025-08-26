# JWT Migration Guide

This document outlines the migration from session-based authentication to JWT-based authentication in the Flownity Backend.

## What Changed

### Before (Session-based)
- OAuth callbacks redirected users to frontend with session cookies
- Authentication state stored server-side in sessions
- Required session middleware and cookie management
- Worked only with same-domain frontend

### After (JWT-based)
- OAuth callbacks return JSON responses with JWT tokens
- Authentication state encoded in JWT tokens (stateless)
- No server-side session storage required
- Works with cross-domain frontends (API-first approach)

## New Environment Variables

Add these to your `.env` file:

```env
# JWT Configuration (required)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Remove these (no longer needed)
# SESSION_SECRET=... (removed)
```

## API Changes

### OAuth Flow

#### GitHub Authentication
1. **Start OAuth**: `GET /auth/github`
2. **Callback**: `GET /auth/github/callback`
   - **Before**: Redirected to frontend with session
   - **After**: Returns JSON with JWT token

```json
{
  "success": true,
  "message": "Authentication successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "displayName": "John Doe",
    "email": "john@example.com",
    "provider": "github",
    "providerId": "12345"
  }
}
```

#### Google Authentication
1. **Start OAuth**: `GET /auth/google`
2. **Callback**: `GET /auth/google/callback`
   - Same JSON response format as GitHub

### New API Endpoints

#### Get User Profile
```http
GET /api/auth/profile
Authorization: Bearer <jwt-token>
```

Response:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "johndoe",
    "displayName": "John Doe",
    "email": "john@example.com",
    "provider": "github",
    "providerId": "12345"
  }
}
```

#### Verify Token
```http
GET /api/auth/verify
Authorization: Bearer <jwt-token>
```

Response:
```json
{
  "success": true,
  "message": "Token is valid",
  "valid": true,
  "user": {
    "id": 1,
    "username": "johndoe",
    "displayName": "John Doe",
    "provider": "github"
  }
}
```

#### Refresh Token
```http
POST /auth/refresh
Authorization: Bearer <jwt-token>
```

Response:
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Logout
```http
POST /auth/logout
```

Response:
```json
{
  "success": true,
  "message": "Logout successful. Please discard your authentication token."
}
```

## Frontend Integration

### Before (Session-based)
```javascript
// Check authentication
fetch('/api/profile', { credentials: 'include' })

// Logout
fetch('/auth/logout', { method: 'POST', credentials: 'include' })
```

### After (JWT-based)
```javascript
// Store token after OAuth
localStorage.setItem('authToken', response.token);

// Check authentication
fetch('/api/auth/profile', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  }
})

// Logout (client-side)
localStorage.removeItem('authToken');
fetch('/auth/logout', { method: 'POST' });
```

## Security Considerations

### JWT Token Security
- Store tokens securely (localStorage, sessionStorage, or secure cookies)
- Tokens are stateless - server cannot revoke them before expiration
- Use HTTPS in production to prevent token interception
- Consider implementing token blacklisting for enhanced security

### Token Expiration
- Default expiration: 24 hours (configurable via `JWT_EXPIRES_IN`)
- Use refresh endpoint to get new tokens before expiration
- Implement automatic token refresh in your frontend

## Migration Steps

1. **Update Environment Variables**
   - Add `JWT_SECRET` and `JWT_EXPIRES_IN`
   - Remove `SESSION_SECRET`

2. **Install Dependencies**
   ```bash
   npm install jsonwebtoken @types/jsonwebtoken
   npm uninstall express-session @types/express-session
   ```

3. **Update Frontend**
   - Modify OAuth flow to handle JSON responses
   - Implement JWT token storage and management
   - Update API calls to include Authorization header
   - Remove session-based authentication code

4. **Test Authentication Flow**
   - Test OAuth providers (GitHub/Google)
   - Verify JWT token generation and validation
   - Test protected API endpoints
   - Verify token refresh functionality

## Removed Features

- Session middleware and configuration
- Session-based user serialization/deserialization
- Cookie-based authentication
- Server-side session storage
- Session regeneration and destruction utilities

## Backward Compatibility

This migration is **not backward compatible**. Existing sessions will be invalid after the migration. Users will need to re-authenticate to receive JWT tokens.

## Troubleshooting

### Common Issues

1. **"JWT_SECRET is required"**
   - Add `JWT_SECRET` to your `.env` file

2. **"Invalid token format"**
   - Ensure Authorization header format: `Bearer <token>`
   - Check token is not expired or malformed

3. **CORS issues with cross-domain requests**
   - Configure CORS middleware to allow Authorization header
   - Ensure preflight requests are handled properly

### Debug Endpoints

- `GET /` - Shows API information and available providers
- Add `Accept: application/json` header for JSON responses