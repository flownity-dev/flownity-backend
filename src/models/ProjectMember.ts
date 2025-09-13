import DatabaseConnection from '../database/connection.js';
import { DatabaseError, ValidationError } from '../errors/index.js';
import { logger, PaginationParams } from '../utils/index.js';

export interface ProjectMemberRow {
    id: number;
    project_id: number;
    members: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface CreateProjectMemberData {
    project_id: number;
    members: string;
}

export interface UpdateProjectMemberData {
    members?: string;
}

export class ProjectMember {
    public readonly id: number;
    public readonly projectId: number;
    public readonly members: string;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;
    public readonly deletedAt: Date | null;

    constructor(data: ProjectMemberRow) {
        this.id = data.id;
        this.projectId = data.project_id;
        this.members = data.members;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.deletedAt = data.deleted_at;
    }

    /**
     * Find all members of a project
     */
    static async findByProjectId(projectId: number): Promise<ProjectMember[]> {
        if (!projectId || typeof projectId !== 'number') {
            throw new ValidationError('Project ID is required and must be a number');
        }

        try {
            logger.database('Finding project members', {
                operation: 'findByProjectId',
                table: 'flwnty_project_members',
                projectId
            });

            const query = `
                SELECT * FROM flwnty_project_members
                WHERE project_id = $1 AND deleted_at IS NULL
                ORDER BY created_at DESC
            `;
            const result = await DatabaseConnection.query<ProjectMemberRow>(query, [projectId]);
            return result.rows.map(row => new ProjectMember(row));
        } catch (error) {
            logger.database('Error finding project members', {
                operation: 'findByProjectId',
                table: 'flwnty_project_members',
                projectId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError('Failed to find project members', 500, 'PROJECT_MEMBERS_FIND_ERROR');
        }
    }

    /**
     * Add a member to a project
     */
    static async create(data: CreateProjectMemberData): Promise<ProjectMember> {
        if (!data.project_id || typeof data.project_id !== 'number') {
            throw new ValidationError('Project ID is required and must be a number');
        }

        if (!data.members || typeof data.members !== 'string' || data.members.trim().length === 0) {
            throw new ValidationError('Member is required and must be a non-empty string');
        }

        try {
            logger.database('Adding new project member', {
                operation: 'create',
                table: 'flwnty_project_members',
                projectId: data.project_id,
                members: data.members
            });

            const query = `
                INSERT INTO flwnty_project_members (project_id, members)
                VALUES ($1, $2)
                RETURNING *
            `;
            const values = [data.project_id, data.members.trim()];
            const result = await DatabaseConnection.query<ProjectMemberRow>(query, values);

            return new ProjectMember(result.rows[0]!);
        } catch (error) {
            logger.database('Error adding project member', {
                operation: 'create',
                table: 'flwnty_project_members',
                projectId: data.project_id,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError('Failed to add project member', 500, 'PROJECT_MEMBERS_CREATE_ERROR');
        }
    }

    /**
     * Update project member
     */
    static async update(id: number, data: UpdateProjectMemberData): Promise<ProjectMember | null> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Project Member ID is required and must be a number');
        }

        if (!data.members || typeof data.members !== 'string' || data.members.trim().length === 0) {
            throw new ValidationError('Member must be a non-empty string');
        }

        try {
            logger.database('Updating project member', {
                operation: 'update',
                table: 'flwnty_project_members',
                memberId: id
            });

            const query = `
                UPDATE flwnty_project_members
                SET members = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2 AND deleted_at IS NULL
                RETURNING *
            `;
            const result = await DatabaseConnection.query<ProjectMemberRow>(query, [data.members.trim(), id]);

            return result.rows.length > 0 ? new ProjectMember(result.rows[0]!) : null;
        } catch (error) {
            logger.database('Error updating project member', {
                operation: 'update',
                table: 'flwnty_project_members',
                memberId: id,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError('Failed to update project member', 500, 'PROJECT_MEMBERS_UPDATE_ERROR');
        }
    }

    /**
     * Soft delete a project member
     */
    static async delete(id: number): Promise<boolean> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Project Member ID is required and must be a number');
        }

        try {
            logger.database('Soft deleting project member', {
                operation: 'soft_delete',
                table: 'flwnty_project_members',
                memberId: id
            });

            const query = `
                UPDATE flwnty_project_members
                SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND deleted_at IS NULL
            `;
            const result = await DatabaseConnection.query(query, [id]);

            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.database('Error soft deleting project member', {
                operation: 'soft_delete',
                table: 'flwnty_project_members',
                memberId: id,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError('Failed to delete project member', 500, 'PROJECT_MEMBERS_DELETE_ERROR');
        }
    }

    /**
     * Restore soft deleted project member
     */
    static async restore(id: number): Promise<boolean> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Project Member ID is required and must be a number');
        }

        try {
            logger.database('Restoring project member', {
                operation: 'restore',
                table: 'flwnty_project_members',
                memberId: id
            });

            const query = `
                UPDATE flwnty_project_members
                SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND deleted_at IS NOT NULL
            `;
            const result = await DatabaseConnection.query(query, [id]);

            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.database('Error restoring project member', {
                operation: 'restore',
                table: 'flwnty_project_members',
                memberId: id,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError('Failed to restore project member', 500, 'PROJECT_MEMBERS_RESTORE_ERROR');
        }
    }

    /**
     * Permanently delete a project member
     */
    static async forceDelete(id: number): Promise<boolean> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Project Member ID is required and must be a number');
        }

        try {
            logger.database('Force deleting project member', {
                operation: 'force_delete',
                table: 'flwnty_project_members',
                memberId: id
            });

            const query = 'DELETE FROM flwnty_project_members WHERE id = $1';
            const result = await DatabaseConnection.query(query, [id]);

            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.database('Error force deleting project member', {
                operation: 'force_delete',
                table: 'flwnty_project_members',
                memberId: id,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError('Failed to permanently delete project member', 500, 'PROJECT_MEMBERS_FORCE_DELETE_ERROR');
        }
    }

    /**
     * Paginated members by project
     */
    static async findByProjectIdPaginated(
        projectId: number,
        params: PaginationParams
    ): Promise<{ members: ProjectMember[]; totalCount: number }> {
        if (!projectId || typeof projectId !== 'number') {
            throw new ValidationError('Project ID is required and must be a number');
        }

        try {
            logger.database('Finding paginated project members', {
                operation: 'findByProjectIdPaginated',
                table: 'flwnty_project_members',
                projectId,
                page: params.page,
                limit: params.limit
            });

            const countQuery = `
                SELECT COUNT(*) as total FROM flwnty_project_members
                WHERE project_id = $1 AND deleted_at IS NULL
            `;
            const countResult = await DatabaseConnection.query<{ total: string }>(countQuery, [projectId]);
            const totalCount = parseInt(countResult.rows[0]?.total || '0', 10);

            const offset = (params.page - 1) * params.limit;
            const dataQuery = `
                SELECT * FROM flwnty_project_members
                WHERE project_id = $1 AND deleted_at IS NULL
                ORDER BY created_at DESC
                LIMIT $2 OFFSET $3
            `;
            const dataResult = await DatabaseConnection.query<ProjectMemberRow>(dataQuery, [projectId, params.limit, offset]);
            const members = dataResult.rows.map(row => new ProjectMember(row));

            return { members, totalCount };
        } catch (error) {
            logger.database('Error finding paginated project members', {
                operation: 'findByProjectIdPaginated',
                table: 'flwnty_project_members',
                projectId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError('Failed to find paginated project members', 500, 'PROJECT_MEMBERS_FIND_PAGINATED_ERROR');
        }
    }

    /**
     * Convert to plain object
     */
    toJSON(): ProjectMemberRow {
        return {
            id: this.id,
            project_id: this.projectId,
            members: this.members,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
            deleted_at: this.deletedAt
        };
    }
}
