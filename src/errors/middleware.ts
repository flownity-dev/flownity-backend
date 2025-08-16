import { Request, Response, NextFunction } from 'express';
import { AppError, SessionError } from './AppError.js';
import { createErrorResponse, logError, acceptsJson, getUserFriendlyMessage } from './utils.js';
import { config } from '../config/index.js';

/**
 * Global error handling middleware
 * Must be the last middleware in the chain
 */
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  logError(error, req, 'Global Error Handler');

  const isAppError = error instanceof AppError;
  const statusCode = isAppError ? error.statusCode : 500;
  const isDevelopment = config.NODE_ENV === 'development';

  // Handle session errors with automatic re-authentication
  if (error instanceof SessionError) {
    handleSessionError(error, req, res);
    return;
  }

  // Determine response format based on request
  if (acceptsJson(req)) {
    // JSON API response
    const errorResponse = createErrorResponse(error, req, isDevelopment);
    res.status(statusCode).json(errorResponse);
  } else {
    // HTML response for browser requests
    const userMessage = getUserFriendlyMessage(error);
    const errorHtml = createErrorPage(statusCode, userMessage, error, isDevelopment);
    res.status(statusCode).send(errorHtml);
  }
}

/**
 * Handle session-specific errors with automatic re-authentication
 */
function handleSessionError(error: SessionError, req: Request, res: Response): void {
  // Clear any existing session data
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error destroying session:', err);
      }
    });
  }

  // Clear session cookie
  res.clearCookie('connect.sid');

  if (acceptsJson(req)) {
    res.status(401).json({
      error: 'SessionError',
      message: 'Your session has expired. Please log in again.',
      statusCode: 401,
      requiresReauth: true,
      loginUrl: '/auth/github'
    });
  } else {
    // Redirect to home page with error message
    res.redirect('/?error=session_expired&message=' + encodeURIComponent('Your session has expired. Please log in again.'));
  }
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  const statusCode = 404;
  const message = `Route ${req.originalUrl} not found`;

  logError(new AppError(message, statusCode), req, '404 Handler');

  if (acceptsJson(req)) {
    res.status(statusCode).json({
      error: 'NotFound',
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    });
  } else {
    const errorHtml = createErrorPage(statusCode, 'Page not found', new Error(message), false);
    res.status(statusCode).send(errorHtml);
  }
}

/**
 * Create HTML error page for browser requests
 */
function createErrorPage(
  statusCode: number,
  userMessage: string,
  error: Error,
  showDetails: boolean
): string {
  const title = getErrorTitle(statusCode);
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - Flownity</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 600px;
          margin: 50px auto;
          padding: 20px;
          background-color: #f5f5f5;
          color: #333;
        }
        .error-container {
          background: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          text-align: center;
        }
        .error-code {
          font-size: 72px;
          font-weight: bold;
          color: #e74c3c;
          margin: 0;
        }
        .error-title {
          font-size: 24px;
          margin: 10px 0;
          color: #2c3e50;
        }
        .error-message {
          font-size: 16px;
          margin: 20px 0;
          color: #7f8c8d;
          line-height: 1.5;
        }
        .actions {
          margin-top: 30px;
        }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          margin: 0 10px;
          background-color: #3498db;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          transition: background-color 0.3s;
        }
        .btn:hover {
          background-color: #2980b9;
        }
        .btn-secondary {
          background-color: #95a5a6;
        }
        .btn-secondary:hover {
          background-color: #7f8c8d;
        }
        .error-details {
          margin-top: 30px;
          padding: 20px;
          background-color: #f8f9fa;
          border-radius: 4px;
          text-align: left;
          font-family: monospace;
          font-size: 12px;
          color: #6c757d;
          white-space: pre-wrap;
          overflow-x: auto;
        }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1 class="error-code">${statusCode}</h1>
        <h2 class="error-title">${title}</h2>
        <p class="error-message">${userMessage}</p>
        
        <div class="actions">
          <a href="/" class="btn">Go Home</a>
          ${statusCode === 401 ? '<a href="/auth/github" class="btn">Login with GitHub</a>' : ''}
          <a href="javascript:history.back()" class="btn btn-secondary">Go Back</a>
        </div>
        
        ${showDetails ? `
          <div class="error-details">
            <strong>Error Details (Development Mode):</strong><br>
            Name: ${error.name}<br>
            Message: ${error.message}<br>
            ${error.stack ? `Stack: ${error.stack}` : ''}
          </div>
        ` : ''}
      </div>
    </body>
    </html>
  `;
}

/**
 * Get user-friendly error title based on status code
 */
function getErrorTitle(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Authentication Required';
    case 403:
      return 'Access Forbidden';
    case 404:
      return 'Page Not Found';
    case 500:
      return 'Internal Server Error';
    case 502:
      return 'Bad Gateway';
    case 503:
      return 'Service Unavailable';
    default:
      return 'Error';
  }
}