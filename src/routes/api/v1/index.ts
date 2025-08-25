import { Router } from 'express';
import userRoutes from './userRoutes.js';
import tokenExamples from './tokenExamples.js';
import projectRoutes from './projectRoutes.js';
import taskGroupRoutes from './taskGroupRoutes.js';

const router = Router();

// Mount v1 routes
router.use('/users', userRoutes);
router.use('/examples', tokenExamples);
router.use('/projects', projectRoutes);
router.use('/task-groups', taskGroupRoutes);

export default router;