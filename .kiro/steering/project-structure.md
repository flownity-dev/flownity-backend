# Flownity Backend - Project Structure

## Architecture Overview
The project follows a modular, layered architecture with clear separation of concerns:

```
src/
├── auth/           # Authentication logic and middleware
├── config/         # Configuration management and validation
├── database/       # Database connection and operations
├── errors/         # Error handling and custom error types
├── middleware/     # Express middleware functions
├── models/         # Data models and database schemas
├── utils/          # Utility functions and logging
└── index.ts        # Main application entry point
```

## Module Responsibilities

### Authentication (`src/auth/`)
- **index.ts**: Main authentication exports and user locals middleware
- **middleware.ts**: Route protection middleware (`ensureAuthenticated`)
- **passport.ts**: PassportJS configuration with GitHub and Google OAuth strategies

### Configuration (`src/config/`)
- **index.ts**: Environment variable validation and configuration object
- **session.ts**: Session configuration with security settings

### Database (`src/database/`)
- **connection.ts**: PostgreSQL connection pool management
- **index.ts**: Database exports and connection utilities
- **init.ts**: Database schema initialization and table creation

### Error Handling (`src/errors/`)
- **AppError.ts**: Base error class for application errors
- **index.ts**: Error exports and centralized error handling
- **middleware.ts**: Express error handling middleware
- **utils.ts**: Error utility functions and helpers

### Models (`src/models/`)
- **User.ts**: User model with database operations
- **index.ts**: Model exports

### Utilities (`src/utils/`)
- **logger.ts**: Structured logging with categories and request context
- **index.ts**: Utility exports

## Key Design Patterns

### Modular Architecture
- Each module has a single responsibility
- Clear interfaces between modules
- Easy to test and maintain individual components

### Error Handling Strategy
- Custom error classes for different error types
- Centralized error handling middleware
- User-friendly error messages with proper HTTP status codes

### Configuration Management
- Environment-based configuration
- Validation of required environment variables
- Type-safe configuration object

### Database Layer
- Connection pooling for performance
- Proper connection lifecycle management
- Schema initialization and migration support

## File Naming Conventions
- **PascalCase**: Classes and models (`User.ts`, `AppError.ts`)
- **camelCase**: Functions and variables
- **kebab-case**: Configuration files and documentation
- **lowercase**: Directories and module names

## Import/Export Patterns
- Use ES6 modules with `.js` extensions for imports
- Barrel exports in `index.ts` files for clean imports
- Relative imports within modules, absolute imports across modules