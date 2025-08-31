import { Router } from 'express';
import { StatusController } from '../../../controllers/api/statusController.js';

const router = Router();

// GET /api/v1/statuses - Get all statuses
router.get('/', StatusController.getStatuses);

// GET /api/v1/statuses/:id - Get a specific status
router.get('/:id', StatusController.getStatus);

// POST /api/v1/statuses - Create a new status
router.post('/', StatusController.createStatus);

// PUT /api/v1/statuses/:id - Update a status
router.put('/:id', StatusController.updateStatus);

// DELETE /api/v1/statuses/:id - Delete a status
router.delete('/:id', StatusController.deleteStatus);

export default router;