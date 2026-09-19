import { prisma } from "@bahau/database";
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

    try {
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
      const wfInstanceId = await WorkflowService.startLeaveWorkflow(employeeId, leave.id, input.totalDays);

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
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (err.code === "P1001" || err.message?.includes("connect") || err.message?.includes("Can't reach database")) {
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
      if (err.code === "P1001" || err.message?.includes("connect") || err.message?.includes("Can't reach database")) {
        return [];
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

      // Kiểm tra quyền xem
      const isOwner = leave.employeeId === currentUser.employeeId;
      const isHR = currentUser.roles.some((r) =>
        ["ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_UNIT_HEAD", "ROLE_SYSADMIN"].includes(r)
      );

      if (!isOwner && !isHR) {
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

    if (leave.status !== "PENDING") {
      throw new AppError(422, "INVALID_STATE", "Chỉ có thể hủy đơn khi đang chờ phê duyệt (PENDING).");
    }

    if (leave.workflowInstanceId) {
      await WorkflowService.cancelWorkflow(leave.workflowInstanceId, currentUser);
    } else {
      await prisma.leaveRequest.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      if (leave.leaveType === "ANNUAL") {
        await LeaveLedgerService.releaseHold(leave.employeeId, Number(leave.totalDays), leave.id);
      }
    }
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
   * Lấy lịch sử biến động sổ cái ngày phép của cá nhân
   */
  public static async getMyLeaveLedger(
    currentUser: AuthUser,
    year = new Date().getFullYear()
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

    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);

    if (endDate < startDate) {
      throw new AppError(422, "INVALID_DATE_RANGE", "Ngày kết thúc không được nhỏ hơn ngày bắt đầu.");
    }

    const employeeId = currentUser.employeeId;

    try {
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

      const wfInstanceId = await WorkflowService.startTripWorkflow(employeeId, trip.id);

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
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (err.code === "P1001" || err.message?.includes("connect") || err.message?.includes("Can't reach database")) {
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
      if (err.code === "P1001" || err.message?.includes("connect") || err.message?.includes("Can't reach database")) {
        return [];
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
      const isHR = currentUser.roles.some((r) =>
        ["ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_UNIT_HEAD", "ROLE_SYSADMIN"].includes(r)
      );

      if (!isOwner && !isHR) {
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

    if (trip.status !== "PENDING") {
      throw new AppError(422, "INVALID_STATE", "Chỉ có thể hủy đơn khi đang chờ phê duyệt (PENDING).");
    }

    if (trip.workflowInstanceId) {
      await WorkflowService.cancelWorkflow(trip.workflowInstanceId, currentUser);
    } else {
      await prisma.businessTripRequest.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
    }
  }
}
