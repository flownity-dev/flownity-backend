import { Router } from 'express';
import { DevController, UserController } from '../controllers/index.js';
import { optionalJWT } from '../auth/index.js';

const router = Router();

// Development and testing routes
router.get('/token-info', optionalJWT, UserController.getTokenInfo);

// Error testing routes
router.get('/test-errors/database', DevController.testDatabaseError);
router.get('/test-errors/oauth', DevController.testOAuthError);
router.get('/test-errors/jwt', DevController.testJWTError);
router.get('/test-errors/generic', DevController.testGenericError);

export default router;