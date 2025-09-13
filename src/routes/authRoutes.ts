import { Router } from 'express';
import { AuthController } from '../controllers/index.js';
import { config } from '../config/index.js';
import { requireJWT } from '../auth/jwtMiddleware.js';

const router = Router();

// GitHub OAuth routes (if configured)
if (config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET) {
  router.get('/github', AuthController.githubAuth);
  router.get('/github/callback', AuthController.githubCallback);
}

// Google OAuth routes (if configured)
if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
  router.get('/google', AuthController.googleAuth);
  router.get('/google/callback', AuthController.googleCallback);
}

// Logout route
router.post('/logout', AuthController.logout);

// Token refresh route
router.post('/refresh', AuthController.refreshToken);

// Token verification route
router.get('/verify-token', requireJWT, (req, res) => {
  // If we reach here, the token is valid (JWT middleware passed)
  const jwtUser = req.jwtUser;
  res.json({
    valid: true,
    user: jwtUser ? {
      id: jwtUser.userId,
      username: jwtUser.username,
      displayName: jwtUser.displayName,
      provider: jwtUser.provider,
      providerId: jwtUser.providerId
    } : null,
    message: 'Token is valid'
  });
});

export default router;