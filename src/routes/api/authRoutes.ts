import { Router } from 'express';
import { requireJWT, getJWTUser } from '../../auth/index.js';
import { logger } from '../../utils/index.js';

const router = Router();

/**
 * Get current user profile (JWT protected)
 */
router.get('/profile', requireJWT, (req, res) => {
  const requestLogger = logger.withRequest(req);
  const jwtUser = getJWTUser(req);

  if (!jwtUser) {
    requestLogger.auth('Profile access failed - no JWT user found', {
      action: 'profile_access_failed',
      success: false,
      error: 'no_jwt_user'
    });

    return res.status(401).json({
      success: false,
      error: 'authentication_required',
      message: 'Valid authentication token required'
    });
  }

  requestLogger.auth('Profile accessed successfully', {
    action: 'profile_access',
    success: true,
    userId: jwtUser.userId,
    provider: jwtUser.provider
  });

  res.json({
    success: true,
    user: {
      id: jwtUser.userId,
      username: jwtUser.username,
      displayName: jwtUser.displayName,
      email: jwtUser.email,
      provider: jwtUser.provider,
      providerId: jwtUser.providerId
    }
  });
});

/**
 * Verify token endpoint
 */
router.get('/verify', requireJWT, (req, res) => {
  const requestLogger = logger.withRequest(req);
  const jwtUser = getJWTUser(req);

  requestLogger.auth('Token verification successful', {
    action: 'token_verify',
    success: true,
    userId: jwtUser?.userId,
    provider: jwtUser?.provider
  });

  res.json({
    success: true,
    message: 'Token is valid',
    valid: true,
    user: jwtUser ? {
      id: jwtUser.userId,
      username: jwtUser.username,
      displayName: jwtUser.displayName,
      provider: jwtUser.provider
    } : null
  });
});

export default router;