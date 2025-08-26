export { configurePassport } from './passport.js';
export { default as passport } from './passport.js';

// JWT exports
export {
  generateToken,
  verifyToken as verifyJWTToken,
  extractTokenFromHeader,
  refreshToken
} from './jwt.js';
export {
  requireJWT,
  optionalJWT,
  getJWTUser,
  isJWTAuthenticated,
  addJWTUserToLocals
} from './jwtMiddleware.js';

// Legacy session middleware (deprecated)
export { 
  ensureAuthenticated, 
  ensureNotAuthenticated, 
  addUserToLocals,
  ensureAuthenticatedFlexible,
  addUserToLocalsFlexible
} from './middleware.js';

// OAuth token verification exports (for external tokens)
export {
  verifyToken,
  requireToken,
  optionalToken,
  requireGitHubToken,
  requireGoogleToken,
  getAuthenticatedUser,
  isAuthenticated
} from './token-verification/middleware.js';