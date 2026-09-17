import { Request, Response } from "express";
import { WorkflowService } from "../services/workflow.service.js";

export async function getPendingTasks(req: Request, res: Response): Promise<void> {
  const tasks = await WorkflowService.getPendingTasks(req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: tasks,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function approveStep(req: Request, res: Response): Promise<void> {
  const stepId = String(req.params["id"]);
  const { comment } = req.body;

  await WorkflowService.approveStep(stepId, req.user!, comment);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: { message: "Phê duyệt bước thành công." },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function rejectStep(req: Request, res: Response): Promise<void> {
  const stepId = String(req.params["id"]);
  const { reason } = req.body;

  await WorkflowService.rejectStep(stepId, req.user!, reason);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: { message: "Đã từ chối đơn thành công." },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}
