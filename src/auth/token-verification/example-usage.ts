/**
 * Example usage patterns for OAuth token verification middleware
 * This file demonstrates various ways to integrate token verification
 * with existing authentication patterns and route protection
 */

import express, { Request, Response, NextFunction } from 'express';
import {
  verifyToken,
  requireToken,
  optionalToken,
  requireGitHubToken,
  requireGoogleToken,
  getAuthenticatedUser,
  isAuthenticated,
  ensureAuthenticatedFlexible,
  addUserToLocalsFlexible
} from '../index.js';

const app = express();

// ============================================================================
// BASIC USAGE PATTERNS
// ============================================================================

// 1. Required token verification (default behavior)
app.get('/api/protected', verifyToken(), (req: Request, res: Response) => {
  // req.tokenUser is guaranteed to exist
  res.json({ user: req.tokenUser });
});

// 2. Optional token verification
app.get('/api/optional', optionalToken(), (req: Request, res: Response) => {
  if (req.tokenUser) {
    res.json({ message: 'Authenticated', user: req.tokenUser });
  } else {
    res.json({ message: 'Anonymous access' });
  }
});

// 3. Provider-specific verification
app.get('/api/github', requireGitHubToken(), (req: Request, res: Response) => {
  // Only GitHub tokens accepted
  res.json({ user: req.tokenUser, provider: 'github' });
});

app.get('/api/google', requireGoogleToken(), (req: Request, res: Response) => {
  // Only Google tokens accepted
  res.json({ user: req.tokenUser, provider: 'google' });
});

// ============================================================================
// HYBRID AUTHENTICATION PATTERNS
// ============================================================================

// 4. Accept both session and token authentication
app.get('/api/profile',
  optionalToken(), // Try token authentication first
  ensureAuthenticatedFlexible, // Ensure some form of authentication
  (req: Request, res: Response) => {
    const user = getAuthenticatedUser(req); // Gets user from token or session
    const authMethod = req.tokenUser ? 'token' : 'session';
    res.json({ user, authMethod });
  }
);

// 5. Web routes with flexible authentication for templates
app.get('/dashboard',
  optionalToken(), // Try token authentication
  addUserToLocalsFlexible, // Add user to template locals
  (req: Request, res: Response) => {
    // res.locals.user contains user from either auth method
    // res.locals.authMethod indicates which method was used
    res.render('dashboard');
  }
);

// ============================================================================
// ROUTE GROUP PATTERNS
// ============================================================================

// 6. API-only routes (token authentication required)
const apiRouter = express.Router();
apiRouter.use(requireToken()); // All routes require token authentication

apiRouter.get('/user', (req: Request, res: Response) => {
  res.json({ user: req.tokenUser });
});

apiRouter.get('/data', (req: Request, res: Response) => {
  res.json({ data: [], user: req.tokenUser });
});

app.use('/api/v2', apiRouter);

// 7. Provider-specific route groups
const githubRouter = express.Router();
githubRouter.use(requireGitHubToken()); // All routes require GitHub tokens

githubRouter.get('/repos', (req: Request, res: Response) => {
  res.json({ user: req.tokenUser, repositories: [] });
});

githubRouter.get('/issues', (req: Request, res: Response) => {
  res.json({ user: req.tokenUser, issues: [] });
});

app.use('/api/github', githubRouter);

// ============================================================================
// CUSTOM CONFIGURATION PATTERNS
// ============================================================================

// 8. Custom cache and timeout settings
app.get('/api/cached', verifyToken({
  cacheTimeout: 600, // 10 minutes
  requestTimeout: 3000, // 3 seconds
  retryAttempts: 1
}), (req: Request, res: Response) => {
  res.json({ user: req.tokenUser });
});

// 9. Provider restrictions with custom settings
app.get('/api/restricted', verifyToken({
  providers: ['github'], // Only GitHub tokens
  required: true,
  cacheTimeout: 300
}), (req: Request, res: Response) => {
  res.json({ user: req.tokenUser, provider: 'github' });
});

// ============================================================================
// MIDDLEWARE COMPOSITION PATTERNS
// ============================================================================

// 10. Reusable middleware compositions
const requireAnyAuth = [
  optionalToken(), // Try token first
  ensureAuthenticatedFlexible // Ensure some authentication
];

const requireTokenAuth = [
  requireToken() // Only token authentication
];

const optionalAnyAuth = [
  optionalToken(), // Try token authentication
  addUserToLocalsFlexible // Add user to locals
];

// Use composed middleware
app.get('/profile', requireAnyAuth, (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  res.json({ user });
});

app.get('/api/data', requireTokenAuth, (req: Request, res: Response) => {
  res.json({ data: [], user: req.tokenUser });
});

app.get('/dashboard', optionalAnyAuth, (req: Request, res: Response) => {
  res.render('dashboard'); // res.locals.user available
});

// ============================================================================
// ERROR HANDLING PATTERNS
// ============================================================================

// 11. Comprehensive error handling
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  // Handle token verification errors
  if (error.name === 'TokenVerificationError') {
    return res.status(error.statusCode || 401).json({
      error: error.message,
      provider: error.provider,
      authMethod: 'token'
    });
  }

  if (error.name === 'ProviderAPIError') {
    return res.status(503).json({
      error: 'Provider API unavailable',
      provider: error.provider,
      authMethod: 'token'
    });
  }

  if (error.name === 'RestrictedProviderError') {
    return res.status(403).json({
      error: `Provider ${error.provider} not allowed for this endpoint`,
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

  // Default error handling
  res.status(500).json({
    error: 'Internal server error'
  });
});

// ============================================================================
// CONDITIONAL AUTHENTICATION PATTERNS
// ============================================================================

// 12. Different auth requirements based on request context
app.get('/api/conditional', (req: Request, res: Response, next: NextFunction) => {
  // API clients (with Accept: application/json) require tokens
  if (req.headers.accept?.includes('application/json')) {
    return requireToken()(req, res, next);
  }

  // Browser requests can use session auth
  return optionalToken()(req, res, (err) => {
    if (err) return next(err);
    ensureAuthenticatedFlexible(req, res, next);
  });
}, (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const authMethod = req.tokenUser ? 'token' : 'session';
  res.json({ user, authMethod });
});

// 13. Rate limiting based on authentication method
app.get('/api/rate-limited', optionalToken(), (req: Request, res: Response, next: NextFunction) => {
  if (req.tokenUser) {
    // Higher rate limits for token-authenticated users
    // Apply token-based rate limiting logic here
    next();
  } else {
    // Lower rate limits for unauthenticated users
    // Apply stricter rate limiting logic here
    next();
  }
}, (req: Request, res: Response) => {
  res.json({
    message: 'Rate limited endpoint',
    user: req.tokenUser || null,
    limits: req.tokenUser ? 'high' : 'low'
  });
});

// ============================================================================
// TESTING AND DEVELOPMENT PATTERNS
// ============================================================================

// 14. Development-only routes for testing
if (process.env.NODE_ENV === 'development') {
  app.get('/dev/auth-test', optionalToken(), (req: Request, res: Response) => {
    res.json({
      tokenUser: req.tokenUser || null,
      sessionUser: req.user || null,
      isTokenAuthenticated: !!req.tokenUser,
      isSessionAuthenticated: req.isAuthenticated?.() || false,
      isAnyAuthenticated: isAuthenticated(req),
      authMethod: req.tokenUser ? 'token' : (req.user ? 'session' : null)
    });
  });
}

export default app;