import { Router, Request, Response } from 'express';
import { 
  verifyToken,
  requireToken,
  optionalToken,
  requireGitHubToken,
  requireGoogleToken,
  getAuthenticatedUser,
  isAuthenticated
} from '../../../auth/index.js';

const router = Router();

/**
 * Example routes demonstrating different token verification patterns
 * These routes showcase various middleware configurations and usage patterns
 */

// Basic required token verification (default behavior)
router.get('/protected', verifyToken(), (req: Request, res: Response) => {
  res.json({
    message: 'Protected endpoint - token required',
    user: req.tokenUser,
    provider: req.tokenUser?.provider
  });
});

// Optional token verification - enhanced experience if token provided
router.get('/optional', optionalToken(), (req: Request, res: Response) => {
  if (req.tokenUser) {
    res.json({
      message: 'Enhanced experience with token authentication',
      user: req.tokenUser,
      provider: req.tokenUser.provider
    });
  } else {
    res.json({
      message: 'Basic experience - no token provided',
      user: null
    });
  }
});

// GitHub-only token verification
router.get('/github-only', requireGitHubToken(), (req: Request, res: Response) => {
  res.json({
    message: 'GitHub token required',
    user: req.tokenUser,
    provider: 'github'
  });
});

// Google-only token verification
router.get('/google-only', requireGoogleToken(), (req: Request, res: Response) => {
  res.json({
    message: 'Google token required',
    user: req.tokenUser,
    provider: 'google'
  });
});

// Custom configuration example
router.get('/custom-config', verifyToken({
  required: true,
  providers: ['github', 'google'],
  cacheTimeout: 600, // 10 minutes
  requestTimeout: 3000, // 3 seconds
  retryAttempts: 1
}), (req: Request, res: Response) => {
  res.json({
    message: 'Custom configuration example',
    user: req.tokenUser,
    config: {
      cacheTimeout: 600,
      requestTimeout: 3000,
      retryAttempts: 1
    }
  });
});

// Helper functions demonstration
router.get('/helpers', optionalToken(), (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  const authenticated = isAuthenticated(req);
  
  res.json({
    message: 'Helper functions demonstration',
    user,
    authenticated,
    authMethod: req.tokenUser ? 'token' : (req.user ? 'session' : null)
  });
});

// Provider-specific routes with different configurations
router.get('/github/repos', requireGitHubToken({
  cacheTimeout: 300 // 5 minutes cache for GitHub API calls
}), (req: Request, res: Response) => {
  res.json({
    message: 'GitHub repositories endpoint',
    user: req.tokenUser,
    repositories: [] // Would fetch actual repositories in real implementation
  });
});

router.get('/google/profile', requireGoogleToken({
  requestTimeout: 2000 // Shorter timeout for Google API
}), (req: Request, res: Response) => {
  res.json({
    message: 'Google profile endpoint',
    user: req.tokenUser,
    profile: req.tokenUser // Google user profile data
  });
});

// Error handling example
router.get('/error-demo', (req: Request, res: Response) => {
  res.json({
    message: 'Token verification error handling examples',
    examples: {
      missingToken: 'GET /api/v1/examples/protected (no Authorization header) -> 401',
      invalidToken: 'GET /api/v1/examples/protected (invalid token) -> 401',
      wrongProvider: 'GET /api/v1/examples/github-only (with Google token) -> 403',
      malformedHeader: 'Authorization: InvalidFormat -> 400'
    }
  });
});

export default router;