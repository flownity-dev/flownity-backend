import { Router } from 'express';
import { UserController } from '../../../controllers/index.js';
import { 
  getJWTUser,
  requireJWT
} from '../../../auth/index.js';
import { ProjectController } from '../../../controllers/api/projectController.js';

const router = Router();

router.get('/get_all_projects', requireJWT, ProjectController.getProjects);

export default router;