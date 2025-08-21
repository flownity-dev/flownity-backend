import { Router } from 'express';
import { DevController, UserController } from '../controllers/index.js';

const router = Router();

// Development and testing routes
router.get('/session-info', UserController.getSessionInfo);

// Error testing routes
router.get('/test-errors/database', DevController.testDatabaseError);
router.get('/test-errors/oauth', DevController.testOAuthError);
router.get('/test-errors/session', DevController.testSessionError);
router.get('/test-errors/generic', DevController.testGenericError);

export default router;