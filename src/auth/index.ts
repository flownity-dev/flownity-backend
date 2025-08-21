export { configurePassport } from './passport.js';
export { 
  ensureAuthenticated, 
  ensureNotAuthenticated, 
  addUserToLocals,
  ensureAuthenticatedFlexible,
  addUserToLocalsFlexible
} from './middleware.js';
export { default as passport } from './passport.js';

// Token verification exports
export {
  verifyToken,
  requireToken,
  optionalToken,
  requireGitHubToken,
  requireGoogleToken,
  getAuthenticatedUser,
  isAuthenticated
} from './token-verification/middleware.js';