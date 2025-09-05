/**
 * Specialized error logging for token verification
 */

import { Request } from 'express';
import { logger, LogCategory } from '../../utils/index.js';
import { 
  TokenVerificationError, 
  ProviderAPIError,
  RequestTimeoutError,
  RateLimitError
} from './errors.js';

/**
 * Log levels for different error types
 */
enum ErrorSeverity {
  LOW = 'LOW',      // Client errors that are expected (invalid tokens, etc.)
  MEDIUM = 'MEDIUM', // Operational issues (timeouts, rate limits)
  HIGH = 'HIGH'     // System issues (provider API failures, configuration errors)
}

/**
 * Enhanced error logging specifically for token verification
 */
export class TokenVerificationErrorLogger {
  /**
   * Log token verification error with appropriate level and context
   */
  static logError(
    error: TokenVerificationError | ProviderAPIError | Error,
    req?: Request,
    additionalContext?: Record<string, any>
  ): void {
    const severity = this.getErrorSeverity(error);
    const context = this.buildErrorContext(error, req, additionalContext);
    const sanitizedContext = this.sanitizeContext(context);

    if (req) {
      const requestLogger = logger.withRequest(req);
      this.logWithRequestContext(requestLogger, error, severity, sanitizedContext);
    } else {
      this.logWithoutRequestContext(error, severity, sanitizedContext);
    }
  }

  /**
   * Log successful token verification for monitoring
   */
  static logSuccess(
    provider: string,
    req?: Request,
    additionalContext?: Record<string, any>
  ): void {
    const context = {
      provider,
      operation: 'token_verification',
      result: 'success',
      ...additionalContext
    };

    const sanitizedContext = this.sanitizeContext(context);

    if (req) {
      const requestLogger = logger.withRequest(req);
      requestLogger.info(LogCategory.AUTH, `Token verification successful for ${provider}`, sanitizedContext);
    } else {
      logger.info(LogCategory.AUTH, `Token verification successful for ${provider}`, sanitizedContext);
    }
  }

  /**
   * Log cache operations for monitoring
   */
  static logCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'cleanup',
    provider?: string,
    additionalContext?: Record<string, any>
  ): void {
    const context = {
      operation: `cache_${operation}`,
      provider,
      ...additionalContext
    };

    const sanitizedContext = this.sanitizeContext(context);
    logger.debug(LogCategory.AUTH, `Token cache ${operation}`, sanitizedContext);
  }

  /**
   * Log provider API calls for monitoring
   */
  static logProviderAPICall(
    provider: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    additionalContext?: Record<string, any>
  ): void {
    const context = {
      provider,
      endpoint,
      statusCode,
      duration,
      operation: 'provider_api_call',
      ...additionalContext
    };

    const sanitizedContext = this.sanitizeContext(context);
    const message = `${provider} API call to ${endpoint} completed in ${duration}ms (${statusCode})`;

    if (statusCode >= 400) {
      logger.warn(LogCategory.AUTH, message, sanitizedContext);
    } else {
      logger.debug(LogCategory.AUTH, message, sanitizedContext);
    }
  }

  /**
   * Determine error severity based on error type
   */
  private static getErrorSeverity(error: Error): ErrorSeverity {
    if (error instanceof ProviderAPIError) {
      return ErrorSeverity.HIGH;
    }

    if (error instanceof RequestTimeoutError || error instanceof RateLimitError) {
      return ErrorSeverity.MEDIUM;
    }

    if (error instanceof TokenVerificationError) {
      return ErrorSeverity.LOW;
    }

    // Unknown errors are treated as high severity
    return ErrorSeverity.HIGH;
  }

  /**
   * Build comprehensive error context
   */
  private static buildErrorContext(
    error: Error,
    req?: Request,
    additionalContext?: Record<string, any>
  ): Record<string, any> {
    const context: Record<string, any> = {
      errorType: error.name,
      operation: 'token_verification',
      ...additionalContext
    };

    // Add provider information if available
    if (error instanceof TokenVerificationError && error.provider) {
      context.provider = error.provider;
    } else if (error instanceof ProviderAPIError) {
      context.provider = error.provider;
      context.apiStatusCode = error.apiStatusCode;
    }

    // Add request information (without sensitive data)
    if (req) {
      context.hasAuthHeader = !!req.headers.authorization;
      context.authHeaderFormat = req.headers.authorization?.startsWith('Bearer ') ? 'Bearer' : 'Other';
      context.userAgent = req.get('User-Agent');
      context.requestId = req.headers['x-request-id'] || 'unknown';
    }

    // Add error-specific context
    if (error instanceof ProviderAPIError) {
      context.originalErrorMessage = error.originalError.message;
      context.originalErrorName = error.originalError.name;
    }

    return context;
  }

  /**
   * Remove sensitive information from context
   */
  private static sanitizeContext(context: Record<string, any>): Record<string, any> {
    const sanitized = { ...context };

    // Remove any keys that might contain sensitive information
    const sensitiveKeys = ['token', 'authorization', 'password', 'secret', 'key'];
    
    for (const key of Object.keys(sanitized)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    // Sanitize nested objects
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeContext(value);
      }
    }

    return sanitized;
  }

  /**
   * Log with request context
   */
  private static logWithRequestContext(
    requestLogger: any,
    error: Error,
    severity: ErrorSeverity,
    context: Record<string, any>
  ): void {
    const message = `Token verification failed: ${error.message}`;

    switch (severity) {
      case ErrorSeverity.LOW:
        requestLogger.info(LogCategory.AUTH, message, context);
        break;
      case ErrorSeverity.MEDIUM:
        requestLogger.warn(LogCategory.AUTH, message, context);
        break;
      case ErrorSeverity.HIGH:
        requestLogger.error(LogCategory.AUTH, message, error, context);
        break;
    }
  }

  /**
   * Log without request context
   */
  private static logWithoutRequestContext(
    error: Error,
    severity: ErrorSeverity,
    context: Record<string, any>
  ): void {
    const message = `Token verification failed: ${error.message}`;

    switch (severity) {
      case ErrorSeverity.LOW:
        logger.info(LogCategory.AUTH, message, context);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(LogCategory.AUTH, message, context);
        break;
      case ErrorSeverity.HIGH:
        logger.error(LogCategory.AUTH, message, error, context);
        break;
    }
  }
}

/**
 * Convenience function for logging token verification errors
 */
export function logTokenVerificationError(
  error: TokenVerificationError | ProviderAPIError | Error,
  req?: Request,
  additionalContext?: Record<string, any>
): void {
  TokenVerificationErrorLogger.logError(error, req, additionalContext);
}

/**
 * Convenience function for logging successful token verification
 */
export function logTokenVerificationSuccess(
  provider: string,
  req?: Request,
  additionalContext?: Record<string, any>
): void {
  TokenVerificationErrorLogger.logSuccess(provider, req, additionalContext);
}

/**
 * Convenience function for logging cache operations
 */
export function logCacheOperation(
  operation: 'hit' | 'miss' | 'set' | 'cleanup',
  provider?: string,
  additionalContext?: Record<string, any>
): void {
  TokenVerificationErrorLogger.logCacheOperation(operation, provider, additionalContext);
}

/**
 * Convenience function for logging provider API calls
 */
export function logProviderAPICall(
  provider: string,
  endpoint: string,
  statusCode: number,
  duration: number,
  additionalContext?: Record<string, any>
): void {
  TokenVerificationErrorLogger.logProviderAPICall(provider, endpoint, statusCode, duration, additionalContext);
}