import axios from 'axios';
import { logger } from './logger.js';

export interface HttpClientConfig {
    baseURL?: string;
    timeout?: number;
    defaultHeaders?: Record<string, string>;
}

export interface RequestOptions {
    headers?: any;
    bearerToken?: string;
    timeout?: number;
    params?: any;
    data?: any;
}

export class HttpClient {
    private client: any;

    constructor(config: HttpClientConfig = {}) {
        const axiosConfig: any = {
            timeout: config.timeout || 10000,
            headers: {
                'Content-Type': 'application/json',
                ...config.defaultHeaders
            }
        };

        // Only add baseURL if it's defined
        if (config.baseURL) {
            axiosConfig.baseURL = config.baseURL;
        }

        this.client = axios.create(axiosConfig);

        // Request interceptor for logging and token handling
        this.client.interceptors.request.use(
            (config: { method: string; url: any; baseURL: any; headers: { Authorization: any; }; }) => {
                logger.server('HTTP request initiated', {
                    method: config.method?.toUpperCase(),
                    url: config.url,
                    baseURL: config.baseURL,
                    hasAuth: !!config.headers?.Authorization
                });
                return config;
            },
            (error: { message: any; }) => {
                logger.server('HTTP request error', {
                    error: error.message,
                    success: false
                });
                return Promise.reject(error);
            }
        );

        // Response interceptor for logging
        this.client.interceptors.response.use(
            (response: { status: any; statusText: any; config: { url: any; }; }) => {
                logger.server('HTTP response received', {
                    status: response.status,
                    statusText: response.statusText,
                    url: response.config.url,
                    success: true
                });
                return response;
            },
            (error: { response: { status: any; statusText: any; }; config: { url: any; }; message: any; }) => {
                logger.server('HTTP response error', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    url: error.config?.url,
                    error: error.message,
                    success: false
                });
                return Promise.reject(error);
            }
        );
    }

    /**
     * Add bearer token to request headers
     */
    private addBearerToken(config: RequestOptions): any {
        if (config.bearerToken) {
            return {
                ...config,
                headers: {
                    ...config.headers,
                    Authorization: `Bearer ${config.bearerToken}`
                }
            };
        }
        return config;
    }

    /**
     * GET request with optional bearer token
     */
    async get<T = any>(url: string, options: RequestOptions = {}): Promise<any> {
        const config = this.addBearerToken(options);
        return this.client.get(url, config);
    }

    /**
     * POST request with optional bearer token
     */
    async post<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<any> {
        const config = this.addBearerToken(options);
        return this.client.post(url, data, config);
    }

    /**
     * PUT request with optional bearer token
     */
    async put<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<any> {
        const config = this.addBearerToken(options);
        return this.client.put(url, data, config);
    }

    /**
     * PATCH request with optional bearer token
     */
    async patch<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<any> {
        const config = this.addBearerToken(options);
        return this.client.patch(url, data, config);
    }

    /**
     * DELETE request with optional bearer token
     */
    async delete<T = any>(url: string, options: RequestOptions = {}): Promise<any> {
        const config = this.addBearerToken(options);
        return this.client.delete(url, config);
    }

    /**
     * Set default bearer token for all requests
     */
    setDefaultBearerToken(token: string): void {
        this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        logger.server('Default bearer token set', {
            action: 'set_default_token',
            hasToken: !!token
        });
    }

    /**
     * Remove default bearer token
     */
    removeDefaultBearerToken(): void {
        delete this.client.defaults.headers.common['Authorization'];
        logger.server('Default bearer token removed', {
            action: 'remove_default_token'
        });
    }
}

// Default HTTP client instance
export const httpClient = new HttpClient();

// Convenience functions using the default client
export const http = {
    get: <T = any>(url: string, options?: RequestOptions) => httpClient.get<T>(url, options),
    post: <T = any>(url: string, data?: any, options?: RequestOptions) => httpClient.post<T>(url, data, options),
    put: <T = any>(url: string, data?: any, options?: RequestOptions) => httpClient.put<T>(url, data, options),
    patch: <T = any>(url: string, data?: any, options?: RequestOptions) => httpClient.patch<T>(url, data, options),
    delete: <T = any>(url: string, options?: RequestOptions) => httpClient.delete<T>(url, options),
    setDefaultBearerToken: (token: string) => httpClient.setDefaultBearerToken(token),
    removeDefaultBearerToken: () => httpClient.removeDefaultBearerToken()
};

// Create a new HTTP client with custom configuration
export const createHttpClient = (config: HttpClientConfig) => new HttpClient(config);