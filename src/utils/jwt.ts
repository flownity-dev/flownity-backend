import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from './logger.js';

export interface JWTPayload {
  userId: number;
  providerId: string;
  provider: string;
  username: string;
  displayName: string;
}

export interface JWTOptions {
  expiresIn: string;
  audience: string;
  issuer: string;
}

/**
 * Generate a JWT token for authenticated user
 */
export function generateJWTToken(payload: JWTPayload, options?: Partial<JWTOptions>): string {
  try {
    if (!config.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const defaultOptions = {
      expiresIn: '24h',
      audience: 'flownity-frontend',
      issuer: 'flownity-backend'
    };

    const jwtOptions = { ...defaultOptions, ...options } as SignOptions;

    const token = jwt.sign(payload, config.JWT_SECRET, jwtOptions);

    logger.auth('JWT token generated successfully', {
      action: 'jwt_generate',
      success: true,
      userId: payload.userId,
      provider: payload.provider,
      expiresIn: jwtOptions.expiresIn
    });

    return token;
  } catch (error) {
    logger.auth('JWT token generation failed', {
      action: 'jwt_generate',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      userId: payload.userId,
      provider: payload.provider
    });

    throw new Error(`JWT token generation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Verify and decode a JWT token
 */
export function verifyJWTToken(token: string): JWTPayload {
  try {
    if (!config.JWT_SECRET) {
      throw new Error('JWT_SECRET is not configured');
    }

    const decoded = jwt.verify(token, config.JWT_SECRET, {
      audience: 'flownity-frontend',
      issuer: 'flownity-backend'
    }) as jwt.JwtPayload & JWTPayload;

    logger.auth('JWT token verified successfully', {
      action: 'jwt_verify',
      success: true,
      userId: decoded.userId,
      provider: decoded.provider
    });

    return decoded;
  } catch (error) {
    logger.auth('JWT token verification failed', {
      action: 'jwt_verify',
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });

    throw new Error(`JWT token verification failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}