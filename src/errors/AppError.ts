/**
 * Base application error class
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly errorCode?: string;

    constructor(
        message: string,
        statusCode: number = 500,
        isOperational: boolean = true,
        errorCode?: string
    ) {
        super(message);

        this.statusCode = statusCode;
        this.isOperational = isOperational;
        if (errorCode !== undefined) {
            this.errorCode = errorCode;
        }

        // Maintains proper stack trace for where our error was thrown
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * OAuth-related errors
 */
export class OAuthError extends AppError {
    code: string | undefined;
    constructor(message: string, statusCode: number = 401, errorCode?: string) {
        super(message, statusCode, true, errorCode);
        this.name = 'OAuthError';
    }
}

/**
 * Database-related errors
 */
export class DatabaseError extends AppError {
    constructor(message: string, statusCode: number = 500, errorCode?: string) {
        super(message, statusCode, true, errorCode);
        this.name = 'DatabaseError';
    }
}

/**
 * Session-related errors
 */
export class SessionError extends AppError {
    constructor(message: string, statusCode: number = 401, errorCode?: string) {
        super(message, statusCode, true, errorCode);
        this.name = 'SessionError';
    }
}

/**
 * Authentication-related errors
 */
export class AuthenticationError extends AppError {
    constructor(message: string, statusCode: number = 401, errorCode?: string) {
        super(message, statusCode, true, errorCode);
        this.name = 'AuthenticationError';
    }
}

/**
 * Configuration-related errors
 */
export class ConfigurationError extends AppError {
    constructor(message: string, statusCode: number = 500, errorCode?: string) {
        super(message, statusCode, false, errorCode); // Not operational - system issue
        this.name = 'ConfigurationError';
    }
}

/**
 * Validation-related errors
 */
export class ValidationError extends AppError {
    constructor(message: string, statusCode: number = 400, errorCode?: string) {
        super(message, statusCode, true, errorCode);
        this.name = 'ValidationError';
    }
}