import { Request, Response } from "express";
import { ProjectMember } from "../../models/ProjectMember.js";

export class projectMemberController {
  static getProjectMembers = async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const members = await ProjectMember.findByProjectId(projectId);

      return res.json({
        success: true,
        data: members.map(m => m.toJSON())
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: (err as Error).message
      });
    }
  };

  static createProjectMembers = async (req: Request, res: Response) => {
    try {
      const { project_id, members } = req.body;
      const projectMember = await ProjectMember.create({ project_id, members });

      return res.status(201).json({
        success: true,
        data: {
          member: projectMember.toJSON()
        }
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: (err as Error).message
      });
    }
  };

  static updateProjectMembers = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { members } = req.body;
      const updated = await ProjectMember.update(id, { members });

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: "Project member not found"
        });
      }

      return res.json({
        success: true,
        data: {
          member: updated.toJSON()
        }
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: (err as Error).message
      });
    }
  };

  static deleteProjectMember = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const success = await ProjectMember.delete(id);

      return res.json({
        success,
        data: success ? { id } : null
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: (err as Error).message
      });
    }
  };
}
