/**
 * Google token verification implementation
 */

import type { VerifiedUser, GoogleTokenInfoResponse, HTTPClientConfig } from './types.js';
import { ProviderAPIError, RateLimitError, TokenVerificationError } from './errors.js';
import { HTTPClient } from './http-client.js';
import { loadTokenVerificationConfig } from './config.js';

/**
 * Google token verifier class
 */
export class GoogleTokenVerifier {
    private static readonly TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';

    private static getDefaultConfig(): HTTPClientConfig {
        const globalConfig = loadTokenVerificationConfig();
        return {
            timeout: globalConfig.requestTimeout,
            retries: globalConfig.retryAttempts,
            retryDelay: 1000 // 1 second base delay
        };
    }

    /**
     * Verify a Google token and return user information
     */
    static async verifyToken(token: string, config?: Partial<HTTPClientConfig>): Promise<VerifiedUser> {
        const finalConfig = { ...this.getDefaultConfig(), ...config };

        try {
            const googleUser = await this.callGoogleTokenInfo(token, finalConfig);
            return this.transformToVerifiedUser(googleUser);
        } catch (error) {
            if (error instanceof TokenVerificationError) {
                throw error;
            }
            throw new ProviderAPIError('google', error as Error);
        }
    }

    /**
     * Make API call to Google tokeninfo endpoint with retry logic
     */
    private static async callGoogleTokenInfo(token: string, config: HTTPClientConfig): Promise<GoogleTokenInfoResponse> {
        const url = `${this.TOKENINFO_URL}?access_token=${encodeURIComponent(token)}`;

        const httpClient = HTTPClient.create('google', config);
        const response = await httpClient.get<Response>(url);
        return await this.handleGoogleResponse(response);
    }

    /**
     * Handle Google API response and extract token info
     */
    private static async handleGoogleResponse(response: Response): Promise<GoogleTokenInfoResponse> {
        if (response.ok) {
            const data = await response.json() as GoogleTokenInfoResponse;

            // Validate that the token is not expired
            const now = Math.floor(Date.now() / 1000);
            if (data.exp && data.exp < now) {
                throw new TokenVerificationError('Google token has expired', 401, 'google');
            }

            return data;
        }

        // Handle specific Google API error responses
        switch (response.status) {
            case 400:
                // Google returns 400 for invalid tokens
                throw new TokenVerificationError('Invalid Google token format', 401, 'google');
            case 401:
                throw new TokenVerificationError('Invalid or expired Google token', 401, 'google');
            case 403:
                throw new TokenVerificationError('Google token lacks required permissions', 403, 'google');
            case 429:
                throw new RateLimitError('google');
            case 500:
            case 502:
            case 503:
            case 504:
                throw new ProviderAPIError('google', new Error(`Google API server error: ${response.status}`));
            default:
                throw new ProviderAPIError('google', new Error(`Unexpected Google API response: ${response.status}`));
        }
    }

    /**
     * Transform Google tokeninfo response to VerifiedUser format
     */
    private static transformToVerifiedUser(googleUser: GoogleTokenInfoResponse): VerifiedUser {
        const user: VerifiedUser = {
            provider: 'google',
            id: googleUser.sub,
            username: googleUser.email?.split('@')[0] || googleUser.sub
        };

        // Only add optional properties if they have values
        if (googleUser.email) {
            user.email = googleUser.email;
        }
        if (googleUser.name) {
            user.name = googleUser.name;
        }
        if (googleUser.picture) {
            user.avatarUrl = googleUser.picture;
        }

        return user;
    }


}