import session from 'express-session';
import { config } from './index.js';

/**
 * Session configuration for the application
 * Implements secure session management with appropriate settings for development and production
 */
export function createSessionConfig(): session.SessionOptions {
  const isProduction = config.NODE_ENV === 'production';
  
  return {
    // Session secret for signing session cookies
    secret: config.SESSION_SECRET,
    
    // Session store settings
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    
    // Custom session name for security (avoid default 'connect.sid')
    name: 'flownity.sid',
    
    // Cookie security settings
    cookie: {
      // HTTPS only in production
      secure: isProduction,
      
      // Prevent XSS attacks by disabling client-side JavaScript access
      httpOnly: true,
      
      // Session lifetime (24 hours)
      maxAge: 24 * 60 * 60 * 1000,
      
      // CSRF protection - strict in production, lax in development for easier testing
      sameSite: isProduction ? 'strict' : 'lax'
    },
    
    // Use memory store for development (default behavior when store is undefined)
    // In production, this should be replaced with a persistent store like Redis
    store: undefined
  };
}

/**
 * Session security middleware to regenerate session ID after authentication
 * This helps prevent session fixation attacks
 */
export function regenerateSession(req: any, res: any, next: any): void {
  if (req.isAuthenticated() && !req.session.regenerated) {
    req.session.regenerate((err: any) => {
      if (err) {
        console.error('Session regeneration error:', err);
        return next(err);
      }
      
      // Mark session as regenerated to avoid infinite regeneration
      req.session.regenerated = true;
      next();
    });
  } else {
    next();
  }
}

/**
 * Session cleanup utility for logout
 * Properly destroys session and clears cookie
 */
export function destroySession(req: any, res: any, callback: (err?: any) => void): void {
  req.session.destroy((err: any) => {
    if (err) {
      console.error('Session destruction error:', err);
      return callback(err);
    }
    
    // Clear the session cookie
    res.clearCookie('flownity.sid');
    callback();
  });
}