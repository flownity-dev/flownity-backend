import { Request, Response } from 'express';
import { getAuthenticatedUser } from '../../auth/index.js';

export class UserController {
  /**
   * Get current user profile
   * Supports both session and token authentication
   */
  static getProfile = (req: Request, res: Response) => {
    const user = getAuthenticatedUser(req);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
    }

    // Handle token-based user (VerifiedUser)
    if (req.tokenUser) {
      return res.json({
        success: true,
        data: {
          user: {
            id: req.tokenUser.id,
            provider: req.tokenUser.provider,
            username: req.tokenUser.username,
            displayName: req.tokenUser.name || req.tokenUser.username,
            email: req.tokenUser.email,
            profilePictureUrl: req.tokenUser.avatarUrl
          },
          authMethod: 'token'
        }
      });
    }

    // Handle session-based user (DatabaseUser)
    if (req.user) {
      return res.json({
        success: true,
        data: {
          user: {
            id: req.user.id,
            providerId: req.user.providerId,
            provider: req.user.provider,
            username: req.user.username,
            displayName: req.user.displayName,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            fullName: req.user.fullName,
            email: req.user.email,
            profilePictureUrl: req.user.profilePictureUrl,
            createdAt: req.user.createdAt,
            updatedAt: req.user.updatedAt
          },
          authMethod: 'session'
        }
      });
    }

    return res.status(401).json({
      success: false,
      error: 'User not authenticated'
    });
  };

  /**
   * Get current user session information
   */
  static getSessionInfo = (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        sessionID: req.sessionID,
        hasSession: !!req.session,
        isAuthenticated: req.isAuthenticated?.(),
        user: req.user || null,
        cookie: req.session?.cookie ? {
          secure: req.session.cookie.secure,
          httpOnly: req.session.cookie.httpOnly,
          maxAge: req.session.cookie.maxAge,
          sameSite: req.session.cookie.sameSite
        } : null
      }
    });
  };
}