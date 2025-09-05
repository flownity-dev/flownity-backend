import DatabaseConnection from '../database/connection.js';
import { DatabaseError, ValidationError } from '../errors/index.js';
import { logger } from '../utils/index.js';
import type { GitHubProfile, GoogleProfile, Provider } from '../types/common.js';

// Re-export for backward compatibility
export type { GitHubProfile, GoogleProfile } from '../types/common.js';

export interface UserRow {
    id: number;
    provider_id: string;
    provider: string;
    username: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    profile_picture_url: string | null;
    created_at: Date;
    updated_at: Date;
}

export class User {
    public readonly id: number;
    public readonly providerId: string;
    public readonly provider: string;
    public readonly username: string;
    public readonly firstName: string | null;
    public readonly lastName: string | null;
    public readonly email: string | null;
    public readonly profilePictureUrl: string | null;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;

    constructor(data: UserRow) {
        this.id = data.id;
        this.providerId = data.provider_id;
        this.provider = data.provider;
        this.username = data.username;
        this.firstName = data.first_name;
        this.lastName = data.last_name;
        this.email = data.email;
        this.profilePictureUrl = data.profile_picture_url;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    /**
     * Find a user by their provider ID and provider
     * @param providerId - The provider ID to search for
     * @param provider - The provider (default: 'github')
     * @returns User instance or null if not found
     */

    /**
     * Find a user by their numeric ID
     * @param id - The user ID to search for
     * @returns User instance or null if not found
     */
    static async findById(id: number | string): Promise<User | null> {
        const numericId = Number(id);
        if (!numericId || isNaN(numericId)) {
            throw new ValidationError('User ID is required and must be a valid number');
        }

        try {
            logger.database('Finding user by ID', {
                operation: 'findById',
                table: 'flwnty_users',
                userId: id
            });

            const query = 'SELECT * FROM flwnty_users WHERE id = $1';
            const result = await DatabaseConnection.query<UserRow>(query, [id]);

            const userRow = result.rows[0];
            if (!userRow) {
                logger.database('User not found by ID', {
                    operation: 'findById',
                    table: 'flwnty_users',
                    userId: id,
                    found: false
                });
                return null;
            }

            logger.database('User found by ID', {
                operation: 'findById',
                table: 'flwnty_users',
                userId: id,
                found: true,
                username: userRow.username
            });

            return new User(userRow);
        } catch (error) {
            if (error instanceof DatabaseError) {
                throw error;
            }

            logger.database('Error finding user by ID', {
                operation: 'findById',
                table: 'flwnty_users',
                userId: id,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to find user by ID',
                500,
                'USER_FIND_BY_ID_ERROR'
            );
        }
    }


    static async findByProviderId(providerId: string, provider: Provider = 'github'): Promise<User | null> {
        if (!providerId || typeof providerId !== 'string' || providerId.trim() === '') {
            throw new ValidationError('Provider ID is required and must be a non-empty string');
        }

        if (!provider || typeof provider !== 'string' || provider.trim() === '') {
            throw new ValidationError('Provider is required and must be a non-empty string');
        }

        try {
            logger.database('Finding user by provider ID', {
                operation: 'findByProviderId',
                table: 'flwnty_users',
                providerId: providerId.trim(),
                provider: provider.trim()
            });

            const query = 'SELECT * FROM flwnty_users WHERE provider_id = $1 AND provider = $2';
            const result = await DatabaseConnection.query<UserRow>(query, [providerId.trim(), provider.trim()]);

            const userRow = result.rows[0];
            if (!userRow) {
                logger.database('User not found by provider ID', {
                    operation: 'findByProviderId',
                    table: 'flwnty_users',
                    providerId: providerId.trim(),
                    provider: provider.trim(),
                    found: false
                });
                return null;
            }

            logger.database('User found by provider ID', {
                operation: 'findByProviderId',
                table: 'flwnty_users',
                providerId: providerId.trim(),
                provider: provider.trim(),
                found: true,
                userId: userRow.id,
                username: userRow.username
            });

            return new User(userRow);
        } catch (error) {
            // Re-throw DatabaseError as-is, wrap other errors
            if (error instanceof DatabaseError) {
                throw error;
            }

            logger.database('Error finding user by provider ID', {
                operation: 'findByProviderId',
                table: 'flwnty_users',
                providerId: providerId.trim(),
                provider: provider.trim(),
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to find user by provider ID',
                500,
                'USER_FIND_ERROR'
            );
        }
    }

    /**
     * Find a user by their GitHub ID (backward compatibility)
     * @param githubId - The GitHub ID to search for
     * @returns User instance or null if not found
     */
    static async findByGitHubId(githubId: string): Promise<User | null> {
        return this.findByProviderId(githubId, 'github');
    }

    /**
     * Find a user by their Google ID
     * @param googleId - The Google ID to search for
     * @returns User instance or null if not found
     */
    static async findByGoogleId(googleId: string): Promise<User | null> {
        return this.findByProviderId(googleId, 'google');
    }

    /**
     * Create a new user from OAuth profile
     * @param profile - OAuth profile data (GitHub or Google)
     * @param provider - The provider (default: 'github')
     * @returns New User instance
     */
    static async create(profile: GitHubProfile | GoogleProfile, provider: Provider = 'github'): Promise<User> {
        // Validate profile data
        if (!profile || typeof profile !== 'object') {
            throw new ValidationError('Profile data is required');
        }

        if (!profile.id || typeof profile.id !== 'string' || profile.id.trim() === '') {
            throw new ValidationError('Profile must have a valid provider ID');
        }

        // For GitHub profiles, username is required. For Google profiles, we'll use email or generate one
        const username = 'username' in profile
            ? profile.username
            : profile.emails?.[0]?.value?.split('@')[0] || `user_${profile.id}`;

        if (!username || typeof username !== 'string' || username.trim() === '') {
            throw new ValidationError('Profile must have a valid username or email');
        }

        try {
            logger.database('Creating new user from profile', {
                operation: 'create',
                table: 'flwnty_users',
                providerId: profile.id.trim(),
                provider: provider.trim(),
                username: username.trim()
            });

            // Extract name parts from displayName or name object
            let firstName: string | null = null;
            let lastName: string | null = null;

            if (profile.name?.givenName || profile.name?.familyName) {
                firstName = profile.name.givenName || null;
                lastName = profile.name.familyName || null;
            } else if (profile.displayName && ('username' in profile ? profile.displayName !== profile.username : true)) {
                const nameParts = profile.displayName.trim().split(' ');
                if (nameParts.length >= 2) {
                    firstName = nameParts[0] || null;
                    lastName = nameParts.slice(1).join(' ') || null;
                } else if (nameParts.length === 1) {
                    firstName = nameParts[0] || null;
                }
            }

            // Extract email from emails array
            const email = profile.emails && profile.emails.length > 0
                ? (profile.emails.find(e => e.verified)?.value || profile.emails[0]?.value || null)
                : null;

            // Extract profile picture URL
            const profilePictureUrl = profile.photos && profile.photos.length > 0
                ? (profile.photos[0]?.value || null)
                : null;

            const query = `
                INSERT INTO flwnty_users (
                    provider_id, provider, username, first_name, last_name, 
                    email, profile_picture_url
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;

            const values = [
                profile.id.trim(),
                provider.trim(),
                username.trim(),
                firstName,
                lastName,
                email,
                profilePictureUrl
            ];

            const result = await DatabaseConnection.query<UserRow>(query, values);

            const userRow = result.rows[0];
            if (!userRow) {
                throw new DatabaseError(
                    'Failed to create user - no data returned from database',
                    500,
                    'USER_CREATE_NO_DATA'
                );
            }

            logger.database('User created successfully', {
                operation: 'create',
                table: 'flwnty_users',
                providerId: profile.id.trim(),
                provider: provider.trim(),
                username: username.trim(),
                userId: userRow.id,
                success: true
            });

            return new User(userRow);
        } catch (error) {
            // Re-throw DatabaseError and ValidationError as-is
            if (error instanceof DatabaseError || error instanceof ValidationError) {
                throw error;
            }

            logger.database('Error creating user', {
                operation: 'create',
                table: 'flwnty_users',
                providerId: profile.id.trim(),
                provider: provider.trim(),
                username: username.trim(),
                error: error instanceof Error ? error.message : String(error)
            });

            // Handle specific database errors that might not be caught by connection layer
            if (error instanceof Error && error.message.includes('duplicate key')) {
                throw new DatabaseError(
                    'User with this provider ID already exists',
                    409,
                    'USER_ALREADY_EXISTS'
                );
            }

            throw new DatabaseError(
                'Failed to create user',
                500,
                'USER_CREATE_ERROR'
            );
        }
    }

    /**
     * Create a new user from Google profile
     * @param profile - Google profile data
     * @returns New User instance
     */
    static async createFromGoogle(profile: GoogleProfile): Promise<User> {
        return this.create(profile, 'google');
    }

    /**
     * Update the user's last login timestamp
     * @returns Updated User instance
     */
    async updateLastLogin(): Promise<User> {
        try {
            logger.database('Updating user last login timestamp', {
                operation: 'updateLastLogin',
                table: 'flwnty_users',
                userId: this.id,
                username: this.username
            });

            const query = `
                UPDATE flwnty_users 
                SET updated_at = CURRENT_TIMESTAMP 
                WHERE id = $1 
                RETURNING *
            `;

            const result = await DatabaseConnection.query<UserRow>(query, [this.id]);

            const userRow = result.rows[0];
            if (!userRow) {
                throw new DatabaseError(
                    'User not found during update - user may have been deleted',
                    404,
                    'USER_NOT_FOUND'
                );
            }

            logger.database('User last login updated successfully', {
                operation: 'updateLastLogin',
                table: 'flwnty_users',
                userId: this.id,
                username: this.username,
                success: true,
                updatedAt: userRow.updated_at
            });

            return new User(userRow);
        } catch (error) {
            // Re-throw DatabaseError as-is
            if (error instanceof DatabaseError) {
                throw error;
            }

            logger.database('Error updating user last login', {
                operation: 'updateLastLogin',
                table: 'flwnty_users',
                userId: this.id,
                username: this.username,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to update user last login',
                500,
                'USER_UPDATE_ERROR'
            );
        }
    }

    /**
     * Get user data as a plain object (useful for serialization)
     */
    toJSON(): UserRow {
        return {
            id: this.id,
            provider_id: this.providerId,
            provider: this.provider,
            username: this.username,
            first_name: this.firstName,
            last_name: this.lastName,
            email: this.email,
            profile_picture_url: this.profilePictureUrl,
            created_at: this.createdAt,
            updated_at: this.updatedAt
        };
    }

    /**
     * Get full name from first and last name
     */
    get fullName(): string | null {
        if (this.firstName && this.lastName) {
            return `${this.firstName} ${this.lastName}`;
        }
        return this.firstName || this.lastName || null;
    }

    /**
     * Get display name (full name or username)
     */
    get displayName(): string {
        return this.fullName || this.username;
    }
}