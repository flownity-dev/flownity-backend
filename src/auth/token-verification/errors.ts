/**
 * Custom error classes for token verification failures
 */

import { AppError } from '../../errors/AppError.js';

/**
 * Base error class for token verification failures
 */
export class TokenVerificationError extends AppError {
  public readonly provider?: string;

  constructor(message: string, statusCode: number, provider?: string) {
    super(message, statusCode);
    this.name = 'TokenVerificationError';
    if (provider !== undefined) {
      this.provider = provider;
    }
  }
}

/**
 * Error class for provider API failures
 */
export class ProviderAPIError extends AppError {
  public readonly provider: string;
  public readonly originalError: Error;
  public readonly apiStatusCode?: number;
  public readonly apiResponse?: any;

  constructor(provider: string, originalError: Error, apiStatusCode?: number, apiResponse?: any) {
    super(`${provider} API error: ${originalError.message}`, 503);
    this.name = 'ProviderAPIError';
    this.provider = provider;
    this.originalError = originalError;
    if (apiStatusCode !== undefined) {
      this.apiStatusCode = apiStatusCode;
    }
    if (apiResponse !== undefined) {
      this.apiResponse = apiResponse;
    }
  }

  /**
   * Create ProviderAPIError from HTTP response
   */
  static fromResponse(provider: string, statusCode: number, responseBody?: any): ProviderAPIError {
    const message = `HTTP ${statusCode}${responseBody?.message ? `: ${responseBody.message}` : ''}`;
    const error = new Error(message);
    return new ProviderAPIError(provider, error, statusCode, responseBody);
  }
}

/**
 * Error class for token extraction failures
 */
export class TokenExtractionError extends TokenVerificationError {
  constructor(message: string) {
    super(message, 401);
    this.name = 'TokenExtractionError';
  }
}

/**
 * Error class for invalid token format
 */
export class InvalidTokenFormatError extends TokenVerificationError {
  constructor(message: string = 'Invalid token format') {
    super(message, 400);
    this.name = 'InvalidTokenFormatError';
  }
}

/**
 * Error class for provider identification failures
 */
export class ProviderIdentificationError extends TokenVerificationError {
  constructor(message: string = 'Unable to identify token provider') {
    super(message, 401);
    this.name = 'ProviderIdentificationError';
  }
}

/**
 * Error class for restricted provider access
 */
export class RestrictedProviderError extends TokenVerificationError {
  constructor(provider: string) {
    super(`Provider '${provider}' is not allowed`, 403, provider);
    this.name = 'RestrictedProviderError';
  }
}

/**
 * Error class for request timeout
 */
export class RequestTimeoutError extends TokenVerificationError {
  constructor(provider: string) {
    super(`Request to ${provider} API timed out`, 408, provider);
    this.name = 'RequestTimeoutError';
  }
}

/**
 * Error class for rate limiting
 */
export class RateLimitError extends TokenVerificationError {
  constructor(provider: string) {
    super(`Rate limit exceeded for ${provider} API`, 429, provider);
    this.name = 'RateLimitError';
  }
}

/**
 * Error class for configuration validation failures
 */
export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Utility functions for creating common token verification errors
 */
export class TokenVerificationErrorFactory {
  /**
   * Create error for missing Authorization header
   */
  static missingAuthHeader(): TokenExtractionError {
    return new TokenExtractionError('Authorization header is required');
  }

  /**
   * Create error for invalid Authorization header format
   */
  static invalidAuthHeaderFormat(): InvalidTokenFormatError {
    return new InvalidTokenFormatError('Authorization header must be in format: Bearer <token>');
  }

  /**
   * Create error for empty or malformed token
   */
  static malformedToken(): InvalidTokenFormatError {
    return new InvalidTokenFormatError('Token is empty or malformed');
  }

  /**
   * Create error for unknown token provider
   */
  static unknownProvider(): ProviderIdentificationError {
    return new ProviderIdentificationError('Unable to identify token provider from token format');
  }

  /**
   * Create error for restricted provider
   */
  static restrictedProvider(provider: string): RestrictedProviderError {
    return new RestrictedProviderError(provider);
  }

  /**
   * Create error for invalid token from provider API
   */
  static invalidToken(provider: string): TokenVerificationError {
    return new TokenVerificationError('Invalid or expired token', 401, provider);
  }

  /**
   * Create error for insufficient token permissions
   */
  static insufficientPermissions(provider: string): TokenVerificationError {
    return new TokenVerificationError('Token does not have required permissions', 403, provider);
  }

  /**
   * Create error for provider API timeout
   */
  static requestTimeout(provider: string): RequestTimeoutError {
    return new RequestTimeoutError(provider);
  }

  /**
   * Create error for provider API rate limiting
   */
  static rateLimited(provider: string): RateLimitError {
    return new RateLimitError(provider);
  }

  /**
   * Create error for provider API unavailability
   */
  static providerUnavailable(provider: string, statusCode?: number): ProviderAPIError {
    const message = `${provider} API is unavailable${statusCode ? ` (HTTP ${statusCode})` : ''}`;
    return new ProviderAPIError(provider, new Error(message), statusCode);
  }

  /**
   * Create error from HTTP response status code
   */
  static fromHttpStatus(provider: string, statusCode: number, responseBody?: any): TokenVerificationError {
    switch (statusCode) {
      case 401:
        return this.invalidToken(provider);
      case 403:
        return this.insufficientPermissions(provider);
      case 404:
        // GitHub sometimes returns 404 for invalid tokens
        return this.invalidToken(provider);
      case 408:
        return this.requestTimeout(provider);
      case 429:
        return this.rateLimited(provider);
      case 500:
      case 502:
      case 503:
      case 504:
        return this.providerUnavailable(provider, statusCode);
      default:
        return ProviderAPIError.fromResponse(provider, statusCode, responseBody);
    }
  }
}