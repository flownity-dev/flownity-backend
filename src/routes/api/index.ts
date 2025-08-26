import { Router } from 'express';
import v1Routes from './v1/index.js';
import authRoutes from './authRoutes.js';

const router = Router();

// Mount auth routes (no versioning for auth endpoints)
router.use('/auth', authRoutes);

// Mount API versions
router.use('/v1', v1Routes);

export default router;