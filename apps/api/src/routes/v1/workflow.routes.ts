import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  getPendingTasks,
  getInstanceDetails,
  approveStep,
  rejectStep,
} from "../../controllers/workflow.controller.js";
import { WorkflowService } from "../../services/workflow.service.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";
import {
  WorkflowApprovalActionSchema,
  WorkflowRejectionActionSchema,
  WorkflowReturnActionSchema,
} from "@bahau/contracts";

const UuidParamSchema = z.string().uuid("Mã định danh không đúng định dạng UUID");

function validateUuidParam(paramName = "id") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      UuidParamSchema.parse(req.params[paramName]);
      next();
    } catch (err) {
      next(err);
    }
  };
}

const router = Router();

router.get("/workflow/pending", requireAuth, asyncHandler(getPendingTasks));
router.get("/workflow/instances/:id", requireAuth, validateUuidParam("id"), asyncHandler(getInstanceDetails));

router.post(
  "/workflow/steps/:id/approve",
  requireAuth,
  validateUuidParam("id"),
  validateBody(WorkflowApprovalActionSchema),
  asyncHandler(approveStep)
);

router.post(
  "/workflow/steps/:id/reject",
  requireAuth,
  validateUuidParam("id"),
  validateBody(WorkflowRejectionActionSchema),
  asyncHandler(rejectStep)
);

router.post(
  "/workflow/steps/:id/return",
  requireAuth,
  validateUuidParam("id"),
  validateBody(WorkflowReturnActionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const stepId = String(req.params["id"]);
    const { reason } = req.body;
    await WorkflowService.returnStep(stepId, req.user!, reason);
    const requestId = req.id || "00000000-0000-0000-0000-000000000000";

    res.status(200).json({
      success: true,
      data: { message: "Đã yêu cầu bổ sung thông tin thành công." },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  })
);

export default router;
