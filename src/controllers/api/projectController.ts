import { Request, Response } from 'express';
import { getJWTUser } from '../../auth/index.js';
import { Project, CreateProjectData, UpdateProjectData } from '../../models/Project.js';
import { Task } from '../../models/Task.js';
import { User } from '../../models/User.js';
import { Status } from '../../models/Status.js';
import { ValidationError } from '../../errors/index.js';
import { PaginationUtils } from '../../utils/index.js';
import DatabaseConnection from '../../database/connection.js';

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

    /**
     * Get project flow data - users with their tasks grouped by task groups for a specific project
     */
    static getProjectFlow = async (req: Request, res: Response) => {
        const jwtUser = getJWTUser(req);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            const projectId = parseInt(req.params.project_id!);

            if (isNaN(projectId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid project ID',
                    message: 'Project ID must be a valid number'
                });
            }

            // Check if project exists and user has access
            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    error: 'Project not found',
                    message: 'Project with the specified ID does not exist'
                });
            }

            // Get all tasks for this project with user details, task groups, and status
            const query = `
                SELECT 
                    t.id as task_id,
                    t.task_title,
                    t.assignee,
                    t.task_group_id,
                    tg.task_group_title,
                    u_assignee.id as assignee_user_id,
                    u_assignee.username as assignee_username,
                    u_assignee.first_name as assignee_first_name,
                    u_assignee.last_name as assignee_last_name,
                    s.status_name,
                    -- Get all approvers for this user's tasks in this project
                    ARRAY_AGG(DISTINCT u_approver.id::text) FILTER (WHERE u_approver.id IS NOT NULL) as approver_ids
                FROM flwnty_task t
                LEFT JOIN flwnty_task_group tg ON t.task_group_id = tg.id
                LEFT JOIN flwnty_users u_assignee ON t.assignee = u_assignee.id
                LEFT JOIN flwnty_task t_all ON t_all.assignee = t.assignee AND t_all.project_id = t.project_id AND t_all.deleted_at IS NULL
                LEFT JOIN flwnty_users u_approver ON t_all.approver = u_approver.id
                LEFT JOIN flwnty_status s ON t.status_id = s.id
                WHERE t.project_id = $1 AND t.deleted_at IS NULL
                GROUP BY t.id, t.task_title, t.assignee, t.task_group_id, tg.task_group_title,
                         u_assignee.id, u_assignee.username, u_assignee.first_name, u_assignee.last_name, s.status_name
                ORDER BY t.assignee, tg.task_group_title, t.created_at ASC
            `;

            const result = await DatabaseConnection.query(query, [projectId]);
            const taskRows = result.rows;

            // Check if user has access to this project (either project owner or involved in tasks)
            const hasAccess = project.createdBy === jwtUser.userId ||
                taskRows.some(row =>
                    row.assignee_user_id === jwtUser.userId ||
                    (row.approver_ids && row.approver_ids.includes(jwtUser.userId.toString()))
                );

            if (!hasAccess) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'You do not have permission to view this project flow'
                });
            }

            // Group tasks by assignee (task owner) and then by task group
            const userTaskMap = new Map();

            for (const row of taskRows) {
                if (!row.assignee_user_id) continue; // Skip tasks without assignee

                const userId = row.assignee_user_id.toString();
                const taskOwnerName = row.assignee_first_name && row.assignee_last_name
                    ? `${row.assignee_first_name} ${row.assignee_last_name}`
                    : row.assignee_username;

                if (!userTaskMap.has(userId)) {
                    userTaskMap.set(userId, {
                        id: userId,
                        task_owner: taskOwnerName,
                        approvers: row.approver_ids || [],
                        taskGroups: new Map()
                    });
                }

                const user = userTaskMap.get(userId);
                const groupName = row.task_group_title || 'Ungrouped';

                if (!user.taskGroups.has(groupName)) {
                    user.taskGroups.set(groupName, {
                        group_name: groupName,
                        tasks: []
                    });
                }

                user.taskGroups.get(groupName).tasks.push({
                    id: row.task_id.toString(),
                    task_title: row.task_title,
                    status: row.status_name || 'pending'
                });
            }

            // Convert maps to arrays
            const users = Array.from(userTaskMap.values()).map(user => ({
                id: user.id,
                task_owner: user.task_owner,
                approvers: user.approvers,
                taskGroups: Array.from(user.taskGroups.values())
            }));

            return res.json({
                success: true,
                data: {
                    project_id: projectId,
                    project_title: project.projectTitle,
                    users
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
}