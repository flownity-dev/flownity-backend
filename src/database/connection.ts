import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config/index.js';
import { DatabaseError, ConfigurationError } from '../errors/index.js';
import { logger } from '../utils/index.js';

export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}

class DatabaseConnection {
    private static pool: Pool | null = null;

    static async initialize(): Promise<void> {
        if (this.pool) {
            return;
        }

        // Validate configuration
        this.validateConfig();

        const dbConfig: DatabaseConfig = {
            host: config.DATABASE_HOST,
            port: config.DATABASE_PORT,
            database: config.DATABASE_NAME,
            user: config.DATABASE_USER,
            password: config.DATABASE_PASSWORD
        };

        this.pool = new Pool({
            ...dbConfig,
            max: 20, // Maximum number of clients in the pool
            idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
            connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
            ssl: config.NODE_ENV === 'production' || dbConfig.host.includes('.render.com') ? {
                rejectUnauthorized: false // Required for cloud databases like Render
            } : false
        });

        // Test the connection
        try {
            const startTime = Date.now();
            const client = await this.pool.connect();
            const duration = Date.now() - startTime;

            logger.database('Database connection established successfully', {
                operation: 'connect',
                duration,
                host: dbConfig.host,
                database: dbConfig.database,
                port: dbConfig.port
            });

            client.release();
        } catch (error) {
            logger.database('Failed to connect to database', {
                operation: 'connect',
                error: error instanceof Error ? error.message : String(error),
                host: dbConfig.host,
                database: dbConfig.database,
                port: dbConfig.port
            });

            throw new DatabaseError(
                'Failed to establish database connection. Please check your database configuration and ensure the database server is running.',
                503,
                'DB_CONNECTION_FAILED'
            );
        }

        // Handle pool errors
        this.pool.on('error', (err) => {
            logger.database('Unexpected error on idle database client', {
                operation: 'pool_error',
                error: err.message
            });
            // Don't throw here as this is an event handler
        });
    }

    static async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
        if (!this.pool) {
            throw new DatabaseError(
                'Database not initialized. Call initialize() first.',
                500,
                'DB_NOT_INITIALIZED'
            );
        }

        const startTime = Date.now();

        try {
            const result = await this.pool.query<T>(text, params);
            const duration = Date.now() - startTime;

            logger.database('Database query executed successfully', {
                operation: 'query',
                duration,
                rowsAffected: result.rowCount || 0,
                query: text.substring(0, 100) + (text.length > 100 ? '...' : ''), // Truncate long queries
                hasParams: !!params && params.length > 0
            });

            return result;
        } catch (error) {
            const duration = Date.now() - startTime;

            logger.database('Database query failed', {
                operation: 'query',
                duration,
                query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                hasParams: !!params && params.length > 0,
                error: error instanceof Error ? error.message : String(error)
            });

            // Handle specific PostgreSQL errors
            if (error && typeof error === 'object' && 'code' in error) {
                const pgError = error as any;
                switch (pgError.code) {
                    case '23505': // Unique violation
                        throw new DatabaseError(
                            'A record with this information already exists.',
                            409,
                            'DB_UNIQUE_VIOLATION'
                        );
                    case '23503': // Foreign key violation
                        throw new DatabaseError(
                            'Referenced record does not exist.',
                            400,
                            'DB_FOREIGN_KEY_VIOLATION'
                        );
                    case '23502': // Not null violation
                        throw new DatabaseError(
                            'Required field is missing.',
                            400,
                            'DB_NOT_NULL_VIOLATION'
                        );
                    case '42P01': // Undefined table
                        throw new DatabaseError(
                            'Database schema is not properly initialized.',
                            500,
                            'DB_SCHEMA_ERROR'
                        );
                    case '28P01': // Invalid password
                    case '28000': // Invalid authorization
                        throw new DatabaseError(
                            'Database authentication failed.',
                            503,
                            'DB_AUTH_FAILED'
                        );
                    case '3D000': // Invalid catalog name (database doesn't exist)
                        throw new DatabaseError(
                            'Database does not exist.',
                            503,
                            'DB_NOT_FOUND'
                        );
                    case '08006': // Connection failure
                    case '08001': // Unable to connect
                        throw new DatabaseError(
                            'Unable to connect to database.',
                            503,
                            'DB_CONNECTION_ERROR'
                        );
                    default:
                        throw new DatabaseError(
                            'Database operation failed.',
                            500,
                            'DB_QUERY_ERROR'
                        );
                }
            }

            // Generic database error
            throw new DatabaseError(
                'Database operation failed.',
                500,
                'DB_UNKNOWN_ERROR'
            );
        }
    }

    static async getClient(): Promise<PoolClient> {
        if (!this.pool) {
            throw new DatabaseError(
                'Database not initialized. Call initialize() first.',
                500,
                'DB_NOT_INITIALIZED'
            );
        }

        try {
            const client = await this.pool.connect();
            logger.database('Database client acquired from pool', {
                operation: 'getClient'
            });
            return client;
        } catch (error) {
            logger.database('Failed to get database client from pool', {
                operation: 'getClient',
                error: error instanceof Error ? error.message : String(error)
            });
            throw new DatabaseError(
                'Unable to get database connection.',
                503,
                'DB_CLIENT_ERROR'
            );
        }
    }

    static async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
            logger.database('Database connection pool closed', {
                operation: 'close'
            });
        }
    }

    static isInitialized(): boolean {
        return this.pool !== null;
    }

    /**
     * Validate database configuration
     */
    private static validateConfig(): void {
        const requiredFields = [
            'DATABASE_HOST',
            'DATABASE_PORT',
            'DATABASE_NAME',
            'DATABASE_USER',
            'DATABASE_PASSWORD'
        ];

        const missingFields = requiredFields.filter(field => {
            const value = config[field as keyof typeof config];
            return !value || (typeof value === 'string' && value.trim() === '');
        });

        if (missingFields.length > 0) {
            throw new ConfigurationError(
                `Missing required database configuration: ${missingFields.join(', ')}`,
                500,
                'DB_CONFIG_MISSING'
            );
        }

        // Validate port is a number
        if (isNaN(config.DATABASE_PORT) || config.DATABASE_PORT <= 0) {
            throw new ConfigurationError(
                'DATABASE_PORT must be a valid positive number',
                500,
                'DB_CONFIG_INVALID_PORT'
            );
        }
    }
}

export default DatabaseConnection;