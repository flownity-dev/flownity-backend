import DatabaseConnection from '../database/connection.js';
import { DatabaseError, ValidationError } from '../errors/index.js';
import { logger, PaginationParams } from '../utils/index.js';

export interface ProjectRow {
    id: number;
    project_title: string;
    project_description: string | null;
    created_by: number;
    status_id: number | null;
    status_name?: string | null; // <-- joined column
    due_from: Date | null;
    due_to: Date | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface CreateProjectData {
    project_title: string;
    project_description?: string | null;
    status_id?: number | null;
    due_from?: Date | null;
    due_to?: Date | null;
}

export interface UpdateProjectData {
    project_title?: string;
    project_description?: string | null;
    status_id?: number | null;
    due_from?: Date | null;
    due_to?: Date | null;
}

export class Project {
    public readonly id: number;
    public readonly projectTitle: string;
    public readonly projectDescription: string | null;
    public readonly createdBy: number;
    public readonly statusId: number | null;
    public readonly statusName: string | null;
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
        this.statusId = data.status_id;
        this.statusName = data.status_name ?? null;
        this.dueFrom = data.due_from;
        this.dueTo = data.due_to;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.deletedAt = data.deleted_at;
    }

    // ---------------------------
    // QUERIES
    // ---------------------------

    static async findByUserId(userId: number): Promise<Project[]> {
        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        try {
            const query = `
                SELECT p.*, s.status_name
                FROM flwnty_project p
                LEFT JOIN flwnty_status s ON p.status_id = s.id
                WHERE p.created_by = $1 AND p.deleted_at IS NULL
                ORDER BY p.created_at DESC
            `;
            const result = await DatabaseConnection.query<ProjectRow>(query, [userId]);
            return result.rows.map(row => new Project(row));
        } catch (error) {
            throw new DatabaseError('Failed to find projects by user ID', 500, 'PROJECT_FIND_ERROR');
        }
    }

    static async findById(id: number): Promise<Project | null> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Project ID is required and must be a number');
        }

        try {
            const query = `
                SELECT p.*, s.status_name
                FROM flwnty_project p
                LEFT JOIN flwnty_status s ON p.status_id = s.id
                WHERE p.id = $1 AND p.deleted_at IS NULL
            `;
            const result = await DatabaseConnection.query<ProjectRow>(query, [id]);
            return result.rows.length > 0 ? new Project(result.rows[0]!) : null;
        } catch (error) {
            throw new DatabaseError('Failed to find project by ID', 500, 'PROJECT_FIND_BY_ID_ERROR');
        }
    }

    static async create(userId: number, data: CreateProjectData): Promise<Project> {
        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }
        if (!data.project_title || typeof data.project_title !== 'string' || data.project_title.trim().length === 0) {
            throw new ValidationError('Project title is required and must be a non-empty string');
        }

        try {
            const query = `
                INSERT INTO flwnty_project (project_title, project_description, created_by, status_id, due_from, due_to)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            const values = [
                data.project_title.trim(),
                data.project_description || null,
                userId,
                data.status_id || null,
                data.due_from || null,
                data.due_to || null
            ];
            const result = await DatabaseConnection.query<ProjectRow>(query, values);
            const inserted = result.rows[0]!;
            // Fetch with join to include status_name
            return await this.findById(inserted.id) as Project;
        } catch (error) {
            throw new DatabaseError('Failed to create project', 500, 'PROJECT_CREATE_ERROR');
        }
    }

    static async update(id: number, userId: number, data: UpdateProjectData): Promise<Project | null> {
        if (!id || typeof id !== 'number') throw new ValidationError('Project ID is required');
        if (!userId || typeof userId !== 'number') throw new ValidationError('User ID is required');

        const existing = await this.findById(id);
        if (!existing) return null;
        if (existing.createdBy !== userId) throw new ValidationError('You can only update your own projects');

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
        if (data.status_id !== undefined) {
            updateFields.push(`status_id = $${paramCount++}`);
            values.push(data.status_id);
        }
        if (data.due_from !== undefined) {
            updateFields.push(`due_from = $${paramCount++}`);
            values.push(data.due_from);
        }
        if (data.due_to !== undefined) {
            updateFields.push(`due_to = $${paramCount++}`);
            values.push(data.due_to);
        }

        if (updateFields.length === 0) throw new ValidationError('At least one field must be provided');

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id, userId);

        try {
            const query = `
                UPDATE flwnty_project
                SET ${updateFields.join(', ')}
                WHERE id = $${paramCount} AND created_by = $${paramCount + 1} AND deleted_at IS NULL
                RETURNING *
            `;
            const result = await DatabaseConnection.query<ProjectRow>(query, values);
            return result.rows.length > 0 ? await this.findById(result.rows[0]!.id) : null;
        } catch (error) {
            throw new DatabaseError('Failed to update project', 500, 'PROJECT_UPDATE_ERROR');
        }
    }

    static async delete(id: number, userId: number): Promise<boolean> {
        const query = `
            UPDATE flwnty_project 
            SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND created_by = $2 AND deleted_at IS NULL
        `;
        const result = await DatabaseConnection.query(query, [id, userId]);
        return (result.rowCount ?? 0) > 0;
    }

    static async restore(id: number, userId: number): Promise<boolean> {
        const query = `
            UPDATE flwnty_project 
            SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND created_by = $2 AND deleted_at IS NOT NULL
        `;
        const result = await DatabaseConnection.query(query, [id, userId]);
        return (result.rowCount ?? 0) > 0;
    }

    static async findDeletedByUserId(userId: number): Promise<Project[]> {
        const query = `
            SELECT p.*, s.status_name
            FROM flwnty_project p
            LEFT JOIN flwnty_status s ON p.status_id = s.id
            WHERE p.created_by = $1 AND p.deleted_at IS NOT NULL
            ORDER BY p.deleted_at DESC
        `;
        const result = await DatabaseConnection.query<ProjectRow>(query, [userId]);
        return result.rows.map(row => new Project(row));
    }

    static async findByUserIdPaginated(
        userId: number,
        params: PaginationParams
    ): Promise<{ projects: Project[]; totalCount: number }> {
        const countQuery = `
            SELECT COUNT(*) as total
            FROM flwnty_project
            WHERE created_by = $1 AND deleted_at IS NULL
        `;
        const countResult = await DatabaseConnection.query<{ total: string }>(countQuery, [userId]);
        const totalCount = parseInt(countResult.rows[0]?.total || '0', 10);

        const offset = (params.page - 1) * params.limit;
        const dataQuery = `
            SELECT p.*, s.status_name
            FROM flwnty_project p
            LEFT JOIN flwnty_status s ON p.status_id = s.id
            WHERE p.created_by = $1 AND p.deleted_at IS NULL
            ORDER BY p.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const dataResult = await DatabaseConnection.query<ProjectRow>(dataQuery, [userId, params.limit, offset]);
        const projects = dataResult.rows.map(row => new Project(row));

        return { projects, totalCount };
    }

    static async findDeletedByUserIdPaginated(
        userId: number,
        params: PaginationParams
    ): Promise<{ projects: Project[]; totalCount: number }> {
        const countQuery = `
            SELECT COUNT(*) as total
            FROM flwnty_project
            WHERE created_by = $1 AND deleted_at IS NOT NULL
        `;
        const countResult = await DatabaseConnection.query<{ total: string }>(countQuery, [userId]);
        const totalCount = parseInt(countResult.rows[0]?.total || '0', 10);

        const offset = (params.page - 1) * params.limit;
        const dataQuery = `
            SELECT p.*, s.status_name
            FROM flwnty_project p
            LEFT JOIN flwnty_status s ON p.status_id = s.id
            WHERE p.created_by = $1 AND p.deleted_at IS NOT NULL
            ORDER BY p.deleted_at DESC
            LIMIT $2 OFFSET $3
        `;
        const dataResult = await DatabaseConnection.query<ProjectRow>(dataQuery, [userId, params.limit, offset]);
        const projects = dataResult.rows.map(row => new Project(row));

        return { projects, totalCount };
    }

    static async forceDelete(id: number, userId: number): Promise<boolean> {
        const query = 'DELETE FROM flwnty_project WHERE id = $1 AND created_by = $2';
        const result = await DatabaseConnection.query(query, [id, userId]);
        return (result.rowCount ?? 0) > 0;
    }

    // ---------------------------
    // JSON Representation
    // ---------------------------
    toJSON(): any {
        return {
            id: this.id,
            project_title: this.projectTitle,
            project_description: this.projectDescription,
            created_by: this.createdBy,
            status: this.statusName ?? null, // <-- return name instead of ID
            due_from: this.dueFrom,
            due_to: this.dueTo,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
            deleted_at: this.deletedAt
        };
    }
}
