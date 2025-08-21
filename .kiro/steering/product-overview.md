# Flownity Backend - Product Overview

## Product Description
Flownity Backend is a Node.js authentication service that provides GitHub and Google OAuth 2.0 integration for web applications. It serves as a secure backend foundation for applications requiring OAuth-based user authentication and session management.

## Core Features
- **Multi-Provider OAuth 2.0 Authentication**: Complete OAuth flow implementation for GitHub and Google using PassportJS
- **Secure Session Management**: Express-session with secure cookie configuration
- **PostgreSQL Integration**: Database-backed user storage with connection pooling
- **Comprehensive Error Handling**: Custom error types and user-friendly error responses
- **Development Tools**: Hot reloading, debug routes, and comprehensive logging
- **Production Ready**: Graceful shutdown, health checks, and production startup scripts

## Target Use Cases
- Web applications requiring OAuth-based authentication (GitHub or Google)
- Developer tools and platforms needing GitHub integration
- Consumer applications requiring Google authentication
- Applications requiring secure user session management
- Services needing PostgreSQL-backed user storage

## Key Value Propositions
1. **Security First**: Implements OAuth 2.0 best practices with secure session handling
2. **Developer Experience**: Hot reloading, comprehensive logging, and debug utilities
3. **Production Ready**: Graceful shutdown, error handling, and health monitoring
4. **Extensible Architecture**: Modular structure for easy feature additions

## API Surface
- **Authentication Routes**: 
  - GitHub: `/auth/github`, `/auth/github/callback`
  - Google: `/auth/google`, `/auth/google/callback`
  - Common: `/auth/logout`
- **Protected Routes**: `/profile` (example of authenticated endpoint)
- **Development Routes**: `/session-info`, `/test-errors/*` (development only)
- **Health Monitoring**: Built-in health check capabilities

## Environment Requirements
- Node.js 18+
- PostgreSQL database
- OAuth App credentials (GitHub and/or Google)
- Secure session secret for production