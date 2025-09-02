# Flownity Backend API Documentation

## Overview

Flownity Backend is a JWT-based OAuth authentication API that supports GitHub and Google OAuth 2.0 providers. After successful OAuth authentication, the API returns JWT tokens for stateless authentication. The API also provides project management features with task tracking and user collaboration.

## Base URL

```
http://localhost:3000  # Development
https://your-domain.com  # Production
```

## Authentication Flow

### 1. OAuth Authentication

#### GitHub OAuth
```http
GET /auth/github
```
Redirects to GitHub OAuth authorization page.

#### Google OAuth
```http
GET /auth/google
```
Redirects to Google OAuth authorization page.

### 2. OAuth Callbacks

#### GitHub Callback
```http
GET /auth/github/callback
```

**Success Response:**
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

#### Google Callback
```http
GET /auth/google/callback
```

**Success Response:** Same format as GitHub callback.

**Error Response:**
```json
{
  "success": false,
  "error": "oauth_failed",
  "message": "OAuth authentication failed"
}
```

## API Endpoints

### Authentication Endpoints

#### Refresh Token
```http
POST /auth/refresh
Authorization: Bearer <jwt-token>
```

**Response:**
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

**Response:**
```json
{
  "success": true,
  "message": "Logout successful. Please discard your authentication token."
}
```

### Protected Endpoints

All protected endpoints require the `Authorization` header:
```
Authorization: Bearer <jwt-token>
```

#### Get User Profile
```http
GET /api/auth/profile
Authorization: Bearer <jwt-token>
```

**Response:**
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

**Response:**
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

#### Legacy Profile Endpoint
```http
GET /profile
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "providerId": "12345",
      "provider": "github",
      "username": "johndoe",
      "displayName": "John Doe",
      "email": "john@example.com"
    },
    "authMethod": "jwt"
  }
}
```

### Project Management Endpoints

#### Get Project Flow
```http
GET /api/v1/projects/project-flow/:project_id
Authorization: Bearer <jwt-token>
```

Returns consolidated project data with users and their tasks grouped by task groups. Only accessible to project members (project owner or users assigned to tasks).

**Parameters:**
- `project_id` (path parameter): The ID of the project

**Response:**
```json
{
  "success": true,
  "data": {
    "project_id": 1,
    "project_title": "Website Redesign",
    "users": [
      {
        "id": "1",
        "task_owner": "Paul",
        "approvers": ["4", "4"],
        "taskGroups": [
          {
            "group_name": "Frontend",
            "tasks": [
              {
                "id": "1",
                "task_title": "Paul Task 1",
                "status": "completed"
              },
              {
                "id": "2",
                "task_title": "Paul Task 2",
                "status": "in-progress"
              }
            ]
          },
          {
            "group_name": "Backend",
            "tasks": [
              {
                "id": "3",
                "task_title": "Paul Task 3",
                "status": "pending"
              },
              {
                "id": "4",
                "task_title": "Paul Task 4",
                "status": "completed"
              }
            ]
          }
        ]
      },
      {
        "id": "2",
        "task_owner": "Nicho",
        "approvers": ["3", "5"],
        "taskGroups": [
          {
            "group_name": "API",
            "tasks": [
              {
                "id": "5",
                "task_title": "Nicho Task 1",
                "status": "completed"
              },
              {
                "id": "6",
                "task_title": "Nicho Task 2",
                "status": "completed"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

**Error Responses:**

Project not found:
```json
{
  "success": false,
  "error": "Project not found",
  "message": "Project with the specified ID does not exist"
}
```

Access denied:
```json
{
  "success": false,
  "error": "Access denied",
  "message": "You do not have permission to view this project flow"
}
```

### Development Endpoints

Available only in development mode (`NODE_ENV=development`):

#### Token Information
```http
GET /token-info
Authorization: Bearer <jwt-token>  # Optional
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tokenValid": true,
    "userId": 1,
    "provider": "github",
    "username": "johndoe",
    "issuedAt": "2024-01-01T12:00:00.000Z",
    "expiresAt": "2024-01-02T12:00:00.000Z"
  }
}
```

#### Error Testing
```http
GET /test-errors/database    # Test database error
GET /test-errors/oauth       # Test OAuth error
GET /test-errors/jwt         # Test JWT error
GET /test-errors/generic     # Test generic error
```

## Error Responses

### Authentication Errors

#### Missing Token
```json
{
  "success": false,
  "error": "JWT_TOKEN_MISSING",
  "message": "Authentication token required. Please provide a valid Bearer token in the Authorization header.",
  "statusCode": 401
}
```

#### Invalid Token
```json
{
  "success": false,
  "error": "JWT_INVALID",
  "message": "Invalid authentication token format",
  "statusCode": 401
}
```

#### Expired Token
```json
{
  "success": false,
  "error": "JWT_EXPIRED",
  "message": "Authentication token has expired",
  "statusCode": 401
}
```

### OAuth Errors

#### OAuth Failed
```json
{
  "success": false,
  "error": "oauth_failed",
  "message": "GitHub authentication failed: Invalid credentials"
}
```

#### OAuth Denied
```json
{
  "success": false,
  "error": "oauth_denied",
  "message": "GitHub authentication was cancelled or denied"
}
```

## JWT Token Structure

### Payload
```json
{
  "userId": 1,
  "providerId": "12345",
  "provider": "github",
  "username": "johndoe",
  "displayName": "John Doe",
  "email": "john@example.com",
  "iat": 1640995200,
  "exp": 1641081600,
  "iss": "flownity-backend",
  "aud": "flownity-frontend"
}
```

### Token Expiration
- Default: 24 hours
- Configurable via `JWT_EXPIRES_IN` environment variable
- Use `/auth/refresh` endpoint to get a new token

## Environment Variables

### Required
```env
JWT_SECRET=your-super-secret-jwt-key
DATABASE_HOST=localhost
DATABASE_NAME=flownity
DATABASE_USER=your-db-user
DATABASE_PASSWORD=your-db-password
```

### Optional
```env
PORT=3000
NODE_ENV=development
JWT_EXPIRES_IN=24h

# GitHub OAuth (optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
CALLBACK_URL=http://localhost:3000/auth/github/callback

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

## Frontend Integration Examples

### JavaScript/TypeScript

#### OAuth Flow
```javascript
// 1. Redirect to OAuth provider
window.location.href = '/auth/github';

// 2. Handle callback (if using popup or iframe)
// The callback will return JSON with token

// 3. Store token
localStorage.setItem('authToken', response.token);
```

#### API Requests
```javascript
// Get user profile
const response = await fetch('/api/auth/profile', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

#### Token Refresh
```javascript
async function refreshToken() {
  const response = await fetch('/auth/refresh', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    localStorage.setItem('authToken', data.token);
    return data.token;
  }
  
  throw new Error('Token refresh failed');
}
```

### React Example

```jsx
import { useState, useEffect } from 'react';

function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      fetch('/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setUser(data.user);
        }
      })
      .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (provider) => {
    window.location.href = `/auth/${provider}`;
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  return { user, loading, login, logout };
}
```

## Security Considerations

1. **HTTPS**: Always use HTTPS in production
2. **Token Storage**: Store tokens securely (consider httpOnly cookies for web apps)
3. **Token Expiration**: Implement automatic token refresh
4. **CORS**: Configure CORS properly for cross-domain requests
5. **Rate Limiting**: Implement rate limiting for authentication endpoints
6. **Input Validation**: Validate all inputs on the server side

## Rate Limits

Currently no rate limiting is implemented. Consider adding rate limiting for:
- OAuth endpoints: 10 requests per minute per IP
- Token refresh: 5 requests per minute per user
- Profile endpoints: 100 requests per minute per user

## CORS Configuration

For cross-domain requests, ensure your CORS configuration allows:
- `Authorization` header
- `Content-Type` header
- Appropriate origins for your frontend domains