/**
 * GitHub token verification implementation
 */

import type { VerifiedUser, GitHubUserResponse, HTTPClientConfig } from './types.js';
import { ProviderAPIError, RateLimitError, TokenVerificationError } from './errors.js';
import { HTTPClient } from './http-client.js';
import { loadTokenVerificationConfig } from './config.js';

/**
 * GitHub token verifier class
 */
export class GitHubTokenVerifier {
    private static readonly API_BASE_URL = 'https://api.github.com';
    private static readonly USER_ENDPOINT = '/user';

    private static getDefaultConfig(): HTTPClientConfig {
        const globalConfig = loadTokenVerificationConfig();
        return {
            timeout: globalConfig.requestTimeout,
            retries: globalConfig.retryAttempts,
            retryDelay: 1000 // 1 second base delay
        };
    }

    /**
     * Verify a GitHub token and return user information
     */
    static async verifyToken(token: string, config?: Partial<HTTPClientConfig>): Promise<VerifiedUser> {
        const finalConfig = { ...this.getDefaultConfig(), ...config };

        try {
            const githubUser = await this.callGitHubAPI(token, finalConfig);
            return this.transformToVerifiedUser(githubUser);
        } catch (error) {
            if (error instanceof TokenVerificationError) {
                throw error;
            }
            throw new ProviderAPIError('github', error as Error);
        }
    }

    /**
     * Make API call to GitHub user endpoint with retry logic
     */
    private static async callGitHubAPI(token: string, config: HTTPClientConfig): Promise<GitHubUserResponse> {
        const url = `${this.API_BASE_URL}${this.USER_ENDPOINT}`;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Flownity-Backend/1.0'
        };

        const httpClient = HTTPClient.create('github', config);
        const response = await httpClient.get<Response>(url, headers);
        return await this.handleGitHubResponse(response);
    }

    /**
     * Handle GitHub API response and extract user data
     */
    private static async handleGitHubResponse(response: Response): Promise<GitHubUserResponse> {
        if (response.ok) {
            const data = await response.json();
            return data as GitHubUserResponse;
        }

        // Handle specific GitHub API error responses
        switch (response.status) {
            case 401:
                throw new TokenVerificationError('Invalid or expired GitHub token', 401, 'github');
            case 403:
                // Check if it's rate limiting
                if (response.headers.get('x-ratelimit-remaining') === '0') {
                    throw new RateLimitError('github');
                }
                throw new TokenVerificationError('GitHub token lacks required permissions', 403, 'github');
            case 404:
                throw new TokenVerificationError('GitHub user not found', 404, 'github');
            case 500:
            case 502:
            case 503:
            case 504:
                throw new ProviderAPIError('github', new Error(`GitHub API server error: ${response.status}`));
            default:
                throw new ProviderAPIError('github', new Error(`Unexpected GitHub API response: ${response.status}`));
        }
    }

    /**
     * Transform GitHub user response to VerifiedUser format
     */
    private static transformToVerifiedUser(githubUser: GitHubUserResponse): VerifiedUser {
        const user: VerifiedUser = {
            provider: 'github',
            id: githubUser.id.toString(),
            username: githubUser.login,
            avatarUrl: githubUser.avatar_url
        };

        // Only add optional properties if they have values
        if (githubUser.email) {
            user.email = githubUser.email;
        }
        if (githubUser.name) {
            user.name = githubUser.name;
        }

        return user;
    }


}