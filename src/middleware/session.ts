import { Request, Response, NextFunction } from 'express';
import { SessionError } from '../errors/index.js';
import { logger, LogCategory } from '../utils/index.js';

/**
 * Middleware to ensure session is properly initialized
 */
export function ensureSession(req: Request, res: Response, next: NextFunction): void {
    const requestLogger = logger.withRequest(req);
    
    if (!req.session) {
        requestLogger.session('Session not initialized', {
            action: 'session_check',
            success: false,
            error: 'session_not_initialized'
        });
        
        const error = new SessionError(
            'Session not initialized - please enable cookies and try again',
            500,
            'SESSION_NOT_INITIALIZED'
        );
        return next(error);
    }
    
    requestLogger.session('Session initialized successfully', {
        action: 'session_check',
        success: true,
        sessionId: req.sessionID
    });
    
    next();
}

/**
 * Middleware to require authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
        const error = new SessionError(
            'Authentication required - please log in to access this resource',
            401,
            'AUTH_REQUIRED'
        );
        return next(error);
    }
    next();
}

/**
 * Session health check middleware for debugging
 */
export function sessionHealthCheck(req: Request, res: Response, next: NextFunction): void {
    const requestLogger = logger.withRequest(req);
    
    requestLogger.debug(LogCategory.SESSION, 'Session health check', {
        sessionID: req.sessionID,
        hasSession: !!req.session,
        isAuthenticated: req.isAuthenticated?.(),
        userID: req.user ? (req.user as any).id : null,
        cookieSecure: req.session?.cookie?.secure,
        cookieHttpOnly: req.session?.cookie?.httpOnly,
        cookieSameSite: req.session?.cookie?.sameSite
    });
    
    next();
}