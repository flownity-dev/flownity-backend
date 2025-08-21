import { Router } from 'express';
import { UserController } from '../controllers/index.js';
import { ensureAuthenticated } from '../auth/middleware.js';

const router = Router();

// Legacy routes for backward compatibility
router.get('/profile', ensureAuthenticated, UserController.getProfile);

export default router;