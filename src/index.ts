import express from 'express';
import session from 'express-session';
import { config } from './config/index.js';
import { createSessionConfig } from './config/session.js';
import { DatabaseConnection, initializeDatabase } from './database/index.js';
import { configurePassport, passport, addUserToLocals } from './auth/index.js';
import { ensureSession, sessionHealthCheck } from './middleware/session.js';
import { errorHandler, notFoundHandler } from './errors/index.js';
import { logger, LogCategory } from './utils/index.js';
import routes from './routes/index.js';

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

// Mount all routes
app.use('/', routes);

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