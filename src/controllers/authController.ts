import { Request, Response, NextFunction } from 'express';
import { passport, generateToken } from '../auth/index.js';
import { OAuthError } from '../errors/index.js';
import { logger } from '../utils/index.js';
import { config } from '../config/index.js';
import type { DatabaseUser } from '../types/common.js';

export class AuthController {
  /**
   * Initiate GitHub OAuth authentication
   */
  static githubAuth = passport.authenticate('github', { scope: ['user:email'] });

  /**
   * Initiate Google OAuth authentication
   */
  static googleAuth = passport.authenticate('google', {
    scope: ['profile', 'email']
  });

  /**
   * Handle GitHub OAuth callback
   */
static githubCallback = (req: Request, res: Response, next: NextFunction) => {
  const requestLogger = logger.withRequest(req);

  passport.authenticate('github', (err: any, user: DatabaseUser, _info: any) => {
    if (err) {
      requestLogger.oauth('OAuth callback failed with error', {
        step: 'callback_error',
        success: false,
        error: err.message,
        provider: 'github'
      });

      return res.send(`
        <script>
          window.opener.postMessage(
            { type: "oauth_error", message: ${JSON.stringify(err.message)} },
            "${config.FRONTEND_URL}"
          );
          window.close();
        </script>
      `);
    }

    if (!user) {
      requestLogger.oauth('OAuth callback failed - user denied access', {
        step: 'callback_denied',
        success: false,
        error: 'user_denied_access',
        provider: 'github'
      });

      return res.send(`
        <script>
          window.opener.postMessage(
            { type: "oauth_error", message: "GitHub authentication was cancelled or denied" },
            "${config.FRONTEND_URL}"
          );
          window.close();
        </script>
      `);
    }

    try {
      // Generate JWT token
      const token = generateToken(user);

      requestLogger.auth('User successfully logged in via OAuth', {
        action: 'oauth_login_complete',
        success: true,
        userId: user.id,
        providerId: user.providerId,
        provider: user.provider,
        username: user.username
      });

      // ✅ Instead of res.json, send HTML that posts back the token
      return res.send(`
        <script>
          window.opener.postMessage(
            { type: "oauth_success", token: "${token}" },
            "${config.FRONTEND_URL}"
          );
          window.close();
        </script>
      `);

    } catch (tokenError) {
      requestLogger.auth('Failed to generate JWT token after authentication', {
        action: 'jwt_generation_failed',
        success: false,
        error: tokenError instanceof Error ? tokenError.message : String(tokenError),
        userId: user?.id,
        provider: 'github'
      });

      return res.send(`
        <script>
          window.opener.postMessage(
            { type: "oauth_error", message: "Failed to generate authentication token" },
            "${config.FRONTEND_URL}"
          );
          window.close();
        </script>
      `);
    }
  })(req, res, next);
};


  /**
   * Handle Google OAuth callback
   */
  static googleCallback = (req: Request, res: Response, next: NextFunction) => {
    const requestLogger = logger.withRequest(req);

    passport.authenticate('google', (err: any, user: DatabaseUser, _info: any) => {
      if (err) {
        requestLogger.oauth('OAuth callback failed with error', {
          step: 'callback_error',
          success: false,
          error: err.message,
          provider: 'google'
        });

        if (err instanceof OAuthError) {
          const errorUrl = `${config.FRONTEND_URL}/login?error=oauth_failed&message=${encodeURIComponent(err.message)}`;
          return res.redirect(errorUrl);
        }
        return next(err);
      }

      if (!user) {
        requestLogger.oauth('OAuth callback failed - user denied access', {
          step: 'callback_denied',
          success: false,
          error: 'user_denied_access',
          provider: 'google'
        });

        const errorUrl = `${config.FRONTEND_URL}/login?error=oauth_denied&message=${encodeURIComponent('Google authentication was cancelled or denied')}`;
        return res.redirect(errorUrl);
      }

      try {
        // Generate JWT token instead of creating session
        const token = generateToken(user);

        requestLogger.auth('User successfully logged in via OAuth', {
          action: 'oauth_login_complete',
          success: true,
          userId: user.id,
          providerId: user.providerId,
          provider: user.provider,
          username: user.username
        });

        // Redirect to frontend with token
        const redirectUrl = `${config.FRONTEND_URL}/auth/callback?token=${encodeURIComponent(token)}&success=true`;
        res.redirect(redirectUrl);

      } catch (tokenError) {
        requestLogger.auth('Failed to generate JWT token after authentication', {
          action: 'jwt_generation_failed',
          success: false,
          error: tokenError instanceof Error ? tokenError.message : String(tokenError),
          userId: user.id,
          provider: 'google'
        });

        return next(new OAuthError('Failed to generate authentication token', 500, 'JWT_GENERATION_FAILED'));
      }
    })(req, res, next);
  };

  /**
   * Handle user logout (JWT-based)
   * Note: With JWT, logout is handled client-side by discarding the token
   */
  static logout = (req: Request, res: Response, next: NextFunction) => {
    const requestLogger = logger.withRequest(req);

    requestLogger.auth('JWT logout request received', {
      action: 'jwt_logout',
      success: true,
      message: 'Client should discard JWT token'
    });

    res.json({
      success: true,
      message: 'Logout successful. Please discard your authentication token.'
    });
  };

  /**
   * Refresh JWT token
   */
  static refreshToken = (req: Request, res: Response, next: NextFunction) => {
    const requestLogger = logger.withRequest(req);

    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'token_missing',
          message: 'Authentication token required for refresh'
        });
      }

      const token = authHeader.split(' ')[1];
      const { refreshToken } = require('../auth/jwt.js');
      const newToken = refreshToken(token);

      requestLogger.auth('JWT token refreshed successfully', {
        action: 'jwt_refresh_success',
        success: true
      });

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        token: newToken
      });
    } catch (error) {
      requestLogger.auth('JWT token refresh failed', {
        action: 'jwt_refresh_failed',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });

      next(error);
    }
  };
}