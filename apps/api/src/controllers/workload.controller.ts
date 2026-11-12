import { Request, Response } from "express";
import { WorkloadService } from "../services/workload.service.js";
import { AppError } from "../middlewares/error.middleware.js";

function parseAcademicYear(raw: unknown): string {
  if (raw === undefined || raw === null || raw === "") {
    return "2025-2026";
  }
  const value = String(raw).trim();
  const match = /^(\d{4})-(\d{4})$/.exec(value);
  if (!match) {
    throw new AppError(422, "VALIDATION_FAILED", "academicYear phải có định dạng YYYY-YYYY (ví dụ: 2025-2026).");
  }
  const startYear = Number(match[1]);
  const endYear = Number(match[2]);
  if (endYear !== startYear + 1 || startYear < 2000 || endYear > 2100) {
    throw new AppError(422, "VALIDATION_FAILED", "academicYear không hợp lệ (năm kết thúc phải bằng năm bắt đầu + 1).");
  }
  return value;
}

export async function getMyQuota(req: Request, res: Response): Promise<void> {
  const employeeId = req.user?.employeeId;
  if (!employeeId) {
    throw new AppError(400, "BAD_REQUEST", "Tài khoản của bạn chưa được liên kết hồ sơ cán bộ.");
  }

  const academicYear = parseAcademicYear(req.query["academicYear"]);
  const quota = await WorkloadService.getEmployeeQuota(employeeId, academicYear);

  res.status(200).json({
    success: true,
    data: quota,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function getSettlement(req: Request, res: Response): Promise<void> {
  const employeeId = req.user?.employeeId;
  if (!employeeId) {
    throw new AppError(400, "BAD_REQUEST", "Tài khoản của bạn chưa được liên kết hồ sơ cán bộ.");
  }

  const academicYear = parseAcademicYear(req.query["academicYear"]);
  const settlement = await WorkloadService.calculateSettlement(employeeId, academicYear);

  res.status(200).json({
    success: true,
    data: settlement,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function convertWorkload(req: Request, res: Response): Promise<void> {
  const { workloadType, rawHours, studentCount } = req.body;
  const parsedStudentCount =
    studentCount !== undefined && studentCount !== null ? Number(studentCount) : 30;
  const result = WorkloadService.convertHours(workloadType, Number(rawHours), parsedStudentCount);

  res.status(200).json({
    success: true,
    data: result,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}
