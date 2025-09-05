import { Router } from 'express';
import { requireJWT } from '../../../auth/index.js';
import { ProjectController } from '../../../controllers/api/projectController.js';

const router = Router();

// GET /api/v1/projects - Get all projects for authenticated user
router.get('/', requireJWT, ProjectController.getProjects);

// GET /api/v1/projects/trash - Get all soft deleted projects (must come before /:id)
router.get('/trash', requireJWT, ProjectController.getDeletedProjects);

// GET /api/v1/projects/:id - Get a specific project by ID
router.get('/:id', requireJWT, ProjectController.getProject);

// POST /api/v1/projects - Create a new project
router.post('/', requireJWT, ProjectController.createProject);

// PUT /api/v1/projects/:id - Update a project
router.put('/:id', requireJWT, ProjectController.updateProject);

// DELETE /api/v1/projects/:id - Soft delete a project
router.delete('/:id', requireJWT, ProjectController.deleteProject);

// POST /api/v1/projects/:id/restore - Restore a soft deleted project
router.post('/:id/restore', requireJWT, ProjectController.restoreProject);

// DELETE /api/v1/projects/:id/force - Permanently delete a project
router.delete('/:id/force', requireJWT, ProjectController.forceDeleteProject);

// GET /api/v1/projects/project-flow/:project_id - Get project flow data
router.get('/project-flow/:project_id', requireJWT, ProjectController.getProjectFlow);

// Legacy route for backward compatibility
router.get('/get_all_projects', requireJWT, ProjectController.getProjects);

export default router;