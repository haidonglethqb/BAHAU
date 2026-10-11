import {
  PayrollService,
  DEFAULT_FACULTY_MEMBERS,
} from "../../services/payroll.service.js";
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

  // Lấy danh sách giảng viên / viên chức
  const facultyList = DEFAULT_FACULTY_MEMBERS;
  const total = facultyList.length;

  let totalGross = 0;
  let totalNet = 0;
  let totalSeniority = 0;
  let totalOvertime = 0;

  await updateProgress(30, "Đang trích xuất dữ liệu định mức giờ giảng và thâm niên nghề NĐ 85...");

  // Duyệt từng giảng viên và tính toán
  for (let i = 0; i < total; i++) {
    const member = facultyList[i];
    if (!member) continue;

    // Tính toán chi tiết phiếu lương với computeSinglePayslip
    const payslip = PayrollService.computeSinglePayslip({
      employeeId: member.employeeId,
      employeeName: member.fullName,
      employeeCode: member.employeeCode,
      departmentName: member.departmentName,
      academicTitle: member.academicTitle,
      positionName: member.positionName,
      positionCode: member.positionCode,
      month,
      year,
      salaryCoefficient: member.salaryCoefficient,
      hireYear: member.hireYear,
      kpiRanking: member.kpiRanking,
      dependentCount: member.dependentCount,
      standardWorkDays: member.standardWorkDays,
      actualWorkDays: member.actualWorkDays,
      unpaidLeaveDays: member.unpaidLeaveDays,
      overtimeTeachingHours: member.overtimeTeachingHours,
    });

    totalGross += payslip.grossIncome;
    totalNet += payslip.netSalary;
    totalSeniority += payslip.seniorityAllowance;
    totalOvertime += payslip.overtimeTeachingPay;

    const progressPct = 30 + Math.floor(((i + 1) / total) * 50);
    await updateProgress(
      progressPct,
      `Đã hoàn tất tính lương cho: ${member.fullName} (${i + 1}/${total})`
    );
  }

  await updateProgress(90, "Đang tổng hợp số liệu trích nộp BHXH, BHYT, BHTN và thuế TNCN...");

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
