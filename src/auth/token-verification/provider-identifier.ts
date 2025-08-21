/**
 * Provider identification system for OAuth tokens
 * Identifies OAuth providers based on token patterns and formats
 */

import type { Provider, ProviderPattern } from './types.js';

/**
 * ProviderIdentifier class handles automatic identification of OAuth providers
 * based on token patterns and formats
 */
export class ProviderIdentifier {
  /**
   * Token patterns for different OAuth providers
   * Ordered by priority (GitHub first, then Google)
   */
  private static readonly patterns: ProviderPattern[] = [
    {
      name: 'github',
      // GitHub personal access tokens: gh[ps]_ followed by 36-255 characters
      // ghp_ = personal access token, ghs_ = server-to-server token
      pattern: /^gh[ps]_[A-Za-z0-9_]{36,255}$/,
      priority: 1
    },
    {
      name: 'google',
      // Google OAuth 2.0 access tokens: ya29. followed by base64url characters
      pattern: /^ya29\.[A-Za-z0-9_-]+$/,
      priority: 2
    }
  ];

  /**
   * Identifies the OAuth provider based on token format
   * @param token - The OAuth token to identify
   * @returns The identified provider or null if no match found
   */
  static identifyProvider(token: string): Provider | null {
    // Validate input
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return null;
    }

    // Trim whitespace from token
    const cleanToken = token.trim();

    // Check each pattern in priority order
    for (const pattern of this.patterns) {
      if (pattern.pattern.test(cleanToken)) {
        return pattern.name;
      }
    }

    // No matching pattern found
    return null;
  }

  /**
   * Gets all supported provider patterns
   * @returns Array of provider patterns
   */
  static getSupportedPatterns(): readonly ProviderPattern[] {
    return [...this.patterns];
  }

  /**
   * Checks if a provider is supported
   * @param provider - The provider to check
   * @returns True if the provider is supported
   */
  static isProviderSupported(provider: string): provider is Provider {
    return this.patterns.some(pattern => pattern.name === provider);
  }

  /**
   * Gets the pattern for a specific provider
   * @param provider - The provider to get the pattern for
   * @returns The provider pattern or undefined if not found
   */
  static getPatternForProvider(provider: Provider): ProviderPattern | undefined {
    return this.patterns.find(pattern => pattern.name === provider);
  }

  /**
   * Validates token format for a specific provider
   * @param token - The token to validate
   * @param provider - The expected provider
   * @returns True if the token matches the provider's pattern
   */
  static validateTokenForProvider(token: string, provider: Provider): boolean {
    const pattern = this.getPatternForProvider(provider);
    if (!pattern) {
      return false;
    }

    return pattern.pattern.test(token.trim());
  }
}