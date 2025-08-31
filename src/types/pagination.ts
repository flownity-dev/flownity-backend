// Core pagination interfaces
export interface PaginationParams {
    page: number;        // 1-based page number
    limit: number;       // Items per page (1-100)
}

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

export interface PaginatedResponse<T> {
    success: boolean;
    data: {
        [key: string]: T[];  // e.g., projects, tasks, taskGroups
    };
    pagination: PaginationMetadata;
    message?: string;
}

// Utility functions for pagination logic
export class PaginationUtils {
    static readonly DEFAULT_PAGE = 1;
    static readonly DEFAULT_LIMIT = 20;
    static readonly MAX_LIMIT = 100;
    
    /**
     * Validates and normalizes pagination parameters from request query
     */
    static validateAndNormalize(params: any): PaginationParams {
        let page = this.DEFAULT_PAGE;
        let limit = this.DEFAULT_LIMIT;

        // Validate page parameter
        if (params.page !== undefined) {
            const pageNum = parseInt(params.page, 10);
            if (isNaN(pageNum) || pageNum < 1) {
                throw new Error('Page number must be a positive integer');
            }
            page = pageNum;
        }

        // Validate limit parameter
        if (params.limit !== undefined) {
            const limitNum = parseInt(params.limit, 10);
            if (isNaN(limitNum) || limitNum < 1) {
                throw new Error('Limit must be a positive integer');
            }
            if (limitNum > this.MAX_LIMIT) {
                limit = this.MAX_LIMIT;
            } else {
                limit = limitNum;
            }
        }

        return { page, limit };
    }

    /**
     * Calculates pagination metadata based on parameters and total items
     */
    static calculateMetadata(params: PaginationParams, totalItems: number): PaginationMetadata {
        const { page, limit } = params;
        const totalPages = Math.ceil(totalItems / limit);
        const startIndex = (page - 1) * limit + 1;
        const endIndex = Math.min(page * limit, totalItems);

        return {
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            startIndex: totalItems > 0 ? startIndex : 0,
            endIndex: totalItems > 0 ? endIndex : 0
        };
    }

    /**
     * Calculates database OFFSET value for pagination
     */
    static calculateOffset(page: number, limit: number): number {
        return (page - 1) * limit;
    }

    /**
     * Creates a standardized paginated response
     */
    static createResponse<T>(
        data: { [key: string]: T[] },
        pagination: PaginationMetadata,
        message?: string
    ): PaginatedResponse<T> {
        return {
            success: true,
            data,
            pagination,
            ...(message && { message })
        };
    }
}