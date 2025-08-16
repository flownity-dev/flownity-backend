import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { config } from '../config/index.js';
import { User, GitHubProfile } from '../models/User.js';
import { OAuthError, ConfigurationError, SessionError } from '../errors/index.js';
import { logger } from '../utils/index.js';

/**
 * Configure Passport with GitHub OAuth 2.0 strategy
 */
export function configurePassport(): void {
    // Validate OAuth configuration
    validateOAuthConfig();

    // Configure GitHub OAuth strategy
    passport.use(new GitHubStrategy({
        clientID: config.GITHUB_CLIENT_ID,
        clientSecret: config.GITHUB_CLIENT_SECRET,
        callbackURL: config.CALLBACK_URL
    },
        async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
            try {
                logger.oauth('GitHub OAuth callback received', {
                    step: 'callback_received',
                    githubId: profile?.id,
                    username: profile?.username
                });

                // Validate GitHub profile data
                if (!profile || !profile.id || !profile.username) {
                    logger.oauth('Invalid GitHub profile data received', {
                        step: 'profile_validation',
                        success: false,
                        error: 'missing_profile_data'
                    });
                    
                    throw new OAuthError(
                        'Invalid GitHub profile data received',
                        400,
                        'OAUTH_INVALID_PROFILE'
                    );
                }

                // Transform GitHub profile to our GitHubProfile interface
                const githubProfile: GitHubProfile = {
                    id: profile.id,
                    username: profile.username,
                    displayName: profile.displayName || profile.username,
                    ...(profile.name && {
                        name: {
                            givenName: profile.name.givenName,
                            familyName: profile.name.familyName
                        }
                    }),
                    ...(profile.emails && { emails: profile.emails }),
                    ...(profile.photos && { photos: profile.photos })
                };

                logger.oauth('GitHub profile validated successfully', {
                    step: 'profile_validated',
                    success: true,
                    githubId: githubProfile.id,
                    username: githubProfile.username
                });

                // Check if user already exists
                let user = await User.findByGitHubId(githubProfile.id);

                if (user) {
                    // Update last login for existing user
                    user = await user.updateLastLogin();
                    
                    logger.auth('Existing user authenticated successfully', {
                        action: 'login',
                        success: true,
                        userId: user.id,
                        providerId: user.providerId,
                        provider: user.provider,
                        username: user.username,
                        userType: 'existing'
                    });
                } else {
                    // Create new user
                    user = await User.create(githubProfile);
                    
                    logger.auth('New user created and authenticated', {
                        action: 'register_and_login',
                        success: true,
                        userId: user.id,
                        providerId: user.providerId,
                        provider: user.provider,
                        username: user.username,
                        userType: 'new'
                    });
                }

                return done(null, user);
            } catch (error) {
                logger.oauth('GitHub authentication failed', {
                    step: 'authentication_failed',
                    success: false,
                    error: error instanceof Error ? error.message : String(error),
                    githubId: profile?.id,
                    username: profile?.username
                });
                
                // Convert known errors to OAuth errors
                if (error instanceof Error) {
                    const oauthError = new OAuthError(
                        `GitHub authentication failed: ${error.message}`,
                        401,
                        'OAUTH_AUTH_FAILED'
                    );
                    return done(oauthError, null);
                }
                
                return done(error, null);
            }
        }));

    // Serialize user for session storage
    passport.serializeUser((user: any, done) => {
        logger.session('User serialized for session storage', {
            action: 'serialize',
            success: true,
            userId: user.id,
            username: user.username
        });
        
        // Store only the user ID in the session
        done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id: number, done) => {
        try {
            logger.session('Attempting to deserialize user from session', {
                action: 'deserialize_start',
                userId: id
            });

            // Validate session data
            if (!id || typeof id !== 'number' || id <= 0) {
                logger.session('Invalid session data - user ID is missing or invalid', {
                    action: 'deserialize_failed',
                    success: false,
                    error: 'invalid_user_id',
                    userId: id
                });
                
                throw new SessionError(
                    'Invalid session data - user ID is missing or invalid',
                    401,
                    'SESSION_INVALID_USER_ID'
                );
            }

            // Find user by ID in database
            const query = 'SELECT * FROM flwnty_users WHERE id = $1';
            const result = await import('../database/connection.js').then(module =>
                module.default.query(query, [id])
            );

            const userRow = result.rows[0];
            if (!userRow) {
                logger.session('User no longer exists - session is invalid', {
                    action: 'deserialize_failed',
                    success: false,
                    error: 'user_not_found',
                    userId: id
                });
                
                // User was deleted from database but session still exists
                throw new SessionError(
                    'User no longer exists - session is invalid',
                    401,
                    'SESSION_USER_NOT_FOUND'
                );
            }

            const user = new User(userRow);
            
            logger.session('User deserialized successfully from session', {
                action: 'deserialize_success',
                success: true,
                userId: user.id,
                username: user.username
            });
            
            done(null, user);
        } catch (error) {
            logger.session('User deserialization failed', {
                action: 'deserialize_failed',
                success: false,
                error: error instanceof Error ? error.message : String(error),
                userId: id
            });
            
            // Convert to session error if not already
            if (!(error instanceof SessionError)) {
                const sessionError = new SessionError(
                    'Session validation failed',
                    401,
                    'SESSION_VALIDATION_FAILED'
                );
                return done(sessionError, null);
            }
            
            done(error, null);
        }
    });
}

/**
 * Validate OAuth configuration
 */
function validateOAuthConfig(): void {
    const requiredFields = [
        'GITHUB_CLIENT_ID',
        'GITHUB_CLIENT_SECRET',
        'CALLBACK_URL'
    ];

    const missingFields = requiredFields.filter(field => {
        const value = config[field as keyof typeof config];
        return !value || (typeof value === 'string' && value.trim() === '');
    });

    if (missingFields.length > 0) {
        throw new ConfigurationError(
            `Missing required OAuth configuration: ${missingFields.join(', ')}`,
            500,
            'OAUTH_CONFIG_MISSING'
        );
    }

    // Validate callback URL format
    try {
        new URL(config.CALLBACK_URL);
    } catch {
        throw new ConfigurationError(
            'CALLBACK_URL must be a valid URL',
            500,
            'OAUTH_CONFIG_INVALID_URL'
        );
    }
}

export default passport;