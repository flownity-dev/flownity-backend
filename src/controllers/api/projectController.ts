import { Request, Response } from 'express';
import { getJWTUser } from '../../auth/index.js';
import { Project } from '../../models/Project.js';

export class ProjectController {
    static getProjects = async (req: Request, res: Response) => {

        console.log('ProjectController.getProjects called'); 
        const jwtUser = getJWTUser(req);
        console.log('JWT User:', jwtUser);

        if (!jwtUser) {
            return res.status(401).json({
                success: false,
                error: 'User not authenticated',
                message: 'Valid JWT token required'
            });
        }

        try {
            const projects = await Project.findByUserId(jwtUser.userId);

            return res.json({
                success: true,
                data: {
                    projects: projects.map(project => project.toJSON())
                }
            });
        } catch (err) {
            return res.status(500).json({
                success: false,
                error: 'Database error',
                message: err instanceof Error ? err.message : String(err)
            });
        }
    }
}