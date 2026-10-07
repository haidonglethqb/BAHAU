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

export async function calculatePayrollPeriod(req: Request, res: Response): Promise<void> {
  const month = req.body["month"] ? Number(req.body["month"]) : 9;
  const year = req.body["year"] ? Number(req.body["year"]) : 2026;
  const recalculate = Boolean(req.body["recalculate"]);

  const period = await PayrollService.calculateFullPeriod(month, year, recalculate);

  res.status(200).json({
    success: true,
    data: period,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function getPayrollTable(req: Request, res: Response): Promise<void> {
  const month = req.query["month"] ? Number(req.query["month"]) : 9;
  const year = req.query["year"] ? Number(req.query["year"]) : 2026;
  const unitName = req.query["unitName"] as string | undefined;
  const search = req.query["search"] as string | undefined;

  const result = await PayrollService.getPayrollTable({ month, year, unitName, search });

  res.status(200).json({
    success: true,
    data: result,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function submitPayrollPeriod(req: Request, res: Response): Promise<void> {
  const month = req.body["month"] ? Number(req.body["month"]) : 9;
  const year = req.body["year"] ? Number(req.body["year"]) : 2026;
  const submitterName = req.user?.email || "Kế toán viên KHTC";

  const updated = await PayrollService.submitPeriod(month, year, submitterName);

  res.status(200).json({
    success: true,
    data: updated,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function approvePayrollPeriod(req: Request, res: Response): Promise<void> {
  const month = req.body["month"] ? Number(req.body["month"]) : 9;
  const year = req.body["year"] ? Number(req.body["year"]) : 2026;
  const pkiSignature = req.body["pkiSignature"] as string | undefined;

  const updated = await PayrollService.approvePeriod(
    month,
    year,
    "GS.TS. Nguyễn Hiệu Trưởng",
    pkiSignature
  );

  res.status(200).json({
    success: true,
    data: updated,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.id || "00000000-0000-0000-0000-000000000000",
    },
  });
}

export async function exportPayslipPdf(req: Request, res: Response): Promise<void> {
  const paramEmpId = String(req.params["employeeId"] || "");
  let targetEmployeeId = paramEmpId;
  if (!targetEmployeeId || targetEmployeeId === "my") {
    targetEmployeeId = req.user?.employeeId || "";
  }
  if (!targetEmployeeId) {
    throw new AppError(400, "BAD_REQUEST", "Thiếu định danh cán bộ để xuất phiếu lương.");
  }

  // Chống IDOR: Nếu là giảng viên thông thường, chỉ được xuất phiếu lương của chính mình
  if (
    req.user &&
    !req.user.roles.some((r) => ["ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_SYSADMIN"].includes(r)) &&
    req.user.employeeId !== targetEmployeeId
  ) {
    throw new AppError(403, "FORBIDDEN", "Bạn không có quyền tải phiếu lương của cán bộ khác.");
  }

  const month = req.query["month"] ? Number(req.query["month"]) : 9;
  const year = req.query["year"] ? Number(req.query["year"]) : 2026;

  const payslip = await PayrollService.calculateEmployeePayslip(targetEmployeeId, month, year);
  const pdfBytes = await PayrollService.exportPayslipPdf(payslip);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="Phieu-Luong-${encodeURIComponent(payslip.employeeCode)}-T${month}-${year}.pdf"`
  );
  res.status(200).send(Buffer.from(pdfBytes));
}
