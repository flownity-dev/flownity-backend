/**
 * HTTP client with retry logic and timeout handling for OAuth provider API calls
 */

import type { HTTPClientConfig, Provider } from './types.js';
import { RequestTimeoutError, RateLimitError, TokenVerificationError } from './errors.js';
import { loadTokenVerificationConfig } from './config.js';

/**
 * HTTP client class with built-in retry logic and timeout handling
 */
export class HTTPClient {
    private readonly config: HTTPClientConfig;
    private readonly provider: Provider;

    constructor(provider: Provider, config?: Partial<HTTPClientConfig>) {
        this.provider = provider;
        const globalConfig = loadTokenVerificationConfig();
        this.config = {
            timeout: globalConfig.requestTimeout,
            retries: globalConfig.retryAttempts,
            retryDelay: 1000, // 1 second base delay
            ...config
        };
    }

    /**
     * Make a GET request with retry logic and timeout handling
     */
    async get<T>(url: string, headers: Record<string, string> = {}): Promise<T> {
        return this.retry(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);
                return response;
            } catch (error) {
                clearTimeout(timeoutId);

                if (error instanceof Error && error.name === 'AbortError') {
                    throw new RequestTimeoutError(this.provider);
                }
                throw error;
            }
        });
    }

    /**
     * Retry logic with exponential backoff
     */
    private async retry<T>(requestFn: () => Promise<Response>): Promise<T> {
        let lastError: Error;

        for (let attempt = 0; attempt <= this.config.retries; attempt++) {
            try {
                const response = await requestFn();
                
                // Let the caller handle the response parsing and error handling
                // This allows provider-specific error handling while centralizing retry logic
                return response as T;
            } catch (error) {
                lastError = error as Error;

                // Don't retry on client errors (4xx) except for rate limiting
                if (error instanceof TokenVerificationError &&
                    error.statusCode >= 400 &&
                    error.statusCode < 500 &&
                    !(error instanceof RateLimitError)) {
                    throw error;
                }

                // Don't retry on the last attempt
                if (attempt === this.config.retries) {
                    break;
                }

                // Calculate delay with exponential backoff
                const delay = this.config.retryDelay * Math.pow(2, attempt);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw lastError!;
    }

    /**
     * Create a new HTTPClient instance with custom configuration
     */
    static create(provider: Provider, config?: Partial<HTTPClientConfig>): HTTPClient {
        return new HTTPClient(provider, config);
    }

    /**
     * Get the current configuration
     */
    getConfig(): HTTPClientConfig {
        return { ...this.config };
    }
}