import { Request, Response } from "express";
import { AttendanceService } from "../services/attendance.service.js";

export async function getMyAttendance(req: Request, res: Response): Promise<void> {
  const now = new Date();
  const month = req.query["month"] ? Number(req.query["month"]) : now.getMonth() + 1;
  const year = req.query["year"] ? Number(req.query["year"]) : now.getFullYear();

  const data = await AttendanceService.getMyMonthlyAttendance(month, year, req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function getUnitAttendance(req: Request, res: Response): Promise<void> {
  const now = new Date();
  const month = req.query["month"] ? Number(req.query["month"]) : now.getMonth() + 1;
  const year = req.query["year"] ? Number(req.query["year"]) : now.getFullYear();
  const unitId = req.query["unitId"] ? String(req.query["unitId"]) : undefined;

  const data = await AttendanceService.getUnitAttendance(unitId, month, year, req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function createAdjustmentRequest(req: Request, res: Response): Promise<void> {
  const created = await AttendanceService.createAdjustmentRequest(req.body, req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(201).json({
    success: true,
    data: created,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function importAttendanceData(req: Request, res: Response): Promise<void> {
  const result = await AttendanceService.importAttendanceData(req.body, req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: result,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function lockPeriod(req: Request, res: Response): Promise<void> {
  const result = await AttendanceService.lockPeriod(req.body, req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: result,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}
