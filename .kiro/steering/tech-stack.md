# Flownity Backend - Tech Stack

## Runtime & Language
- **Node.js 18+**: JavaScript runtime with ES modules support
- **TypeScript 5.9+**: Static typing with strict configuration
- **ES Modules**: Modern module system with `.js` import extensions

## Core Framework & Libraries
- **Express.js 5.1+**: Web application framework
- **PassportJS 0.7+**: Authentication middleware
- **passport-github2**: GitHub OAuth 2.0 strategy
- **express-session 1.18+**: Session management middleware

## Database & Storage
- **PostgreSQL**: Primary database with connection pooling
- **pg 8.16+**: PostgreSQL client for Node.js
- **Connection Pooling**: Built-in connection management

## Development Tools
- **TypeScript Compiler**: Build system with watch mode
- **ts-node**: Direct TypeScript execution for development
- **nodemon**: File watching and auto-restart
- **concurrently**: Parallel script execution

## Code Quality & Formatting
- **ESLint 9.33+**: Linting with TypeScript support
- **Prettier 3.6+**: Code formatting
- **@typescript-eslint**: TypeScript-specific linting rules
- **eslint-config-prettier**: ESLint and Prettier integration

## Configuration & Environment
- **dotenv 17.2+**: Environment variable management
- **Strict TypeScript**: Enhanced type checking with strict mode
- **Environment Validation**: Runtime validation of required variables

## Security Features
- **Secure Sessions**: httpOnly, secure, sameSite cookie settings
- **OAuth 2.0**: GitHub authentication with proper state handling
- **CSRF Protection**: Built-in session-based protection
- **SQL Injection Prevention**: Parameterized queries

## Build & Deployment
- **TypeScript Compilation**: Source maps and declarations
- **Production Scripts**: Enhanced startup with error handling
- **Health Checks**: Built-in health monitoring endpoints
- **Graceful Shutdown**: Proper cleanup of connections and resources

## Development Features
- **Hot Reloading**: Automatic restart on file changes
- **Debug Routes**: Development-only testing endpoints
- **Structured Logging**: Categorized logging with request context
- **Error Testing**: Built-in error simulation routes

## TypeScript Configuration
- **Target**: ESNext with Node.js libraries
- **Module System**: NodeNext for ES modules
- **Strict Mode**: All strict type checking enabled
- **Source Maps**: Full debugging support
- **Declaration Files**: Type definitions generation

## Package Management
- **npm**: Package manager with lock file
- **ES Module Imports**: `.js` extensions required for TypeScript
- **Type Definitions**: Comprehensive @types packages

## Production Considerations
- **Process Management**: Signal handling for graceful shutdown
- **Error Recovery**: Uncaught exception and rejection handling
- **Connection Pooling**: Efficient database connection management
- **Session Storage**: Memory store (development) with production alternatives

## Scripts & Automation
- **Development**: `npm run dev` - Hot reloading with TypeScript watch
- **Production**: `npm run start:prod` - Enhanced production startup
- **Build**: `npm run build` - TypeScript compilation
- **Health Check**: `npm run health-check` - Service monitoring
- **Code Quality**: Linting, formatting, and type checking scripts