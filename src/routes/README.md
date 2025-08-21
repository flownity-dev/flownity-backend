# Routes Structure

This document describes the new modular route structure for the Flownity Backend.

## Route Organization

### Web Routes (`/`)
- **File**: `webRoutes.ts`
- **Controller**: `WebController`
- **Purpose**: HTML pages and web interface
- **Routes**:
  - `GET /` - Home page with authentication status

### Authentication Routes (`/auth`)
- **File**: `authRoutes.ts`
- **Controller**: `AuthController`
- **Purpose**: OAuth authentication flows
- **Routes**:
  - `GET /auth/github` - Initiate GitHub OAuth
  - `GET /auth/github/callback` - GitHub OAuth callback
  - `GET /auth/google` - Initiate Google OAuth
  - `GET /auth/google/callback` - Google OAuth callback
  - `POST /auth/logout` - User logout

### API Routes (`/api`)
- **File**: `api/index.ts`
- **Purpose**: RESTful API endpoints for frontend consumption
- **Versioning**: Supports multiple API versions

#### API v1 (`/api/v1`)
- **File**: `api/v1/index.ts`
- **Purpose**: Version 1 of the API

##### User Routes (`/api/v1/users`)
- **File**: `api/v1/userRoutes.ts`
- **Controller**: `UserController`
- **Routes**:
  - `GET /api/v1/users/me` - Get current user profile (protected)
  - `GET /api/v1/users/me/session` - Get session information

### Development Routes (Development Only)
- **File**: `devRoutes.ts`
- **Controller**: `DevController`, `UserController`
- **Purpose**: Testing and debugging in development
- **Routes**:
  - `GET /session-info` - Session debugging information
  - `GET /test-errors/database` - Test database error handling
  - `GET /test-errors/oauth` - Test OAuth error handling
  - `GET /test-errors/session` - Test session error handling
  - `GET /test-errors/generic` - Test generic error handling

### Legacy Routes (Backward Compatibility)
- **File**: `legacyRoutes.ts`
- **Purpose**: Maintain compatibility with existing endpoints
- **Routes**:
  - `GET /profile` - Legacy user profile endpoint (redirects to API)

## Route Structure Benefits

### 1. Separation of Concerns
- **Web routes**: Handle HTML responses for browsers
- **API routes**: Handle JSON responses for frontend applications
- **Auth routes**: Handle OAuth flows and authentication
- **Dev routes**: Handle development and testing utilities

### 2. Versioning Support
- API routes are versioned (`/api/v1/`)
- Easy to add new versions without breaking existing clients
- Clear migration path for API changes

### 3. Modular Organization
- Each route file has a single responsibility
- Controllers are separated from route definitions
- Easy to test individual route modules

### 4. RESTful Design
- API routes follow REST conventions
- Resource-based URLs (`/api/v1/users/me`)
- Proper HTTP methods and status codes

## Adding New Routes

### 1. Create Controller
```typescript
// src/controllers/newController.ts
export class NewController {
  static someAction = (req: Request, res: Response) => {
    // Controller logic
  };
}
```

### 2. Create Route File
```typescript
// src/routes/newRoutes.ts
import { Router } from 'express';
import { NewController } from '../controllers/index.js';

const router = Router();
router.get('/some-path', NewController.someAction);
export default router;
```

### 3. Mount Routes
```typescript
// src/routes/index.ts
import newRoutes from './newRoutes.js';
router.use('/new', newRoutes);
```

## API Response Format

All API endpoints return consistent JSON responses:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE",
    "statusCode": 400
  }
}
```

## Authentication

- **Web routes**: Use session-based authentication with redirects
- **API routes**: Use session-based authentication with JSON responses
- **Protected routes**: Use `ensureAuthenticated` middleware
- **Public routes**: No authentication required

## Development vs Production

- **Development**: All routes including debug/test routes are available
- **Production**: Only production routes are mounted
- **Environment detection**: Based on `NODE_ENV` configuration