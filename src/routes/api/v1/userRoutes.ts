import { Router } from 'express';
import { UserController } from '../../../controllers/index.js';
import { 
  ensureAuthenticated, 
  ensureAuthenticatedFlexible,
  optionalToken,
  requireToken,
  requireGitHubToken,
  requireGoogleToken
} from '../../../auth/index.js';

const router = Router();

// User profile routes with flexible authentication (session or token)
router.get('/me', optionalToken(), ensureAuthenticatedFlexible, UserController.getProfile);

// Token-only routes for API clients
router.get('/me/token', requireToken(), UserController.getProfile);

// Provider-specific token routes
router.get('/me/github', requireGitHubToken(), UserController.getProfile);
router.get('/me/google', requireGoogleToken(), UserController.getProfile);

export default router;