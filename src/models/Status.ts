import DatabaseConnection from '../database/connection.js';
import { DatabaseError, ValidationError } from '../errors/index.js';
import { logger } from '../utils/index.js';

export interface StatusRow {
    id: number;
    status_name: string;
}

export interface CreateStatusData {
    status_name: string;
}

export interface UpdateStatusData {
    status_name?: string;
}

export class Status {
    public readonly id: number;
    public readonly statusName: string;

    constructor(data: StatusRow) {
        this.id = data.id;
        this.statusName = data.status_name;
    }

    /**
     * Find all statuses
     */
    static async findAll(): Promise<Status[]> {
        try {
            logger.database('Finding all statuses', {
                operation: 'findAll',
                table: 'flwnty_status'
            });

            const query = 'SELECT * FROM flwnty_status ORDER BY id ASC';
            const result = await DatabaseConnection.query<StatusRow>(query);
            return result.rows.map(row => new Status(row));
        } catch (error) {
            logger.database('Error finding all statuses', {
                operation: 'findAll',
                table: 'flwnty_status',
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to find statuses',
                500,
                'STATUS_FIND_ALL_ERROR'
            );
        }
    }

    /**
     * Find a status by ID
     */
    static async findById(id: number): Promise<Status | null> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Status ID is required and must be a number');
        }

        try {
            logger.database('Finding status by ID', {
                operation: 'findById',
                table: 'flwnty_status',
                statusId: id
            });

            const query = 'SELECT * FROM flwnty_status WHERE id = $1';
            const result = await DatabaseConnection.query<StatusRow>(query, [id]);

            return result.rows.length > 0 ? new Status(result.rows[0]!) : null;
        } catch (error) {
            logger.database('Error finding status by ID', {
                operation: 'findById',
                table: 'flwnty_status',
                statusId: id,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to find status by ID',
                500,
                'STATUS_FIND_BY_ID_ERROR'
            );
        }
    }

    /**
     * Find a status by name
     */
    static async findByName(statusName: string): Promise<Status | null> {
        if (!statusName || typeof statusName !== 'string' || statusName.trim().length === 0) {
            throw new ValidationError('Status name is required and must be a non-empty string');
        }

        try {
            logger.database('Finding status by name', {
                operation: 'findByName',
                table: 'flwnty_status',
                statusName: statusName.trim()
            });

            const query = 'SELECT * FROM flwnty_status WHERE status_name = $1';
            const result = await DatabaseConnection.query<StatusRow>(query, [statusName.trim()]);

            return result.rows.length > 0 ? new Status(result.rows[0]!) : null;
        } catch (error) {
            logger.database('Error finding status by name', {
                operation: 'findByName',
                table: 'flwnty_status',
                statusName: statusName.trim(),
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to find status by name',
                500,
                'STATUS_FIND_BY_NAME_ERROR'
            );
        }
    }

    /**
     * Create a new status
     */
    static async create(data: CreateStatusData): Promise<Status> {
        if (!data.status_name || typeof data.status_name !== 'string' || data.status_name.trim().length === 0) {
            throw new ValidationError('Status name is required and must be a non-empty string');
        }

        try {
            logger.database('Creating new status', {
                operation: 'create',
                table: 'flwnty_status',
                statusName: data.status_name.trim()
            });

            // Check if status name already exists
            const existingStatus = await this.findByName(data.status_name.trim());
            if (existingStatus) {
                throw new ValidationError('Status name already exists');
            }

            const query = `
                INSERT INTO flwnty_status (status_name)
                VALUES ($1)
                RETURNING *
            `;

            const result = await DatabaseConnection.query<StatusRow>(query, [data.status_name.trim()]);
            return new Status(result.rows[0]!);
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }

            logger.database('Error creating status', {
                operation: 'create',
                table: 'flwnty_status',
                statusName: data.status_name.trim(),
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to create status',
                500,
                'STATUS_CREATE_ERROR'
            );
        }
    }

    /**
     * Update a status
     */
    static async update(id: number, data: UpdateStatusData): Promise<Status | null> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Status ID is required and must be a number');
        }

        if (!data.status_name) {
            throw new ValidationError('At least one field must be provided for update');
        }

        if (typeof data.status_name !== 'string' || data.status_name.trim().length === 0) {
            throw new ValidationError('Status name must be a non-empty string');
        }

        try {
            logger.database('Updating status', {
                operation: 'update',
                table: 'flwnty_status',
                statusId: id,
                statusName: data.status_name.trim()
            });

            // Check if status exists
            const existingStatus = await this.findById(id);
            if (!existingStatus) {
                return null;
            }

            // Check if new status name already exists (but not for the current status)
            const statusWithSameName = await this.findByName(data.status_name.trim());
            if (statusWithSameName && statusWithSameName.id !== id) {
                throw new ValidationError('Status name already exists');
            }

            const query = `
                UPDATE flwnty_status 
                SET status_name = $1
                WHERE id = $2
                RETURNING *
            `;

            const result = await DatabaseConnection.query<StatusRow>(query, [data.status_name.trim(), id]);
            return result.rows.length > 0 ? new Status(result.rows[0]!) : null;
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }

            logger.database('Error updating status', {
                operation: 'update',
                table: 'flwnty_status',
                statusId: id,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to update status',
                500,
                'STATUS_UPDATE_ERROR'
            );
        }
    }

    /**
     * Delete a status
     */
    static async delete(id: number): Promise<boolean> {
        if (!id || typeof id !== 'number') {
            throw new ValidationError('Status ID is required and must be a number');
        }

        try {
            logger.database('Deleting status', {
                operation: 'delete',
                table: 'flwnty_status',
                statusId: id
            });

            // Check if status is being used by any tasks
            const taskCheckQuery = 'SELECT COUNT(*) as count FROM flwnty_task WHERE status_id = $1';
            const taskCheckResult = await DatabaseConnection.query<{ count: string }>(taskCheckQuery, [id]);
            const taskCount = parseInt(taskCheckResult.rows[0]?.count || '0', 10);

            if (taskCount > 0) {
                throw new ValidationError('Cannot delete status that is being used by tasks');
            }

            const query = 'DELETE FROM flwnty_status WHERE id = $1';
            const result = await DatabaseConnection.query(query, [id]);

            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            if (error instanceof ValidationError) {
                throw error;
            }

            logger.database('Error deleting status', {
                operation: 'delete',
                table: 'flwnty_status',
                statusId: id,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new DatabaseError(
                'Failed to delete status',
                500,
                'STATUS_DELETE_ERROR'
            );
        }
    }

    /**
     * Get status data as a plain object
     */
    toJSON(): StatusRow {
        return {
            id: this.id,
            status_name: this.statusName
        };
    }
}