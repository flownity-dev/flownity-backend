import { Router } from 'express';
import { requireJWT } from '../../../auth/index.js';
import { TaskGroupController } from '../../../controllers/api/taskGroupController.js';

const router = Router();

// GET /api/v1/task-groups - Get all task groups for authenticated user
router.get('/', requireJWT, TaskGroupController.getTaskGroups);

// GET /api/v1/task-groups/trash - Get all soft deleted task groups (must come before /:id)
router.get('/trash', requireJWT, TaskGroupController.getDeletedTaskGroups);

// GET /api/v1/task-groups/:id - Get a specific task group by ID
router.get('/:id', requireJWT, TaskGroupController.getTaskGroup);

// POST /api/v1/task-groups - Create a new task group
router.post('/', requireJWT, TaskGroupController.createTaskGroup);

// PUT /api/v1/task-groups/:id - Update a task group
router.put('/:id', requireJWT, TaskGroupController.updateTaskGroup);

// DELETE /api/v1/task-groups/:id - Soft delete a task group
router.delete('/:id', requireJWT, TaskGroupController.deleteTaskGroup);

// POST /api/v1/task-groups/:id/restore - Restore a soft deleted task group
router.post('/:id/restore', requireJWT, TaskGroupController.restoreTaskGroup);

// DELETE /api/v1/task-groups/:id/force - Permanently delete a task group
router.delete('/:id/force', requireJWT, TaskGroupController.forceDeleteTaskGroup);

export default router;