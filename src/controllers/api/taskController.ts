import { Request, Response } from 'express';
import { getJWTUser } from '../../auth/index.js';
import { Task, CreateTaskData, UpdateTaskData } from '../../models/Task.js';
import { ValidationError } from '../../errors/index.js';
import { PaginationUtils } from '../../utils/index.js';

export class TaskController {
    /**
     * Get all tasks for the authenticated user with pagination
     */
    static getTasks = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            // Parse and validate pagination parameters
            const paginationParams = PaginationUtils.validateAndNormalize(req.query);
            
            // Get paginated tasks
            const { tasks, totalCount } = await Task.findByUserIdPaginated(jwtUser.userId, paginationParams);

            // Create paginated response
            const response = PaginationUtils.createResponse(
                tasks.map(task => task.toJSON()),
                'tasks',
                paginationParams,
                totalCount
            );

            return res.json(response);
        } catch (err) {
            if (err instanceof ValidationError) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: err.message
                });
            }

            return res.status(500).json({
                success: false,
                error: 'Database error',
                message: err instanceof Error ? err.message : String(err)
            });
        }
    };

    /**
     * Get a single task by ID
     */
    static getTask = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            const taskId = parseInt(req.params.id!);
            
            if (isNaN(taskId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid task ID',
                    message: 'Task ID must be a valid number'
                });
            }

            const task = await Task.findById(taskId);

            if (!task) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found',
                    message: 'Task with the specified ID does not exist'
                });
            }

            // Check if user has access to the task (assignee or approver)
            if (task.assignee !== jwtUser.userId && task.approver !== jwtUser.userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'You can only access tasks where you are the assignee or approver'
                });
            }

            return res.json({
                success: true,
                data: {
                    task: task.toJSON()
                }
            });
        } catch (err) {
            return res.status(500).json({
                success: false,
                error: 'Database error',
                message: err instanceof Error ? err.message : String(err)
            });
        }
    };

    /**
     * Create a new task
     */
    static createTask = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            const taskData: CreateTaskData = {
                task_group_id: req.body.task_group_id || null,
                project_id: req.body.project_id || null,
                task_title: req.body.task_title,
                description: req.body.description || null,
                due_from: req.body.due_from ? new Date(req.body.due_from) : null,
                due_to: req.body.due_to ? new Date(req.body.due_to) : null,
                assignee: req.body.assignee || null,
                approver: req.body.approver || null
            };

            const task = await Task.create(taskData);

            return res.status(201).json({
                success: true,
                data: {
                    task: task.toJSON()
                },
                message: 'Task created successfully'
            });
        } catch (err) {
            if (err instanceof ValidationError) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: err.message
                });
            }

            return res.status(500).json({
                success: false,
                error: 'Database error',
                message: err instanceof Error ? err.message : String(err)
            });
        }
    };

    /**
     * Update an existing task
     */
    static updateTask = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            const taskId = parseInt(req.params.id!);
            
            if (isNaN(taskId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid task ID',
                    message: 'Task ID must be a valid number'
                });
            }

            const updateData: UpdateTaskData = {};
            
            if (req.body.task_group_id !== undefined) {
                updateData.task_group_id = req.body.task_group_id;
            }
            if (req.body.project_id !== undefined) {
                updateData.project_id = req.body.project_id;
            }
            if (req.body.task_title !== undefined) {
                updateData.task_title = req.body.task_title;
            }
            if (req.body.description !== undefined) {
                updateData.description = req.body.description;
            }
            if (req.body.due_from !== undefined) {
                updateData.due_from = req.body.due_from ? new Date(req.body.due_from) : null;
            }
            if (req.body.due_to !== undefined) {
                updateData.due_to = req.body.due_to ? new Date(req.body.due_to) : null;
            }
            if (req.body.assignee !== undefined) {
                updateData.assignee = req.body.assignee;
            }
            if (req.body.approver !== undefined) {
                updateData.approver = req.body.approver;
            }

            const task = await Task.update(taskId, jwtUser.userId, updateData);

            if (!task) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found',
                    message: 'Task with the specified ID does not exist or you do not have permission to update it'
                });
            }

            return res.json({
                success: true,
                data: {
                    task: task.toJSON()
                },
                message: 'Task updated successfully'
            });
        } catch (err) {
            if (err instanceof ValidationError) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: err.message
                });
            }

            return res.status(500).json({
                success: false,
                error: 'Database error',
                message: err instanceof Error ? err.message : String(err)
            });
        }
    };

    /**
     * Delete a task (soft delete)
     */
    static deleteTask = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            const taskId = parseInt(req.params.id!);
            
            if (isNaN(taskId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid task ID',
                    message: 'Task ID must be a valid number'
                });
            }

            const deleted = await Task.delete(taskId, jwtUser.userId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found',
                    message: 'Task with the specified ID does not exist or you do not have permission to delete it'
                });
            }

            return res.json({
                success: true,
                message: 'Task deleted successfully'
            });
        } catch (err) {
            if (err instanceof ValidationError) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: err.message
                });
            }

            return res.status(500).json({
                success: false,
                error: 'Database error',
                message: err instanceof Error ? err.message : String(err)
            });
        }
    };

    /**
     * Get all soft deleted tasks for the authenticated user with pagination
     */
    static getDeletedTasks = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            // Parse and validate pagination parameters
            const paginationParams = PaginationUtils.validateAndNormalize(req.query);
            
            // Get paginated deleted tasks
            const { tasks, totalCount } = await Task.findDeletedByUserIdPaginated(jwtUser.userId, paginationParams);

            // Create paginated response
            const response = PaginationUtils.createResponse(
                tasks.map(task => task.toJSON()),
                'tasks',
                paginationParams,
                totalCount
            );

            return res.json(response);
        } catch (err) {
            if (err instanceof ValidationError) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: err.message
                });
            }

            return res.status(500).json({
                success: false,
                error: 'Database error',
                message: err instanceof Error ? err.message : String(err)
            });
        }
    };

    /**
     * Restore a soft deleted task
     */
    static restoreTask = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            const taskId = parseInt(req.params.id!);
            
            if (isNaN(taskId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid task ID',
                    message: 'Task ID must be a valid number'
                });
            }

            const restored = await Task.restore(taskId, jwtUser.userId);

            if (!restored) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found',
                    message: 'Task with the specified ID does not exist in trash or you do not have permission to restore it'
                });
            }

            return res.json({
                success: true,
                message: 'Task restored successfully'
            });
        } catch (err) {
            if (err instanceof ValidationError) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: err.message
                });
            }

            return res.status(500).json({
                success: false,
                error: 'Database error',
                message: err instanceof Error ? err.message : String(err)
            });
        }
    };

    /**
     * Permanently delete a task (hard delete)
     */
    static forceDeleteTask = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            const taskId = parseInt(req.params.id!);
            
            if (isNaN(taskId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid task ID',
                    message: 'Task ID must be a valid number'
                });
            }

            const deleted = await Task.forceDelete(taskId, jwtUser.userId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Task not found',
                    message: 'Task with the specified ID does not exist or you do not have permission to delete it'
                });
            }

            return res.json({
                success: true,
                message: 'Task permanently deleted successfully'
            });
        } catch (err) {
            if (err instanceof ValidationError) {
                return res.status(400).json({
                    success: false,
                    error: 'Validation error',
                    message: err.message
                });
            }

            return res.status(500).json({
                success: false,
                error: 'Database error',
                message: err instanceof Error ? err.message : String(err)
            });
        }
    };
}