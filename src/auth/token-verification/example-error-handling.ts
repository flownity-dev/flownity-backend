/**
 * Example usage of comprehensive error handling for token verification
 */

import { Request, Response, NextFunction } from 'express';
import { 
  TokenVerificationErrorFactory,
  TokenVerificationErrorLogger,
  logTokenVerificationError,
  logTokenVerificationSuccess
} from './index.js';

/**
 * Example middleware demonstrating comprehensive error handling
 */
export function exampleTokenVerificationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // Example: Extract token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      const error = TokenVerificationErrorFactory.missingAuthHeader();
      logTokenVerificationError(error, req);
      throw error;
    }

    if (!authHeader.startsWith('Bearer ')) {
      const error = TokenVerificationErrorFactory.invalidAuthHeaderFormat();
      logTokenVerificationError(error, req);
      throw error;
    }

    const token = authHeader.substring(7);
    
    if (!token || token.trim().length === 0) {
      const error = TokenVerificationErrorFactory.malformedToken();
      logTokenVerificationError(error, req);
      throw error;
    }

    // Example: Provider identification
    const provider = identifyProvider(token);
    
    if (!provider) {
      const error = TokenVerificationErrorFactory.unknownProvider();
      logTokenVerificationError(error, req);
      throw error;
    }

    // Example: Check if provider is allowed
    const allowedProviders = ['github', 'google'];
    if (!allowedProviders.includes(provider)) {
      const error = TokenVerificationErrorFactory.restrictedProvider(provider);
      logTokenVerificationError(error, req, { allowedProviders });
      throw error;
    }

    // Example: Simulate successful verification
    logTokenVerificationSuccess(provider, req, { tokenLength: token.length });
    
    // Attach user to request (example)
    (req as any).tokenUser = {
      provider: provider as 'github' | 'google',
      id: 'example-user-id',
      username: 'example-user',
      email: 'user@example.com'
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Example function demonstrating provider API error handling
 */
export async function exampleProviderAPICall(provider: string, token: string): Promise<any> {
  const startTime = Date.now();
  
  try {
    // Simulate API call
    const response = await simulateProviderAPICall(provider, token);
    const duration = Date.now() - startTime;
    
    TokenVerificationErrorLogger.logProviderAPICall(
      provider,
      '/user',
      response.status,
      duration
    );

    if (response.status >= 400) {
      const error = TokenVerificationErrorFactory.fromHttpStatus(
        provider,
        response.status,
        response.body
      );
      throw error;
    }

    return response.body;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    if (error instanceof Error) {
      TokenVerificationErrorLogger.logProviderAPICall(
        provider,
        '/user',
        0,
        duration,
        { error: error.message }
      );
    }
    
    throw error;
  }
}

/**
 * Example function demonstrating cache error handling
 */
export function exampleCacheOperation(token: string, provider: string): any {
  try {
    // Simulate cache lookup
    const cacheKey = `token:${provider}:${hashToken(token)}`;
    const cachedResult = getFromCache(cacheKey);
    
    if (cachedResult) {
      TokenVerificationErrorLogger.logCacheOperation('hit', provider);
      return cachedResult;
    }

    TokenVerificationErrorLogger.logCacheOperation('miss', provider);
    
    // Simulate getting fresh data
    const freshData = { user: 'example-user' };
    
    // Cache the result
    setInCache(cacheKey, freshData, 300); // 5 minutes
    TokenVerificationErrorLogger.logCacheOperation('set', provider, { ttl: 300 });
    
    return freshData;
  } catch (error) {
    // Cache errors shouldn't break the flow, just log them
    logTokenVerificationError(
      error instanceof Error ? error : new Error('Cache operation failed'),
      undefined,
      { operation: 'cache', provider }
    );
    
    // Return null to indicate cache miss
    return null;
  }
}

/**
 * Helper functions for examples
 */

function identifyProvider(token: string): string | null {
  if (token.startsWith('ghp_') || token.startsWith('ghs_')) {
    return 'github';
  }
  if (token.startsWith('ya29.')) {
    return 'google';
  }
  return null;
}

async function simulateProviderAPICall(provider: string, token: string): Promise<{ status: number; body: any }> {
  // Simulate different response scenarios
  if (token === 'invalid-token') {
    return { status: 401, body: { message: 'Invalid token' } };
  }
  if (token === 'expired-token') {
    return { status: 401, body: { message: 'Token expired' } };
  }
  if (token === 'rate-limited-token') {
    return { status: 429, body: { message: 'Rate limit exceeded' } };
  }
  if (token === 'server-error-token') {
    return { status: 500, body: { message: 'Internal server error' } };
  }
  
  // Simulate successful response
  return {
    status: 200,
    body: {
      id: 'user-123',
      login: 'example-user',
      email: 'user@example.com'
    }
  };
}

function hashToken(token: string): string {
  // Simple hash for example (in real implementation, use crypto)
  return Buffer.from(token).toString('base64').substring(0, 16);
}

function getFromCache(key: string): any {
  // Simulate cache lookup
  return null;
}

function setInCache(key: string, value: any, ttl: number): void {
  // Simulate cache set
}

/**
 * Example error handling in route handler
 */
export function exampleRouteHandler(req: Request, res: Response, next: NextFunction): void {
  try {
    // Route logic here
    res.json({ 
      message: 'Success',
      user: (req as any).tokenUser 
    });
  } catch (error) {
    // Let the global error handler deal with it
    next(error);
  }
}