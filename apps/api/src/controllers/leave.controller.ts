import { Request, Response } from "express";
import { LeaveService } from "../services/leave.service.js";

export async function createLeaveRequest(req: Request, res: Response): Promise<void> {
  const result = await LeaveService.createLeaveRequest(req.user!, req.body);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(201).json({
    success: true,
    data: result,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function getMyLeaveRequests(req: Request, res: Response): Promise<void> {
  const list = await LeaveService.getMyLeaveRequests(req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: list,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function getMyLeaveBalance(req: Request, res: Response): Promise<void> {
  const balance = await LeaveService.getMyLeaveBalance(req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: balance,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function createTripRequest(req: Request, res: Response): Promise<void> {
  const result = await LeaveService.createTripRequest(req.user!, req.body);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(201).json({
    success: true,
    data: result,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function getMyTripRequests(req: Request, res: Response): Promise<void> {
  const list = await LeaveService.getMyTripRequests(req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: list,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}
