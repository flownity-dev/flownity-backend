import { Request, Response } from 'express';
import { config } from '../config/index.js';

export class WebController {
  /**
   * Home page - displays authentication status and login options
   */
  static home = (req: Request, res: Response) => {
    const isAuthenticated = req.isAuthenticated();
    const user = req.user;
    
    // Check for error messages from redirects
    const errorType = req.query.error as string;
    const errorMessage = req.query.message as string;
    
    let errorHtml = '';
    if (errorType && errorMessage) {
      errorHtml = `
        <div style="background-color: #f8d7da; color: #721c24; padding: 10px; margin: 10px 0; border-radius: 4px; border: 1px solid #f5c6cb;">
          <strong>Error:</strong> ${decodeURIComponent(errorMessage)}
        </div>
      `;
    }

    if (isAuthenticated && user) {
      res.send(`
        <h1>Flownity Backend - OAuth Authentication</h1>
        ${errorHtml}
        <p>Welcome, ${user.username}!</p>
        <p>Display Name: ${user.displayName}</p>
        <p>Provider: ${user.provider} (ID: ${user.providerId})</p>
        <p>Email: ${user.email || 'Not provided'}</p>
        <p>Full Name: ${user.fullName || 'Not provided'}</p>
        <p>Last Updated: ${user.updatedAt}</p>
        <form method="post" action="/auth/logout">
          <button type="submit">Logout</button>
        </form>
      `);
    } else {
      const authOptions = [];
      if (config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET) {
        authOptions.push('<a href="/auth/github">Login with GitHub</a>');
      }
      if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
        authOptions.push('<a href="/auth/google">Login with Google</a>');
      }
      
      res.send(`
        <h1>Flownity Backend - OAuth Authentication</h1>
        ${errorHtml}
        <p>You are not authenticated.</p>
        ${authOptions.join(' | ')}
      `);
    }
  };
}