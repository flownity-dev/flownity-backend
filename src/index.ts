import express from 'express';
import session from 'express-session';
import { config } from './config/index.js';
import { createSessionConfig, destroySession } from './config/session.js';
import { DatabaseConnection, initializeDatabase } from './database/index.js';
import { configurePassport, passport, addUserToLocals } from './auth/index.js';
import { ensureAuthenticated } from './auth/middleware.js';
import { ensureSession, sessionHealthCheck } from './middleware/session.js';
import { errorHandler, notFoundHandler, OAuthError, DatabaseError, SessionError } from './errors/index.js';
import { logger, LogCategory } from './utils/index.js';

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration with secure settings
app.use(session(createSessionConfig()));

// Session middleware
app.use(ensureSession);
app.use(sessionHealthCheck);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Add user information to response locals
app.use(addUserToLocals);

// Basic route for testing
app.get('/', (req, res) => {
  const isAuthenticated = req.isAuthenticated();
  const user = req.user;
  
  // Check for error messages from redirects
  const errorType = req.query.error as string;
  const errorMessage = req.query.message as string;
  
  let errorHtml = '';
  if (errorType && errorMessage) {
    errorHtml = `
      <div style="background-color: #f8d7da; color: #721c24; padding: 10px; margin: 10px 0; border-radius: 4px; border: 1px solid #f5c6cb;">
        <strong>Error:</strong> ${decodeURIComponent(errorMessage)}
      </div>
    `;
  }

  if (isAuthenticated && user) {
    res.send(`
      <h1>Flownity Backend - OAuth Authentication</h1>
      ${errorHtml}
      <p>Welcome, ${user.username}!</p>
      <p>Display Name: ${user.displayName}</p>
      <p>Provider: ${user.provider} (ID: ${user.providerId})</p>
      <p>Email: ${user.email || 'Not provided'}</p>
      <p>Full Name: ${user.fullName || 'Not provided'}</p>
      <p>Last Updated: ${user.updatedAt}</p>
      <form method="post" action="/auth/logout">
        <button type="submit">Logout</button>
      </form>
    `);
  } else {
    const authOptions = [];
    if (config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET) {
      authOptions.push('<a href="/auth/github">Login with GitHub</a>');
    }
    if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
      authOptions.push('<a href="/auth/google">Login with Google</a>');
    }
    
    res.send(`
      <h1>Flownity Backend - OAuth Authentication</h1>
      ${errorHtml}
      <p>You are not authenticated.</p>
      ${authOptions.join(' | ')}
    `);
  }
});

// Authentication routes
// GitHub OAuth routes (if configured)
if (config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET) {
  app.get('/auth/github', passport.authenticate('github', { scope: ['user:email'] }));
}

// Google OAuth routes (if configured)
if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
  app.get('/auth/google', passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  }));
}

// GitHub callback route (if configured)
if (config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET) {
  app.get('/auth/github/callback',
    (req, res, next) => {
      const requestLogger = logger.withRequest(req);
      
      passport.authenticate('github', (err: any, user: any, _info: any) => {
      if (err) {
        requestLogger.oauth('OAuth callback failed with error', {
          step: 'callback_error',
          success: false,
          error: err.message
        });
        
        // Handle OAuth errors
        if (err instanceof OAuthError) {
          return res.redirect('/?error=oauth_failed&message=' + encodeURIComponent(err.message));
        }
        // Pass other errors to error handler
        return next(err);
      }
      
      if (!user) {
        requestLogger.oauth('OAuth callback failed - user denied access', {
          step: 'callback_denied',
          success: false,
          error: 'user_denied_access'
        });
        
        // Authentication failed but no error (user denied access)
        return res.redirect('/?error=oauth_denied&message=' + encodeURIComponent('GitHub authentication was cancelled or denied'));
      }
      
      // Log the user in
      req.logIn(user, (loginErr) => {
        if (loginErr) {
          requestLogger.session('Failed to establish session after authentication', {
            action: 'login_session_failed',
            success: false,
            error: loginErr.message,
            userId: user.id
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
        
        // Successful authentication, redirect to home page
        res.redirect('/');
      });
    })(req, res, next);
  }
  );
}

// Google callback route (if configured)
if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
  app.get('/auth/google/callback',
    (req, res, next) => {
      const requestLogger = logger.withRequest(req);
      
      passport.authenticate('google', (err: any, user: any, _info: any) => {
        if (err) {
          requestLogger.oauth('OAuth callback failed with error', {
            step: 'callback_error',
            success: false,
            error: err.message,
            provider: 'google'
          });
          
          // Handle OAuth errors
          if (err instanceof OAuthError) {
            return res.redirect('/?error=oauth_failed&message=' + encodeURIComponent(err.message));
          }
          // Pass other errors to error handler
          return next(err);
        }
        
        if (!user) {
          requestLogger.oauth('OAuth callback failed - user denied access', {
            step: 'callback_denied',
            success: false,
            error: 'user_denied_access',
            provider: 'google'
          });
          
          // Authentication failed but no error (user denied access)
          return res.redirect('/?error=oauth_denied&message=' + encodeURIComponent('Google authentication was cancelled or denied'));
        }
        
        // Log the user in
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
          
          // Successful authentication, redirect to home page
          res.redirect('/');
        });
      })(req, res, next);
    }
  );
}

app.post('/auth/logout', (req, res, next) => {
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

    // Properly destroy session and clear cookie
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
});

// Protected route example - demonstrates route protection middleware
app.get('/profile', ensureAuthenticated, (req, res) => {
  const user = req.user!; // TypeScript knows user exists due to ensureAuthenticated middleware
  res.json({
    message: 'This is a protected route',
    user: {
      id: user.id,
      providerId: user.providerId,
      provider: user.provider,
      username: user.username,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      email: user.email,
      profilePictureUrl: user.profilePictureUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  });
});

// Development and testing routes
if (config.NODE_ENV === 'development') {
  app.get('/session-info', (req, res) => {
    res.json({
      sessionID: req.sessionID,
      hasSession: !!req.session,
      isAuthenticated: req.isAuthenticated?.(),
      user: req.user || null,
      cookie: req.session?.cookie ? {
        secure: req.session.cookie.secure,
        httpOnly: req.session.cookie.httpOnly,
        maxAge: req.session.cookie.maxAge,
        sameSite: req.session.cookie.sameSite
      } : null
    });
  });

  // Error testing routes
  app.get('/test-errors/database', (_req, _res, next) => {
    const error = new DatabaseError(
      'Test database error',
      500,
      'TEST_DB_ERROR'
    );
    next(error);
  });

  app.get('/test-errors/oauth', (_req, _res, next) => {
    const error = new OAuthError(
      'Test OAuth error',
      401,
      'TEST_OAUTH_ERROR'
    );
    next(error);
  });

  app.get('/test-errors/session', (_req, _res, next) => {
    const error = new SessionError(
      'Test session error',
      401,
      'TEST_SESSION_ERROR'
    );
    next(error);
  });

  app.get('/test-errors/generic', (_req, _res, next) => {
    const error = new Error('Test generic error');
    next(error);
  });
}

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Server instance for graceful shutdown
let server: any = null;

// Initialize database and start server
async function startServer() {
  try {
    logger.server('Starting server initialization', {
      environment: config.NODE_ENV,
      port: config.PORT,
      nodeVersion: process.version,
      platform: process.platform
    });

    // Configure Passport (this validates OAuth config)
    configurePassport();
    logger.server('Passport configuration validated successfully', {
      step: 'passport_config'
    });

    // Initialize database connection
    await DatabaseConnection.initialize();
    logger.server('Database connection established successfully', {
      step: 'database_init'
    });

    // Initialize database schema
    await initializeDatabase();
    logger.server('Database schema initialized successfully', {
      step: 'database_schema'
    });

    // Start server
    server = app.listen(config.PORT, () => {
      logger.server('Server started successfully', {
        port: config.PORT,
        environment: config.NODE_ENV,
        callbackUrl: config.CALLBACK_URL,
        status: 'running',
        pid: process.pid
      });

      // Log development-specific information
      if (config.NODE_ENV === 'development') {
        logger.server('Development mode active', {
          hotReload: 'enabled',
          debugRoutes: 'available',
          testRoutes: [
            '/session-info',
            '/test-errors/database',
            '/test-errors/oauth',
            '/test-errors/session',
            '/test-errors/generic'
          ]
        });
      }
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(LogCategory.SERVER, `Port ${config.PORT} is already in use`, error, {
          step: 'server_start',
          port: config.PORT,
          suggestion: 'Try a different port or stop the process using this port'
        });
      } else {
        logger.error(LogCategory.SERVER, 'Server error occurred', error, {
          step: 'server_runtime',
          port: config.PORT
        });
      }
      process.exit(1);
    });

  } catch (error) {
    logger.error(LogCategory.SERVER, 'Failed to start server', error instanceof Error ? error : new Error(String(error)), {
      step: 'server_startup',
      port: config.PORT,
      environment: config.NODE_ENV
    });
    
    // Ensure database connection is closed on startup failure
    try {
      await DatabaseConnection.close();
    } catch (closeError) {
      logger.error(LogCategory.DATABASE, 'Failed to close database connection during startup cleanup', closeError instanceof Error ? closeError : new Error(String(closeError)));
    }
    
    process.exit(1);
  }
}

// Graceful shutdown handler
async function gracefulShutdown(signal: string) {
  logger.server(`Received ${signal}, initiating graceful shutdown`, {
    signal,
    action: 'graceful_shutdown_start',
    pid: process.pid
  });

  // Set a timeout for forceful shutdown
  const shutdownTimeout = setTimeout(() => {
    logger.server('Graceful shutdown timeout reached, forcing exit', {
      signal,
      action: 'forced_shutdown',
      timeout: '10s'
    });
    process.exit(1);
  }, 10000); // 10 second timeout

  try {
    // Close HTTP server
    if (server) {
      logger.server('Closing HTTP server', {
        action: 'server_close'
      });
      
      await new Promise<void>((resolve, reject) => {
        server.close((err: any) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
      
      logger.server('HTTP server closed successfully', {
        action: 'server_closed'
      });
    }

    // Close database connections
    if (DatabaseConnection.isInitialized()) {
      logger.server('Closing database connections', {
        action: 'database_close'
      });
      
      await DatabaseConnection.close();
      
      logger.server('Database connections closed successfully', {
        action: 'database_closed'
      });
    }

    // Clear the shutdown timeout
    clearTimeout(shutdownTimeout);

    logger.server('Graceful shutdown completed successfully', {
      signal,
      action: 'graceful_shutdown_complete',
      pid: process.pid
    });

    process.exit(0);

  } catch (error) {
    clearTimeout(shutdownTimeout);
    
    logger.error(LogCategory.SERVER, 'Error during graceful shutdown', error instanceof Error ? error : new Error(String(error)), {
      signal,
      action: 'graceful_shutdown_error'
    });
    
    process.exit(1);
  }
}

// Handle graceful shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error(LogCategory.SERVER, 'Uncaught exception occurred', error, {
    action: 'uncaught_exception',
    pid: process.pid
  });
  
  // Attempt graceful shutdown
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error(LogCategory.SERVER, 'Unhandled promise rejection', error, {
    action: 'unhandled_rejection',
    promise: promise.toString(),
    pid: process.pid
  });
  
  // Attempt graceful shutdown
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the application
startServer();

export default app;