import DatabaseConnection from '../database/connection.js';
import { DatabaseError, ValidationError } from '../errors/index.js';
import { logger } from '../utils/index.js';

export interface ProjectRow {
    id: number;
    project_title: string;
    project_description: string | null;
    created_by: number;
    due_from: Date | null;
    due_to: Date | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface CreateProjectData {
    project_title: string;
    project_description?: string | null;
    due_from?: Date | null;
    due_to?: Date | null;
}

export interface UpdateProjectData {
    project_title?: string;
    project_description?: string | null;
    due_from?: Date | null;
    due_to?: Date | null;
}

export class Project {
    public readonly id: number;
    public readonly projectTitle: string;
    public readonly projectDescription: string | null;
    public readonly createdBy: number;
    public readonly dueFrom: Date | null;
    public readonly dueTo: Date | null;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;
    public readonly deletedAt: Date | null;

    constructor(data: ProjectRow) {
        this.id = data.id;
        this.projectTitle = data.project_title;
        this.projectDescription = data.project_description;
        this.createdBy = data.created_by;
        this.dueFrom = data.due_from;
        this.dueTo = data.due_to;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.deletedAt = data.deleted_at;
    }

    /**
     * Get all projects for a user
     */
    static async findByUserId(userId: number): Promise<Project[]> {
        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        try {
            logger.database('Finding projects by user ID', {
                operation: 'findByUserId',
                table: 'flwnty_project',
                userId
            });

            const query = `
                SELECT * FROM flwnty_project
                WHERE created_by = $1 AND deleted_at IS NULL
                ORDER BY created_at DESC
            `;
            const result = await DatabaseConnection.query<ProjectRow>(query, [userId]);
            return result.rows.map(row => new Project(row));
        } catch (error) {
            logger.database('Error finding projects by user ID', {
                operation: 'findByUserId',
                table: 'flwnty_project',
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to find projects by user ID',
                500,
                'PROJECT_FIND_ERROR'
            );
        }
    }

    /**
     * Find a project by ID
     */
    static async findById(id: number): Promise<Project | null> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Project ID is required and must be a number');
        }

        try {
            logger.database('Finding project by ID', {
                operation: 'findById',
                table: 'flwnty_project',
                projectId: id
            });

            const query = 'SELECT * FROM flwnty_project WHERE id = $1 AND deleted_at IS NULL';
            const result = await DatabaseConnection.query<ProjectRow>(query, [id]);

            return result.rows.length > 0 ? new Project(result.rows[0]!) : null;
        } catch (error) {
            logger.database('Error finding project by ID', {
                operation: 'findById',
                table: 'flwnty_project',
                projectId: id,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to find project by ID',
                500,
                'PROJECT_FIND_BY_ID_ERROR'
            );
        }
    }

    /**
     * Create a new project
     */
    static async create(userId: number, data: CreateProjectData): Promise<Project> {
        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        if (!data.project_title || typeof data.project_title !== 'string' || data.project_title.trim().length === 0) {
            throw new ValidationError('Project title is required and must be a non-empty string');
        }

        try {
            logger.database('Creating new project', {
                operation: 'create',
                table: 'flwnty_project',
                userId,
                title: data.project_title
            });

            const query = `
                INSERT INTO flwnty_project (project_title, project_description, created_by, due_from, due_to)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            `;

            const values = [
                data.project_title.trim(),
                data.project_description || null,
                userId,
                data.due_from || null,
                data.due_to || null
            ];

            const result = await DatabaseConnection.query<ProjectRow>(query, values);
            return new Project(result.rows[0]!);
        } catch (error) {
            logger.database('Error creating project', {
                operation: 'create',
                table: 'flwnty_project',
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to create project',
                500,
                'PROJECT_CREATE_ERROR'
            );
        }
    }

    /**
     * Update a project
     */
    static async update(id: number, userId: number, data: UpdateProjectData): Promise<Project | null> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Project ID is required and must be a number');
        }

        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        // Check if project exists and belongs to user
        const existingProject = await this.findById(id);
        if (!existingProject) {
            return null;
        }

        if (existingProject.createdBy !== userId) {
            throw new ValidationError('You can only update your own projects');
        }

        // Build dynamic update query
        const updateFields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (data.project_title !== undefined) {
            if (typeof data.project_title !== 'string' || data.project_title.trim().length === 0) {
                throw new ValidationError('Project title must be a non-empty string');
            }
            updateFields.push(`project_title = $${paramCount++}`);
            values.push(data.project_title.trim());
        }

        if (data.project_description !== undefined) {
            updateFields.push(`project_description = $${paramCount++}`);
            values.push(data.project_description);
        }

        if (data.due_from !== undefined) {
            updateFields.push(`due_from = $${paramCount++}`);
            values.push(data.due_from);
        }

        if (data.due_to !== undefined) {
            updateFields.push(`due_to = $${paramCount++}`);
            values.push(data.due_to);
        }

        if (updateFields.length === 0) {
            throw new ValidationError('At least one field must be provided for update');
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        try {
            logger.database('Updating project', {
                operation: 'update',
                table: 'flwnty_project',
                projectId: id,
                userId,
                fields: updateFields
            });

            const query = `
                UPDATE flwnty_project 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramCount} AND created_by = $${paramCount + 1} AND deleted_at IS NULL
                RETURNING *
            `;

            values.push(userId);
            const result = await DatabaseConnection.query<ProjectRow>(query, values);

            return result.rows.length > 0 ? new Project(result.rows[0]!) : null;
        } catch (error) {
            logger.database('Error updating project', {
                operation: 'update',
                table: 'flwnty_project',
                projectId: id,
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to update project',
                500,
                'PROJECT_UPDATE_ERROR'
            );
        }
    }

    /**
     * Soft delete a project (sets deleted_at timestamp)
     */
    static async delete(id: number, userId: number): Promise<boolean> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Project ID is required and must be a number');
        }

        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        try {
            logger.database('Soft deleting project', {
                operation: 'soft_delete',
                table: 'flwnty_project',
                projectId: id,
                userId
            });

            const query = `
                UPDATE flwnty_project 
                SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND created_by = $2 AND deleted_at IS NULL
            `;
            const result = await DatabaseConnection.query(query, [id, userId]);

            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.database('Error soft deleting project', {
                operation: 'soft_delete',
                table: 'flwnty_project',
                projectId: id,
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to delete project',
                500,
                'PROJECT_DELETE_ERROR'
            );
        }
    }

    /**
     * Restore a soft deleted project
     */
    static async restore(id: number, userId: number): Promise<boolean> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Project ID is required and must be a number');
        }

        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        try {
            logger.database('Restoring soft deleted project', {
                operation: 'restore',
                table: 'flwnty_project',
                projectId: id,
                userId
            });

            const query = `
                UPDATE flwnty_project 
                SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND created_by = $2 AND deleted_at IS NOT NULL
            `;
            const result = await DatabaseConnection.query(query, [id, userId]);

            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.database('Error restoring project', {
                operation: 'restore',
                table: 'flwnty_project',
                projectId: id,
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to restore project',
                500,
                'PROJECT_RESTORE_ERROR'
            );
        }
    }

    /**
     * Get all soft deleted projects for a user
     */
    static async findDeletedByUserId(userId: number): Promise<Project[]> {
        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        try {
            logger.database('Finding deleted projects by user ID', {
                operation: 'findDeletedByUserId',
                table: 'flwnty_project',
                userId
            });

            const query = `
                SELECT * FROM flwnty_project
                WHERE created_by = $1 AND deleted_at IS NOT NULL
                ORDER BY deleted_at DESC
            `;
            const result = await DatabaseConnection.query<ProjectRow>(query, [userId]);
            return result.rows.map(row => new Project(row));
        } catch (error) {
            logger.database('Error finding deleted projects by user ID', {
                operation: 'findDeletedByUserId',
                table: 'flwnty_project',
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to find deleted projects by user ID',
                500,
                'PROJECT_FIND_DELETED_ERROR'
            );
        }
    }

    /**
     * Permanently delete a project (hard delete)
     */
    static async forceDelete(id: number, userId: number): Promise<boolean> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Project ID is required and must be a number');
        }

        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        try {
            logger.database('Force deleting project', {
                operation: 'force_delete',
                table: 'flwnty_project',
                projectId: id,
                userId
            });

            const query = 'DELETE FROM flwnty_project WHERE id = $1 AND created_by = $2';
            const result = await DatabaseConnection.query(query, [id, userId]);

            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.database('Error force deleting project', {
                operation: 'force_delete',
                table: 'flwnty_project',
                projectId: id,
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to permanently delete project',
                500,
                'PROJECT_FORCE_DELETE_ERROR'
            );
        }
    }

    /**
     * Get project data as a plain object
     */
    toJSON(): ProjectRow {
        return {
            id: this.id,
            project_title: this.projectTitle,
            project_description: this.projectDescription,
            created_by: this.createdBy,
            due_from: this.dueFrom,
            due_to: this.dueTo,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
            deleted_at: this.deletedAt
        };
    }
}