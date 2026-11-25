import { prisma } from "@bahau/database";
import {
  LeaveTypeEnum,
  type AgentProposedAction,
  type AuthUser,
  type DraftProposal,
  type PolicySourceCitation,
} from "@bahau/contracts";
import { AttendanceService } from "../attendance.service.js";
import { ContractService } from "../contract.service.js";
import { DashboardService } from "../dashboard.service.js";
import { EmployeeService } from "../employee.service.js";
import { LeaveLedgerService } from "../leave-ledger.service.js";
import { PayrollService, DEFAULT_FACULTY_MEMBERS } from "../payroll.service.js";
import { WorkflowService } from "../workflow.service.js";
import { normalizeVietnamese, searchPoliciesLocalAndDb } from "./agent-fallback.js";
import { isHrOrAdminUser } from "./agent-tool-registry.js";

export interface AgentToolExecutionResult {
  summary: string;
  output: Record<string, unknown>;
  sources?: PolicySourceCitation[];
  profileData?: Record<string, unknown>;
  draftProposal?: DraftProposal;
  action?: AgentProposedAction;
}

const ALLOWED_NAVIGATION_PATHS = new Set<string>([
  "/dashboard",
  "/attendance",
  "/checkin",
  "/leave",
  "/payroll",
  "/employees",
  "/contracts",
  "/approvals",
  "/profile",
  "/admin/system",
]);

function getVnNowParts(): { dateStr: string; month: number; year: number } {
  const vn = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const year = vn.getUTCFullYear();
  const month = vn.getUTCMonth() + 1;
  const day = vn.getUTCDate();
  return {
    dateStr: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    month,
    year,
  };
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const base = new Date(`${dateStr}T00:00:00.000Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().split("T")[0];
}

function isIsoDateStr(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

function clampMonth(raw: unknown, fallback: number): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 12) return fallback;
  return n;
}

function clampYear(raw: unknown, fallback: number): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 2000 || n > 2100) return fallback;
  return n;
}

export class AgentToolExecutorService {
  async execute(
    toolName: string,
    args: Record<string, unknown>,
    authUser: AuthUser
  ): Promise<AgentToolExecutionResult> {
    const { dateStr: todayVn, month: currentMonth, year: currentYear } = getVnNowParts();

    switch (toolName) {
      case "search_dau_policies": {
        const query = typeof args["query"] === "string" ? args["query"].trim() : "";
        if (!query) {
          return {
            summary: "Thiếu từ khóa tra cứu quy chế",
            output: { error: "Vui lòng cung cấp từ khóa tra cứu." },
          };
        }
        try {
          const sources = await searchPoliciesLocalAndDb(query);
          return {
            summary:
              sources.length > 0
                ? `Tìm thấy ${sources.length} văn bản quy chế liên quan`
                : "Không tìm thấy văn bản khớp trực tiếp",
            output: {
              count: sources.length,
              policies: sources.slice(0, 4).map((s) => ({
                documentNo: s.documentNo,
                title: s.title,
                category: s.category,
                excerpt: s.excerpt,
              })),
            },
            sources: sources.slice(0, 3),
          };
        } catch (err: any) {
          return {
            summary: "Lỗi tra cứu quy chế",
            output: { error: err?.message || "Không thể tra cứu cơ sở tri thức." },
          };
        }
      }

      case "get_my_leave_balance": {
        if (!authUser.employeeId) {
          return {
            summary: "Chưa liên kết hồ sơ nhân sự",
            output: {
              error: "Tài khoản hiện tại chưa được liên kết với hồ sơ Cán bộ, Giảng viên.",
            },
          };
        }
        const year = clampYear(args["year"], currentYear);
        try {
          const balance = await LeaveLedgerService.getBalance(authUser.employeeId, year);
          return {
            summary: `Số dư phép năm ${year}: còn ${balance.remaining} ngày`,
            output: {
              employeeCode: authUser.employeeCode,
              ...balance,
            },
            profileData: {
              employeeCode: authUser.employeeCode,
              year: balance.year,
              remainingLeaveDays: balance.remaining,
            },
          };
        } catch (err: any) {
          return {
            summary: "Không thể lấy số dư phép",
            output: { error: err?.message || "Lỗi truy vấn sổ cái phép." },
          };
        }
      }

      case "get_my_attendance_summary": {
        if (!authUser.employeeId) {
          return {
            summary: "Chưa liên kết hồ sơ nhân sự",
            output: {
              error: "Tài khoản hiện tại chưa được liên kết với hồ sơ Cán bộ, Giảng viên.",
            },
          };
        }
        const month = clampMonth(args["month"], currentMonth);
        const year = clampYear(args["year"], currentYear);
        try {
          const data = await AttendanceService.getMyMonthlyAttendance(month, year, authUser);
          const todayRecord = data.records.find((r) => r.workDate === todayVn) || null;
          const summary = data.summary;
          return {
            summary: summary
              ? `Công tháng ${month}/${year}: ${summary.totalPayableDays}/${summary.standardDays} ngày công hưởng lương`
              : `Đã lấy dữ liệu chấm công tháng ${month}/${year}`,
            output: {
              month,
              year,
              periodLocked: data.period?.isLocked ?? false,
              standardDays: summary?.standardDays ?? data.period?.standardWorkingDays ?? 22,
              actualWorkingDays: summary?.actualWorkingDays ?? 0,
              paidLeaveDays: summary?.paidLeaveDays ?? 0,
              unpaidLeaveDays: summary?.unpaidLeaveDays ?? 0,
              businessTripDays: summary?.businessTripDays ?? 0,
              lateCount: summary?.lateCount ?? 0,
              earlyLeaveCount: summary?.earlyLeaveCount ?? 0,
              totalPayableDays: summary?.totalPayableDays ?? 0,
              recordCount: data.records.length,
              todayRecord: todayRecord
                ? {
                    workDate: todayRecord.workDate,
                    status: todayRecord.status,
                    checkInTime: todayRecord.checkInTime,
                    checkOutTime: todayRecord.checkOutTime,
                    rawWorkingHours: todayRecord.rawWorkingHours,
                  }
                : null,
            },
          };
        } catch (err: any) {
          return {
            summary: "Không thể lấy bảng chấm công",
            output: { error: err?.message || "Lỗi truy vấn dữ liệu chấm công." },
          };
        }
      }

      case "get_my_payslip": {
        if (!authUser.employeeId) {
          return {
            summary: "Chưa liên kết hồ sơ nhân sự",
            output: {
              error: "Tài khoản hiện tại chưa được liên kết với hồ sơ Cán bộ, Giảng viên.",
            },
          };
        }
        const month = clampMonth(args["month"], currentMonth);
        const year = clampYear(args["year"], currentYear);
        try {
          const payslip = await PayrollService.calculateEmployeePayslip(
            authUser.employeeId,
            month,
            year
          );
          return {
            summary: `Phiếu lương T${month}/${year}: Thực lĩnh ${payslip.netSalary.toLocaleString("vi-VN")} VNĐ`,
            output: {
              employeeCode: payslip.employeeCode,
              employeeName: payslip.employeeName,
              departmentName: payslip.departmentName,
              positionName: payslip.positionName,
              month: payslip.month,
              year: payslip.year,
              salaryCoefficient: payslip.salaryCoefficient,
              baseSalary: payslip.baseSalary,
              leadershipAllowance: payslip.leadershipAllowance,
              seniorityAllowance: payslip.seniorityAllowance,
              pedagogicalAllowance: payslip.pedagogicalAllowance,
              kpiRanking: payslip.kpiRanking,
              kpiExtraIncome: payslip.kpiExtraIncome,
              overtimeTeachingHours: payslip.overtimeTeachingHours,
              overtimeTeachingPay: payslip.overtimeTeachingPay,
              grossIncome: payslip.grossIncome,
              socialInsurance: payslip.socialInsurance,
              healthInsurance: payslip.healthInsurance,
              unemploymentInsurance: payslip.unemploymentInsurance,
              totalInsurance: payslip.totalInsurance,
              personalIncomeTax: payslip.personalIncomeTax,
              netSalary: payslip.netSalary,
              standardWorkDays: payslip.standardWorkDays,
              actualWorkDays: payslip.actualWorkDays,
              status: payslip.status,
            },
          };
        } catch (err: any) {
          return {
            summary: "Không thể tính phiếu lương",
            output: { error: err?.message || "Lỗi truy vấn phiếu lương cá nhân." },
          };
        }
      }

      case "get_my_profile_summary": {
        if (!authUser.employeeId) {
          return {
            summary: "Chưa liên kết hồ sơ nhân sự",
            output: {
              error: "Tài khoản hiện tại chưa được liên kết với hồ sơ Cán bộ, Giảng viên.",
            },
          };
        }
        try {
          const profile = await EmployeeService.getMyProfile(authUser);
          const safeProfile = {
            employeeCode: profile.employeeCode,
            fullName: profile.fullName,
            workEmail: profile.workEmail,
            academicTitle: profile.academicTitle,
            academicDegree: profile.academicDegree,
            employmentStatus: profile.employmentStatus,
            hireDate: profile.hireDate,
            primaryUnitName: profile.primaryUnitName,
            primaryPositionName: profile.primaryPositionName,
          };
          return {
            summary: `Hồ sơ ${profile.employeeCode} — ${profile.fullName}`,
            output: safeProfile,
            profileData: safeProfile,
          };
        } catch (err: any) {
          return {
            summary: "Không thể lấy hồ sơ cá nhân",
            output: { error: err?.message || "Lỗi truy vấn hồ sơ nhân sự." },
          };
        }
      }

      case "get_hr_overview_alerts": {
        if (!isHrOrAdminUser(authUser)) {
          return {
            summary: "Không có quyền truy cập",
            output: {
              error: "FORBIDDEN: Chỉ Phòng TCHC, Ban Giám hiệu hoặc Quản trị hệ thống mới có quyền xem cảnh báo toàn trường.",
            },
          };
        }
        try {
          const scope = {
            roles: authUser.roles,
            unitsManaged: authUser.unitsManaged,
            employeeId: authUser.employeeId,
          };
          const [overview, alerts] = await Promise.all([
            DashboardService.getOverview(scope),
            DashboardService.getExecutiveAlerts(scope),
          ]);
          let contractSummary: Record<string, unknown> | null = null;
          if (authUser.roles.some((r) => ["ROLE_HR_OFFICER", "ROLE_RECTOR"].includes(r))) {
            try {
              contractSummary = (await ContractService.getContractAlertSummary(authUser)) as unknown as Record<string, unknown>;
            } catch {
              contractSummary = null;
            }
          }
          return {
            summary: `Tổng quan: ${overview.totalEmployees} nhân sự, ${overview.expiringContractsCount} HĐ sắp hết hạn, ${overview.pendingRequestsCount} hồ sơ chờ duyệt`,
            output: {
              overview,
              contractSummary,
              expiringContracts: alerts.expiringContracts.slice(0, 5),
              expiringCertificates: alerts.expiringCertificates.slice(0, 5),
              pendingApprovals: alerts.pendingApprovals.slice(0, 5),
            },
          };
        } catch (err: any) {
          return {
            summary: "Không thể lấy tổng quan nhân sự",
            output: { error: err?.message || "Lỗi truy vấn tổng quan điều hành." },
          };
        }
      }

      case "get_payroll_period_summary": {
        if (!isHrOrAdminUser(authUser)) {
          return {
            summary: "Không có quyền truy cập",
            output: {
              error: "FORBIDDEN: Chỉ Phòng TCHC, Ban Giám hiệu hoặc Quản trị hệ thống mới có quyền xem quỹ lương toàn trường.",
            },
          };
        }
        const month = clampMonth(args["month"], currentMonth);
        const year = clampYear(args["year"], currentYear);
        try {
          const summary = await PayrollService.getPeriodSummary(month, year);
          return {
            summary: `Quỹ lương T${month}/${year}: ${summary.totalEmployees} CBGV, Tổng Net ${summary.totalNetPayout.toLocaleString("vi-VN")} VNĐ (${summary.status})`,
            output: summary as unknown as Record<string, unknown>,
          };
        } catch (err: any) {
          return {
            summary: "Không thể lấy tổng hợp kỳ lương",
            output: { error: err?.message || "Lỗi truy vấn tổng hợp kỳ lương." },
          };
        }
      }

      case "get_pending_approvals": {
        if (!isHrOrAdminUser(authUser)) {
          return {
            summary: "Không có quyền truy cập",
            output: {
              error: "FORBIDDEN: Chỉ Phòng TCHC, Ban Giám hiệu hoặc Quản trị hệ thống mới có quyền xem hàng đợi phê duyệt.",
            },
          };
        }
        try {
          const tasks = await WorkflowService.getPendingTasks(authUser);
          return {
            summary: `Có ${tasks.length} hồ sơ đang chờ phê duyệt`,
            output: {
              totalPending: tasks.length,
              items: tasks.slice(0, 10),
            },
          };
        } catch (err: any) {
          return {
            summary: "Không thể lấy danh sách chờ duyệt",
            output: { error: err?.message || "Lỗi truy vấn luồng phê duyệt." },
          };
        }
      }

      case "propose_leave_request": {
        if (!authUser.employeeId) {
          return {
            summary: "Chưa liên kết hồ sơ nhân sự",
            output: {
              error: "Tài khoản hiện tại chưa được liên kết với hồ sơ Cán bộ, Giảng viên để tạo đơn nghỉ phép.",
            },
          };
        }
        const rawLeaveType = typeof args["leaveType"] === "string" ? args["leaveType"].toUpperCase() : "ANNUAL";
        const leaveTypeParsed = LeaveTypeEnum.safeParse(rawLeaveType);
        const leaveType = leaveTypeParsed.success ? leaveTypeParsed.data : "ANNUAL";

        let totalDays = typeof args["totalDays"] === "number" ? args["totalDays"] : Number(args["totalDays"] ?? 1);
        if (!Number.isFinite(totalDays) || totalDays <= 0) {
          return {
            summary: "Số ngày nghỉ không hợp lệ",
            output: { error: "Số ngày nghỉ phép phải lớn hơn 0 (tối thiểu 0.5 ngày)." },
          };
        }
        totalDays = Math.min(365, Math.max(0.5, Math.round(totalDays * 2) / 2));

        const startDate = isIsoDateStr(args["startDate"])
          ? args["startDate"]
          : addDaysToDateStr(todayVn, 1);

        const defaultEndDate = addDaysToDateStr(startDate, Math.max(0, Math.ceil(totalDays) - 1));
        let endDate = isIsoDateStr(args["endDate"]) ? args["endDate"] : defaultEndDate;
        if (endDate < startDate) {
          endDate = defaultEndDate;
        }

        const rawReason = typeof args["reason"] === "string" ? args["reason"].trim() : "";
        const reason =
          rawReason.length >= 5
            ? rawReason.slice(0, 1000)
            : "Nghỉ phép thường niên (Tạo qua Trợ lý ảo AI)";

        const payload = {
          leaveType,
          startDate,
          endDate,
          totalDays,
          reason,
        };
        const summary = `Đơn xin nghỉ phép (${leaveType}, ${totalDays} ngày): từ ${startDate} đến ${endDate}`;

        let currentRemainingBalance: number | undefined;
        try {
          const targetYear = Number(startDate.slice(0, 4));
          const bal = await LeaveLedgerService.getBalance(authUser.employeeId, targetYear);
          currentRemainingBalance = bal.remaining;
        } catch {
          // Best-effort check
        }

        return {
          summary: `Đã lập dự thảo đơn nghỉ ${totalDays} ngày (${startDate} -> ${endDate})`,
          output: {
            status: "CONFIRMATION_REQUIRED",
            payload,
            currentRemainingBalance,
          },
          draftProposal: {
            type: "LEAVE",
            summary,
            payload,
            status: "CONFIRMATION_REQUIRED",
          },
          action: {
            type: "LEAVE_DRAFT",
            title: "Dự thảo đơn xin nghỉ phép",
            subtitle: `${leaveType} — ${totalDays} ngày (${startDate} đến ${endDate})`,
            summary,
            payload,
            status: "CONFIRMATION_REQUIRED",
          },
        };
      }

      case "propose_navigation": {
        const rawPath = typeof args["path"] === "string" ? args["path"].trim() : "";
        const cleanPath = rawPath.split("?")[0].split("#")[0];
        if (!ALLOWED_NAVIGATION_PATHS.has(cleanPath)) {
          return {
            summary: "Đường dẫn điều hướng không hợp lệ",
            output: {
              error: `Đường dẫn '${rawPath}' không nằm trong danh sách phân hệ cho phép.`,
            },
          };
        }
        const title =
          typeof args["title"] === "string" && args["title"].trim().length > 0
            ? args["title"].trim().slice(0, 80)
            : `Mở trang ${cleanPath}`;
        const subtitle =
          typeof args["subtitle"] === "string" && args["subtitle"].trim().length > 0
            ? args["subtitle"].trim().slice(0, 140)
            : "Chuyển nhanh tới phân hệ nghiệp vụ BAHAU";

        return {
          summary: `Đề xuất mở ${cleanPath}`,
          output: { href: cleanPath, title, subtitle },
          action: {
            type: "NAVIGATE",
            title,
            subtitle,
            href: cleanPath,
          },
        };
      }

      case "propose_attendance_adjustment": {
        if (!authUser.employeeId) {
          return {
            summary: "Chưa liên kết hồ sơ nhân sự",
            output: {
              error: "Tài khoản hiện tại chưa được liên kết với hồ sơ Cán bộ, Giảng viên.",
            },
          };
        }

        const rawWorkDate = args["workDate"];
        const workDate = isIsoDateStr(rawWorkDate) ? rawWorkDate : todayVn;

        const normalizeTimeInput = (val: unknown): { value?: string; invalid?: boolean } => {
          if (val === undefined || val === null || val === "") return {};
          if (typeof val !== "string") return { invalid: true };
          const s = val.trim();
          if (!s) return {};
          const hhmmMatch = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
          if (hhmmMatch) {
            const hNum = Number(hhmmMatch[1]);
            const mNum = Number(hhmmMatch[2]);
            if (hNum < 0 || hNum > 23 || mNum < 0 || mNum > 59) {
              return { invalid: true };
            }
            return { value: `${String(hNum).padStart(2, "0")}:${String(mNum).padStart(2, "0")}` };
          }
          if (isIsoDateStr(s.slice(0, 10)) && s.includes("T") && !Number.isNaN(Date.parse(s))) {
            return { value: s };
          }
          return { invalid: true };
        };

        const parsedIn = normalizeTimeInput(args["requestedCheckIn"]);
        const parsedOut = normalizeTimeInput(args["requestedCheckOut"]);
        if (parsedIn.invalid || parsedOut.invalid) {
          return {
            summary: "Định dạng giờ chấm công không hợp lệ",
            output: {
              error: "Giờ đề xuất không hợp lệ. Vui lòng dùng định dạng HH:mm (từ 00:00 đến 23:59).",
            },
          };
        }

        const requestedCheckIn = parsedIn.value;
        const requestedCheckOut = parsedOut.value;

        if (!requestedCheckIn && !requestedCheckOut) {
          return {
            summary: "Thiếu thông tin giờ quẹt thẻ",
            output: {
              error: "Vui lòng cung cấp ít nhất giờ vào hoặc giờ ra cần điều chỉnh.",
            },
          };
        }

        if (requestedCheckIn && requestedCheckOut) {
          const inIso = requestedCheckIn.includes("T")
            ? requestedCheckIn
            : `${workDate}T${requestedCheckIn}:00+07:00`;
          const outIso = requestedCheckOut.includes("T")
            ? requestedCheckOut
            : `${workDate}T${requestedCheckOut}:00+07:00`;
          if (Date.parse(outIso) <= Date.parse(inIso)) {
            return {
              summary: "Giờ ra phải sau giờ vào",
              output: {
                error: "Giờ tan ca (check-out) phải lớn hơn giờ vào ca (check-in).",
              },
            };
          }
        }

        const rawReason = typeof args["reason"] === "string" ? args["reason"].trim() : "";
        if (rawReason.length < 5) {
          return {
            summary: "Lý do giải trình không hợp lệ",
            output: {
              error: "Lý do giải trình điều chỉnh công phải có ít nhất 5 ký tự.",
            },
          };
        }

        const payload = {
          workDate,
          requestedCheckIn,
          requestedCheckOut,
          reason: rawReason,
        };

        const inDisplay = requestedCheckIn || "--:--";
        const outDisplay = requestedCheckOut || "--:--";
        const summary = `Giải trình công ngày ${workDate}: vào ${inDisplay}, ra ${outDisplay} (${rawReason})`;

        return {
          summary: `Đã lập dự thảo giải trình chấm công ngày ${workDate}`,
          output: {
            status: "CONFIRMATION_REQUIRED",
            payload,
          },
          action: {
            type: "ATTENDANCE_ADJUSTMENT_DRAFT",
            title: "Dự thảo giải trình điều chỉnh công",
            subtitle: `Ngày ${workDate} — Vào ${inDisplay}, Ra ${outDisplay}`,
            summary,
            payload,
            status: "CONFIRMATION_REQUIRED",
          },
        };
      }

      case "search_employee_info": {
        if (!isHrOrAdminUser(authUser)) {
          return {
            summary: "Không có quyền truy cập",
            output: {
              error: "FORBIDDEN: Chỉ Phòng TCHC, Ban Giám hiệu hoặc Quản trị hệ thống mới có quyền tìm kiếm danh bạ nhân sự.",
            },
          };
        }

        const query = typeof args["query"] === "string" ? args["query"].trim() : "";
        if (!query) {
          return {
            summary: "Thiếu từ khóa tìm kiếm",
            output: { error: "Vui lòng cung cấp tên, mã CBGV hoặc email cần tìm." },
          };
        }

        try {
          const result = await EmployeeService.getEmployees(
            { search: query, page: 1, pageSize: 10, sortBy: "fullName", sortOrder: "asc" },
            authUser
          );
          const mapped = result.items.map((emp) => ({
            id: emp.id,
            employeeCode: emp.employeeCode,
            fullName: emp.fullName,
            workEmail: emp.workEmail,
            unitName: emp.primaryUnitName || "Chưa phân bổ",
            positionName: emp.primaryPositionName || "Cán bộ / Giảng viên",
          }));

          return {
            summary: `Tìm thấy ${mapped.length} nhân sự phù hợp với '${query}'`,
            output: {
              query,
              totalItems: result.pagination.totalItems,
              employees: mapped,
            },
          };
        } catch {
          // Fallback khi DB offline hoặc lỗi kết nối: tìm trong danh bạ DEFAULT_FACULTY_MEMBERS (hỗ trợ không dấu)
          const qNorm = normalizeVietnamese(query);
          const fallbackMatches = DEFAULT_FACULTY_MEMBERS.filter((m) => {
            const code = normalizeVietnamese(m.employeeCode || "");
            const name = normalizeVietnamese(m.fullName || m.employeeName || "");
            const dept = normalizeVietnamese(m.departmentName || "");
            const pos = normalizeVietnamese(m.positionName || "");
            return code.includes(qNorm) || name.includes(qNorm) || dept.includes(qNorm) || pos.includes(qNorm);
          }).slice(0, 10);

          const mapped = fallbackMatches.map((m) => ({
            id: m.id,
            employeeCode: m.employeeCode,
            fullName: m.fullName || m.employeeName,
            unitName: m.departmentName,
            positionName: m.positionName,
          }));

          return {
            summary: `Tìm thấy ${mapped.length} nhân sự (danh bạ cơ hữu) với '${query}'`,
            output: {
              query,
              totalItems: mapped.length,
              employees: mapped,
              dataSource: "FALLBACK_FACULTY_MEMBERS",
            },
          };
        }
      }

      case "get_employee_payroll_attendance": {
        if (!isHrOrAdminUser(authUser)) {
          return {
            summary: "Không có quyền truy cập",
            output: {
              error: "FORBIDDEN: Chỉ Phòng TCHC, Ban Giám hiệu hoặc Quản trị hệ thống mới có quyền tra cứu thông tin lương và công của nhân sự khác.",
            },
          };
        }

        const employeeCode = typeof args["employeeCode"] === "string" ? args["employeeCode"].trim() : "";
        const employeeName = typeof args["employeeName"] === "string" ? args["employeeName"].trim() : "";
        if (!employeeCode && !employeeName) {
          return {
            summary: "Thiếu thông tin nhân sự",
            output: { error: "Vui lòng cung cấp mã cán bộ (employeeCode) hoặc họ tên (employeeName) để tra cứu." },
          };
        }

        const month = clampMonth(args["month"], currentMonth);
        const year = clampYear(args["year"], currentYear);

        let targetEmployee: {
          id: string;
          employeeCode: string;
          fullName: string;
          unitName?: string;
          positionName?: string;
        } | null = null;

        // 1. Tìm qua Prisma DB trước
        try {
          const whereOr: any[] = [];
          if (employeeCode) {
            whereOr.push({ employeeCode: { equals: employeeCode, mode: "insensitive" } });
          }
          if (employeeName) {
            whereOr.push({ fullName: { contains: employeeName, mode: "insensitive" } });
          }

          const dbEmp = await prisma.employee.findFirst({
            where: { OR: whereOr },
            include: {
              assignments: {
                where: { status: "ACTIVE" },
                include: { unit: true, position: true },
                take: 1,
              },
            },
          });

          if (dbEmp) {
            targetEmployee = {
              id: dbEmp.id,
              employeeCode: dbEmp.employeeCode,
              fullName: dbEmp.fullName,
              unitName: dbEmp.assignments[0]?.unit?.name,
              positionName: dbEmp.assignments[0]?.position?.name,
            };
          }
        } catch {
          // DB offline
        }

        // 2. Nếu chưa thấy, fallback sang DEFAULT_FACULTY_MEMBERS (hỗ trợ tên không dấu)
        if (!targetEmployee) {
          const codeNorm = normalizeVietnamese(employeeCode);
          const nameNorm = normalizeVietnamese(employeeName);
          const targetFaculty = DEFAULT_FACULTY_MEMBERS.find((m) => {
            if (codeNorm && normalizeVietnamese(m.employeeCode) === codeNorm) return true;
            if (
              nameNorm &&
              (normalizeVietnamese(m.fullName).includes(nameNorm) ||
                normalizeVietnamese(m.employeeName).includes(nameNorm))
            )
              return true;
            return false;
          });

          if (targetFaculty) {
            targetEmployee = {
              id: targetFaculty.employeeId || targetFaculty.id,
              employeeCode: targetFaculty.employeeCode,
              fullName: targetFaculty.fullName || targetFaculty.employeeName,
              unitName: targetFaculty.departmentName,
              positionName: targetFaculty.positionName,
            };
          }
        }

        if (!targetEmployee) {
          return {
            summary: "Không tìm thấy nhân sự",
            output: {
              error: `Không tìm thấy cán bộ, giảng viên phù hợp với thông tin '${employeeCode || employeeName}'.`,
            },
          };
        }

        // 3. Tra cứu phiếu lương và bảng công (bọc try/catch riêng rẽ)
        let payslipData: Record<string, unknown> | null = null;
        let attendanceData: Record<string, unknown> | null = null;

        try {
          const payslip = await PayrollService.calculateEmployeePayslip(targetEmployee.id, month, year);
          payslipData = {
            grossIncome: payslip.grossIncome,
            netSalary: payslip.netSalary,
            salaryCoefficient: payslip.salaryCoefficient,
            kpiRanking: payslip.kpiRanking,
            insurableBase: payslip.insurableBase,
            socialInsurance: payslip.socialInsurance,
            healthInsurance: payslip.healthInsurance,
            unemploymentInsurance: payslip.unemploymentInsurance,
            totalInsurance: payslip.totalInsurance,
            personalIncomeTax: payslip.personalIncomeTax,
            standardWorkDays: payslip.standardWorkDays,
            actualWorkDays: payslip.actualWorkDays,
            status: payslip.status,
          };
        } catch (err: any) {
          payslipData = { error: err?.message || "Không thể tính phiếu lương." };
        }

        try {
          const targetAuthUser = {
            ...authUser,
            employeeId: targetEmployee.id,
            employeeCode: targetEmployee.employeeCode,
          } as AuthUser;
          const att = await AttendanceService.getMyMonthlyAttendance(month, year, targetAuthUser);
          const summary = att.summary;
          attendanceData = {
            standardDays: summary?.standardDays ?? att.period?.standardWorkingDays ?? 22,
            actualWorkingDays: summary?.actualWorkingDays ?? 0,
            totalPayableDays: summary?.totalPayableDays ?? 0,
            lateCount: summary?.lateCount ?? 0,
            earlyLeaveCount: summary?.earlyLeaveCount ?? 0,
            paidLeaveDays: summary?.paidLeaveDays ?? 0,
            unpaidLeaveDays: summary?.unpaidLeaveDays ?? 0,
          };
        } catch (err: any) {
          attendanceData = { error: err?.message || "Không thể truy vấn bảng chấm công." };
        }

        const netDisplay =
          payslipData && "netSalary" in payslipData && typeof payslipData.netSalary === "number"
            ? `${payslipData.netSalary.toLocaleString("vi-VN")} VNĐ`
            : "N/A";
        const daysDisplay =
          attendanceData && "totalPayableDays" in attendanceData
            ? `${attendanceData.totalPayableDays} công`
            : "N/A";

        return {
          summary: `Nhân sự ${targetEmployee.employeeCode} (${targetEmployee.fullName}) - T${month}/${year}: Net ${netDisplay}, ${daysDisplay}`,
          output: {
            employee: targetEmployee,
            month,
            year,
            payslip: payslipData,
            attendance: attendanceData,
          },
        };
      }

      default:
        return {
          summary: `Tool '${toolName}' không tồn tại`,
          output: { error: `Unknown tool: ${toolName}` },
        };
    }
  }
}

export const agentToolExecutor = new AgentToolExecutorService();
