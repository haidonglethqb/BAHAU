import { prisma } from "@bahau/database";
import { AppError } from "../middlewares/error.middleware.js";
import { LeaveLedgerService } from "./leave-ledger.service.js";
import { WorkflowService } from "./workflow.service.js";
import type {
  AuthUser,
  CreateLeaveRequestInput,
  LeaveRequestDto,
  LeaveBalanceDto,
  CreateTripRequestInput,
  BusinessTripDto,
} from "@bahau/contracts";

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

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (endDate < startDate) {
      throw new AppError(422, "INVALID_DATE_RANGE", "Ngày kết thúc không được nhỏ hơn ngày bắt đầu.");
    }

    const employeeId = currentUser.employeeId;

    // 1. Kiểm tra số dư phép nếu là nghỉ phép năm
    if (input.leaveType === "ANNUAL") {
      const balance = await LeaveLedgerService.getBalance(employeeId);
      if (balance.remaining < input.totalDays) {
        throw new AppError(
          422,
          "INSUFFICIENT_LEAVE_BALANCE",
          `Số dư phép năm không đủ. Bạn còn ${balance.remaining} ngày nhưng xin nghỉ ${input.totalDays} ngày.`
        );
      }
    }

    // 2. Tạo bản ghi đơn nghỉ phép
    const leave = await prisma.leaveRequest.create({
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

    // 3. Nếu là phép năm -> Ghi nhận TẠM GIỮ trên Sổ cái (HOLD)
    if (input.leaveType === "ANNUAL") {
      await LeaveLedgerService.recordHold(employeeId, input.totalDays, leave.id);
    }

    // 4. Kích hoạt chuỗi Workflow phê duyệt phân cấp
    await WorkflowService.startLeaveWorkflow(employeeId, leave.id, input.totalDays);

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
      status: leave.status as any,
      createdAt: leave.createdAt.toISOString(),
    };
  }

  /**
   * Lấy danh sách các đơn nghỉ phép của bản thân
   */
  public static async getMyLeaveRequests(currentUser: AuthUser): Promise<LeaveRequestDto[]> {
    if (!currentUser.employeeId) {
      throw new AppError(403, "FORBIDDEN", "Tài khoản hiện tại chưa được gán hồ sơ nhân sự.");
    }

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
      status: l.status as any,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  /**
   * Lấy số dư phép năm cá nhân
   */
  public static async getMyLeaveBalance(currentUser: AuthUser): Promise<LeaveBalanceDto> {
    if (!currentUser.employeeId) {
      throw new AppError(403, "FORBIDDEN", "Tài khoản hiện tại chưa được gán hồ sơ nhân sự.");
    }
    return await LeaveLedgerService.getBalance(currentUser.employeeId);
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

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (endDate < startDate) {
      throw new AppError(422, "INVALID_DATE_RANGE", "Ngày kết thúc không được nhỏ hơn ngày bắt đầu.");
    }

    const employeeId = currentUser.employeeId;

    const trip = await prisma.businessTripRequest.create({
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

    await WorkflowService.startTripWorkflow(employeeId, trip.id);

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
      status: trip.status as any,
      createdAt: trip.createdAt.toISOString(),
    };
  }

  /**
   * Lấy danh sách các chuyến công tác của bản thân
   */
  public static async getMyTripRequests(currentUser: AuthUser): Promise<BusinessTripDto[]> {
    if (!currentUser.employeeId) {
      throw new AppError(403, "FORBIDDEN", "Tài khoản hiện tại chưa được gán hồ sơ nhân sự.");
    }

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
      status: t.status as any,
      createdAt: t.createdAt.toISOString(),
    }));
  }
}
