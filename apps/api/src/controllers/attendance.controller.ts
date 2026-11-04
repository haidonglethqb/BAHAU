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

export async function faceCheckIn(req: Request, res: Response): Promise<void> {
  const employeeId =
    req.user?.employeeId ||
    req.body?.employeeId ||
    (req.body?.employeeCode ? `${req.body.employeeCode}-ID` : "DAU260003-ID");
  const result = await AttendanceService.faceCheckIn(employeeId, {
    snapshot: req.body?.snapshot,
    deviceSource: req.body?.deviceSource || "BIOMETRIC_FACE_RECOGNITION",
    timestamp: req.body?.timestamp ? new Date(req.body.timestamp) : new Date(),
  });
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

export async function faceCheckOut(req: Request, res: Response): Promise<void> {
  const employeeId =
    req.user?.employeeId ||
    req.body?.employeeId ||
    (req.body?.employeeCode ? `${req.body.employeeCode}-ID` : "DAU260003-ID");
  const result = await AttendanceService.faceCheckOut(employeeId, {
    snapshot: req.body?.snapshot,
    deviceSource: req.body?.deviceSource || "BIOMETRIC_FACE_RECOGNITION",
    timestamp: req.body?.timestamp ? new Date(req.body.timestamp) : new Date(),
  });
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
