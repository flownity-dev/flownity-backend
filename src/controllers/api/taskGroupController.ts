import { Request, Response } from 'express';
import { getJWTUser } from '../../auth/index.js';
import { TaskGroup, CreateTaskGroupData, UpdateTaskGroupData } from '../../models/TaskGroup.js';
import { ValidationError } from '../../errors/index.js';
import { PaginationUtils } from '../../types/pagination.js';

export class TaskGroupController {
    /**
     * Get all task groups for the authenticated user with pagination
     */
    static getTaskGroups = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            // Validate and normalize pagination parameters
            const paginationParams = PaginationUtils.validateAndNormalize(req.query);
            
            // Get paginated task groups
            const { taskGroups, totalCount } = await TaskGroup.findByUserIdPaginated(jwtUser.userId, paginationParams);
            
            // Calculate pagination metadata
            const paginationMetadata = PaginationUtils.calculateMetadata(paginationParams, totalCount);
            
            // Check if limit was capped and add warning message
            let message: string | undefined;
            if (req.query.limit && parseInt(req.query.limit as string, 10) > PaginationUtils.MAX_LIMIT) {
                message = `Limit was capped at maximum value of ${PaginationUtils.MAX_LIMIT}`;
            }

            return res.json(PaginationUtils.createResponse(
                { taskGroups: taskGroups.map(taskGroup => taskGroup.toJSON()) },
                paginationMetadata,
                message
            ));
        } catch (err) {
            if (err instanceof Error && err.message.includes('must be a positive integer')) {
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
     * Get a single task group by ID
     */
    static getTaskGroup = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            const taskGroupId = parseInt(req.params.id!);
            
            if (isNaN(taskGroupId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid task group ID',
                    message: 'Task group ID must be a valid number'
                });
            }

            const taskGroup = await TaskGroup.findById(taskGroupId);

            if (!taskGroup) {
                return res.status(404).json({
                    success: false,
                    error: 'Task group not found',
                    message: 'Task group with the specified ID does not exist'
                });
            }

            // Check if user owns the task group
            if (taskGroup.createdBy !== jwtUser.userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'You can only access your own task groups'
                });
            }

            return res.json({
                success: true,
                data: {
                    taskGroup: taskGroup.toJSON()
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
     * Create a new task group
     */
    static createTaskGroup = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            const taskGroupData: CreateTaskGroupData = {
                task_group_title: req.body.task_group_title,
                project_id: req.body.project_id,
                due_from: req.body.due_from ? new Date(req.body.due_from) : null,
                due_to: req.body.due_to ? new Date(req.body.due_to) : null
            };

            const taskGroup = await TaskGroup.create(jwtUser.userId, taskGroupData);

            return res.status(201).json({
                success: true,
                data: {
                    taskGroup: taskGroup.toJSON()
                },
                message: 'Task group created successfully'
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
     * Update an existing task group
     */
    static updateTaskGroup = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            const taskGroupId = parseInt(req.params.id!);
            
            if (isNaN(taskGroupId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid task group ID',
                    message: 'Task group ID must be a valid number'
                });
            }

            const updateData: UpdateTaskGroupData = {};
            
            if (req.body.task_group_title !== undefined) {
                updateData.task_group_title = req.body.task_group_title;
            }
            if (req.body.due_from !== undefined) {
                updateData.due_from = req.body.due_from ? new Date(req.body.due_from) : null;
            }
            if (req.body.due_to !== undefined) {
                updateData.due_to = req.body.due_to ? new Date(req.body.due_to) : null;
            }

            const taskGroup = await TaskGroup.update(taskGroupId, jwtUser.userId, updateData);

            if (!taskGroup) {
                return res.status(404).json({
                    success: false,
                    error: 'Task group not found',
                    message: 'Task group with the specified ID does not exist or you do not have permission to update it'
                });
            }

            return res.json({
                success: true,
                data: {
                    taskGroup: taskGroup.toJSON()
                },
                message: 'Task group updated successfully'
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
     * Delete a task group (soft delete)
     */
    static deleteTaskGroup = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            const taskGroupId = parseInt(req.params.id!);
            
            if (isNaN(taskGroupId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid task group ID',
                    message: 'Task group ID must be a valid number'
                });
            }

            const deleted = await TaskGroup.delete(taskGroupId, jwtUser.userId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Task group not found',
                    message: 'Task group with the specified ID does not exist or you do not have permission to delete it'
                });
            }

            return res.json({
                success: true,
                message: 'Task group deleted successfully'
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
     * Get all soft deleted task groups for the authenticated user with pagination
     */
    static getDeletedTaskGroups = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            // Validate and normalize pagination parameters
            const paginationParams = PaginationUtils.validateAndNormalize(req.query);
            
            // Get paginated deleted task groups
            const { taskGroups, totalCount } = await TaskGroup.findDeletedByUserIdPaginated(jwtUser.userId, paginationParams);
            
            // Calculate pagination metadata
            const paginationMetadata = PaginationUtils.calculateMetadata(paginationParams, totalCount);
            
            // Check if limit was capped and add warning message
            let message: string | undefined;
            if (req.query.limit && parseInt(req.query.limit as string, 10) > PaginationUtils.MAX_LIMIT) {
                message = `Limit was capped at maximum value of ${PaginationUtils.MAX_LIMIT}`;
            }

            return res.json(PaginationUtils.createResponse(
                { taskGroups: taskGroups.map(taskGroup => taskGroup.toJSON()) },
                paginationMetadata,
                message
            ));
        } catch (err) {
            if (err instanceof Error && err.message.includes('must be a positive integer')) {
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
     * Restore a soft deleted task group
     */
    static restoreTaskGroup = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            const taskGroupId = parseInt(req.params.id!);
            
            if (isNaN(taskGroupId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid task group ID',
                    message: 'Task group ID must be a valid number'
                });
            }

            const restored = await TaskGroup.restore(taskGroupId, jwtUser.userId);

            if (!restored) {
                return res.status(404).json({
                    success: false,
                    error: 'Task group not found',
                    message: 'Task group with the specified ID does not exist in trash or you do not have permission to restore it'
                });
            }

            return res.json({
                success: true,
                message: 'Task group restored successfully'
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
     * Permanently delete a task group (hard delete)
     */
    static forceDeleteTaskGroup = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            const taskGroupId = parseInt(req.params.id!);
            
            if (isNaN(taskGroupId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid task group ID',
                    message: 'Task group ID must be a valid number'
                });
            }

            const deleted = await TaskGroup.forceDelete(taskGroupId, jwtUser.userId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Task group not found',
                    message: 'Task group with the specified ID does not exist or you do not have permission to delete it'
                });
            }

            return res.json({
                success: true,
                message: 'Task group permanently deleted successfully'
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