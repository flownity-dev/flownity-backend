import DatabaseConnection from '../database/connection.js';
import { DatabaseError, ValidationError } from '../errors/index.js';
import { logger, PaginationParams } from '../utils/index.js';

export interface TaskRow {
    id: number;
    task_group_id: number | null;
    project_id: number | null;
    task_title: string;
    description: string | null;
    status_id: number | null;
    status_name?: string | null;   // <-- added
    due_from: Date | null;
    due_to: Date | null;
    assignee: number | null;
    approver: number | null;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
}

export interface CreateTaskData {
    task_group_id?: number | null;
    project_id?: number | null;
    task_title: string;
    description?: string | null;
    status_id?: number | null;
    due_from?: Date | null;
    due_to?: Date | null;
    assignee?: number | null;
    approver?: number | null;
}

export interface UpdateTaskData {
    task_group_id?: number | null;
    project_id?: number | null;
    task_title?: string;
    description?: string | null;
    status_id?: number | null;
    due_from?: Date | null;
    due_to?: Date | null;
    assignee?: number | null;
    approver?: number | null;
}

export class Task {
    public readonly id: number;
    public readonly taskGroupId: number | null;
    public readonly projectId: number | null;
    public readonly taskTitle: string;
    public readonly description: string | null;
    public readonly statusId: number | null;
    public readonly statusName: string | null;   // <-- added
    public readonly dueFrom: Date | null;
    public readonly dueTo: Date | null;
    public readonly assignee: number | null;
    public readonly approver: number | null;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;
    public readonly deletedAt: Date | null;

    constructor(data: TaskRow) {
        this.id = data.id;
        this.taskGroupId = data.task_group_id;
        this.projectId = data.project_id;
        this.taskTitle = data.task_title;
        this.description = data.description;
        this.statusId = data.status_id;
        this.statusName = data.status_name ?? null;   // <-- map status_name
        this.dueFrom = data.due_from;
        this.dueTo = data.due_to;
        this.assignee = data.assignee;
        this.approver = data.approver;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.deletedAt = data.deleted_at;
    }

    /**
     * Get all tasks for a user (where user is assignee or approver)
     */
    static async findByUserId(userId: number): Promise<Task[]> {
        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        try {
            logger.database('Finding tasks by user ID', {
                operation: 'findByUserId',
                table: 'flwnty_task',
                userId
            });

            const query = `
                SELECT t.*, s.status_name
                FROM flwnty_task t
                LEFT JOIN flwnty_status s ON t.status_id = s.id
                WHERE (t.assignee = $1 OR t.approver = $1) AND t.deleted_at IS NULL
                ORDER BY t.created_at DESC
            `;
            const result = await DatabaseConnection.query<TaskRow>(query, [userId]);
            return result.rows.map(row => new Task(row));
        } catch (error) {
            logger.database('Error finding tasks by user ID', {
                operation: 'findByUserId',
                table: 'flwnty_task',
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to find tasks by user ID',
                500,
                'TASK_FIND_ERROR'
            );
        }
    }

    /**
     * Find a task by ID
     */
    static async findById(id: number): Promise<Task | null> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Task ID is required and must be a number');
        }

        try {
            logger.database('Finding task by ID', {
                operation: 'findById',
                table: 'flwnty_task',
                taskId: id
            });

            const query = `
                SELECT t.*, s.status_name
                FROM flwnty_task t
                LEFT JOIN flwnty_status s ON t.status_id = s.id
                WHERE t.id = $1 AND t.deleted_at IS NULL
            `;
            const result = await DatabaseConnection.query<TaskRow>(query, [id]);

            return result.rows.length > 0 ? new Task(result.rows[0]!) : null;
        } catch (error) {
            logger.database('Error finding task by ID', {
                operation: 'findById',
                table: 'flwnty_task',
                taskId: id,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to find task by ID',
                500,
                'TASK_FIND_BY_ID_ERROR'
            );
        }
    }

    /**
     * Create a new task
     */
    static async create(data: CreateTaskData): Promise<Task> {
        if (!data.task_title || typeof data.task_title !== 'string' || data.task_title.trim().length === 0) {
            throw new ValidationError('Task title is required and must be a non-empty string');
        }

        try {
            logger.database('Creating new task', {
                operation: 'create',
                table: 'flwnty_task',
                title: data.task_title
            });

            const query = `
                INSERT INTO flwnty_task (task_group_id, project_id, task_title, description, status_id, due_from, due_to, assignee, approver)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;

            const values = [
                data.task_group_id || null,
                data.project_id || null,
                data.task_title.trim(),
                data.description || null,
                data.status_id || 1, // Default to 'pending' status
                data.due_from || null,
                data.due_to || null,
                data.assignee || null,
                data.approver || null
            ];

            const result = await DatabaseConnection.query<TaskRow>(query, values);
            return new Task(result.rows[0]!);
        } catch (error) {
            logger.database('Error creating task', {
                operation: 'create',
                table: 'flwnty_task',
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to create task',
                500,
                'TASK_CREATE_ERROR'
            );
        }
    }

    /**
     * Update a task
     */
    static async update(id: number, userId: number, data: UpdateTaskData): Promise<Task | null> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Task ID is required and must be a number');
        }

        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        const existingTask = await this.findById(id);
        if (!existingTask) {
            return null;
        }

        if (existingTask.assignee !== userId && existingTask.approver !== userId) {
            throw new ValidationError('You can only update tasks where you are the assignee or approver');
        }

        const updateFields: string[] = [];
        const values: any[] = [];
        let paramCount = 1;

        if (data.task_group_id !== undefined) {
            updateFields.push(`task_group_id = $${paramCount++}`);
            values.push(data.task_group_id);
        }

        if (data.project_id !== undefined) {
            updateFields.push(`project_id = $${paramCount++}`);
            values.push(data.project_id);
        }

        if (data.task_title !== undefined) {
            if (typeof data.task_title !== 'string' || data.task_title.trim().length === 0) {
                throw new ValidationError('Task title must be a non-empty string');
            }
            updateFields.push(`task_title = $${paramCount++}`);
            values.push(data.task_title.trim());
        }

        if (data.description !== undefined) {
            updateFields.push(`description = $${paramCount++}`);
            values.push(data.description);
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

        if (data.assignee !== undefined) {
            updateFields.push(`assignee = $${paramCount++}`);
            values.push(data.assignee);
        }

        if (data.approver !== undefined) {
            updateFields.push(`approver = $${paramCount++}`);
            values.push(data.approver);
        }

        if (updateFields.length === 0) {
            throw new ValidationError('At least one field must be provided for update');
        }

        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(id);

        try {
            logger.database('Updating task', {
                operation: 'update',
                table: 'flwnty_task',
                taskId: id,
                userId,
                fields: updateFields
            });

            const query = `
                UPDATE flwnty_task 
                SET ${updateFields.join(', ')}
                WHERE id = $${paramCount} AND (assignee = $${paramCount + 1} OR approver = $${paramCount + 1}) AND deleted_at IS NULL
                RETURNING *
            `;

            values.push(userId);
            const result = await DatabaseConnection.query<TaskRow>(query, values);

            return result.rows.length > 0 ? new Task(result.rows[0]!) : null;
        } catch (error) {
            logger.database('Error updating task', {
                operation: 'update',
                table: 'flwnty_task',
                taskId: id,
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to update task',
                500,
                'TASK_UPDATE_ERROR'
            );
        }
    }

    /**
     * Soft delete a task
     */
    static async delete(id: number, userId: number): Promise<boolean> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Task ID is required and must be a number');
        }

        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        try {
            logger.database('Soft deleting task', {
                operation: 'soft_delete',
                table: 'flwnty_task',
                taskId: id,
                userId
            });

            const query = `
                UPDATE flwnty_task 
                SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND (assignee = $2 OR approver = $2) AND deleted_at IS NULL
            `;
            const result = await DatabaseConnection.query(query, [id, userId]);

            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.database('Error soft deleting task', {
                operation: 'soft_delete',
                table: 'flwnty_task',
                taskId: id,
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to delete task',
                500,
                'TASK_DELETE_ERROR'
            );
        }
    }

    /**
     * Restore a task
     */
    static async restore(id: number, userId: number): Promise<boolean> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Task ID is required and must be a number');
        }

        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        try {
            logger.database('Restoring soft deleted task', {
                operation: 'restore',
                table: 'flwnty_task',
                taskId: id,
                userId
            });

            const query = `
                UPDATE flwnty_task 
                SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1 AND (assignee = $2 OR approver = $2) AND deleted_at IS NOT NULL
            `;
            const result = await DatabaseConnection.query(query, [id, userId]);

            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.database('Error restoring task', {
                operation: 'restore',
                table: 'flwnty_task',
                taskId: id,
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to restore task',
                500,
                'TASK_RESTORE_ERROR'
            );
        }
    }

    /**
     * Get all soft deleted tasks
     */
    static async findDeletedByUserId(userId: number): Promise<Task[]> {
        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        try {
            logger.database('Finding deleted tasks by user ID', {
                operation: 'findDeletedByUserId',
                table: 'flwnty_task',
                userId
            });

            const query = `
                SELECT t.*, s.status_name
                FROM flwnty_task t
                LEFT JOIN flwnty_status s ON t.status_id = s.id
                WHERE (t.assignee = $1 OR t.approver = $1) AND t.deleted_at IS NOT NULL
                ORDER BY t.deleted_at DESC
            `;
            const result = await DatabaseConnection.query<TaskRow>(query, [userId]);
            return result.rows.map(row => new Task(row));
        } catch (error) {
            logger.database('Error finding deleted tasks by user ID', {
                operation: 'findDeletedByUserId',
                table: 'flwnty_task',
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to find deleted tasks by user ID',
                500,
                'TASK_FIND_DELETED_ERROR'
            );
        }
    }

    /**
     * Paginated tasks
     */
    static async findByUserIdPaginated(
        userId: number, 
        params: PaginationParams
    ): Promise<{ tasks: Task[]; totalCount: number }> {
        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        try {
            logger.database('Finding paginated tasks by user ID', {
                operation: 'findByUserIdPaginated',
                table: 'flwnty_task',
                userId,
                page: params.page,
                limit: params.limit
            });

            const countQuery = `
                SELECT COUNT(*) as total FROM flwnty_task
                WHERE (assignee = $1 OR approver = $1) AND deleted_at IS NULL
            `;
            const countResult = await DatabaseConnection.query<{ total: string }>(countQuery, [userId]);
            const totalCount = parseInt(countResult.rows[0]?.total || '0', 10);

            const offset = (params.page - 1) * params.limit;
            const dataQuery = `
                SELECT t.*, s.status_name
                FROM flwnty_task t
                LEFT JOIN flwnty_status s ON t.status_id = s.id
                WHERE (t.assignee = $1 OR t.approver = $1) AND t.deleted_at IS NULL
                ORDER BY t.created_at DESC
                LIMIT $2 OFFSET $3
            `;
            const dataResult = await DatabaseConnection.query<TaskRow>(dataQuery, [userId, params.limit, offset]);
            const tasks = dataResult.rows.map(row => new Task(row));

            return { tasks, totalCount };
        } catch (error) {
            logger.database('Error finding paginated tasks by user ID', {
                operation: 'findByUserIdPaginated',
                table: 'flwnty_task',
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to find paginated tasks by user ID',
                500,
                'TASK_FIND_PAGINATED_ERROR'
            );
        }
    }

    /**
     * Paginated deleted tasks
     */
    static async findDeletedByUserIdPaginated(
        userId: number, 
        params: PaginationParams
    ): Promise<{ tasks: Task[]; totalCount: number }> {
        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        try {
            logger.database('Finding paginated deleted tasks by user ID', {
                operation: 'findDeletedByUserIdPaginated',
                table: 'flwnty_task',
                userId,
                page: params.page,
                limit: params.limit
            });

            const countQuery = `
                SELECT COUNT(*) as total FROM flwnty_task
                WHERE (assignee = $1 OR approver = $1) AND deleted_at IS NOT NULL
            `;
            const countResult = await DatabaseConnection.query<{ total: string }>(countQuery, [userId]);
            const totalCount = parseInt(countResult.rows[0]?.total || '0', 10);

            const offset = (params.page - 1) * params.limit;
            const dataQuery = `
                SELECT t.*, s.status_name
                FROM flwnty_task t
                LEFT JOIN flwnty_status s ON t.status_id = s.id
                WHERE (t.assignee = $1 OR t.approver = $1) AND t.deleted_at IS NOT NULL
                ORDER BY t.deleted_at DESC
                LIMIT $2 OFFSET $3
            `;
            const dataResult = await DatabaseConnection.query<TaskRow>(dataQuery, [userId, params.limit, offset]);
            const tasks = dataResult.rows.map(row => new Task(row));

            return { tasks, totalCount };
        } catch (error) {
            logger.database('Error finding paginated deleted tasks by user ID', {
                operation: 'findDeletedByUserIdPaginated',
                table: 'flwnty_task',
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to find paginated deleted tasks by user ID',
                500,
                'TASK_FIND_DELETED_PAGINATED_ERROR'
            );
        }
    }

    /**
     * Permanently delete
     */
    static async forceDelete(id: number, userId: number): Promise<boolean> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Task ID is required and must be a number');
        }

        if (!userId || typeof userId !== 'number') {
            throw new ValidationError('User ID is required and must be a number');
        }

        try {
            logger.database('Force deleting task', {
                operation: 'force_delete',
                table: 'flwnty_task',
                taskId: id,
                userId
            });

            const query = 'DELETE FROM flwnty_task WHERE id = $1 AND (assignee = $2 OR approver = $2)';
            const result = await DatabaseConnection.query(query, [id, userId]);

            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            logger.database('Error force deleting task', {
                operation: 'force_delete',
                table: 'flwnty_task',
                taskId: id,
                userId,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to permanently delete task',
                500,
                'TASK_FORCE_DELETE_ERROR'
            );
        }
    }

    /**
     * Serialize
     */
    toJSON(): TaskRow {
        return {
            id: this.id,
            task_group_id: this.taskGroupId,
            project_id: this.projectId,
            task_title: this.taskTitle,
            description: this.description,
            status_id: this.statusId,
            status_name: this.statusName,   // <-- included
            due_from: this.dueFrom,
            due_to: this.dueTo,
            assignee: this.assignee,
            approver: this.approver,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
            deleted_at: this.deletedAt
        };
    }
}
