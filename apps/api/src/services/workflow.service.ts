import { prisma } from "@bahau/database";
import { AppError } from "../middlewares/error.middleware.js";
import { LeaveLedgerService } from "./leave-ledger.service.js";
import type { AuthUser, PendingWorkflowTaskDto } from "@bahau/contracts";

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

    // 3. Khởi tạo các bước phê duyệt
    if (isHeadOfUnit) {
      // Trường hợp người gửi là Lãnh đạo đơn vị -> Leo thang lên Ban Giám hiệu
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
  }

  /**
   * Khởi tạo quy trình phê duyệt Công tác
   */
  public static async startTripWorkflow(
    requesterEmployeeId: string,
    tripRequestId: string
  ): Promise<string> {
    const instance = await prisma.workflowInstance.create({
      data: {
        module: "BUSINESS_TRIP",
        recordId: tripRequestId,
        requesterEmployeeId,
        currentStepIndex: 0,
        status: "PENDING",
      },
    });

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

    await prisma.businessTripRequest.update({
      where: { id: tripRequestId },
      data: { workflowInstanceId: instance.id },
    });

    return instance.id;
  }

  /**
   * Lấy danh sách các công việc đang chờ người dùng hiện tại xử lý
   */
  public static async getPendingTasks(currentUser: AuthUser): Promise<PendingWorkflowTaskDto[]> {
    const userEmployeeId = currentUser.employeeId;
    const userRoles = currentUser.roles;

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
  }

  /**
   * Phê duyệt bước hiện tại trong quy trình
   */
  public static async approveStep(stepId: string, currentUser: AuthUser, comment?: string): Promise<void> {
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
      }
    }
  }

  /**
   * Từ chối đơn trong quy trình
   */
  public static async rejectStep(stepId: string, currentUser: AuthUser, reason: string): Promise<void> {
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
    }
  }
}
