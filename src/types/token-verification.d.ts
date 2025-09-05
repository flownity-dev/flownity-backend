/**
 * Type extensions for Express Request object to include token verification context
 * Note: This extends the existing Express.User interface for token-based authentication
 */

import type { VerifiedUser } from '../auth/token-verification/types.js';

declare global {
  namespace Express {
    interface Request {
      // For token-based auth, user can be either DatabaseUser (session) or VerifiedUser (token)
      user?: User | VerifiedUser;
      tokenUser?: VerifiedUser; // Specific property for token-verified users
    }
  }
}

export {};