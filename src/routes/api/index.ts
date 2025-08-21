import { Router } from 'express';
import v1Routes from './v1/index.js';

const router = Router();

// Mount API versions
router.use('/v1', v1Routes);

export default router;