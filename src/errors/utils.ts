import { Request } from 'express';
import { AppError } from './AppError.js';
import { logger, LogCategory } from '../utils/index.js';
import { 
  TokenVerificationError, 
  ProviderAPIError,
  TokenExtractionError,
  InvalidTokenFormatError,
  ProviderIdentificationError,
  RestrictedProviderError,
  RequestTimeoutError,
  RateLimitError
} from '../auth/token-verification/errors.js';

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
 * Map provider API error responses to appropriate HTTP status codes and error types
 */
export function mapProviderAPIError(provider: string, statusCode: number, responseBody?: any): TokenVerificationError {
  switch (statusCode) {
    case 401:
      return new TokenVerificationError(
        'Invalid or expired token',
        401,
        provider
      );
    
    case 403:
      return new TokenVerificationError(
        'Token does not have required permissions',
        403,
        provider
      );
    
    case 404:
      // GitHub returns 404 for invalid tokens sometimes
      return new TokenVerificationError(
        'Invalid token',
        401,
        provider
      );
    
    case 429:
      return new RateLimitError(provider);
    
    case 500:
    case 502:
    case 503:
    case 504:
      return new ProviderAPIError(provider, new Error(`${provider} API returned ${statusCode}`));
    
    default:
      return new ProviderAPIError(provider, new Error(`Unexpected ${provider} API response: ${statusCode}`));
  }
}

/**
 * Enhanced error logging specifically for token verification errors
 */
export function logTokenVerificationError(
  error: TokenVerificationError | ProviderAPIError,
  req?: Request,
  additionalContext?: Record<string, any>
): void {
  const context: Record<string, any> = {
    provider: error instanceof TokenVerificationError ? error.provider : error.provider,
    errorType: error.name,
    statusCode: error.statusCode,
    ...additionalContext
  };

  // Don't log the actual token for security reasons
  if (req?.headers?.authorization) {
    context.hasAuthHeader = true;
    context.authHeaderFormat = req.headers.authorization.startsWith('Bearer ') ? 'Bearer' : 'Other';
  }

  // Log with appropriate level based on error type
  if (error instanceof ProviderAPIError) {
    // Provider API errors are system issues, log as errors
    logError(error, req, 'Token Verification - Provider API');
  } else if (error instanceof TokenVerificationError) {
    // Most token verification errors are client issues, log as warnings
    const logContext = {
      name: error.name,
      statusCode: error.statusCode,
      isOperational: true,
      context: 'Token Verification',
      ...context
    };

    if (req) {
      const requestLogger = logger.withRequest(req);
      requestLogger.warn(LogCategory.AUTH, `Token Verification Failed: ${error.message}`, logContext);
    } else {
      logger.warn(LogCategory.AUTH, `Token Verification Failed: ${error.message}`, logContext);
    }
  } else {
    // Fallback to general error logging
    logError(error, req, 'Token Verification');
  }
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
      
      // Token verification error messages
      case 'TokenExtractionError':
        return 'Authentication token is required. Please provide a valid token.';
      case 'InvalidTokenFormatError':
        return 'Invalid token format. Please provide a valid authentication token.';
      case 'ProviderIdentificationError':
        return 'Unable to identify token provider. Please use a valid GitHub or Google token.';
      case 'RestrictedProviderError':
        return 'This authentication provider is not allowed for this endpoint.';
      case 'TokenVerificationError':
        return 'Token verification failed. Please provide a valid authentication token.';
      case 'ProviderAPIError':
        return 'Authentication service is temporarily unavailable. Please try again later.';
      case 'RequestTimeoutError':
        return 'Authentication request timed out. Please try again.';
      case 'RateLimitError':
        return 'Too many authentication requests. Please wait a moment and try again.';
      
      default:
        return error.message;
    }
  }
  
  // Generic error message for unknown errors
  return 'An unexpected error occurred. Please try again later.';
}