import { config } from '../config/index.js';

/**
 * Log levels for different types of messages
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * Log categories for different parts of the application
 */
export enum LogCategory {
  AUTH = 'AUTH',
  DATABASE = 'DATABASE',
  SESSION = 'SESSION',
  SERVER = 'SERVER',
  ERROR = 'ERROR',
  OAUTH = 'OAUTH'
}

/**
 * Interface for structured log entries
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  context?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string | undefined;
    code?: string | undefined;
  };
  user?: {
    id?: number | undefined;
    providerId?: string | undefined;
    provider?: string | undefined;
    username?: string | undefined;
  };
  request?: {
    method?: string | undefined;
    url?: string | undefined;
    userAgent?: string | undefined;
    ip?: string | undefined;
    sessionId?: string | undefined;
  };
}

/**
 * Enhanced logging utility with structured logging and development-friendly output
 */
class Logger {
  http(arg0: string, arg1: { method: any; url: any; baseURL: any; hasAuth: boolean; }) {
      throw new Error('Method not implemented.');
  }
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = config.NODE_ENV === 'development';
  }

  /**
   * Log debug messages (only in development)
   */
  debug(category: LogCategory, message: string, context?: Record<string, any>): void {
    if (this.isDevelopment) {
      this.log(LogLevel.DEBUG, category, message, context);
    }
  }

  /**
   * Log informational messages
   */
  info(category: LogCategory, message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, category, message, context);
  }

  /**
   * Log warning messages
   */
  warn(category: LogCategory, message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, category, message, context);
  }

  /**
   * Log error messages with optional error object
   */
  error(category: LogCategory, message: string, error?: Error, context?: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      category,
      message
    };

    if (context) {
      logEntry.context = context;
    }

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack || undefined,
        code: (error as any).code || (error as any).errorCode || undefined
      };
    }

    this.outputLog(logEntry);
  }

  /**
   * Log authentication events
   */
  auth(message: string, context?: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.INFO,
      category: LogCategory.AUTH,
      message
    };

    if (context) {
      logEntry.context = context;
      
      if (context.userId || context.providerId || context.username) {
        logEntry.user = {
          id: context.userId || undefined,
          providerId: context.providerId || undefined,
          provider: context.provider || undefined,
          username: context.username || undefined
        };
      }
    }

    this.outputLog(logEntry);
  }

  /**
   * Log OAuth-specific events
   */
  oauth(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, LogCategory.OAUTH, message, context);
  }

  /**
   * Log database operations
   */
  database(message: string, context?: Record<string, any>): void {
    const level = context?.error ? LogLevel.ERROR : LogLevel.DEBUG;
    this.log(level, LogCategory.DATABASE, message, context);
  }

  /**
   * Log session-related events
   */
  session(message: string, context?: Record<string, any>): void {
    const level = context?.error ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, LogCategory.SESSION, message, context);
  }

  /**
   * Log server events
   */
  server(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, LogCategory.SERVER, message, context);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, category: LogCategory, message: string, context?: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message
    };

    if (context) {
      logEntry.context = context;
    }

    this.outputLog(logEntry);
  }

  /**
   * Output log entry to console with appropriate formatting
   */
  private outputLog(entry: LogEntry): void {
    if (this.isDevelopment) {
      this.outputDevelopmentLog(entry);
    } else {
      this.outputProductionLog(entry);
    }
  }

  /**
   * Development-friendly console output with colors and formatting
   */
  private outputDevelopmentLog(entry: LogEntry): void {
    const colors = {
      [LogLevel.DEBUG]: '\x1b[36m', // Cyan
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m'  // Red
    };

    const categoryColors = {
      [LogCategory.AUTH]: '\x1b[35m',     // Magenta
      [LogCategory.DATABASE]: '\x1b[34m', // Blue
      [LogCategory.SESSION]: '\x1b[36m',  // Cyan
      [LogCategory.SERVER]: '\x1b[32m',   // Green
      [LogCategory.ERROR]: '\x1b[31m',    // Red
      [LogCategory.OAUTH]: '\x1b[35m'     // Magenta
    };

    const reset = '\x1b[0m';
    const bold = '\x1b[1m';
    const dim = '\x1b[2m';

    const timestamp = `${dim}${entry.timestamp}${reset}`;
    const level = `${colors[entry.level]}${bold}[${entry.level}]${reset}`;
    const category = `${categoryColors[entry.category]}[${entry.category}]${reset}`;
    const message = `${bold}${entry.message}${reset}`;

    console.log(`${timestamp} ${level} ${category} ${message}`);

    // Log context if present
    if (entry.context && Object.keys(entry.context).length > 0) {
      console.log(`${dim}Context:${reset}`, entry.context);
    }

    // Log user info if present
    if (entry.user) {
      console.log(`${dim}User:${reset}`, entry.user);
    }

    // Log request info if present
    if (entry.request) {
      console.log(`${dim}Request:${reset}`, entry.request);
    }

    // Log error details if present
    if (entry.error) {
      console.log(`${colors[LogLevel.ERROR]}Error Details:${reset}`);
      console.log(`  Name: ${entry.error.name}`);
      console.log(`  Message: ${entry.error.message}`);
      if (entry.error.code) {
        console.log(`  Code: ${entry.error.code}`);
      }
      if (entry.error.stack) {
        console.log(`  Stack Trace:`);
        console.log(`${dim}${entry.error.stack}${reset}`);
      }
    }

    console.log(''); // Empty line for readability
  }

  /**
   * Production JSON output for log aggregation
   */
  private outputProductionLog(entry: LogEntry): void {
    // In production, output structured JSON logs
    console.log(JSON.stringify(entry));
  }

  /**
   * Create a logger instance with request context
   */
  withRequest(req: any): RequestLogger {
    return new RequestLogger(this, req);
  }
}

/**
 * Request-scoped logger that automatically includes request context
 */
class RequestLogger {
  private logger: Logger;
  private requestContext: LogEntry['request'];
  private userContext?: LogEntry['user'];

  constructor(logger: Logger, req: any) {
    this.logger = logger;
    
    this.requestContext = {
      method: req.method,
      url: req.originalUrl || req.url,
      userAgent: req.get?.('User-Agent'),
      ip: req.ip,
      sessionId: req.sessionID
    };

    if (req.user) {
      this.userContext = {
        id: req.user.id,
        providerId: req.user.providerId,
        provider: req.user.provider,
        username: req.user.username
      };
    }
  }

  debug(category: LogCategory, message: string, context?: Record<string, any>): void {
    this.logWithContext(LogLevel.DEBUG, category, message, context);
  }

  info(category: LogCategory, message: string, context?: Record<string, any>): void {
    this.logWithContext(LogLevel.INFO, category, message, context);
  }

  warn(category: LogCategory, message: string, context?: Record<string, any>): void {
    this.logWithContext(LogLevel.WARN, category, message, context);
  }

  error(category: LogCategory, message: string, error?: Error, context?: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      category,
      message
    };

    if (context) {
      logEntry.context = context;
    }

    if (this.requestContext) {
      logEntry.request = this.requestContext;
    }

    if (this.userContext) {
      logEntry.user = this.userContext;
    }

    if (error) {
      logEntry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack || undefined,
        code: (error as any).code || (error as any).errorCode || undefined
      };
    }

    this.logger['outputLog'](logEntry);
  }

  auth(message: string, context?: Record<string, any>): void {
    this.logWithContext(LogLevel.INFO, LogCategory.AUTH, message, context);
  }

  oauth(message: string, context?: Record<string, any>): void {
    this.logWithContext(LogLevel.INFO, LogCategory.OAUTH, message, context);
  }

  database(message: string, context?: Record<string, any>): void {
    const level = context?.error ? LogLevel.ERROR : LogLevel.DEBUG;
    this.logWithContext(level, LogCategory.DATABASE, message, context);
  }

  session(message: string, context?: Record<string, any>): void {
    const level = context?.error ? LogLevel.ERROR : LogLevel.INFO;
    this.logWithContext(level, LogCategory.SESSION, message, context);
  }

  private logWithContext(level: LogLevel, category: LogCategory, message: string, context?: Record<string, any>): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message
    };

    if (context) {
      logEntry.context = context;
    }

    if (this.requestContext) {
      logEntry.request = this.requestContext;
    }

    if (this.userContext) {
      logEntry.user = this.userContext;
    }

    this.logger['outputLog'](logEntry);
  }
}

// Export singleton logger instance
export const logger = new Logger();

// Export types and classes for external use
export { Logger, RequestLogger };