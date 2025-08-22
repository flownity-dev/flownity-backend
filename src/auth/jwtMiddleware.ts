import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, JWTPayload } from './jwt.js';
import { AuthenticationError } from '../errors/index.js';
import { logger } from '../utils/index.js';

/**
 * Extend Express Request interface to include JWT user
 */
declare global {
  namespace Express {
    interface Request {
      jwtUser?: JWTPayload;
    }
  }
}

/**
 * Middleware to verify JWT token and attach user to request
 * Requires a valid JWT token in Authorization header
 */
export function requireJWT(req: Request, res: Response, next: NextFunction): void {
  const requestLogger = logger.withRequest(req);

  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      requestLogger.auth('JWT token missing from request', {
        action: 'jwt_missing',
        success: false,
        resource: req.originalUrl || req.url
      });

      throw new AuthenticationError(
        'Authentication token required. Please provide a valid Bearer token in the Authorization header.',
        401,
        'JWT_TOKEN_MISSING'
      );
    }

    const decoded = verifyToken(token);
    req.jwtUser = decoded;

    requestLogger.auth('JWT authentication successful', {
      action: 'jwt_auth_success',
      success: true,
      userId: decoded.userId,
      provider: decoded.provider,
      resource: req.originalUrl || req.url
    });

    next();
  } catch (error) {
    requestLogger.auth('JWT authentication failed', {
      action: 'jwt_auth_failed',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      resource: req.originalUrl || req.url
    });

    next(error);
  }
}

/**
 * Middleware to optionally verify JWT token
 * Continues without error if no token is provided
 */
export function optionalJWT(req: Request, res: Response, next: NextFunction): void {
  const requestLogger = logger.withRequest(req);

  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      // No token provided, continue without authentication
      requestLogger.auth('No JWT token provided, continuing without authentication', {
        action: 'jwt_optional_skip',
        success: true,
        resource: req.originalUrl || req.url
      });
      return next();
    }

    const decoded = verifyToken(token);
    req.jwtUser = decoded;

    requestLogger.auth('Optional JWT authentication successful', {
      action: 'jwt_optional_success',
      success: true,
      userId: decoded.userId,
      provider: decoded.provider,
      resource: req.originalUrl || req.url
    });

    next();
  } catch (error) {
    requestLogger.auth('Optional JWT authentication failed', {
      action: 'jwt_optional_failed',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      resource: req.originalUrl || req.url
    });

    // In optional mode, continue without authentication on token errors
    next();
  }
}

/**
 * Helper function to get authenticated user from JWT
 */
export function getJWTUser(req: Request): JWTPayload | undefined {
  return req.jwtUser;
}

/**
 * Helper function to check if request has JWT authentication
 */
export function isJWTAuthenticated(req: Request): boolean {
  return !!req.jwtUser;
}

/**
 * Middleware to add JWT user information to response locals
 */
export function addJWTUserToLocals(req: Request, res: Response, next: NextFunction): void {
  res.locals.jwtUser = req.jwtUser || null;
  res.locals.isJWTAuthenticated = !!req.jwtUser;
  next();
}