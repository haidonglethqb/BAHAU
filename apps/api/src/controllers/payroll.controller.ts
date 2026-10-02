import { Request, Response } from "express";
import { PayrollService } from "../services/payroll.service.js";
import { AppError } from "../middlewares/error.middleware.js";

export async function getMyPayslip(req: Request, res: Response): Promise<void> {
  const employeeId = req.user?.employeeId;
  if (!employeeId) {
    throw new AppError(400, "BAD_REQUEST", "Tài khoản chưa được liên kết hồ sơ cán bộ.");
  }

  const month = req.query["month"] ? Number(req.query["month"]) : 9;
  const year = req.query["year"] ? Number(req.query["year"]) : 2026;

  const payslip = await PayrollService.calculateEmployeePayslip(employeeId, month, year);

  res.status(200).json({
    success: true,
    data: payslip,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function getPeriodSummary(req: Request, res: Response): Promise<void> {
  const month = req.query["month"] ? Number(req.query["month"]) : 9;
  const year = req.query["year"] ? Number(req.query["year"]) : 2026;

  const summary = await PayrollService.getPeriodSummary(month, year);

  res.status(200).json({
    success: true,
    data: summary,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}
