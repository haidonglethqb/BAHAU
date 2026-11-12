import { Request, Response } from "express";
import { z } from "zod";
import { AttendanceService } from "../services/attendance.service.js";
import { AppError } from "../middlewares/error.middleware.js";

/** Schema kiểm tra dữ liệu đầu vào hợp lệ cho điểm danh khuôn mặt (bỏ qua employeeId/timestamp từ client). */
export const FaceAttendanceSchema = z.preprocess(
  (val) => (val == null ? {} : val),
  z.object({
    snapshot: z.string().max(5_000_000, "Ảnh khuôn mặt vượt quá kích thước cho phép").optional(),
    deviceSource: z.string().trim().min(1).max(100).optional(),
    deviceInfo: z
      .union([
        z.string().trim().max(500),
        z.record(z.string().max(100), z.union([z.string().max(200), z.number(), z.boolean()])),
      ])
      .optional(),
  })
);

function getCurrentVnMonthYear(): { month: number; year: number } {
  const vn = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return {
    month: vn.getUTCMonth() + 1,
    year: vn.getUTCFullYear(),
  };
}

export async function getMyAttendance(req: Request, res: Response): Promise<void> {
  const vnNow = getCurrentVnMonthYear();
  const month = req.query["month"] !== undefined ? Number(req.query["month"]) : vnNow.month;
  const year = req.query["year"] !== undefined ? Number(req.query["year"]) : vnNow.year;

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
  const vnNow = getCurrentVnMonthYear();
  const month = req.query["month"] !== undefined ? Number(req.query["month"]) : vnNow.month;
  const year = req.query["year"] !== undefined ? Number(req.query["year"]) : vnNow.year;
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

async function handleFaceAttendance(
  req: Request,
  res: Response,
  mode: "checkin" | "checkout"
): Promise<void> {
  if (!req.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Yêu cầu đăng nhập để thực hiện điểm danh.");
  }
  const employeeId = req.user.employeeId;
  if (!employeeId) {
    throw new AppError(403, "FORBIDDEN", "Tài khoản chưa được liên kết hồ sơ nhân sự để điểm danh.");
  }

  const body = (req.body ?? {}) as {
    snapshot?: string;
    deviceSource?: string;
    deviceInfo?: string | Record<string, string | number | boolean>;
  };

  const deviceSourceFromInfo =
    typeof body.deviceInfo === "string" && body.deviceInfo.trim()
      ? body.deviceInfo.trim().slice(0, 100)
      : undefined;

  // Luôn lấy thời gian máy chủ; tuyệt đối không tin employeeId/timestamp từ client
  const payload = {
    snapshot: body.snapshot,
    deviceSource: body.deviceSource || deviceSourceFromInfo || "BIOMETRIC_FACE_RECOGNITION",
    timestamp: new Date(),
  };

  const result =
    mode === "checkin"
      ? await AttendanceService.faceCheckIn(employeeId, payload)
      : await AttendanceService.faceCheckOut(employeeId, payload);
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
  await handleFaceAttendance(req, res, "checkin");
}

export async function faceCheckOut(req: Request, res: Response): Promise<void> {
  await handleFaceAttendance(req, res, "checkout");
}
