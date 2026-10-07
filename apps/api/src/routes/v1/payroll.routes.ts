import { Router } from "express";
import {
  getMyPayslip,
  getPeriodSummary,
  calculatePayrollPeriod,
  getPayrollTable,
  submitPayrollPeriod,
  approvePayrollPeriod,
  exportPayslipPdf,
} from "../../controllers/payroll.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";

const router = Router();

// Xem phiếu lương của cá nhân
router.get("/payroll/my-payslip", requireAuth, asyncHandler(getMyPayslip));

// Xuất PDF phiếu lương (cá nhân hoặc theo ID có chống IDOR)
router.get(
  "/payroll/payslip/:employeeId/pdf",
  requireAuth,
  asyncHandler(exportPayslipPdf)
);

// Quản trị kỳ lương toàn trường (HR, KHTC, Ban Giám hiệu)
router.get(
  "/payroll/period-summary",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_HR_OFFICER", "ROLE_SYSADMIN"]),
  asyncHandler(getPeriodSummary)
);

router.get(
  "/payroll/table",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_HR_OFFICER", "ROLE_SYSADMIN"]),
  asyncHandler(getPayrollTable)
);

router.post(
  "/payroll/calculate",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_HR_OFFICER", "ROLE_SYSADMIN"]),
  asyncHandler(calculatePayrollPeriod)
);

router.post(
  "/payroll/submit",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_HR_OFFICER", "ROLE_SYSADMIN"]),
  asyncHandler(submitPayrollPeriod)
);

router.post(
  "/payroll/approve",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_SYSADMIN"]),
  asyncHandler(approvePayrollPeriod)
);

export default router;
