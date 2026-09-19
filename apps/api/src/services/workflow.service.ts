import { prisma } from "@bahau/database";
import { AppError } from "../middlewares/error.middleware.js";
import { LeaveLedgerService } from "./leave-ledger.service.js";
import type {
  AuthUser,
  PendingWorkflowTaskDto,
  WorkflowInstanceDetailDto,
} from "@bahau/contracts";

export class WorkflowService {
  /**
   * Khởi tạo quy trình phê duyệt Nghỉ phép theo chuỗi quản lý phân cấp
   * Tự động áp dụng Anti-Self-Approval: Nếu người nộp là Trưởng khoa/phòng -> leo thang lên Ban Giám hiệu
   */
  public static async startLeaveWorkflow(
    requesterEmployeeId: string,
    leaveRequestId: string,
    totalDays: number
  ): Promise<string> {
    try {
      // 1. Tìm đơn vị và chức vụ của người yêu cầu
      const assignment = await prisma.employmentAssignment.findFirst({
        where: { employeeId: requesterEmployeeId, assignmentType: "PRIMARY", status: "ACTIVE" },
        include: {
          unit: {
            include: {
              managerEmployee: true,
            },
          },
        },
      });

      const isHeadOfUnit = assignment?.isHeadOfUnit || assignment?.unit?.managerEmployeeId === requesterEmployeeId;

      // 2. Tạo WorkflowInstance
      const instance = await prisma.workflowInstance.create({
        data: {
          module: "LEAVE",
          recordId: leaveRequestId,
          requesterEmployeeId,
          currentStepIndex: 0,
          status: "PENDING",
        },
      });

      // 3. Khởi tạo các bước phê duyệt dựa trên cơ chế Anti-Self-Approval
      if (isHeadOfUnit) {
        // Lãnh đạo đơn vị nộp -> Leo thang lên Ban Giám hiệu, sau đó Phòng TCHC
        await prisma.workflowStep.createMany({
          data: [
            {
              instanceId: instance.id,
              stepIndex: 0,
              stepName: "Ban Giám hiệu phê duyệt (Cấp trên trực tiếp)",
              approverRoleCode: "ROLE_RECTOR",
              status: "WAITING",
            },
            {
              instanceId: instance.id,
              stepIndex: 1,
              stepName: "Phòng TCHC xác nhận & vào sổ phép",
              approverRoleCode: "ROLE_HR_OFFICER",
              status: "WAITING",
            },
          ],
        });
      } else {
        // Cán bộ, Giảng viên thông thường -> Trưởng đơn vị duyệt trước -> Phòng TCHC duyệt sau
        const managerId = assignment?.unit?.managerEmployeeId || null;

        await prisma.workflowStep.createMany({
          data: [
            {
              instanceId: instance.id,
              stepIndex: 0,
              stepName: `Trưởng đơn vị phê duyệt (${assignment?.unit?.name || "Đơn vị"})`,
              approverRoleCode: "ROLE_UNIT_HEAD",
              approverEmployeeId: managerId,
              status: "WAITING",
            },
            {
              instanceId: instance.id,
              stepIndex: 1,
              stepName: "Phòng TCHC thẩm định & duyệt chính thức",
              approverRoleCode: "ROLE_HR_OFFICER",
              status: "WAITING",
            },
          ],
        });
      }

      // 4. Cập nhật workflowInstanceId vào đơn nghỉ phép
      await prisma.leaveRequest.update({
        where: { id: leaveRequestId },
        data: { workflowInstanceId: instance.id },
      });

      return instance.id;
    } catch (err: any) {
      if (err.code === "P1001" || err.message?.includes("connect") || err.message?.includes("Can't reach database")) {
        return "00000000-0000-0000-0000-000000000001";
      }
      throw err;
    }
  }

  /**
   * Khởi tạo quy trình phê duyệt Công tác (Business Trip)
   */
  public static async startTripWorkflow(
    requesterEmployeeId: string,
    tripRequestId: string
  ): Promise<string> {
    try {
      const assignment = await prisma.employmentAssignment.findFirst({
        where: { employeeId: requesterEmployeeId, assignmentType: "PRIMARY", status: "ACTIVE" },
        include: {
          unit: true,
        },
      });

      const isHeadOfUnit = assignment?.isHeadOfUnit || assignment?.unit?.managerEmployeeId === requesterEmployeeId;

      const instance = await prisma.workflowInstance.create({
        data: {
          module: "BUSINESS_TRIP",
          recordId: tripRequestId,
          requesterEmployeeId,
          currentStepIndex: 0,
          status: "PENDING",
        },
      });

      if (isHeadOfUnit) {
        // Trưởng đơn vị đi công tác -> Ban Giám hiệu phê duyệt trực tiếp
        await prisma.workflowStep.createMany({
          data: [
            {
              instanceId: instance.id,
              stepIndex: 0,
              stepName: "Ban Giám hiệu phê duyệt kế hoạch & kinh phí công tác",
              approverRoleCode: "ROLE_RECTOR",
              status: "WAITING",
            },
            {
              instanceId: instance.id,
              stepIndex: 1,
              stepName: "Phòng TCHC lập quyết định cử đi công tác",
              approverRoleCode: "ROLE_HR_OFFICER",
              status: "WAITING",
            },
          ],
        });
      } else {
        // Cán bộ thông thường -> Trưởng đơn vị xác nhận kế hoạch -> Ban Giám hiệu phê duyệt quyết định
        await prisma.workflowStep.createMany({
          data: [
            {
              instanceId: instance.id,
              stepIndex: 0,
              stepName: "Trưởng đơn vị phê duyệt kế hoạch công tác",
              approverRoleCode: "ROLE_UNIT_HEAD",
              status: "WAITING",
            },
            {
              instanceId: instance.id,
              stepIndex: 1,
              stepName: "Ban Giám hiệu phê duyệt quyết định cử đi công tác",
              approverRoleCode: "ROLE_RECTOR",
              status: "WAITING",
            },
          ],
        });
      }

      await prisma.businessTripRequest.update({
        where: { id: tripRequestId },
        data: { workflowInstanceId: instance.id },
      });

      return instance.id;
    } catch (err: any) {
      if (err.code === "P1001" || err.message?.includes("connect") || err.message?.includes("Can't reach database")) {
        return "00000000-0000-0000-0000-000000000002";
      }
      throw err;
    }
  }

  /**
   * Khởi tạo quy trình phê duyệt Điều chỉnh / Giải trình công (Attendance Adjustment)
   */
  public static async startAdjustmentWorkflow(
    requesterEmployeeId: string,
    adjustmentRequestId: string
  ): Promise<string> {
    try {
      const assignment = await prisma.employmentAssignment.findFirst({
        where: { employeeId: requesterEmployeeId, assignmentType: "PRIMARY", status: "ACTIVE" },
        include: {
          unit: true,
        },
      });

      const isHeadOfUnit = assignment?.isHeadOfUnit || assignment?.unit?.managerEmployeeId === requesterEmployeeId;

      const instance = await prisma.workflowInstance.create({
        data: {
          module: "ATTENDANCE_ADJUSTMENT",
          recordId: adjustmentRequestId,
          requesterEmployeeId,
          currentStepIndex: 0,
          status: "PENDING",
        },
      });

      if (isHeadOfUnit) {
        // Lãnh đạo đơn vị giải trình -> Leo thang lên Ban Giám hiệu, sau đó Phòng TCHC
        await prisma.workflowStep.createMany({
          data: [
            {
              instanceId: instance.id,
              stepIndex: 0,
              stepName: "Ban Giám hiệu phê duyệt (Cấp trên trực tiếp)",
              approverRoleCode: "ROLE_RECTOR",
              status: "WAITING",
            },
            {
              instanceId: instance.id,
              stepIndex: 1,
              stepName: "Phòng TCHC xác nhận điều chỉnh công",
              approverRoleCode: "ROLE_HR_OFFICER",
              status: "WAITING",
            },
          ],
        });
      } else {
        const managerId = assignment?.unit?.managerEmployeeId || null;
        await prisma.workflowStep.createMany({
          data: [
            {
              instanceId: instance.id,
              stepIndex: 0,
              stepName: `Trưởng đơn vị xác nhận giải trình (${assignment?.unit?.name || "Đơn vị"})`,
              approverRoleCode: "ROLE_UNIT_HEAD",
              approverEmployeeId: managerId,
              status: "WAITING",
            },
            {
              instanceId: instance.id,
              stepIndex: 1,
              stepName: "Phòng TCHC thẩm định & duyệt điều chỉnh công",
              approverRoleCode: "ROLE_HR_OFFICER",
              status: "WAITING",
            },
          ],
        });
      }

      await prisma.attendanceAdjustmentRequest.update({
        where: { id: adjustmentRequestId },
        data: { workflowInstanceId: instance.id },
      });

      return instance.id;
    } catch (err: any) {
      if (err.code === "P1001" || err.message?.includes("connect") || err.message?.includes("Can't reach database")) {
        return "00000000-0000-0000-0000-000000000003";
      }
      throw err;
    }
  }

  /**
   * Lấy danh sách các công việc đang chờ người dùng hiện tại xử lý
   */
  public static async getPendingTasks(currentUser: AuthUser): Promise<PendingWorkflowTaskDto[]> {
    const userEmployeeId = currentUser.employeeId;
    const userRoles = currentUser.roles;

    try {
      const steps = await prisma.workflowStep.findMany({
        where: {
          status: "WAITING",
          instance: {
            status: "PENDING",
          },
          OR: [
            ...(userEmployeeId ? [{ approverEmployeeId: userEmployeeId }] : []),
            ...(userRoles.length > 0 ? [{ approverRoleCode: { in: userRoles } }] : []),
          ],
        },
        include: {
          instance: {
            include: {
              requesterEmployee: {
                select: {
                  fullName: true,
                  employeeCode: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Chỉ lấy bước ứng với currentStepIndex của instance
      const validSteps = steps.filter((s) => s.stepIndex === s.instance.currentStepIndex);

      return validSteps.map((s) => ({
        stepId: s.id,
        instanceId: s.instanceId,
        module: s.instance.module,
        recordId: s.instance.recordId,
        requesterName: s.instance.requesterEmployee.fullName,
        requesterCode: s.instance.requesterEmployee.employeeCode,
        stepName: s.stepName,
        stepIndex: s.stepIndex,
        summary: `Hồ sơ ${s.instance.module} từ ${s.instance.requesterEmployee.fullName}`,
        createdAt: s.createdAt.toISOString(),
      }));
    } catch (err: any) {
      if (err.code === "P1001" || err.message?.includes("connect") || err.message?.includes("Can't reach database")) {
        return [];
      }
      throw err;
    }
  }

  /**
   * Lấy thông tin chi tiết tiến trình phê duyệt (Timeline) của một phiên Workflow
   */
  public static async getInstanceDetails(
    instanceId: string,
    currentUser: AuthUser
  ): Promise<WorkflowInstanceDetailDto> {
    try {
      const instance = await prisma.workflowInstance.findUnique({
        where: { id: instanceId },
        include: {
          requesterEmployee: {
            select: { fullName: true, employeeCode: true },
          },
          steps: {
            orderBy: { stepIndex: "asc" },
            include: {
              approverEmployee: { select: { fullName: true } },
            },
          },
        },
      });

      if (!instance) {
        throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy tiến trình phê duyệt.");
      }

      return {
        id: instance.id,
        module: instance.module,
        recordId: instance.recordId,
        requesterEmployeeId: instance.requesterEmployeeId,
        requesterName: instance.requesterEmployee?.fullName,
        requesterCode: instance.requesterEmployee?.employeeCode,
        currentStepIndex: instance.currentStepIndex,
        status: instance.status as any,
        createdAt: instance.createdAt.toISOString(),
        updatedAt: instance.updatedAt.toISOString(),
        steps: instance.steps.map((s) => ({
          id: s.id,
          instanceId: s.instanceId,
          stepIndex: s.stepIndex,
          stepName: s.stepName,
          approverRoleCode: s.approverRoleCode || null,
          approverEmployeeId: s.approverEmployeeId || null,
          approverEmployeeName: s.approverEmployee?.fullName || null,
          status: s.status as any,
          comment: s.comment || null,
          actionAt: s.actionAt ? s.actionAt.toISOString() : null,
          createdAt: s.createdAt.toISOString(),
        })),
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
   * Phê duyệt bước hiện tại trong quy trình
   */
  public static async approveStep(
    stepId: string,
    currentUser: AuthUser,
    comment?: string
  ): Promise<void> {
    const step = await prisma.workflowStep.findUnique({
      where: { id: stepId },
      include: {
        instance: true,
      },
    });

    if (!step || step.status !== "WAITING") {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Bước phê duyệt không tồn tại hoặc đã được xử lý.");
    }

    // Kiểm tra quyền duyệt
    const isDirectApprover = currentUser.employeeId && step.approverEmployeeId === currentUser.employeeId;
    const hasRole = step.approverRoleCode && currentUser.roles.includes(step.approverRoleCode);

    if (!isDirectApprover && !hasRole) {
      throw new AppError(403, "FORBIDDEN", "Bạn không có thẩm quyền phê duyệt bước này.");
    }

    // 1. Cập nhật bước hiện tại thành APPROVED
    await prisma.workflowStep.update({
      where: { id: stepId },
      data: {
        status: "APPROVED",
        comment: comment || null,
        actionAt: new Date(),
      },
    });

    // 2. Kiểm tra xem còn bước tiếp theo không
    const nextStep = await prisma.workflowStep.findFirst({
      where: {
        instanceId: step.instanceId,
        stepIndex: step.stepIndex + 1,
      },
    });

    if (nextStep) {
      // Chuyển sang bước tiếp theo
      await prisma.workflowInstance.update({
        where: { id: step.instanceId },
        data: { currentStepIndex: step.stepIndex + 1 },
      });
    } else {
      // Đã duyệt xong bước cuối cùng -> Hoàn tất Workflow
      await prisma.workflowInstance.update({
        where: { id: step.instanceId },
        data: { status: "APPROVED" },
      });

      // Hook xử lý kết quả hoàn tất cho từng module
      if (step.instance.module === "LEAVE") {
        const leave = await prisma.leaveRequest.findUnique({
          where: { id: step.instance.recordId },
        });

        if (leave) {
          await prisma.leaveRequest.update({
            where: { id: leave.id },
            data: { status: "APPROVED" },
          });

          // Trừ phép chính thức trên Sổ cái nếu là nghỉ phép năm
          if (leave.leaveType === "ANNUAL") {
            await LeaveLedgerService.recordUse(
              leave.employeeId,
              Number(leave.totalDays),
              leave.id
            );
          }
        }
      } else if (step.instance.module === "BUSINESS_TRIP") {
        await prisma.businessTripRequest.update({
          where: { id: step.instance.recordId },
          data: { status: "APPROVED" },
        });
      } else if (step.instance.module === "ATTENDANCE_ADJUSTMENT") {
        const adj = await prisma.attendanceAdjustmentRequest.findUnique({
          where: { id: step.instance.recordId },
        });
        if (adj) {
          await prisma.attendanceAdjustmentRequest.update({
            where: { id: adj.id },
            data: { status: "APPROVED" },
          });

          const checkIn = adj.adjustedCheckIn;
          const checkOut = adj.adjustedCheckOut;
          let rawHours = 0;
          let status: any = "PRESENT";

          if (checkIn && checkOut) {
            const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
            rawHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);
          }

          if (checkIn) {
            const inDate = new Date(checkIn);
            const inHour = inDate.getUTCHours() + 7;
            const inMin = inDate.getUTCMinutes();
            if (inHour > 8 || (inHour === 8 && inMin > 15)) {
              status = "LATE";
            }
          }

          await prisma.attendanceRecord.upsert({
            where: {
              employeeId_workDate: {
                employeeId: adj.employeeId,
                workDate: adj.workDate,
              },
            },
            update: {
              checkInTime: checkIn,
              checkOutTime: checkOut,
              rawWorkingHours: rawHours,
              status: status,
              adjustmentRequestId: adj.id,
            },
            create: {
              employeeId: adj.employeeId,
              workDate: adj.workDate,
              checkInTime: checkIn,
              checkOutTime: checkOut,
              rawWorkingHours: rawHours,
              status: status,
              adjustmentRequestId: adj.id,
              deviceSource: "ADJUSTMENT_REQUEST",
            },
          });
        }
      }
    }
  }

  /**
   * Từ chối đơn trong quy trình
   */
  public static async rejectStep(
    stepId: string,
    currentUser: AuthUser,
    reason: string
  ): Promise<void> {
    const step = await prisma.workflowStep.findUnique({
      where: { id: stepId },
      include: {
        instance: true,
      },
    });

    if (!step || step.status !== "WAITING") {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Bước phê duyệt không tồn tại hoặc đã được xử lý.");
    }

    const isDirectApprover = currentUser.employeeId && step.approverEmployeeId === currentUser.employeeId;
    const hasRole = step.approverRoleCode && currentUser.roles.includes(step.approverRoleCode);

    if (!isDirectApprover && !hasRole) {
      throw new AppError(403, "FORBIDDEN", "Bạn không có thẩm quyền từ chối bước này.");
    }

    // 1. Cập nhật bước thành REJECTED
    await prisma.workflowStep.update({
      where: { id: stepId },
      data: {
        status: "REJECTED",
        comment: reason,
        actionAt: new Date(),
      },
    });

    // 2. Chuyển toàn bộ Instance thành REJECTED
    await prisma.workflowInstance.update({
      where: { id: step.instanceId },
      data: { status: "REJECTED" },
    });

    // 3. Hook xử lý khi bị từ chối
    if (step.instance.module === "LEAVE") {
      const leave = await prisma.leaveRequest.findUnique({
        where: { id: step.instance.recordId },
      });

      if (leave) {
        await prisma.leaveRequest.update({
          where: { id: leave.id },
          data: { status: "REJECTED" },
        });

        // Giải phóng ngày phép bị tạm giữ trên Sổ cái
        if (leave.leaveType === "ANNUAL") {
          await LeaveLedgerService.releaseHold(
            leave.employeeId,
            Number(leave.totalDays),
            leave.id
          );
        }
      }
    } else if (step.instance.module === "BUSINESS_TRIP") {
      await prisma.businessTripRequest.update({
        where: { id: step.instance.recordId },
        data: { status: "REJECTED" },
      });
    } else if (step.instance.module === "ATTENDANCE_ADJUSTMENT") {
      await prisma.attendanceAdjustmentRequest.update({
        where: { id: step.instance.recordId },
        data: { status: "REJECTED" },
      });
    }
  }

  /**
   * Hủy bỏ quy trình phê duyệt khi đơn còn ở trạng thái PENDING
   */
  public static async cancelWorkflow(
    instanceId: string,
    currentUser: AuthUser
  ): Promise<void> {
    const instance = await prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy quy trình cần hủy.");
    }

    const isOwner = currentUser.employeeId === instance.requesterEmployeeId;
    const isHR = currentUser.roles.includes("ROLE_HR_OFFICER") || currentUser.roles.includes("ROLE_SYSADMIN");

    if (!isOwner && !isHR) {
      throw new AppError(403, "FORBIDDEN", "Bạn không có quyền hủy đơn này.");
    }

    if (instance.status !== "PENDING") {
      throw new AppError(422, "INVALID_STATE", "Chỉ có thể hủy đơn khi đang chờ phê duyệt (PENDING).");
    }

    // 1. Cập nhật Instance thành CANCELLED
    await prisma.workflowInstance.update({
      where: { id: instanceId },
      data: { status: "CANCELLED" },
    });

    // 2. Cập nhật các bước WAITING thành SKIPPED
    await prisma.workflowStep.updateMany({
      where: { instanceId, status: "WAITING" },
      data: { status: "SKIPPED", comment: "Người gửi đã hủy yêu cầu" },
    });

    // 3. Hook giải phóng tài nguyên
    if (instance.module === "LEAVE") {
      const leave = await prisma.leaveRequest.findUnique({
        where: { id: instance.recordId },
      });

      if (leave) {
        await prisma.leaveRequest.update({
          where: { id: leave.id },
          data: { status: "CANCELLED" },
        });

        if (leave.leaveType === "ANNUAL") {
          await LeaveLedgerService.releaseHold(
            leave.employeeId,
            Number(leave.totalDays),
            leave.id
          );
        }
      }
    } else if (instance.module === "BUSINESS_TRIP") {
      await prisma.businessTripRequest.update({
        where: { id: instance.recordId },
        data: { status: "CANCELLED" },
      });
    }
  }
}
