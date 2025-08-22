import { Request, Response, NextFunction } from 'express';
import { DatabaseError, OAuthError, SessionError, AuthenticationError } from '../errors/index.js';

export class DevController {
  /**
   * Test database error
   */
  static testDatabaseError = (_req: Request, _res: Response, next: NextFunction) => {
    const error = new DatabaseError(
      'Test database error',
      500,
      'TEST_DB_ERROR'
    );
    next(error);
  };

  /**
   * Test OAuth error
   */
  static testOAuthError = (_req: Request, _res: Response, next: NextFunction) => {
    const error = new OAuthError(
      'Test OAuth error',
      401,
      'TEST_OAUTH_ERROR'
    );
    next(error);
  };

  /**
   * Test JWT error
   */
  static testJWTError = (_req: Request, _res: Response, next: NextFunction) => {
    const error = new AuthenticationError(
      'Test JWT authentication error',
      401,
      'TEST_JWT_ERROR'
    );
    next(error);
  };

  /**
   * Test session error (legacy)
   */
  static testSessionError = (_req: Request, _res: Response, next: NextFunction) => {
    const error = new SessionError(
      'Test session error (legacy - sessions no longer used)',
      401,
      'TEST_SESSION_ERROR'
    );
    next(error);
  };

  /**
   * Test generic error
   */
  static testGenericError = (_req: Request, _res: Response, next: NextFunction) => {
    const error = new Error('Test generic error');
    next(error);
  };
}