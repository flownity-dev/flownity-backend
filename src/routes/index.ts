import { Router } from 'express';
import { config } from '../config/index.js';
import authRoutes from './authRoutes.js';
import webRoutes from './webRoutes.js';
import apiRoutes from './api/index.js';
import devRoutes from './devRoutes.js';
import legacyRoutes from './legacyRoutes.js';

const router = Router();

// Mount route modules
router.use('/', webRoutes);
router.use('/auth', authRoutes);
router.use('/api', apiRoutes);

// Legacy routes for backward compatibility
router.use('/', legacyRoutes);

// Development routes (only in development environment)
if (config.NODE_ENV === 'development') {
  router.use('/', devRoutes);
}

export default router;