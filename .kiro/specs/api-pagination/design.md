# Design Document

## Overview

This design implements comprehensive pagination support for all GET endpoints that return lists of data in the Flownity Backend API. The solution provides efficient, database-level pagination with consistent metadata across all endpoints while maintaining backward compatibility.

The design follows the existing architectural patterns in the codebase, extending the current model layer with pagination capabilities and updating controllers to handle pagination parameters. The implementation uses PostgreSQL's LIMIT and OFFSET clauses for efficient data retrieval and separate COUNT queries for total record calculation.

## Architecture

### Pagination Flow
```
Client Request → Controller → Model (with pagination) → Database → Response with Metadata
```

### Key Components
1. **Pagination Interface**: Standardized pagination parameters and response structure
2. **Model Extensions**: Enhanced model methods with pagination support
3. **Controller Updates**: Modified controllers to handle pagination parameters
4. **Response Wrapper**: Consistent pagination metadata structure

### Database Strategy
- Use PostgreSQL LIMIT and OFFSET for efficient data retrieval
- Separate COUNT queries to determine total records
- Maintain existing WHERE clauses and user filtering
- Preserve current ordering (ORDER BY created_at DESC, deleted_at DESC)

## Components and Interfaces

### Pagination Types
```typescript
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
```

### Pagination Utility
```typescript
// Utility functions for pagination logic
export class PaginationUtils {
    static readonly DEFAULT_PAGE = 1;
    static readonly DEFAULT_LIMIT = 20;
    static readonly MAX_LIMIT = 100;
    
    static validateAndNormalize(params: any): PaginationParams;
    static calculateMetadata(params: PaginationParams, totalItems: number): PaginationMetadata;
    static calculateOffset(page: number, limit: number): number;
}
```

### Model Extensions
Each model (Project, Task, TaskGroup) will be extended with paginated versions of existing methods:

```typescript
// Example for Project model
export class Project {
    // Existing methods remain unchanged for backward compatibility
    static async findByUserId(userId: number): Promise<Project[]>;
    static async findDeletedByUserId(userId: number): Promise<Project[]>;
    
    // New paginated methods
    static async findByUserIdPaginated(
        userId: number, 
        params: PaginationParams
    ): Promise<{ projects: Project[]; totalCount: number }>;
    
    static async findDeletedByUserIdPaginated(
        userId: number, 
        params: PaginationParams
    ): Promise<{ projects: Project[]; totalCount: number }>;
}
```

## Data Models

### Request Parameters
- `page` (optional): Page number starting from 1. Default: 1
- `limit` (optional): Items per page (1-100). Default: 20

### Response Structure
```json
{
    "success": true,
    "data": {
        "projects": [/* array of project objects */]
    },
    "pagination": {
        "currentPage": 2,
        "totalPages": 5,
        "totalItems": 87,
        "itemsPerPage": 20,
        "hasNextPage": true,
        "hasPreviousPage": true,
        "startIndex": 21,
        "endIndex": 40
    }
}
```

### Database Queries
The implementation will use efficient SQL patterns:

```sql
-- Count query (for metadata)
SELECT COUNT(*) FROM flwnty_project 
WHERE created_by = $1 AND deleted_at IS NULL;

-- Data query (for results)
SELECT * FROM flwnty_project 
WHERE created_by = $1 AND deleted_at IS NULL 
ORDER BY created_at DESC 
LIMIT $2 OFFSET $3;
```

## Error Handling

### Validation Errors (400)
- Invalid page number (< 1 or non-integer)
- Invalid limit (< 1, > 100, or non-integer)
- Non-numeric pagination parameters

### Edge Cases
- Page number exceeds available data: Return empty array with correct metadata
- No results found: Return empty array with totalItems: 0
- Limit exceeds maximum: Cap at 100 with warning message

### Error Response Format
```json
{
    "success": false,
    "error": "Validation error",
    "message": "Page number must be a positive integer"
}
```

## Implementation Phases

### Phase 1: Core Infrastructure
- Create pagination types and utilities
- Implement pagination validation logic
- Set up response formatting

### Phase 2: Model Layer Extensions
- Add paginated methods to Project model
- Add paginated methods to Task model  
- Add paginated methods to TaskGroup model
- Implement efficient COUNT queries

### Phase 3: Controller Updates
- Update ProjectController with pagination support
- Update TaskController with pagination support
- Update TaskGroupController with pagination support
- Implement consistent error handling

## Backward Compatibility

### Strategy
- Existing endpoints continue to work without pagination parameters
- Default pagination applied when no parameters provided
- Response structure extended (not modified) with pagination metadata
- No breaking changes to existing data structures

### Migration Path
- Existing clients receive paginated responses with default settings
- Clients can gradually adopt pagination parameters
- Clear documentation provided for pagination usage
- Optional warning headers for clients using default pagination