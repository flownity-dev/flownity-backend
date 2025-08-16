import { Request } from 'express';
import { AppError } from './AppError.js';
import { logger, LogCategory } from '../utils/index.js';

/**
 * Interface for error response structure
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  errorCode?: string;
  timestamp: string;
  path: string;
  stack?: string;
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: Error | AppError,
  req: Request,
  includeStack: boolean = false
): ErrorResponse {
  const isAppError = error instanceof AppError;
  
  const response: ErrorResponse = {
    error: error.name || 'Error',
    message: error.message || 'An unexpected error occurred',
    statusCode: isAppError ? error.statusCode : 500,
    timestamp: new Date().toISOString(),
    path: req.originalUrl || req.url
  };

  if (isAppError && error.errorCode !== undefined) {
    response.errorCode = error.errorCode;
  }

  if (includeStack && error.stack) {
    response.stack = error.stack;
  }

  return response;
}

/**
 * Log error with appropriate level and context
 */
export function logError(error: Error | AppError, req?: Request, context?: string): void {
  const isAppError = error instanceof AppError;
  const isOperational = isAppError ? error.isOperational : false;
  
  const logContext: any = {
    name: error.name,
    statusCode: isAppError ? error.statusCode : 500,
    isOperational,
    context: context || 'Unknown',
    errorCode: isAppError ? error.errorCode : undefined
  };

  if (req) {
    const requestLogger = logger.withRequest(req);
    
    if (isOperational) {
      // Operational errors are expected and should be logged as warnings
      requestLogger.warn(LogCategory.ERROR, `Operational Error: ${error.message}`, logContext);
    } else {
      // Programming errors should be logged as errors with full stack trace
      requestLogger.error(LogCategory.ERROR, `Programming Error: ${error.message}`, error, logContext);
    }
  } else {
    if (isOperational) {
      // Operational errors are expected and should be logged as warnings
      logger.warn(LogCategory.ERROR, `Operational Error: ${error.message}`, logContext);
    } else {
      // Programming errors should be logged as errors with full stack trace
      logger.error(LogCategory.ERROR, `Programming Error: ${error.message}`, error, logContext);
    }
  }
}

/**
 * Check if request accepts JSON responses
 */
export function acceptsJson(req: Request): boolean {
  return req.headers.accept?.includes('application/json') || 
         req.headers['content-type']?.includes('application/json') ||
         req.xhr === true;
}

/**
 * Generate user-friendly error messages for different error types
 */
export function getUserFriendlyMessage(error: Error | AppError): string {
  if (error instanceof AppError) {
    switch (error.name) {
      case 'OAuthError':
        return 'There was a problem with GitHub authentication. Please try logging in again.';
      case 'DatabaseError':
        return 'We\'re experiencing technical difficulties. Please try again later.';
      case 'SessionError':
        return 'Your session has expired. Please log in again.';
      case 'AuthenticationError':
        return 'Please log in to access this resource.';
      case 'ValidationError':
        return error.message; // Validation messages are usually user-friendly
      case 'ConfigurationError':
        return 'The service is temporarily unavailable. Please try again later.';
      default:
        return error.message;
    }
  }
  
  // Generic error message for unknown errors
  return 'An unexpected error occurred. Please try again later.';
}