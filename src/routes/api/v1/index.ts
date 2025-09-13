import { Router } from 'express';
import userRoutes from './userRoutes.js';
import tokenExamples from './tokenExamples.js';
import projectRoutes from './projectRoutes.js';
import taskGroupRoutes from './taskGroupRoutes.js';
import taskRoutes from './taskRoutes.js';
import statusRoutes from './statusRoutes.js';
import projectMemberRoutes from './projectMemberRoutes.js';

const router = Router();

// Mount v1 routes
router.use('/users', userRoutes);
router.use('/examples', tokenExamples);
router.use('/projects', projectRoutes);
router.use('/task-groups', taskGroupRoutes);
router.use('/tasks', taskRoutes);
router.use('/statuses', statusRoutes);
router.use('/project-member', projectMemberRoutes);

export default router;