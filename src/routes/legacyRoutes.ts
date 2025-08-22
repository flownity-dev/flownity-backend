import { Router } from 'express';
import { UserController } from '../controllers/index.js';
import { requireJWT } from '../auth/index.js';

const router = Router();

// Legacy routes for backward compatibility (now using JWT)
router.get('/profile', requireJWT, UserController.getProfile);

export default router;