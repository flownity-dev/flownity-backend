import { Request, Response } from 'express';
import { getJWTUser } from '../../auth/index.js';
import { Project, CreateProjectData, UpdateProjectData } from '../../models/Project.js';
import { Task } from '../../models/Task.js';
import { User } from '../../models/User.js';
import { Status } from '../../models/Status.js';
import { ValidationError } from '../../errors/index.js';
import { PaginationUtils } from '../../utils/index.js';
import DatabaseConnection from '../../database/connection.js';
import { TaskGroup } from '../../models/TaskGroup.js';
import { logger } from '../../utils/index.js';
import { DatabaseError } from '../../errors/index.js';


interface ApiTask {
    id: string;
    task_title: string;
    status: string | null;
    approver_id: number | null;
    task_group_id: number | null;
}

interface ApiTaskGroup {
    id: string;
    group_name: string;
    tasks: ApiTask[];
}

interface ApiUserTasks {
    id: string;
    task_owner: string;
    taskGroups: ApiTaskGroup[];
    ungroupedTasks: ApiTask[];
}

export class ProjectController {
    /**
     * Get all projects for the authenticated user with pagination
     */
    static getProjects = async (req: Request, res: Response) => {
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

            // Get paginated projects
            const { projects, totalCount } = await Project.findByUserIdPaginated(jwtUser.userId, paginationParams);

            // Create paginated response
            const response = PaginationUtils.createResponse(
                projects.map(project => project.toJSON()),
                'projects',
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
     * Get a single project by ID
     */
    static getProject = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            const idParam = req.params.id;

            if (!idParam) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing project ID',
                    message: 'Project ID is required'
                });
            }

            const projectId = parseInt(idParam);

            if (isNaN(projectId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid project ID',
                    message: 'Project ID must be a valid number'
                });
            }

            const project = await Project.findById(projectId);

            if (!project) {
                return res.status(404).json({
                    success: false,
                    error: 'Project not found',
                    message: 'Project with the specified ID does not exist'
                });
            }

            // Check if user owns the project
            if (project.createdBy !== jwtUser.userId) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'You can only access your own projects'
                });
            }

            return res.json({
                success: true,
                data: {
                    project: project.toJSON()
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
     * Create a new project
     */
    static createProject = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            const projectData: CreateProjectData = {
                project_title: req.body.project_title,
                project_description: req.body.project_description,
                due_from: req.body.due_from ? new Date(req.body.due_from) : null,
                due_to: req.body.due_to ? new Date(req.body.due_to) : null
            };

            const project = await Project.create(jwtUser.userId, projectData);

            return res.status(201).json({
                success: true,
                data: {
                    project: project.toJSON()
                },
                message: 'Project created successfully'
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
     * Update an existing project
     */
    static updateProject = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            const idParam = req.params.id;

            if (!idParam) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing project ID',
                    message: 'Project ID is required'
                });
            }

            const projectId = parseInt(idParam);

            if (isNaN(projectId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid project ID',
                    message: 'Project ID must be a valid number'
                });
            }

            const updateData: UpdateProjectData = {};

            if (req.body.project_title !== undefined) {
                updateData.project_title = req.body.project_title;
            }
            if (req.body.project_description !== undefined) {
                updateData.project_description = req.body.project_description;
            }
            if (req.body.due_from !== undefined) {
                updateData.due_from = req.body.due_from ? new Date(req.body.due_from) : null;
            }
            if (req.body.due_to !== undefined) {
                updateData.due_to = req.body.due_to ? new Date(req.body.due_to) : null;
            }

            const project = await Project.update(projectId, jwtUser.userId, updateData);

            if (!project) {
                return res.status(404).json({
                    success: false,
                    error: 'Project not found',
                    message: 'Project with the specified ID does not exist or you do not have permission to update it'
                });
            }

            return res.json({
                success: true,
                data: {
                    project: project.toJSON()
                },
                message: 'Project updated successfully'
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
     * Delete a project
     */
    static deleteProject = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            const idParam = req.params.id;

            if (!idParam) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing project ID',
                    message: 'Project ID is required'
                });
            }

            const projectId = parseInt(idParam);

            if (isNaN(projectId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid project ID',
                    message: 'Project ID must be a valid number'
                });
            }

            const deleted = await Project.delete(projectId, jwtUser.userId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Project not found',
                    message: 'Project with the specified ID does not exist or you do not have permission to delete it'
                });
            }

            return res.json({
                success: true,
                message: 'Project deleted successfully'
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
     * Get all soft deleted projects for the authenticated user with pagination
     */
    static getDeletedProjects = async (req: Request, res: Response) => {
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

            // Get paginated deleted projects
            const { projects, totalCount } = await Project.findDeletedByUserIdPaginated(jwtUser.userId, paginationParams);

            // Create paginated response
            const response = PaginationUtils.createResponse(
                projects.map(project => project.toJSON()),
                'projects',
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
     * Restore a soft deleted project
     */
    static restoreProject = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            const projectId = parseInt(req.params.id!);

            if (isNaN(projectId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid project ID',
                    message: 'Project ID must be a valid number'
                });
            }

            const restored = await Project.restore(projectId, jwtUser.userId);

            if (!restored) {
                return res.status(404).json({
                    success: false,
                    error: 'Project not found',
                    message: 'Project with the specified ID does not exist in trash or you do not have permission to restore it'
                });
            }

            return res.json({
                success: true,
                message: 'Project restored successfully'
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
     * Permanently delete a project (hard delete)
     */
    static forceDeleteProject = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            const projectId = parseInt(req.params.id!);

            if (isNaN(projectId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid project ID',
                    message: 'Project ID must be a valid number'
                });
            }

            const deleted = await Project.forceDelete(projectId, jwtUser.userId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Project not found',
                    message: 'Project with the specified ID does not exist or you do not have permission to delete it'
                });
            }

            return res.json({
                success: true,
                message: 'Project permanently deleted successfully'
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



static getProjectFlow = async (req: Request, res: Response) => {
    const jwtUser = getJWTUser(req);
    const projectId = parseInt(req.params.project_id!);

    if (!jwtUser) {
        return res.status(401).json({
            success: false,
            error: 'User not authenticated',
            message: 'Valid JWT token required'
        });
    }

    if (!projectId || isNaN(projectId)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid project ID',
            message: 'Project ID must be a valid number'
        });
    }

    try {
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                error: 'Project not found',
                message: 'Project with the specified ID does not exist'
            });
        }

        if (project.createdBy !== jwtUser.userId) {
            return res.status(403).json({
                success: false,
                error: 'Access denied',
                message: 'You can only access your own projects'
            });
        }

        // Get tasks
        const { rows } = await DatabaseConnection.query(
            'SELECT * FROM flwnty_task WHERE project_id = $1 AND deleted_at IS NULL',
            [projectId]
        );

        // Preload users
        const userIds = Array.from(
            new Set(
                rows.map(t => t.assignee).filter((id): id is number => id != null)
            )
        );

        const users = await Promise.all(userIds.map(id => User.findById(Number(id))));
        const userMap = new Map(users.filter((u): u is User => !!u).map(u => [u.id, u]));

        // Preload task groups
        const taskGroupIds = Array.from(
            new Set(rows.map(t => t.task_group_id).filter((id): id is number => id != null))
        );
        const taskGroups = await Promise.all(taskGroupIds.map(id => TaskGroup.findById(id)));
        const taskGroupMap = new Map(taskGroups.filter((g): g is TaskGroup => !!g).map(g => [g.id, g]));

        // Preload statuses
        const statuses = await Status.findAll();
        const statusMap = new Map(statuses.map(s => [s.id, s.statusName]));

        // Group tasks by user
        const usersWithTasks: ApiUserTasks[] = userIds
            .map(userId => userMap.get(Number(userId)))
            .filter((user): user is User => !!user)
            .map(user => {
                const userTasks = rows.filter(t => Number(t.assignee) === user.id);


                const groupedTasks: Record<number, ApiTask[]> = {};
                const ungroupedTasks: ApiTask[] = [];

                userTasks.forEach(task => {
                    const groupId = task.task_group_id != null ? Number(task.task_group_id) : null;
                    const apiTask: ApiTask = {
                        id: String(task.id),
                        task_title: task.task_title,
                        status: task.status_id ? statusMap.get(task.status_id) ?? null : null,
                        approver_id: task.approver,
                        task_group_id: groupId ?? null
                    };

                    if (groupId != null) { // include 0
                        if (!groupedTasks[groupId]) groupedTasks[groupId] = [];
                        groupedTasks[groupId].push(apiTask);
                    } else {
                        ungroupedTasks.push(apiTask);
                    }
                });

                return {
                    id: String(user.id),
                    task_owner: user.displayName,
                    taskGroups: Object.entries(groupedTasks).map(([groupId, tasks]) => {
                        const group = taskGroupMap.get(Number(groupId));
                        return {
                            id: String(group?.id ?? groupId),
                            group_name: group?.taskGroupTitle ?? "Unknown",
                            tasks
                        };
                    }),
                    ungroupedTasks
                };
            });

        return res.json({
            success: true,
            data: usersWithTasks
        });

    } catch (err: unknown) {
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: err instanceof Error ? err.message : String(err)
        });
    }
};







}