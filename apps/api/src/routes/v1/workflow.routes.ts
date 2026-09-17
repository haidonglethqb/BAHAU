import { Router } from "express";
import {
  getPendingTasks,
  approveStep,
  rejectStep,
} from "../../controllers/workflow.controller.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";
import {
  WorkflowApprovalActionSchema,
  WorkflowRejectionActionSchema,
} from "@bahau/contracts";

const router = Router();

router.get("/workflow/pending", requireAuth, asyncHandler(getPendingTasks));
router.post(
  "/workflow/steps/:id/approve",
  requireAuth,
  validateBody(WorkflowApprovalActionSchema),
  asyncHandler(approveStep)
);
router.post(
  "/workflow/steps/:id/reject",
  requireAuth,
  validateBody(WorkflowRejectionActionSchema),
  asyncHandler(rejectStep)
);

export default router;
