import { Request, Response } from "express";
import { WorkloadService } from "../services/workload.service.js";
import { AppError } from "../middlewares/error.middleware.js";

export async function getMyQuota(req: Request, res: Response): Promise<void> {
  const employeeId = req.user?.employeeId;
  if (!employeeId) {
    throw new AppError(400, "BAD_REQUEST", "Tài khoản của bạn chưa được liên kết hồ sơ cán bộ.");
  }

  const academicYear = (req.query["academicYear"] as string) || "2025-2026";
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

  const academicYear = (req.query["academicYear"] as string) || "2025-2026";
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
  const result = WorkloadService.convertHours(workloadType, Number(rawHours), studentCount ? Number(studentCount) : 30);

  res.status(200).json({
    success: true,
    data: result,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}
