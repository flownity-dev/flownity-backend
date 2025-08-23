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

    constructor(data: ProjectRow) {
        this.id = data.id;
        this.projectTitle = data.project_title;
        this.projectDescription = data.project_description;
        this.createdBy = data.created_by;
        this.dueFrom = data.due_from;
        this.dueTo = data.due_to;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
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
                WHERE created_by = $1
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
            updated_at: this.updatedAt
        };
    }
}