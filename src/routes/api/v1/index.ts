import { Router } from 'express';
import userRoutes from './userRoutes.js';
import tokenExamples from './tokenExamples.js';

const router = Router();

// Mount v1 routes
router.use('/users', userRoutes);
router.use('/examples', tokenExamples);

export default router;