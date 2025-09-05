import { Request, Response } from 'express';
import { config } from '../config/index.js';

export class WebController {
  /**
   * Home page - API information and authentication endpoints
   */
  static home = (req: Request, res: Response) => {
    const authOptions = [];
    if (config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET) {
      authOptions.push({
        provider: 'GitHub',
        authUrl: '/auth/github',
        description: 'Authenticate with GitHub OAuth'
      });
    }
    if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
      authOptions.push({
        provider: 'Google',
        authUrl: '/auth/google',
        description: 'Authenticate with Google OAuth'
      });
    }

    // Check if request accepts JSON
    if (req.headers.accept?.includes('application/json')) {
      return res.json({
        message: 'Flownity Backend - JWT-based OAuth API',
        version: '1.0.0',
        authentication: {
          type: 'JWT Bearer Token',
          providers: authOptions.map(opt => opt.provider.toLowerCase()),
          endpoints: {
            github: config.GITHUB_CLIENT_ID ? '/auth/github' : null,
            google: config.GOOGLE_CLIENT_ID ? '/auth/google' : null,
            refresh: '/auth/refresh',
            logout: '/auth/logout'
          }
        },
        api: {
          profile: '/api/auth/profile',
          verify: '/api/auth/verify'
        },
        documentation: {
          note: 'This API uses JWT tokens. After OAuth authentication, you will receive a JWT token to use in the Authorization header as: Bearer <token>'
        }
      });
    }

    // HTML response for browser requests
    const authLinks = authOptions.map(opt => 
      `<li><a href="${opt.authUrl}">${opt.description}</a></li>`
    ).join('');

    res.send(`
      <h1>Flownity Backend - JWT-based OAuth API</h1>
      <div style="background-color: #e7f3ff; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #2196F3;">
        <h3>🔄 Migration Notice</h3>
        <p><strong>This backend has been migrated from session-based to JWT-based authentication.</strong></p>
        <p>OAuth callbacks now return JSON responses with JWT tokens instead of redirecting with sessions.</p>
      </div>
      
      <h2>Available Authentication Providers</h2>
      <ul>${authLinks}</ul>
      
      <h2>API Endpoints</h2>
      <ul>
        <li><strong>GET /api/auth/profile</strong> - Get user profile (requires JWT token)</li>
        <li><strong>GET /api/auth/verify</strong> - Verify JWT token</li>
        <li><strong>POST /auth/refresh</strong> - Refresh JWT token</li>
        <li><strong>POST /auth/logout</strong> - Logout (client-side token removal)</li>
      </ul>
      
      <h2>Usage</h2>
      <ol>
        <li>Visit an OAuth provider link above to authenticate</li>
        <li>You'll receive a JSON response with a JWT token</li>
        <li>Use the token in API requests: <code>Authorization: Bearer &lt;token&gt;</code></li>
      </ol>
      
      <p><em>For JSON responses, send requests with <code>Accept: application/json</code> header.</em></p>
    `);
  };
}