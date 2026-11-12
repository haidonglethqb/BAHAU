import { PayrollService } from "../../services/payroll.service.js";
import type { JobHandlerFn } from "../worker-queue.js";

export interface PayrollBatchPayload {
  period?: string; // YYYY-MM
  departmentId?: string;
  applyOverloadBonus?: boolean;
}

export interface PayrollBatchResult {
  period: string;
  totalFacultyProcessed: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalSeniorityAllowance: number;
  totalOvertimeTeachingPay: number;
  status: "FINALIZED";
  processedAt: string;
}

export const payrollBatchHandler: JobHandlerFn<PayrollBatchPayload, PayrollBatchResult> = async (
  payload,
  updateProgress
) => {
  const period = payload?.period || new Date().toISOString().slice(0, 7);
  const [yearStr, monthStr] = period.split("-");
  const year = Number(yearStr) || new Date().getFullYear();
  const month = Number(monthStr) || new Date().getMonth() + 1;

  await updateProgress(10, `Bắt đầu tính toán bảng lương kỳ ${period}...`);
  await updateProgress(30, "Đang trích xuất dữ liệu định mức giờ giảng, chấm công và thâm niên nghề...");

  const periodDetail = await PayrollService.calculateFullPeriod(month, year, true);
  const items = payload?.departmentId
    ? periodDetail.items.filter(
        (item) => item.departmentName === payload.departmentId
      )
    : periodDetail.items;

  const total = items.length;
  let totalGross = 0;
  let totalNet = 0;
  let totalSeniority = 0;
  let totalOvertime = 0;

  for (let i = 0; i < total; i++) {
    const payslip = items[i];
    if (!payslip) continue;

    totalGross += payslip.grossIncome;
    totalNet += payslip.netSalary;
    totalSeniority += payslip.seniorityAllowance;
    totalOvertime += payslip.overtimeTeachingPay;

    const progressPct = 30 + Math.floor(((i + 1) / Math.max(1, total)) * 60);
    await updateProgress(
      progressPct,
      `Đã hoàn tất tính lương cho: ${payslip.employeeName} (${i + 1}/${total})`
    );
  }

  await updateProgress(95, "Đang tổng hợp số liệu trích nộp BHXH, BHYT, BHTN và thuế TNCN...");
  await updateProgress(100, `Hoàn thành kết chuyển bảng lương kỳ ${period}`);

  return {
    period,
    totalFacultyProcessed: total,
    totalGrossPay: totalGross,
    totalNetPay: totalNet,
    totalSeniorityAllowance: totalSeniority,
    totalOvertimeTeachingPay: totalOvertime,
    status: "FINALIZED",
    processedAt: new Date().toISOString(),
  };
};
