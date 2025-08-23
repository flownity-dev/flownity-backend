import { Request, Response } from 'express';
import { getJWTUser } from '../../auth/index.js';
import { Project, CreateProjectData, UpdateProjectData } from '../../models/Project.js';
import { ValidationError } from '../../errors/index.js';

export class ProjectController {
    /**
     * Get all projects for the authenticated user
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
            const projects = await Project.findByUserId(jwtUser.userId);

            return res.json({
                success: true,
                data: {
                    projects: projects.map(project => project.toJSON())
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
     * Get all soft deleted projects for the authenticated user
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
            const projects = await Project.findDeletedByUserId(jwtUser.userId);

            return res.json({
                success: true,
                data: {
                    projects: projects.map(project => project.toJSON())
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
}