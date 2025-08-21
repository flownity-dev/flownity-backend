/**
 * Main token verification middleware
 * Provides Express middleware for OAuth token verification with configurable options
 */

import type { Request, Response, NextFunction } from 'express';
import type { TokenVerificationOptions, VerifiedUser, Provider } from './types.js';
import { extractAndValidateToken } from './token-extraction.js';
import { ProviderIdentifier } from './provider-identifier.js';
import { TokenCache } from './token-cache.js';
import { GitHubTokenVerifier } from './github-verifier.js';
import { GoogleTokenVerifier } from './google-verifier.js';
import { loadTokenVerificationConfig, mergeConfig } from './config.js';
import {
  TokenExtractionError,
  ProviderIdentificationError,
  RestrictedProviderError,
  ConfigurationError
} from './errors.js';

// Extend Express Request interface to include token user context
declare global {
  namespace Express {
    interface Request {
      tokenUser?: VerifiedUser;
    }
  }
}

/**
 * Valid providers that can be used for token verification
 */
const VALID_PROVIDERS: Provider[] = ['github', 'google'];

/**
 * Load global configuration from environment variables
 */
const GLOBAL_CONFIG = loadTokenVerificationConfig();

/**
 * Default configuration for token verification middleware options
 */
const DEFAULT_MIDDLEWARE_OPTIONS: Required<TokenVerificationOptions> = {
  required: true,
  providers: ['github', 'google'],
  cacheTimeout: GLOBAL_CONFIG.cacheTimeout,
  requestTimeout: GLOBAL_CONFIG.requestTimeout,
  retryAttempts: GLOBAL_CONFIG.retryAttempts
};

/**
 * Validates the providers list in configuration options
 * @param providers - Array of providers to validate
 * @throws ConfigurationError if any provider is invalid
 */
function validateProviders(providers: Provider[]): void {
  if (!Array.isArray(providers)) {
    throw new ConfigurationError('Providers must be an array');
  }

  if (providers.length === 0) {
    throw new ConfigurationError('At least one provider must be specified');
  }

  const invalidProviders = providers.filter(provider => !VALID_PROVIDERS.includes(provider));
  if (invalidProviders.length > 0) {
    throw new ConfigurationError(`Invalid providers: ${invalidProviders.join(', ')}. Valid providers are: ${VALID_PROVIDERS.join(', ')}`);
  }

  // Check for duplicates
  const uniqueProviders = new Set(providers);
  if (uniqueProviders.size !== providers.length) {
    throw new ConfigurationError('Duplicate providers are not allowed');
  }
}

/**
 * Creates token verification middleware with configurable options
 * @param options - Configuration options for token verification
 * @returns Express middleware function
 */
export function verifyToken(options: TokenVerificationOptions = {}): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  // Validate configuration options
  if (options.providers) {
    validateProviders(options.providers);
  }

  const config = { ...DEFAULT_MIDDLEWARE_OPTIONS, ...options };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Step 1: Extract token from request
      let token: string;
      try {
        token = extractAndValidateToken(req);
      } catch (error) {
        if (!config.required && (error instanceof TokenExtractionError)) {
          // In optional mode, continue without user context if no token provided
          return next();
        }
        throw error;
      }

      // Step 2: Check cache first
      const cachedUser = TokenCache.get(token);
      if (cachedUser) {
        // Verify provider is allowed (providers list is always validated to have at least one element)
        if (!config.providers.includes(cachedUser.provider)) {
          throw new RestrictedProviderError(cachedUser.provider);
        }
        
        req.tokenUser = cachedUser;
        return next();
      }

      // Step 3: Identify provider
      const provider = ProviderIdentifier.identifyProvider(token);
      if (!provider) {
        throw new ProviderIdentificationError('Unable to identify token provider from token format');
      }

      // Step 4: Check if provider is allowed (providers list is always validated to have at least one element)
      if (!config.providers.includes(provider)) {
        throw new RestrictedProviderError(provider);
      }

      // Step 5: Verify token with provider
      const user = await verifyTokenWithProvider(token, provider, config);

      // Step 6: Cache the result
      TokenCache.set(token, user, config.cacheTimeout);

      // Step 7: Attach user to request context
      req.tokenUser = user;

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Verifies token with the appropriate provider
 * @param token - The token to verify
 * @param provider - The identified provider
 * @param config - Configuration options
 * @returns Promise resolving to verified user information
 */
async function verifyTokenWithProvider(
  token: string,
  provider: Provider,
  config: Required<TokenVerificationOptions>
): Promise<VerifiedUser> {
  const httpConfig = {
    timeout: config.requestTimeout,
    retries: config.retryAttempts,
    retryDelay: 1000 // 1 second base delay
  };

  switch (provider) {
    case 'github':
      return await GitHubTokenVerifier.verifyToken(token, httpConfig);
    case 'google':
      return await GoogleTokenVerifier.verifyToken(token, httpConfig);
    default:
      throw new ProviderIdentificationError(`Unsupported provider: ${provider}`);
  }
}

/**
 * Middleware factory for required token verification (default behavior)
 * @param options - Configuration options
 * @returns Express middleware function
 */
export function requireToken(options: Omit<TokenVerificationOptions, 'required'> = {}): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return verifyToken({ ...options, required: true });
}

/**
 * Middleware factory for optional token verification
 * @param options - Configuration options
 * @returns Express middleware function
 */
export function optionalToken(options: Omit<TokenVerificationOptions, 'required'> = {}): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return verifyToken({ ...options, required: false });
}

/**
 * Middleware factory for GitHub-only token verification
 * @param options - Configuration options
 * @returns Express middleware function
 */
export function requireGitHubToken(options: Omit<TokenVerificationOptions, 'providers'> = {}): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return verifyToken({ ...options, providers: ['github'] });
}

/**
 * Middleware factory for Google-only token verification
 * @param options - Configuration options
 * @returns Express middleware function
 */
export function requireGoogleToken(options: Omit<TokenVerificationOptions, 'providers'> = {}): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  return verifyToken({ ...options, providers: ['google'] });
}

/**
 * Helper function to get authenticated user from either session or token
 * @param req - Express request object
 * @returns User information from session or token authentication, or undefined if not authenticated
 */
export function getAuthenticatedUser(req: Request): VerifiedUser | Express.User | undefined {
  // Prefer token user if available (more recent authentication)
  if (req.tokenUser) {
    return req.tokenUser;
  }
  
  // Fall back to session user
  if (req.user) {
    return req.user;
  }
  
  return undefined;
}

/**
 * Helper function to check if request has any form of authentication
 * @param req - Express request object
 * @returns True if user is authenticated via session or token
 */
export function isAuthenticated(req: Request): boolean {
  return !!(req.tokenUser || (req.isAuthenticated && req.isAuthenticated()));
}