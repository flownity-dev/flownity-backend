import { Request, Response, NextFunction } from 'express';
import { AuthenticationError } from '../errors/index.js';
import { logger } from '../utils/index.js';
import type { DatabaseUser } from '../types/common.js';

/**
 * Extend Express Request interface to include user property and Passport methods
 */
declare global {
  namespace Express {
    interface User extends DatabaseUser {}

    interface Request {
      user?: User;
      isAuthenticated(): boolean;
      login(user: User, done: (err: any) => void): void;
      login(user: User, options: any, done: (err: any) => void): void;
      logIn(user: User, done: (err: any) => void): void;
      logIn(user: User, options: any, done: (err: any) => void): void;
      logout(done: (err: any) => void): void;
      logOut(done: (err: any) => void): void;
    }
  }
}

/**
 * Middleware to ensure user is authenticated
 * Redirects to login if not authenticated
 */
export function ensureAuthenticated(req: Request, res: Response, next: NextFunction): void {
  const requestLogger = logger.withRequest(req);

  if (req.isAuthenticated()) {
    requestLogger.auth('Access granted to protected resource', {
      action: 'access_granted',
      success: true,
      resource: req.originalUrl || req.url
    });
    return next();
  }

  requestLogger.auth('Access denied to protected resource - authentication required', {
    action: 'access_denied',
    success: false,
    resource: req.originalUrl || req.url,
    reason: 'not_authenticated'
  });

  const error = new AuthenticationError(
    'Authentication required - please log in to access this resource',
    401,
    'AUTH_REQUIRED'
  );

  // For API requests, pass error to error handler
  if (req.headers.accept?.includes('application/json')) {
    return next(error);
  }

  // For browser requests, redirect to home page with error message
  res.redirect('/?error=auth_required&message=' + encodeURIComponent('Please log in to access this resource'));
}

/**
 * Middleware to ensure user is NOT authenticated
 * Redirects authenticated users away from login pages
 */
export function ensureNotAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    return next();
  }

  const requestLogger = logger.withRequest(req);
  requestLogger.auth('Authenticated user redirected from login page', {
    action: 'redirect_authenticated',
    success: true,
    from: req.originalUrl || req.url,
    to: '/'
  });

  // Redirect authenticated users to home page
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(frontendUrl);
}

/**
 * Middleware to add user information to response locals
 * Makes user data available in templates
 */
export function addUserToLocals(req: Request, res: Response, next: NextFunction): void {
  res.locals.user = req.user || null;
  res.locals.isAuthenticated = req.isAuthenticated();
  next();
}

/**
 * Enhanced middleware that supports both session and token authentication
 * Checks for token authentication first, then falls back to session authentication
 */
export function ensureAuthenticatedFlexible(req: Request, res: Response, next: NextFunction): void {
  const requestLogger = logger.withRequest(req);

  // Check if user is authenticated via token or session
  const isTokenAuthenticated = !!req.tokenUser;
  const isSessionAuthenticated = req.isAuthenticated();

  if (isTokenAuthenticated || isSessionAuthenticated) {
    const authMethod = isTokenAuthenticated ? 'token' : 'session';
    requestLogger.auth('Access granted to protected resource', {
      action: 'access_granted',
      success: true,
      resource: req.originalUrl || req.url,
      authMethod
    });
    return next();
  }

  requestLogger.auth('Access denied to protected resource - authentication required', {
    action: 'access_denied',
    success: false,
    resource: req.originalUrl || req.url,
    reason: 'not_authenticated'
  });

  const error = new AuthenticationError(
    'Authentication required - please log in or provide a valid token to access this resource',
    401,
    'AUTH_REQUIRED'
  );

  // For API requests, pass error to error handler
  if (req.headers.accept?.includes('application/json')) {
    return next(error);
  }

  // For browser requests, redirect to home page with error message
  res.redirect('/?error=auth_required&message=' + encodeURIComponent('Please log in to access this resource'));
}

/**
 * Enhanced middleware to add user information to response locals
 * Supports both session and token authentication
 */
export function addUserToLocalsFlexible(req: Request, res: Response, next: NextFunction): void {
  // Prefer token user if available (more recent authentication)
  const user = req.tokenUser || req.user || null;
  const isAuthenticated = !!(req.tokenUser || req.isAuthenticated());
  
  res.locals.user = user;
  res.locals.isAuthenticated = isAuthenticated;
  res.locals.authMethod = req.tokenUser ? 'token' : (req.user ? 'session' : null);
  next();
}