import { Router } from "express";
import { requireJWT } from "../../../auth/index.js";
import { projectMemberController } from "../../../controllers/api/projectMemberController.js";

const router = Router();

// ✅ Get all members of a project
router.get("/:projectId", requireJWT, projectMemberController.getProjectMembers);

// ✅ Add members to a project
router.post("/", requireJWT, projectMemberController.createProjectMembers);

// ✅ Update project members by ID
router.put("/:id", requireJWT, projectMemberController.updateProjectMembers);

// ✅ Delete project members by ID
router.delete("/:id", requireJWT, projectMemberController.deleteProjectMember);

export default router;
