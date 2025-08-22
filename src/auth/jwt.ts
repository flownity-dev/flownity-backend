import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { config } from '../config/index.js';
import { AuthenticationError } from '../errors/index.js';
import { logger } from '../utils/index.js';
import type { DatabaseUser } from '../types/common.js';

export interface JWTPayload {
  userId: number;
  providerId: string;
  provider: 'github' | 'google';
  username: string;
  displayName: string;
  email?: string | undefined;
  iat?: number;
  exp?: number;
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: DatabaseUser): string {
  const payload: JWTPayload = {
    userId: user.id,
    providerId: user.providerId,
    provider: user.provider as 'github' | 'google',
    username: user.username,
    displayName: user.displayName,
    email: user.email ? user.email : undefined
  };

  try {
    const options: SignOptions = {
      expiresIn: config.JWT_EXPIRES_IN,
      issuer: 'flownity-backend',
      audience: 'flownity-frontend'
    };
    
    const token = jwt.sign(payload, config.JWT_SECRET, options);

    logger.auth('JWT token generated successfully', {
      action: 'jwt_generate',
      success: true,
      userId: user.id,
      provider: user.provider,
      expiresIn: config.JWT_EXPIRES_IN
    });

    return token;
  } catch (error) {
    logger.auth('JWT token generation failed', {
      action: 'jwt_generate',
      success: false,
      userId: user.id,
      error: error instanceof Error ? error.message : String(error)
    });

    throw new AuthenticationError(
      'Failed to generate authentication token',
      500,
      'JWT_GENERATION_FAILED'
    );
  }
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET, {
      issuer: 'flownity-backend',
      audience: 'flownity-frontend'
    }) as JWTPayload;

    logger.auth('JWT token verified successfully', {
      action: 'jwt_verify',
      success: true,
      userId: decoded.userId,
      provider: decoded.provider
    });

    return decoded;
  } catch (error) {
    let errorCode = 'JWT_VERIFICATION_FAILED';
    let message = 'Invalid authentication token';

    if (error instanceof jwt.TokenExpiredError) {
      errorCode = 'JWT_EXPIRED';
      message = 'Authentication token has expired';
    } else if (error instanceof jwt.JsonWebTokenError) {
      errorCode = 'JWT_INVALID';
      message = 'Invalid authentication token format';
    } else if (error instanceof jwt.NotBeforeError) {
      errorCode = 'JWT_NOT_ACTIVE';
      message = 'Authentication token is not yet active';
    }

    logger.auth('JWT token verification failed', {
      action: 'jwt_verify',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    });

    throw new AuthenticationError(message, 401, errorCode);
  }
}

/**
 * Extract JWT token from Authorization header
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] || null;
}

/**
 * Refresh a JWT token (generate a new one with updated expiration)
 */
export function refreshToken(token: string): string {
  try {
    // Verify the current token (this will throw if expired or invalid)
    const decoded = verifyToken(token);
    
    // Create a new token with the same payload but fresh expiration
    const newPayload: JWTPayload = {
      userId: decoded.userId,
      providerId: decoded.providerId,
      provider: decoded.provider,
      username: decoded.username,
      displayName: decoded.displayName,
      email: decoded.email ? decoded.email : undefined
    };

    const options: SignOptions = {
      expiresIn: config.JWT_EXPIRES_IN,
      issuer: 'flownity-backend',
      audience: 'flownity-frontend'
    };
    
    const newToken = jwt.sign(newPayload, config.JWT_SECRET, options);

    logger.auth('JWT token refreshed successfully', {
      action: 'jwt_refresh',
      success: true,
      userId: decoded.userId,
      provider: decoded.provider
    });

    return newToken;
  } catch (error) {
    logger.auth('JWT token refresh failed', {
      action: 'jwt_refresh',
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });

    throw error; // Re-throw the original error from verifyToken
  }
}