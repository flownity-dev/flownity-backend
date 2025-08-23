import { Request, Response } from 'express';
import { getJWTUser } from '../../auth/index.js';


export class TaskGroupController {


    static getTaskGroups = (req: Request, res: Response) => {
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
            taskGroups: [
              // Example task groups
              { id: 1, name: 'Group 1', userId: jwtUser.userId },
              { id: 2, name: 'Group 2', userId: jwtUser.userId }
            ]
          }
        });
    }
    

}