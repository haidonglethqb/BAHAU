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

export async function getLeaveRequestById(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const detail = await LeaveService.getLeaveRequestById(id, req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: detail,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function cancelLeaveRequest(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  await LeaveService.cancelLeaveRequest(id, req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: { message: "Đã hủy đơn xin nghỉ phép thành công." },
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

export async function getMyLeaveLedger(req: Request, res: Response): Promise<void> {
  const year = req.query["year"] ? Number(req.query["year"]) : undefined;
  const ledger = await LeaveService.getMyLeaveLedger(req.user!, year);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: ledger,
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

export async function getTripRequestById(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  const detail = await LeaveService.getTripRequestById(id, req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: detail,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function cancelTripRequest(req: Request, res: Response): Promise<void> {
  const id = String(req.params["id"]);
  await LeaveService.cancelTripRequest(id, req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: { message: "Đã hủy đơn đăng ký công tác thành công." },
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}
