import { Request, Response } from 'express';
import { getJWTUser } from '../../auth/index.js';

export class UserController {
  /**
   * Get current user profile (JWT-based)
   */
  static getProfile = (req: Request, res: Response) => {
    const jwtUser = getJWTUser(req);
    
    if (!jwtUser) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
        message: 'Valid JWT token required'
      });
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: jwtUser.userId,
          providerId: jwtUser.providerId,
          provider: jwtUser.provider,
          username: jwtUser.username,
          displayName: jwtUser.displayName,
          email: jwtUser.email
        },
        authMethod: 'jwt'
      }
    });
  };

  /**
   * Get JWT token information
   */
  static getTokenInfo = (req: Request, res: Response) => {
    const jwtUser = getJWTUser(req);
    
    if (!jwtUser) {
      return res.status(401).json({
        success: false,
        error: 'No valid JWT token found'
      });
    }

    res.json({
      success: true,
      data: {
        tokenValid: true,
        userId: jwtUser.userId,
        provider: jwtUser.provider,
        username: jwtUser.username,
        issuedAt: jwtUser.iat ? new Date(jwtUser.iat * 1000) : null,
        expiresAt: jwtUser.exp ? new Date(jwtUser.exp * 1000) : null
      }
    });
  };
}