import { ValidationError } from '../errors/index.js';

/**
 * Pagination parameters interface
 */
export interface PaginationParams {
    page: number;        // 1-based page number
    limit: number;       // Items per page (1-100)
}

/**
 * Pagination metadata interface
 */
export interface PaginationMetadata {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startIndex: number;
    endIndex: number;
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
    success: boolean;
    data: {
        [key: string]: T[];  // e.g., projects, tasks, taskGroups
    };
    pagination: PaginationMetadata;
    message?: string;
}

/**
 * Utility class for pagination operations
 */
export class PaginationUtils {
    static readonly DEFAULT_PAGE = 1;
    static readonly DEFAULT_LIMIT = 20;
    static readonly MAX_LIMIT = 100;
    static readonly MIN_LIMIT = 1;
    static readonly MIN_PAGE = 1;

    /**
     * Validate and normalize pagination parameters
     */
    static validateAndNormalize(params: any): PaginationParams {
        let page = this.DEFAULT_PAGE;
        let limit = this.DEFAULT_LIMIT;

        // Validate and parse page parameter
        if (params.page !== undefined) {
            const parsedPage = parseInt(params.page, 10);
            if (isNaN(parsedPage)) {
                throw new ValidationError('Page number must be a valid integer');
            }
            if (parsedPage < this.MIN_PAGE) {
                throw new ValidationError('Page number must be a positive integer');
            }
            page = parsedPage;
        }

        // Validate and parse limit parameter
        if (params.limit !== undefined) {
            const parsedLimit = parseInt(params.limit, 10);
            if (isNaN(parsedLimit)) {
                throw new ValidationError('Limit must be a valid integer');
            }
            if (parsedLimit < this.MIN_LIMIT) {
                throw new ValidationError('Limit must be at least 1');
            }
            if (parsedLimit > this.MAX_LIMIT) {
                throw new ValidationError(`Limit cannot exceed ${this.MAX_LIMIT}`);
            }
            limit = parsedLimit;
        }

        return { page, limit };
    }

    /**
     * Calculate pagination metadata
     */
    static calculateMetadata(params: PaginationParams, totalItems: number): PaginationMetadata {
        const { page, limit } = params;
        const totalPages = Math.ceil(totalItems / limit);
        const startIndex = totalItems > 0 ? (page - 1) * limit + 1 : 0;
        const endIndex = Math.min(page * limit, totalItems);

        return {
            currentPage: page,
            totalPages: totalPages,
            totalItems: totalItems,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            startIndex: startIndex,
            endIndex: endIndex
        };
    }

    /**
     * Calculate database offset for LIMIT/OFFSET queries
     */
    static calculateOffset(page: number, limit: number): number {
        return (page - 1) * limit;
    }

    /**
     * Create a standardized paginated response
     */
    static createResponse<T>(
        data: T[],
        dataKey: string,
        params: PaginationParams,
        totalItems: number,
        message?: string
    ): PaginatedResponse<T> {
        const pagination = this.calculateMetadata(params, totalItems);
        
        return {
            success: true,
            data: {
                [dataKey]: data
            } as { [key: string]: T[] },
            pagination,
            ...(message && { message })
        };
    }
}