import DatabaseConnection from '../database/connection.js';
import { DatabaseError, ValidationError } from '../errors/index.js';
import { logger, PaginationParams } from '../utils/index.js';

export interface TaskGroupRow {
    id: number;
    task_group_title: string;
    project_id: number;
    status?: string | null; // from flwnty_status.status_name
    due_from: Date | null;
    due_to: Date | null;
    created_by: number;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface CreateTaskGroupData {
    task_group_title: string;
    project_id: number;
    status_id?: number | null;
    due_from?: Date | null;
    due_to?: Date | null;
}

export interface UpdateTaskGroupData {
    task_group_title?: string;
    project_id?: number;
    status_id?: number | null;
    due_from?: Date | null;
    due_to?: Date | null;
}

export class TaskGroup {
    public readonly id: number;
    public readonly taskGroupTitle: string;
    public readonly projectId: number;
    public readonly status: string | null;
    public readonly dueFrom: Date | null;
    public readonly dueTo: Date | null;
    public readonly createdBy: number;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;
    public readonly deletedAt: Date | null;

    constructor(data: TaskGroupRow) {
        this.id = data.id;
        this.taskGroupTitle = data.task_group_title;
        this.projectId = data.project_id;
        this.status = data.status ?? null;
        this.dueFrom = data.due_from;
        this.dueTo = data.due_to;
        this.createdBy = data.created_by;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.deletedAt = data.deleted_at;
    }

    /**
     * Get all task groups for a user
     */
    static async findByUserId(userId: number): Promise<TaskGroup[]> {
        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        try {
            logger.database('Finding task groups by user ID', {
                operation: 'findByUserId',
                table: 'flwnty_task_group',
                userId
            });

            const query = `
                SELECT tg.*, s.status_name AS status
                FROM flwnty_task_group tg
                LEFT JOIN flwnty_status s ON tg.status_id = s.id
                WHERE tg.created_by = $1 AND tg.deleted_at IS NULL
                ORDER BY tg.created_at DESC
            `;
            const result = await DatabaseConnection.query<TaskGroupRow>(query, [userId]);
            return result.rows.map(row => new TaskGroup(row));
        } catch (error) {
            logger.database('Error finding task groups by user ID', {
                operation: 'findByUserId',
                table: 'flwnty_task_group',
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to find task groups by user ID',
                500,
                'TASK_GROUP_FIND_ERROR'
            );
        }
    }

    /**
     * Find a task group by ID
     */
    static async findById(id: number): Promise<TaskGroup | null> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Task Group ID is required and must be a number');
        }

        try {
            logger.database('Finding task group by ID', {
                operation: 'findById',
                table: 'flwnty_task_group',
                taskGroupId: id
            });

            const query = `
                SELECT tg.*, s.status_name AS status
                FROM flwnty_task_group tg
                LEFT JOIN flwnty_status s ON tg.status_id = s.id
                WHERE tg.id = $1 AND tg.deleted_at IS NULL
            `;
            const result = await DatabaseConnection.query<TaskGroupRow>(query, [id]);

            return result.rows.length > 0 ? new TaskGroup(result.rows[0]!) : null;
        } catch (error) {
            logger.database('Error finding task group by ID', {
                operation: 'findById',
                table: 'flwnty_task_group',
                taskGroupId: id,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to find task group by ID',
                500,
                'TASK_GROUP_FIND_BY_ID_ERROR'
            );
        }
    }

    /**
     * Create a new task group
     */
    static async create(userId: number, data: CreateTaskGroupData): Promise<TaskGroup> {
        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        if (!data.task_group_title || typeof data.task_group_title !== 'string' || data.task_group_title.trim().length === 0) {
            throw new ValidationError('Task group title is required and must be a non-empty string');
        }

        try {
            logger.database('Creating new task group', {
                operation: 'create',
                table: 'flwnty_task_group',
                userId,
                title: data.task_group_title
            });

            const query = `
                INSERT INTO flwnty_task_group (task_group_title, project_id, status_id, due_from, due_to, created_by)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;

            const values = [
                data.task_group_title.trim(),
                data.project_id,
                data.status_id || null,
                data.due_from || null,
                data.due_to || null,
                userId
            ];

            const result = await DatabaseConnection.query<TaskGroupRow>(query, values);
            return new TaskGroup(result.rows[0]!);
        } catch (error) {
            logger.database('Error creating task group', {
                operation: 'create',
                table: 'flwnty_task_group',
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to create task group',
                500,
                'TASK_GROUP_CREATE_ERROR'
            );
        }
    }

    /**
     * Update a task group
     */
    static async update(id: number, userId: number, data: UpdateTaskGroupData): Promise<TaskGroup | null> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Task Group ID is required and must be a number');
        }

        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        const existingTaskGroup = await this.findById(id);
        if (!existingTaskGroup) {
            return null;
        }

        if (existingTaskGroup.createdBy !== userId) {
            throw new ValidationError('You can only update your own task groups');
        }

        const updateFields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (data.task_group_title !== undefined) {
            if (typeof data.task_group_title !== 'string' || data.task_group_title.trim().length === 0) {
                throw new ValidationError('Task group title must be a non-empty string');
            }
            updateFields.push(`task_group_title = $${paramCount++}`);
            values.push(data.task_group_title.trim());
        }

        if (data.project_id !== undefined) {
            if (typeof data.project_id !== 'number') {
                throw new ValidationError('Project ID must be a number');
            }
            updateFields.push(`project_id = $${paramCount++}`);
            values.push(data.project_id);
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

        if (updateFields.length === 0) {
            throw new ValidationError('At least one field must be provided for update');
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);
        values.push(userId);

        try {
            logger.database('Updating task group', {
                operation: 'update',
                table: 'flwnty_task_group',
                taskGroupId: id,
                userId,
                fields: updateFields
            });

            const query = `
                UPDATE flwnty_task_group 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramCount} AND created_by = $${paramCount + 1} AND deleted_at IS NULL
                RETURNING *
            `;

            const result = await DatabaseConnection.query<TaskGroupRow>(query, values);
            return result.rows.length > 0 ? new TaskGroup(result.rows[0]!) : null;
        } catch (error) {
            logger.database('Error updating task group', {
                operation: 'update',
                table: 'flwnty_task_group',
                taskGroupId: id,
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to update task group',
                500,
                'TASK_GROUP_UPDATE_ERROR'
            );
        }
    }

    /**
     * Soft delete a task group
     */
    static async delete(id: number, userId: number): Promise<boolean> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Task Group ID is required and must be a number');
        }

        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        try {
            const query = `
                UPDATE flwnty_task_group 
                SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND created_by = $2 AND deleted_at IS NULL
            `;
            const result = await DatabaseConnection.query(query, [id, userId]);
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            throw new DatabaseError('Failed to delete task group', 500, 'TASK_GROUP_DELETE_ERROR');
        }
    }



    static async findDeletedByUserIdPaginated(
        userId: number, 
        params: PaginationParams
    ): Promise<{ taskGroups: TaskGroup[]; totalCount: number }> {
        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        try {
            logger.database('Finding paginated deleted task groups by user ID', {
                operation: 'findDeletedByUserIdPaginated',
                table: 'flwnty_task_group',
                userId,
                page: params.page,
                limit: params.limit
            });

            // First, get the total count
            const countQuery = `
                SELECT COUNT(*) as total FROM flwnty_task_group
                WHERE created_by = $1 AND deleted_at IS NOT NULL
            `;
            const countResult = await DatabaseConnection.query<{ total: string }>(countQuery, [userId]);
            const totalCount = parseInt(countResult.rows[0]?.total || '0', 10);

            // Then get the paginated data
            const offset = (params.page - 1) * params.limit;
            const dataQuery = `
                SELECT * FROM flwnty_task_group
                WHERE created_by = $1 AND deleted_at IS NOT NULL
                ORDER BY deleted_at DESC
                LIMIT $2 OFFSET $3
            `;
            const dataResult = await DatabaseConnection.query<TaskGroupRow>(dataQuery, [userId, params.limit, offset]);
            const taskGroups = dataResult.rows.map(row => new TaskGroup(row));

            return { taskGroups, totalCount };
        } catch (error) {
            logger.database('Error finding paginated deleted task groups by user ID', {
                operation: 'findDeletedByUserIdPaginated',
                table: 'flwnty_task_group',
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to find paginated deleted task groups by user ID',
                500,
                'TASK_GROUP_FIND_DELETED_PAGINATED_ERROR'
            );
        }
    }


        /**
     * Restore a soft deleted task group
     */
    static async restore(id: number, userId: number): Promise<boolean> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Task Group ID is required and must be a number');
        }

        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        try {
            logger.database('Restoring soft deleted task group', {
                operation: 'restore',
                table: 'flwnty_task_group',
                taskGroupId: id,
                userId
            });

            const query = `
                UPDATE flwnty_task_group 
                SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND created_by = $2 AND deleted_at IS NOT NULL
            `;
            const result = await DatabaseConnection.query(query, [id, userId]);

            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.database('Error restoring task group', {
                operation: 'restore',
                table: 'flwnty_task_group',
                taskGroupId: id,
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to restore task group',
                500,
                'TASK_GROUP_RESTORE_ERROR'
            );
        }
    }

    /**
     * Permanently delete a task group (hard delete)
     */
    static async forceDelete(id: number, userId: number): Promise<boolean> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Task Group ID is required and must be a number');
        }

        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        try {
            logger.database('Force deleting task group', {
                operation: 'force_delete',
                table: 'flwnty_task_group',
                taskGroupId: id,
                userId
            });

            const query = 'DELETE FROM flwnty_task_group WHERE id = $1 AND created_by = $2';
            const result = await DatabaseConnection.query(query, [id, userId]);

            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.database('Error force deleting task group', {
                operation: 'force_delete',
                table: 'flwnty_task_group',
                taskGroupId: id,
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to permanently delete task group',
                500,
                'TASK_GROUP_FORCE_DELETE_ERROR'
            );
        }
    }    

    /**
     * Get paginated task groups for a user
     */
    static async findByUserIdPaginated(
        userId: number, 
        params: PaginationParams
    ): Promise<{ taskGroups: TaskGroup[]; totalCount: number }> {
        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        try {
            const countQuery = `
                SELECT COUNT(*) as total FROM flwnty_task_group
                WHERE created_by = $1 AND deleted_at IS NULL
            `;
            const countResult = await DatabaseConnection.query<{ total: string }>(countQuery, [userId]);
            const totalCount = parseInt(countResult.rows[0]?.total || '0', 10);

            const offset = (params.page - 1) * params.limit;
            const dataQuery = `
                SELECT tg.*, s.status_name AS status
                FROM flwnty_task_group tg
                LEFT JOIN flwnty_status s ON tg.status_id = s.id
                WHERE tg.created_by = $1 AND tg.deleted_at IS NULL
                ORDER BY tg.created_at DESC
                LIMIT $2 OFFSET $3
            `;
            const dataResult = await DatabaseConnection.query<TaskGroupRow>(dataQuery, [userId, params.limit, offset]);
            const taskGroups = dataResult.rows.map(row => new TaskGroup(row));

            return { taskGroups, totalCount };
        } catch (error) {
            throw new DatabaseError('Failed to find paginated task groups', 500, 'TASK_GROUP_FIND_PAGINATED_ERROR');
        }
    }

    /**
     * Convert to plain object
     */
    toJSON(): TaskGroupRow {
        return {
            id: this.id,
            task_group_title: this.taskGroupTitle,
            project_id: this.projectId,
            status: this.status,
            due_from: this.dueFrom,
            due_to: this.dueTo,
            created_by: this.createdBy,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
            deleted_at: this.deletedAt
        };
    }
}
