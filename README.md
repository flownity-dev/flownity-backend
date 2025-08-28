# Flownity Backend

A Node.js backend service with GitHub OAuth authentication built with Express.js, TypeScript, and PostgreSQL.

## Features

- 🔐 GitHub OAuth 2.0 authentication using PassportJS
- 🗄️ PostgreSQL database integration with connection pooling
- 🛡️ Secure session management with express-session
- 📝 Comprehensive logging and error handling
- 🔄 Hot reloading for development
- 🚀 Production-ready startup scripts
- 🏥 Health check endpoints

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- GitHub OAuth App (for authentication)

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Copy the environment template and configure:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Set up your PostgreSQL database and update the database configuration in `.env`

4. Create a GitHub OAuth App and add the credentials to `.env`

### Development

Start the development server with hot reloading:
```bash
npm run dev
```

This will:
- Build the TypeScript code
- Start the TypeScript compiler in watch mode
- Start nodemon to restart the server on changes
- Provide detailed logging and error information

Alternative development commands:
```bash
npm run dev:simple  # Simple concurrent build and watch
npm run dev:ts      # Run directly with ts-node (slower)
```

### Production

Build and start the production server:
```bash
npm run build
npm run start:prod
```

The production startup script includes:
- Environment variable validation
- Build verification
- Enhanced error handling
- Graceful shutdown handling

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reloading |
| `npm run build` | Build TypeScript to JavaScript |
| `npm run build:clean` | Clean build directory and rebuild |
| `npm run start` | Start production server (simple) |
| `npm run start:prod` | Start production server (enhanced) |
| `npm run health-check` | Check if the server is running |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | Check TypeScript types without building |

## 🚨 Security Setup

**CRITICAL: Never commit real credentials to version control!**

See [SECURITY_SETUP.md](./SECURITY_SETUP.md) for detailed security configuration.

## Environment Configuration

Required environment variables (use `.env.example` as template):

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=24h

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
CALLBACK_URL=http://localhost:3000/auth/github/callback

# Google OAuth Configuration  
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# Database Configuration
DATABASE_HOST=your-database-host
DATABASE_PORT=5432
DATABASE_NAME=your-database-name
DATABASE_USER=your-database-user
DATABASE_PASSWORD=your-database-password
```

⚠️ **Always use placeholder values in `.env` file committed to git!**

## API Endpoints

### Authentication Routes

- `GET /` - Home page with login/logout interface
- `GET /auth/github` - Initiate GitHub OAuth flow
- `GET /auth/github/callback` - Handle OAuth callback
- `POST /auth/logout` - Destroy user session

### Protected Routes

- `GET /profile` - Get authenticated user profile (requires authentication)

### Development Routes (development mode only)

- `GET /session-info` - Display session information
- `GET /test-errors/*` - Test error handling

## Architecture

The application follows a modular architecture:

```
src/
├── auth/           # Authentication logic (Passport, middleware)
├── config/         # Configuration management
├── database/       # Database connection and operations
├── errors/         # Error handling and custom error types
├── middleware/     # Express middleware
├── models/         # Data models
├── utils/          # Utility functions (logging, etc.)
└── index.ts        # Main application entry point
```

## Error Handling

The application includes comprehensive error handling:

- **OAuth Errors**: GitHub authentication failures
- **Database Errors**: Connection and query failures  
- **Session Errors**: Session management issues
- **Validation Errors**: Input validation failures

All errors are logged with detailed context and return appropriate HTTP status codes.

## Logging

Structured logging is provided through a custom logger that supports:

- Categorized logging (AUTH, DATABASE, SERVER, etc.)
- Request-specific logging context
- Development and production log formats
- Error tracking with stack traces

## Graceful Shutdown

The application handles graceful shutdown for:

- SIGINT (Ctrl+C)
- SIGTERM (process termination)
- Uncaught exceptions
- Unhandled promise rejections

During shutdown:
1. HTTP server stops accepting new connections
2. Existing connections are allowed to complete
3. Database connections are properly closed
4. Process exits cleanly

## Health Monitoring

Use the health check script to monitor application status:

```bash
npm run health-check
```

This is useful for:
- Container health checks
- Load balancer health probes
- Monitoring systems

## Development Features

### Hot Reloading

The development server provides:
- TypeScript compilation watching
- Automatic server restart on changes
- Error reporting and recovery
- Development-specific logging

### Debug Routes

In development mode, additional routes are available:
- `/session-info` - Session debugging information
- `/test-errors/*` - Error handling testing

## Security Features

- Secure session cookies (httpOnly, secure, sameSite)
- CSRF protection considerations
- SQL injection prevention with parameterized queries
- Environment variable validation
- Secure OAuth state handling

## Contributing

1. Follow the existing code style (ESLint + Prettier)
2. Add tests for new functionality
3. Update documentation as needed
4. Ensure all scripts pass before submitting

## License

ISC