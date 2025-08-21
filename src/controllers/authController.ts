import { Request, Response, NextFunction } from 'express';
import { passport } from '../auth/index.js';
import { destroySession } from '../config/session.js';
import { OAuthError } from '../errors/index.js';
import { logger } from '../utils/index.js';

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
    
    passport.authenticate('github', (err: any, user: any, _info: any) => {
      if (err) {
        requestLogger.oauth('OAuth callback failed with error', {
          step: 'callback_error',
          success: false,
          error: err.message,
          provider: 'github'
        });
        
        if (err instanceof OAuthError) {
          return res.redirect('/?error=oauth_failed&message=' + encodeURIComponent(err.message));
        }
        return next(err);
      }
      
      if (!user) {
        requestLogger.oauth('OAuth callback failed - user denied access', {
          step: 'callback_denied',
          success: false,
          error: 'user_denied_access',
          provider: 'github'
        });
        
        return res.redirect('/?error=oauth_denied&message=' + encodeURIComponent('GitHub authentication was cancelled or denied'));
      }
      
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          requestLogger.session('Failed to establish session after authentication', {
            action: 'login_session_failed',
            success: false,
            error: loginErr.message,
            userId: user.id,
            provider: 'github'
          });
          
          return next(new OAuthError('Failed to establish session after authentication', 500, 'SESSION_LOGIN_FAILED'));
        }
        
        requestLogger.auth('User successfully logged in via OAuth', {
          action: 'oauth_login_complete',
          success: true,
          userId: user.id,
          providerId: user.providerId,
          provider: user.provider,
          username: user.username
        });
        
        res.redirect('/');
      });
    })(req, res, next);
  };

  /**
   * Handle Google OAuth callback
   */
  static googleCallback = (req: Request, res: Response, next: NextFunction) => {
    const requestLogger = logger.withRequest(req);
    
    passport.authenticate('google', (err: any, user: any, _info: any) => {
      if (err) {
        requestLogger.oauth('OAuth callback failed with error', {
          step: 'callback_error',
          success: false,
          error: err.message,
          provider: 'google'
        });
        
        if (err instanceof OAuthError) {
          return res.redirect('/?error=oauth_failed&message=' + encodeURIComponent(err.message));
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
        
        return res.redirect('/?error=oauth_denied&message=' + encodeURIComponent('Google authentication was cancelled or denied'));
      }
      
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          requestLogger.session('Failed to establish session after authentication', {
            action: 'login_session_failed',
            success: false,
            error: loginErr.message,
            userId: user.id,
            provider: 'google'
          });
          
          return next(new OAuthError('Failed to establish session after authentication', 500, 'SESSION_LOGIN_FAILED'));
        }
        
        requestLogger.auth('User successfully logged in via OAuth', {
          action: 'oauth_login_complete',
          success: true,
          userId: user.id,
          providerId: user.providerId,
          provider: user.provider,
          username: user.username
        });
        
        res.redirect('/');
      });
    })(req, res, next);
  };

  /**
   * Handle user logout
   */
  static logout = (req: Request, res: Response, next: NextFunction) => {
    const requestLogger = logger.withRequest(req);
    const user = req.user;
    
    requestLogger.auth('User logout initiated', {
      action: 'logout_start',
      userId: user ? (user as any).id : undefined,
      username: user ? (user as any).username : undefined
    });
    
    req.logout((err) => {
      if (err) {
        requestLogger.auth('Logout failed during passport logout', {
          action: 'logout_failed',
          success: false,
          error: err.message,
          userId: user ? (user as any).id : undefined
        });
        return next(err);
      }

      destroySession(req, res, (sessionErr) => {
        if (sessionErr) {
          requestLogger.session('Session destruction failed during logout', {
            action: 'logout_session_failed',
            success: false,
            error: sessionErr.message
          });
          return next(sessionErr);
        }
        
        requestLogger.auth('User logout completed successfully', {
          action: 'logout_complete',
          success: true,
          userId: user ? (user as any).id : undefined,
          username: user ? (user as any).username : undefined
        });
        
        res.redirect('/');
      });
    });
  };
}