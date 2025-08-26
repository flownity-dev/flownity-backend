import { DatabaseConnection } from '../database/index.js';
import { logger } from './logger.js';

export type OperationType = 'create' | 'edit' | 'delete';

export interface AuditEntry {
    createdBy: string;
    operationType: OperationType;
    description: string;
    taskId?: number | undefined;
    taskGroupId?: number | undefined;
    projectId?: number | undefined;
}

export interface AuditRecord extends AuditEntry {
    id: number;
    createdAt: Date;
}

export class AuditHelper {
    /**
     * Record an audit entry for project operations
     */
    static async recordProjectOperation(
        createdBy: string,
        operationType: OperationType,
        description: string,
        projectId: number
    ): Promise<AuditRecord | null> {
        return this.recordAuditEntry({
            createdBy,
            operationType,
            description,
            projectId
        });
    }

    /**
     * Record an audit entry for task operations
     */
    static async recordTaskOperation(
        createdBy: string,
        operationType: OperationType,
        description: string,
        taskId: number,
        projectId?: number
    ): Promise<AuditRecord | null> {
        return this.recordAuditEntry({
            createdBy,
            operationType,
            description,
            taskId,
            projectId
        });
    }

    /**
     * Record an audit entry for task group operations
     */
    static async recordTaskGroupOperation(
        createdBy: string,
        operationType: OperationType,
        description: string,
        taskGroupId: number,
        projectId?: number
    ): Promise<AuditRecord | null> {
        return this.recordAuditEntry({
            createdBy,
            operationType,
            description,
            taskGroupId,
            projectId
        });
    }

    /**
     * Record an audit entry for member operations
     */
    static async recordMemberOperation(
        createdBy: string,
        operationType: OperationType,
        description: string,
        projectId: number
    ): Promise<AuditRecord | null> {
        return this.recordAuditEntry({
            createdBy,
            operationType,
            description,
            projectId
        });
    }

    /**
     * Generic method to record any audit entry
     */
    static async recordAuditEntry(entry: AuditEntry): Promise<AuditRecord | null> {
        try {
            const query = `
        INSERT INTO flwnty_audithelper (
          createdBy, 
          operation_type_check, 
          description, 
          taskId, 
          taskGroupId, 
          projectId
        ) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *
      `;

            const values = [
                entry.createdBy,
                entry.operationType,
                entry.description,
                entry.taskId || null,
                entry.taskGroupId || null,
                entry.projectId || null
            ];

            const result = await DatabaseConnection.query(query, values);
            const auditRecord = result.rows[0];

            if (auditRecord) {
                logger.server('Audit entry recorded successfully', {
                    action: 'audit_record',
                    success: true,
                    auditId: auditRecord.id,
                    operationType: entry.operationType,
                    createdBy: entry.createdBy,
                    projectId: entry.projectId,
                    taskId: entry.taskId,
                    taskGroupId: entry.taskGroupId
                });

                return {
                    id: auditRecord.id,
                    createdBy: auditRecord.createdby,
                    createdAt: auditRecord.createdat,
                    operationType: auditRecord.operation_type_check as OperationType,
                    description: auditRecord.description,
                    taskId: auditRecord.taskid,
                    taskGroupId: auditRecord.taskgroupid,
                    projectId: auditRecord.projectid
                };
            }

            return null;
        } catch (error) {
            logger.server('Failed to record audit entry', {
                action: 'audit_record',
                success: false,
                error: error instanceof Error ? error.message : String(error),
                operationType: entry.operationType,
                createdBy: entry.createdBy,
                projectId: entry.projectId,
                taskId: entry.taskId,
                taskGroupId: entry.taskGroupId
            });

            throw new Error(`Failed to record audit entry: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get audit history for a project
     */
    static async getProjectAuditHistory(projectId: number, limit: number = 50): Promise<AuditRecord[]> {
        try {
            const query = `
        SELECT * FROM flwnty_audithelper 
        WHERE projectId = $1 
        ORDER BY createdAt DESC 
        LIMIT $2
      `;

            const result = await DatabaseConnection.query(query, [projectId, limit]);

            return result.rows.map(row => ({
                id: row.id,
                createdBy: row.createdby,
                createdAt: row.createdat,
                operationType: row.operation_type_check as OperationType,
                description: row.description,
                taskId: row.taskid,
                taskGroupId: row.taskgroupid,
                projectId: row.projectid
            }));
        } catch (error) {
            logger.server('Failed to get project audit history', {
                action: 'audit_history',
                success: false,
                error: error instanceof Error ? error.message : String(error),
                projectId
            });

            throw new Error(`Failed to get audit history: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get audit history for a specific task
     */
    static async getTaskAuditHistory(taskId: number, limit: number = 50): Promise<AuditRecord[]> {
        try {
            const query = `
        SELECT * FROM flwnty_audithelper 
        WHERE taskId = $1 
        ORDER BY createdAt DESC 
        LIMIT $2
      `;

            const result = await DatabaseConnection.query(query, [taskId, limit]);

            return result.rows.map(row => ({
                id: row.id,
                createdBy: row.createdby,
                createdAt: row.createdat,
                operationType: row.operation_type_check as OperationType,
                description: row.description,
                taskId: row.taskid,
                taskGroupId: row.taskgroupid,
                projectId: row.projectid
            }));
        } catch (error) {
            logger.server('Failed to get task audit history', {
                action: 'audit_history',
                success: false,
                error: error instanceof Error ? error.message : String(error),
                taskId
            });

            throw new Error(`Failed to get audit history: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get recent audit entries across all projects
     */
    static async getRecentAuditEntries(limit: number = 100): Promise<AuditRecord[]> {
        try {
            const query = `
        SELECT * FROM flwnty_audithelper 
        ORDER BY createdAt DESC 
        LIMIT $1
      `;

            const result = await DatabaseConnection.query(query, [limit]);

            return result.rows.map(row => ({
                id: row.id,
                createdBy: row.createdby,
                createdAt: row.createdat,
                operationType: row.operation_type_check as OperationType,
                description: row.description,
                taskId: row.taskid,
                taskGroupId: row.taskgroupid,
                projectId: row.projectid
            }));
        } catch (error) {
            logger.server('Failed to get recent audit entries', {
                action: 'audit_history',
                success: false,
                error: error instanceof Error ? error.message : String(error)
            });

            throw new Error(`Failed to get audit entries: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}

// Convenience functions for common audit operations
export const audit = {
    // Project operations
    projectCreated: (createdBy: string, projectId: number, projectName: string) =>
        AuditHelper.recordProjectOperation(createdBy, 'create', `Created project: ${projectName}`, projectId),

    projectUpdated: (createdBy: string, projectId: number, projectName: string, changes: string) =>
        AuditHelper.recordProjectOperation(createdBy, 'edit', `Updated project: ${projectName} - ${changes}`, projectId),

    projectDeleted: (createdBy: string, projectId: number, projectName: string) =>
        AuditHelper.recordProjectOperation(createdBy, 'delete', `Deleted project: ${projectName}`, projectId),

    // Task operations
    taskCreated: (createdBy: string, taskId: number, taskName: string, projectId?: number) =>
        AuditHelper.recordTaskOperation(createdBy, 'create', `Created task: ${taskName}`, taskId, projectId),

    taskUpdated: (createdBy: string, taskId: number, taskName: string, changes: string, projectId?: number) =>
        AuditHelper.recordTaskOperation(createdBy, 'edit', `Updated task: ${taskName} - ${changes}`, taskId, projectId),

    taskDeleted: (createdBy: string, taskId: number, taskName: string, projectId?: number) =>
        AuditHelper.recordTaskOperation(createdBy, 'delete', `Deleted task: ${taskName}`, taskId, projectId),

    // Task group operations
    taskGroupCreated: (createdBy: string, taskGroupId: number, groupName: string, projectId?: number) =>
        AuditHelper.recordTaskGroupOperation(createdBy, 'create', `Created task group: ${groupName}`, taskGroupId, projectId),

    taskGroupUpdated: (createdBy: string, taskGroupId: number, groupName: string, changes: string, projectId?: number) =>
        AuditHelper.recordTaskGroupOperation(createdBy, 'edit', `Updated task group: ${groupName} - ${changes}`, taskGroupId, projectId),

    taskGroupDeleted: (createdBy: string, taskGroupId: number, groupName: string, projectId?: number) =>
        AuditHelper.recordTaskGroupOperation(createdBy, 'delete', `Deleted task group: ${groupName}`, taskGroupId, projectId),

    // Member operations
    memberAdded: (createdBy: string, projectId: number, memberName: string) =>
        AuditHelper.recordMemberOperation(createdBy, 'create', `Added member: ${memberName}`, projectId),

    memberUpdated: (createdBy: string, projectId: number, memberName: string, changes: string) =>
        AuditHelper.recordMemberOperation(createdBy, 'edit', `Updated member: ${memberName} - ${changes}`, projectId),

    memberRemoved: (createdBy: string, projectId: number, memberName: string) =>
        AuditHelper.recordMemberOperation(createdBy, 'delete', `Removed member: ${memberName}`, projectId),

    // History retrieval
    getProjectHistory: (projectId: number, limit?: number) => AuditHelper.getProjectAuditHistory(projectId, limit),
    getTaskHistory: (taskId: number, limit?: number) => AuditHelper.getTaskAuditHistory(taskId, limit),
    getRecentEntries: (limit?: number) => AuditHelper.getRecentAuditEntries(limit)
};