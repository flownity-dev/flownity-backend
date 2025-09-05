# Implementation Plan

- [ ] 1. Create pagination infrastructure and types
  - Create pagination types and interfaces in `src/types/pagination.ts`
  - Implement PaginationUtils class with validation and calculation methods
  - Create response wrapper utilities for consistent pagination metadata
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.3_

- [ ] 2. Extend Project model with pagination support
  - Add paginated version of `findByUserId` method to Project model
  - Add paginated version of `findDeletedByUserId` method for trash endpoint
  - Implement efficient COUNT queries for total record calculation
  - Ensure proper SQL query structure with LIMIT and OFFSET
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2_

- [ ] 3. Extend Task model with pagination support
  - Add paginated version of `findByUserId` method to Task model
  - Add paginated version of `findDeletedByUserId` method for trash endpoint
  - Implement efficient COUNT queries for total task records
  - Maintain existing filtering and ordering logic with pagination
  - _Requirements: 2.1, 2.2, 2.3, 5.1, 5.2_

- [ ] 4. Extend TaskGroup model with pagination support
  - Add paginated version of `findByUserId` method to TaskGroup model
  - Add paginated version of `findDeletedByUserId` method for trash endpoint
  - Implement efficient COUNT queries for total task group records
  - Ensure consistent ordering with pagination implementation
  - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2_

- [ ] 5. Update ProjectController with pagination
  - Modify `getAllProjects` method to handle pagination parameters
  - Update `getTrashedProjects` method to support pagination
  - Implement pagination parameter validation and error handling
  - Ensure backward compatibility with default pagination settings
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2_

- [ ] 6. Update TaskController with pagination
  - Modify `getAllTasks` method to handle pagination parameters
  - Update `getTrashedTasks` method to support pagination
  - Add pagination parameter validation with proper error responses
  - Implement limit capping at maximum value with warning messages
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.3, 6.1, 6.2_

- [ ] 7. Update TaskGroupController with pagination
  - Modify `getAllTaskGroups` method to handle pagination parameters
  - Update `getTrashedTaskGroups` method to support pagination
  - Implement consistent error handling for invalid pagination parameters
  - Ensure empty result handling with correct pagination metadata
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.3, 6.1, 6.2_

- [ ] 8. Integrate pagination across all controllers
  - Ensure consistent pagination metadata structure across all endpoints
  - Verify backward compatibility by testing endpoints without pagination parameters
  - Implement proper error handling for edge cases (invalid pages, limits)
  - Add response formatting to maintain existing API structure while adding pagination metadata
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 6.1, 6.2, 6.3_