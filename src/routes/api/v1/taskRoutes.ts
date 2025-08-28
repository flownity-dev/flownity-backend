import { Router } from 'express';
import { requireJWT } from '../../../auth/index.js';
import { TaskController } from '../../../controllers/api/taskController.js';

const router = Router();

// GET /api/v1/tasks - Get all tasks for authenticated user
router.get('/', requireJWT, TaskController.getTasks);

// GET /api/v1/tasks/trash - Get all soft deleted tasks (must come before /:id)
router.get('/trash', requireJWT, TaskController.getDeletedTasks);

// GET /api/v1/tasks/:id - Get a specific task by ID
router.get('/:id', requireJWT, TaskController.getTask);

// POST /api/v1/tasks - Create a new task
router.post('/', requireJWT, TaskController.createTask);

// PUT /api/v1/tasks/:id - Update a task
router.put('/:id', requireJWT, TaskController.updateTask);

// DELETE /api/v1/tasks/:id - Soft delete a task
router.delete('/:id', requireJWT, TaskController.deleteTask);

// POST /api/v1/tasks/:id/restore - Restore a soft deleted task
router.post('/:id/restore', requireJWT, TaskController.restoreTask);

// DELETE /api/v1/tasks/:id/force - Permanently delete a task
router.delete('/:id/force', requireJWT, TaskController.forceDeleteTask);

export default router;