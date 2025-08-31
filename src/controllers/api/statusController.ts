import { Request, Response } from 'express';
import { Status, CreateStatusData, UpdateStatusData } from '../../models/Status.js';
import { ValidationError } from '../../errors/index.js';

export class StatusController {
    /**
     * Get all statuses
     */
    static getStatuses = async (req: Request, res: Response) => {
        try {
            const statuses = await Status.findAll();

            return res.json({
                success: true,
                data: {
                    statuses: statuses.map(status => status.toJSON())
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
     * Get a single status by ID
     */
    static getStatus = async (req: Request, res: Response) => {
        try {
            const statusId = parseInt(req.params.id!);

            if (isNaN(statusId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status ID',
                    message: 'Status ID must be a valid number'
                });
            }

            const status = await Status.findById(statusId);

            if (!status) {
                return res.status(404).json({
                    success: false,
                    error: 'Status not found',
                    message: 'Status with the specified ID does not exist'
                });
            }

            return res.json({
                success: true,
                data: {
                    status: status.toJSON()
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
     * Create a new status
     */
    static createStatus = async (req: Request, res: Response) => {
        try {
            const statusData: CreateStatusData = {
                status_name: req.body.status_name
            };

            const status = await Status.create(statusData);

            return res.status(201).json({
                success: true,
                data: {
                    status: status.toJSON()
                },
                message: 'Status created successfully'
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
     * Update an existing status
     */
    static updateStatus = async (req: Request, res: Response) => {
        try {
            const statusId = parseInt(req.params.id!);

            if (isNaN(statusId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status ID',
                    message: 'Status ID must be a valid number'
                });
            }

            const updateData: UpdateStatusData = {};

            if (req.body.status_name !== undefined) {
                updateData.status_name = req.body.status_name;
            }

            const status = await Status.update(statusId, updateData);

            if (!status) {
                return res.status(404).json({
                    success: false,
                    error: 'Status not found',
                    message: 'Status with the specified ID does not exist'
                });
            }

            return res.json({
                success: true,
                data: {
                    status: status.toJSON()
                },
                message: 'Status updated successfully'
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
     * Delete a status
     */
    static deleteStatus = async (req: Request, res: Response) => {
        try {
            const statusId = parseInt(req.params.id!);

            if (isNaN(statusId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid status ID',
                    message: 'Status ID must be a valid number'
                });
            }

            const deleted = await Status.delete(statusId);

            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Status not found',
                    message: 'Status with the specified ID does not exist'
                });
            }

            return res.json({
                success: true,
                message: 'Status deleted successfully'
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