import { Router } from 'express';
import { WebController } from '../controllers/index.js';

const router = Router();

// Web routes
router.get('/', WebController.home);

export default router;