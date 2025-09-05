import { Router } from 'express';
import { AuthController } from '../controllers/index.js';
import { config } from '../config/index.js';

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

export default router;