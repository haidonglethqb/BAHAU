import { prisma, Prisma } from "@bahau/database";
import { AppError } from "../middlewares/error.middleware.js";
import { LeaveLedgerService } from "./leave-ledger.service.js";
import { WorkflowService } from "./workflow.service.js";
import type {
  AuthUser,
  CreateLeaveRequestInput,
  LeaveRequestDto,
  LeaveRequestDetailDto,
  LeaveBalanceDto,
  LeaveLedgerEntryDto,
  CreateTripRequestInput,
  BusinessTripDto,
  BusinessTripDetailDto,
} from "@bahau/contracts";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isDbConnectionError(err: any): boolean {
  return Boolean(
    err?.code === "P1001" ||
      err?.code === "P1002" ||
      err?.code === "P1008" ||
      err?.message?.includes("connect") ||
      err?.message?.includes("Can't reach database")
  );
}

function getCurrentVnYear(): number {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).getUTCFullYear();
}

function getVnYearFromDate(date: Date): number {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000).getUTCFullYear();
}

function parseCalendarDate(dateStr: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) {
    throw new AppError(422, "INVALID_DATE_RANGE", `Định dạng ngày không hợp lệ: ${dateStr}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new AppError(422, "INVALID_DATE_RANGE", `Ngày lịch không tồn tại: ${dateStr}`);
  }
  return date;
}

function validateDaysAgainstRange(startDate: Date, endDate: Date, totalDays: number): void {
  if (endDate < startDate) {
    throw new AppError(422, "INVALID_DATE_RANGE", "Ngày kết thúc không được nhỏ hơn ngày bắt đầu.");
  }
  if (!Number.isFinite(totalDays) || totalDays < 0.5 || Math.abs(totalDays * 2 - Math.round(totalDays * 2)) >= 1e-9) {
    throw new AppError(422, "VALIDATION_FAILED", "Số ngày đăng ký phải từ 0.5 ngày và là bội số của 0.5.");
  }
  const calendarDays = Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (totalDays > calendarDays) {
    throw new AppError(
      422,
      "INVALID_TOTAL_DAYS",
      `Số ngày đăng ký (${totalDays}) không được vượt quá số ngày lịch trong khoảng đã chọn (${calendarDays} ngày).`
    );
  }
}

async function lockEmployeeInTx(tx: Prisma.TransactionClient, employeeId: string): Promise<void> {
  if (UUID_REGEX.test(employeeId) && typeof (tx as any).$executeRaw === "function") {
    await tx.$executeRaw`SELECT id FROM employees WHERE id = ${employeeId}::uuid FOR UPDATE`;
  }
}

async function assertNoOverlappingRequests(
  tx: Prisma.TransactionClient,
  employeeId: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  const [overlappingLeave, overlappingTrip] = await Promise.all([
    tx.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { id: true, startDate: true, endDate: true },
    }),
    tx.businessTripRequest.findFirst({
      where: {
        employeeId,
        status: { in: ["PENDING", "APPROVED"] },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { id: true, startDate: true, endDate: true },
    }),
  ]);

  if (overlappingLeave || overlappingTrip) {
    throw new AppError(
      409,
      "OVERLAPPING_REQUEST",
      "Khoảng thời gian đăng ký trùng với đơn nghỉ phép hoặc công tác đang chờ duyệt/đã duyệt."
    );
  }
}

export class LeaveService {
  /**
   * Tạo đơn xin nghỉ phép mới kèm tạm giữ phép trên Sổ cái và kích hoạt Workflow
   */
  public static async createLeaveRequest(
    currentUser: AuthUser,
    input: CreateLeaveRequestInput
  ): Promise<LeaveRequestDto> {
    if (!currentUser.employeeId) {
      throw new AppError(403, "FORBIDDEN", "Tài khoản hiện tại chưa được gán hồ sơ nhân sự.");
    }

    const employeeId = currentUser.employeeId;

    if (input.substituteEmployeeId && input.substituteEmployeeId === employeeId) {
      throw new AppError(422, "INVALID_SUBSTITUTE", "Không thể chọn chính mình làm người thay thế.");
    }

    const startDate = parseCalendarDate(input.startDate);
    const endDate = parseCalendarDate(input.endDate);
    validateDaysAgainstRange(startDate, endDate, input.totalDays);

    const targetYear = getVnYearFromDate(startDate);

    try {
      return await prisma.$transaction(async (tx) => {
        await lockEmployeeInTx(tx, employeeId);

        if (input.substituteEmployeeId) {
          const substitute = await tx.employee.findUnique({
            where: { id: input.substituteEmployeeId },
            select: { id: true },
          });
          if (!substitute) {
            throw new AppError(422, "INVALID_SUBSTITUTE", "Người thay thế được chọn không tồn tại.");
          }
        }

        // 1. Kiểm tra trùng lặp thời gian với đơn nghỉ phép / công tác PENDING hoặc APPROVED
        await assertNoOverlappingRequests(tx, employeeId, startDate, endDate);

        // 2. Kiểm tra số dư phép trong transaction nếu là nghỉ phép năm
        if (input.leaveType === "ANNUAL") {
          const balance = await LeaveLedgerService.getBalance(employeeId, targetYear, tx);
          if (balance.remaining < input.totalDays) {
            throw new AppError(
              422,
              "INSUFFICIENT_LEAVE_BALANCE",
              `Số dư phép năm ${targetYear} không đủ. Bạn còn ${balance.remaining} ngày nhưng xin nghỉ ${input.totalDays} ngày.`
            );
          }
        }

        // 3. Tạo bản ghi đơn nghỉ phép
        const leave = await tx.leaveRequest.create({
          data: {
            employeeId,
            leaveType: input.leaveType as any,
            startDate,
            endDate,
            totalDays: input.totalDays,
            reason: input.reason,
            substituteEmployeeId: input.substituteEmployeeId || null,
            status: "PENDING",
          },
          include: {
            employee: { select: { fullName: true, employeeCode: true } },
            substituteEmployee: { select: { fullName: true } },
          },
        });

        // 4. Nếu là phép năm -> Ghi nhận TẠM GIỮ trên Sổ cái (HOLD) trong cùng transaction
        if (input.leaveType === "ANNUAL") {
          await LeaveLedgerService.recordHold(employeeId, input.totalDays, leave.id, targetYear, tx);
        }

        // 5. Kích hoạt chuỗi Workflow phê duyệt phân cấp trong cùng transaction
        const wfInstanceId = await WorkflowService.startLeaveWorkflow(employeeId, leave.id, input.totalDays, tx);

        return {
          id: leave.id,
          employeeId: leave.employeeId,
          employeeName: leave.employee.fullName,
          employeeCode: leave.employee.employeeCode,
          leaveType: leave.leaveType as any,
          startDate: input.startDate,
          endDate: input.endDate,
          totalDays: Number(leave.totalDays),
          reason: leave.reason,
          substituteEmployeeName: leave.substituteEmployee?.fullName || null,
          workflowInstanceId: wfInstanceId,
          status: leave.status as any,
          createdAt: leave.createdAt.toISOString(),
        };
      });
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối tới cơ sở dữ liệu.");
      }
      throw err;
    }
  }

  /**
   * Lấy danh sách các đơn nghỉ phép của bản thân
   */
  public static async getMyLeaveRequests(currentUser: AuthUser): Promise<LeaveRequestDto[]> {
    if (!currentUser.employeeId) {
      throw new AppError(403, "FORBIDDEN", "Tài khoản hiện tại chưa được gán hồ sơ nhân sự.");
    }

    try {
      const leaves = await prisma.leaveRequest.findMany({
        where: { employeeId: currentUser.employeeId },
        orderBy: { createdAt: "desc" },
        include: {
          employee: { select: { fullName: true, employeeCode: true } },
          substituteEmployee: { select: { fullName: true } },
        },
      });

      return leaves.map((l) => ({
        id: l.id,
        employeeId: l.employeeId,
        employeeName: l.employee.fullName,
        employeeCode: l.employee.employeeCode,
        leaveType: l.leaveType as any,
        startDate: l.startDate.toISOString().split("T")[0],
        endDate: l.endDate.toISOString().split("T")[0],
        totalDays: Number(l.totalDays),
        reason: l.reason,
        substituteEmployeeName: l.substituteEmployee?.fullName || null,
        workflowInstanceId: l.workflowInstanceId || null,
        status: l.status as any,
        createdAt: l.createdAt.toISOString(),
      }));
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối cơ sở dữ liệu.");
      }
      throw err;
    }
  }

  /**
   * Lấy chi tiết một đơn nghỉ phép kèm theo thông tin tiến trình phê duyệt (Timeline)
   */
  public static async getLeaveRequestById(
    id: string,
    currentUser: AuthUser
  ): Promise<LeaveRequestDetailDto> {
    try {
      const leave = await prisma.leaveRequest.findUnique({
        where: { id },
        include: {
          employee: { select: { fullName: true, employeeCode: true } },
          substituteEmployee: { select: { fullName: true } },
        },
      });

      if (!leave) {
        throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy đơn nghỉ phép yêu cầu.");
      }

      // Kiểm tra quyền xem (Chống IDOR & Cross-Unit Data Exposure)
      const isOwner = leave.employeeId === currentUser.employeeId;
      const isGlobalHR = currentUser.roles.some((r) =>
        ["ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_SYSADMIN"].includes(r)
      );

      let isUnitHeadOfEmployee = false;
      if (currentUser.roles.includes("ROLE_UNIT_HEAD") && currentUser.unitsManaged && currentUser.unitsManaged.length > 0) {
        const assignment = await prisma.employmentAssignment.findFirst({
          where: { employeeId: leave.employeeId, assignmentType: "PRIMARY", status: "ACTIVE" },
        });
        if (assignment?.unitId && currentUser.unitsManaged.includes(assignment.unitId)) {
          isUnitHeadOfEmployee = true;
        }
      }

      if (!isOwner && !isGlobalHR && !isUnitHeadOfEmployee) {
        throw new AppError(403, "FORBIDDEN", "Bạn không có quyền xem thông tin đơn này.");
      }

      let workflowDetail;
      if (leave.workflowInstanceId) {
        workflowDetail = await WorkflowService.getInstanceDetails(leave.workflowInstanceId, currentUser);
      }

      return {
        id: leave.id,
        employeeId: leave.employeeId,
        employeeName: leave.employee.fullName,
        employeeCode: leave.employee.employeeCode,
        leaveType: leave.leaveType as any,
        startDate: leave.startDate.toISOString().split("T")[0],
        endDate: leave.endDate.toISOString().split("T")[0],
        totalDays: Number(leave.totalDays),
        reason: leave.reason,
        substituteEmployeeName: leave.substituteEmployee?.fullName || null,
        workflowInstanceId: leave.workflowInstanceId || null,
        status: leave.status as any,
        createdAt: leave.createdAt.toISOString(),
        workflow: workflowDetail,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (err.code === "P1001" || err.message?.includes("connect") || err.message?.includes("Can't reach database")) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối cơ sở dữ liệu.");
      }
      throw err;
    }
  }

  /**
   * Hủy đơn xin nghỉ phép (chỉ khi đang ở trạng thái PENDING)
   */
  public static async cancelLeaveRequest(id: string, currentUser: AuthUser): Promise<void> {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
    });

    if (!leave) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy đơn nghỉ phép cần hủy.");
    }

    const isOwner = currentUser.employeeId === leave.employeeId;
    const isHR = currentUser.roles.some((r) =>
      ["ROLE_HR_OFFICER", "ROLE_SYSADMIN"].includes(r)
    );
    if (!isOwner && !isHR) {
      throw new AppError(403, "FORBIDDEN", "Bạn không có quyền hủy đơn nghỉ phép của cán bộ khác.");
    }

    if (leave.status !== "PENDING") {
      throw new AppError(422, "INVALID_STATE", "Chỉ có thể hủy đơn khi đang chờ phê duyệt (PENDING).");
    }

    if (leave.workflowInstanceId) {
      await WorkflowService.cancelWorkflow(leave.workflowInstanceId, currentUser);
    } else {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.leaveRequest.updateMany({
          where: { id, status: "PENDING" },
          data: { status: "CANCELLED" },
        });
        if (updated.count === 0) {
          throw new AppError(409, "CONFLICT_STATE", "Đơn nghỉ phép đã được xử lý trước đó.");
        }
        if (leave.leaveType === "ANNUAL") {
          await LeaveLedgerService.releaseHold(
            leave.employeeId,
            Number(leave.totalDays),
            leave.id,
            getVnYearFromDate(leave.startDate),
            tx
          );
        }
      });
    }
  }

  /**
   * Lấy số dư phép năm cá nhân
   */
  public static async getMyLeaveBalance(currentUser: AuthUser): Promise<LeaveBalanceDto> {
    if (!currentUser.employeeId) {
      throw new AppError(403, "FORBIDDEN", "Tài khoản hiện tại chưa được gán hồ sơ nhân sự.");
    }
    return await LeaveLedgerService.getBalance(currentUser.employeeId, getCurrentVnYear());
  }

  /**
   * Lấy lịch sử biến động sổ cái ngày phép của cá nhân
   */
  public static async getMyLeaveLedger(
    currentUser: AuthUser,
    year = getCurrentVnYear()
  ): Promise<LeaveLedgerEntryDto[]> {
    if (!currentUser.employeeId) {
      throw new AppError(403, "FORBIDDEN", "Tài khoản hiện tại chưa được gán hồ sơ nhân sự.");
    }
    return await LeaveLedgerService.getLedgerHistory(currentUser.employeeId, year);
  }

  /**
   * Tạo đơn đăng ký công tác
   */
  public static async createTripRequest(
    currentUser: AuthUser,
    input: CreateTripRequestInput
  ): Promise<BusinessTripDto> {
    if (!currentUser.employeeId) {
      throw new AppError(403, "FORBIDDEN", "Tài khoản hiện tại chưa được gán hồ sơ nhân sự.");
    }

    const startDate = parseCalendarDate(input.startDate);
    const endDate = parseCalendarDate(input.endDate);
    validateDaysAgainstRange(startDate, endDate, input.totalDays);

    const employeeId = currentUser.employeeId;

    try {
      return await prisma.$transaction(async (tx) => {
        await lockEmployeeInTx(tx, employeeId);
        await assertNoOverlappingRequests(tx, employeeId, startDate, endDate);

        const trip = await tx.businessTripRequest.create({
          data: {
            employeeId,
            purpose: input.purpose,
            destination: input.destination,
            startDate,
            endDate,
            totalDays: input.totalDays,
            budgetEstimate: input.budgetEstimate || null,
            fundingSource: input.fundingSource || null,
            status: "PENDING",
          },
          include: {
            employee: { select: { fullName: true } },
          },
        });

        const wfInstanceId = await WorkflowService.startTripWorkflow(employeeId, trip.id, tx);

        return {
          id: trip.id,
          employeeId: trip.employeeId,
          employeeName: trip.employee.fullName,
          purpose: trip.purpose,
          destination: trip.destination,
          startDate: input.startDate,
          endDate: input.endDate,
          totalDays: Number(trip.totalDays),
          budgetEstimate: trip.budgetEstimate ? Number(trip.budgetEstimate) : null,
          fundingSource: trip.fundingSource,
          workflowInstanceId: wfInstanceId,
          status: trip.status as any,
          createdAt: trip.createdAt.toISOString(),
        };
      });
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối cơ sở dữ liệu.");
      }
      throw err;
    }
  }

  /**
   * Lấy danh sách các chuyến công tác của bản thân
   */
  public static async getMyTripRequests(currentUser: AuthUser): Promise<BusinessTripDto[]> {
    if (!currentUser.employeeId) {
      throw new AppError(403, "FORBIDDEN", "Tài khoản hiện tại chưa được gán hồ sơ nhân sự.");
    }

    try {
      const trips = await prisma.businessTripRequest.findMany({
        where: { employeeId: currentUser.employeeId },
        orderBy: { createdAt: "desc" },
        include: {
          employee: { select: { fullName: true } },
        },
      });

      return trips.map((t) => ({
        id: t.id,
        employeeId: t.employeeId,
        employeeName: t.employee.fullName,
        purpose: t.purpose,
        destination: t.destination,
        startDate: t.startDate.toISOString().split("T")[0],
        endDate: t.endDate.toISOString().split("T")[0],
        totalDays: Number(t.totalDays),
        budgetEstimate: t.budgetEstimate ? Number(t.budgetEstimate) : null,
        fundingSource: t.fundingSource,
        workflowInstanceId: t.workflowInstanceId || null,
        status: t.status as any,
        createdAt: t.createdAt.toISOString(),
      }));
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối cơ sở dữ liệu.");
      }
      throw err;
    }
  }

  /**
   * Lấy chi tiết chuyến công tác kèm theo tiến trình phê duyệt
   */
  public static async getTripRequestById(
    id: string,
    currentUser: AuthUser
  ): Promise<BusinessTripDetailDto> {
    try {
      const trip = await prisma.businessTripRequest.findUnique({
        where: { id },
        include: {
          employee: { select: { fullName: true } },
        },
      });

      if (!trip) {
        throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy chuyến công tác yêu cầu.");
      }

      const isOwner = trip.employeeId === currentUser.employeeId;
      const isGlobalHR = currentUser.roles.some((r) =>
        ["ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_SYSADMIN"].includes(r)
      );

      let isUnitHeadOfEmployee = false;
      if (currentUser.roles.includes("ROLE_UNIT_HEAD") && currentUser.unitsManaged && currentUser.unitsManaged.length > 0) {
        const assignment = await prisma.employmentAssignment.findFirst({
          where: { employeeId: trip.employeeId, assignmentType: "PRIMARY", status: "ACTIVE" },
        });
        if (assignment?.unitId && currentUser.unitsManaged.includes(assignment.unitId)) {
          isUnitHeadOfEmployee = true;
        }
      }

      if (!isOwner && !isGlobalHR && !isUnitHeadOfEmployee) {
        throw new AppError(403, "FORBIDDEN", "Bạn không có quyền xem thông tin chuyến công tác này.");
      }

      let workflowDetail;
      if (trip.workflowInstanceId) {
        workflowDetail = await WorkflowService.getInstanceDetails(trip.workflowInstanceId, currentUser);
      }

      return {
        id: trip.id,
        employeeId: trip.employeeId,
        employeeName: trip.employee.fullName,
        purpose: trip.purpose,
        destination: trip.destination,
        startDate: trip.startDate.toISOString().split("T")[0],
        endDate: trip.endDate.toISOString().split("T")[0],
        totalDays: Number(trip.totalDays),
        budgetEstimate: trip.budgetEstimate ? Number(trip.budgetEstimate) : null,
        fundingSource: trip.fundingSource,
        workflowInstanceId: trip.workflowInstanceId || null,
        status: trip.status as any,
        createdAt: trip.createdAt.toISOString(),
        workflow: workflowDetail,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (err.code === "P1001" || err.message?.includes("connect") || err.message?.includes("Can't reach database")) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối cơ sở dữ liệu.");
      }
      throw err;
    }
  }

  /**
   * Hủy đơn công tác (khi còn PENDING)
   */
  public static async cancelTripRequest(id: string, currentUser: AuthUser): Promise<void> {
    const trip = await prisma.businessTripRequest.findUnique({
      where: { id },
    });

    if (!trip) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy đơn công tác cần hủy.");
    }

    const isOwner = currentUser.employeeId === trip.employeeId;
    const isHR = currentUser.roles.some((r) =>
      ["ROLE_HR_OFFICER", "ROLE_SYSADMIN"].includes(r)
    );
    if (!isOwner && !isHR) {
      throw new AppError(403, "FORBIDDEN", "Bạn không có quyền hủy đơn công tác của cán bộ khác.");
    }

    if (trip.status !== "PENDING") {
      throw new AppError(422, "INVALID_STATE", "Chỉ có thể hủy đơn khi đang chờ phê duyệt (PENDING).");
    }

    if (trip.workflowInstanceId) {
      await WorkflowService.cancelWorkflow(trip.workflowInstanceId, currentUser);
    } else {
      const updated = await prisma.businessTripRequest.updateMany({
        where: { id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      if (updated.count === 0) {
        throw new AppError(409, "CONFLICT_STATE", "Đơn công tác đã được xử lý trước đó.");
      }
    }
  }
}
