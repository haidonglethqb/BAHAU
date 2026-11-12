import { prisma, Prisma } from "@bahau/database";
import { AppError } from "../middlewares/error.middleware.js";
import { AttendanceService } from "./attendance.service.js";
import { LeaveLedgerService } from "./leave-ledger.service.js";
import { UnitService } from "./unit.service.js";
import type {
  AuthUser,
  PendingWorkflowTaskDto,
  WorkflowInstanceDetailDto,
} from "@bahau/contracts";

export type WorkflowDbClient = Prisma.TransactionClient | typeof prisma;

function isDbConnectionError(err: any): boolean {
  return Boolean(
    err?.code === "P1001" ||
      err?.code === "P1002" ||
      err?.code === "P1008" ||
      err?.message?.includes("connect") ||
      err?.message?.includes("Can't reach database")
  );
}

function getVnDateParts(date: Date): { year: number; month: number; day: number } {
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return {
    year: vn.getUTCFullYear(),
    month: vn.getUTCMonth() + 1,
    day: vn.getUTCDate(),
  };
}

export class WorkflowService {
  /** Mở rộng danh sách đơn vị quản lý trực tiếp sang toàn bộ cây đơn vị con */
  private static async getExpandedManagedUnitIds(unitsManaged?: string[]): Promise<Set<string>> {
    const managedSet = new Set<string>();
    if (!unitsManaged || unitsManaged.length === 0) return managedSet;

    const unitTrees = await Promise.all(
      Array.from(new Set(unitsManaged)).map((uid) => UnitService.getDescendantUnitIds(uid))
    );
    for (const tree of unitTrees) {
      for (const id of tree) managedSet.add(id);
    }
    return managedSet;
  }

  /** Lấy danh sách đơn vị đang công tác (gồm cả kiêm nhiệm CONCURRENT và chính thức PRIMARY) */
  private static async getEmployeeActiveUnitIds(
    employeeId: string,
    db: WorkflowDbClient = prisma
  ): Promise<string[]> {
    const assignments = await db.employmentAssignment.findMany({
      where: {
        employeeId,
        assignmentType: { in: ["PRIMARY", "CONCURRENT"] },
        status: "ACTIVE",
      },
      select: { unitId: true },
    });
    return Array.from(new Set(assignments.map((a) => a.unitId)));
  }

  /** Xác định luồng phê duyệt bước 0 dựa trên PRIMARY + CONCURRENT và leo thang cây parentId nếu thiếu trưởng đơn vị */
  private static async resolveRequesterRouting(
    requesterEmployeeId: string,
    db: WorkflowDbClient = prisma
  ): Promise<{
    isHeadOfUnit: boolean;
    unitName: string;
    approverRoleCode: "ROLE_UNIT_HEAD" | "ROLE_RECTOR";
    approverEmployeeId: string | null;
  }> {
    const activeAssignments = await db.employmentAssignment.findMany({
      where: {
        employeeId: requesterEmployeeId,
        assignmentType: { in: ["PRIMARY", "CONCURRENT"] },
        status: "ACTIVE",
      },
      include: {
        unit: {
          select: {
            id: true,
            name: true,
            unitType: true,
            parentId: true,
            managerEmployeeId: true,
          },
        },
      },
    });

    const isHeadOfUnit = activeAssignments.some(
      (a) => a.isHeadOfUnit || a.unit?.managerEmployeeId === requesterEmployeeId
    );
    const baseAssignment =
      activeAssignments.find((a) => a.assignmentType === "PRIMARY") || activeAssignments[0] || null;
    const unitName = baseAssignment?.unit?.name || "Đơn vị";

    if (isHeadOfUnit) {
      return {
        isHeadOfUnit: true,
        unitName,
        approverRoleCode: "ROLE_RECTOR",
        approverEmployeeId: null,
      };
    }

    // Duyệt lên cây parentId khi đơn vị hiện tại chưa bổ nhiệm trưởng đơn vị (managerEmployeeId = null)
    let currentUnit: {
      id: string;
      name: string;
      unitType: string;
      parentId: string | null;
      managerEmployeeId: string | null;
    } | null = baseAssignment?.unit || null;
    const visited = new Set<string>();
    while (currentUnit && !visited.has(currentUnit.id)) {
      visited.add(currentUnit.id);
      if (currentUnit.managerEmployeeId && currentUnit.managerEmployeeId !== requesterEmployeeId) {
        return {
          isHeadOfUnit: false,
          unitName,
          approverRoleCode: currentUnit.unitType === "BOARD" ? "ROLE_RECTOR" : "ROLE_UNIT_HEAD",
          approverEmployeeId: currentUnit.managerEmployeeId,
        };
      }
      if (!currentUnit.parentId) break;
      currentUnit = await db.organizationalUnit.findUnique({
        where: { id: currentUnit.parentId },
        select: {
          id: true,
          name: true,
          unitType: true,
          parentId: true,
          managerEmployeeId: true,
        },
      });
    }

    return {
      isHeadOfUnit: false,
      unitName,
      approverRoleCode: "ROLE_RECTOR",
      approverEmployeeId: null,
    };
  }

  /** Kiểm tra thẩm quyền phê duyệt / từ chối bước theo vai trò và cây đơn vị quản lý */
  private static async assertCanActOnStep(
    step: {
      approverEmployeeId: string | null;
      approverRoleCode: string | null;
      instance: { requesterEmployeeId: string };
    },
    currentUser: AuthUser,
    actionDeniedMessage: string,
    db: WorkflowDbClient = prisma
  ): Promise<void> {
    const isGlobalHR = currentUser.roles.some((r) =>
      ["ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_SYSADMIN"].includes(r)
    );
    const isDirectApprover = Boolean(
      currentUser.employeeId && step.approverEmployeeId === currentUser.employeeId
    );
    const hasRole = Boolean(
      step.approverRoleCode && currentUser.roles.includes(step.approverRoleCode)
    );

    if (!isDirectApprover && !hasRole) {
      throw new AppError(403, "FORBIDDEN", actionDeniedMessage);
    }

    if (step.approverRoleCode === "ROLE_UNIT_HEAD" && !isDirectApprover && !isGlobalHR) {
      const [managedUnitIds, requesterUnitIds] = await Promise.all([
        this.getExpandedManagedUnitIds(currentUser.unitsManaged),
        this.getEmployeeActiveUnitIds(step.instance.requesterEmployeeId, db),
      ]);
      const isManaged = requesterUnitIds.some((uid) => managedUnitIds.has(uid));
      if (!isManaged) {
        throw new AppError(403, "FORBIDDEN", "Bạn không có thẩm quyền quản lý đơn vị của cán bộ này.");
      }
    }
  }
  /**
   * Khởi tạo quy trình phê duyệt Nghỉ phép theo chuỗi quản lý phân cấp
   * Tự động áp dụng Anti-Self-Approval: Nếu người nộp là Trưởng khoa/phòng -> leo thang lên Ban Giám hiệu
   */
  public static async startLeaveWorkflow(
    requesterEmployeeId: string,
    leaveRequestId: string,
    totalDays: number,
    db: WorkflowDbClient = prisma
  ): Promise<string> {
    try {
      // 1. Tìm đơn vị và chuỗi phê duyệt phân cấp của người yêu cầu
      const routing = await this.resolveRequesterRouting(requesterEmployeeId, db);

      // 2. Tạo WorkflowInstance
      const instance = await db.workflowInstance.create({
        data: {
          module: "LEAVE",
          recordId: leaveRequestId,
          requesterEmployeeId,
          currentStepIndex: 0,
          status: "PENDING",
        },
      });

      // 3. Khởi tạo các bước phê duyệt dựa trên cơ chế Anti-Self-Approval & leo thang cây đơn vị
      if (routing.isHeadOfUnit) {
        // Lãnh đạo đơn vị nộp -> Leo thang lên Ban Giám hiệu, sau đó Phòng TCHC
        await db.workflowStep.createMany({
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
        const step0Name =
          routing.approverRoleCode === "ROLE_RECTOR"
            ? `Ban Giám hiệu phê duyệt (${routing.unitName})`
            : `Trưởng đơn vị phê duyệt (${routing.unitName})`;

        await db.workflowStep.createMany({
          data: [
            {
              instanceId: instance.id,
              stepIndex: 0,
              stepName: step0Name.slice(0, 100),
              approverRoleCode: routing.approverRoleCode,
              approverEmployeeId: routing.approverEmployeeId,
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
      await db.leaveRequest.update({
        where: { id: leaveRequestId },
        data: { workflowInstanceId: instance.id },
      });

      return instance.id;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối cơ sở dữ liệu.");
      }
      throw err;
    }
  }

  /**
   * Khởi tạo quy trình phê duyệt Công tác (Business Trip)
   */
  public static async startTripWorkflow(
    requesterEmployeeId: string,
    tripRequestId: string,
    db: WorkflowDbClient = prisma
  ): Promise<string> {
    try {
      const routing = await this.resolveRequesterRouting(requesterEmployeeId, db);

      const instance = await db.workflowInstance.create({
        data: {
          module: "BUSINESS_TRIP",
          recordId: tripRequestId,
          requesterEmployeeId,
          currentStepIndex: 0,
          status: "PENDING",
        },
      });

      if (routing.isHeadOfUnit) {
        // Trưởng đơn vị đi công tác -> Ban Giám hiệu phê duyệt trực tiếp
        await db.workflowStep.createMany({
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
        // Cán bộ thông thường -> Trưởng đơn vị (hoặc cấp trên khi khuyết trưởng) -> Ban Giám hiệu phê duyệt quyết định
        const step0Name =
          routing.approverRoleCode === "ROLE_RECTOR"
            ? "Ban Giám hiệu phê duyệt kế hoạch công tác"
            : "Trưởng đơn vị phê duyệt kế hoạch công tác";

        await db.workflowStep.createMany({
          data: [
            {
              instanceId: instance.id,
              stepIndex: 0,
              stepName: step0Name,
              approverRoleCode: routing.approverRoleCode,
              approverEmployeeId: routing.approverEmployeeId,
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

      await db.businessTripRequest.update({
        where: { id: tripRequestId },
        data: { workflowInstanceId: instance.id },
      });

      return instance.id;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối cơ sở dữ liệu.");
      }
      throw err;
    }
  }

  /**
   * Khởi tạo quy trình phê duyệt Điều chỉnh / Giải trình công (Attendance Adjustment)
   */
  public static async startAdjustmentWorkflow(
    requesterEmployeeId: string,
    adjustmentRequestId: string,
    db: WorkflowDbClient = prisma
  ): Promise<string> {
    try {
      const routing = await this.resolveRequesterRouting(requesterEmployeeId, db);

      const instance = await db.workflowInstance.create({
        data: {
          module: "ATTENDANCE_ADJUSTMENT",
          recordId: adjustmentRequestId,
          requesterEmployeeId,
          currentStepIndex: 0,
          status: "PENDING",
        },
      });

      if (routing.isHeadOfUnit) {
        // Lãnh đạo đơn vị giải trình -> Leo thang lên Ban Giám hiệu, sau đó Phòng TCHC
        await db.workflowStep.createMany({
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
        const step0Name =
          routing.approverRoleCode === "ROLE_RECTOR"
            ? `Ban Giám hiệu xác nhận giải trình (${routing.unitName})`
            : `Trưởng đơn vị xác nhận giải trình (${routing.unitName})`;

        await db.workflowStep.createMany({
          data: [
            {
              instanceId: instance.id,
              stepIndex: 0,
              stepName: step0Name.slice(0, 100),
              approverRoleCode: routing.approverRoleCode,
              approverEmployeeId: routing.approverEmployeeId,
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

      await db.attendanceAdjustmentRequest.update({
        where: { id: adjustmentRequestId },
        data: { workflowInstanceId: instance.id },
      });

      return instance.id;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối cơ sở dữ liệu.");
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
                  assignments: {
                    where: { assignmentType: { in: ["PRIMARY", "CONCURRENT"] }, status: "ACTIVE" },
                    select: { unitId: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const isGlobalHR = currentUser.roles.some((r) =>
        ["ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_SYSADMIN"].includes(r)
      );

      // Lọc bước hợp lệ: đúng thứ tự, và KHÔNG phải đơn của chính mình (Anti-Self-Approval)
      let validSteps = steps.filter(
        (s) =>
          s.stepIndex === s.instance.currentStepIndex &&
          (!userEmployeeId || s.instance.requesterEmployeeId !== userEmployeeId)
      );

      // Nếu người duyệt là Trưởng đơn vị (và không phải HR toàn trường), chỉ duyệt đơn của cây đơn vị mình quản lý
      if (!isGlobalHR && currentUser.roles.includes("ROLE_UNIT_HEAD")) {
        const managedUnits = await this.getExpandedManagedUnitIds(currentUser.unitsManaged);
        validSteps = validSteps.filter((s) => {
          if (s.approverEmployeeId && s.approverEmployeeId === userEmployeeId) return true;
          if (s.approverRoleCode !== "ROLE_UNIT_HEAD") return true;
          const reqAssignments = s.instance.requesterEmployee?.assignments || [];
          return reqAssignments.some((a) => managedUnits.has(a.unitId));
        });
      }

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
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối cơ sở dữ liệu.");
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

      // Kiểm tra quyền hạn truy cập tiến trình phê duyệt (Chống IDOR)
      const isRequester = Boolean(currentUser.employeeId && currentUser.employeeId === instance.requesterEmployeeId);
      const isGlobalHR = currentUser.roles.some((r) =>
        ["ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_SYSADMIN"].includes(r)
      );

      let isRequesterUnitHead = false;
      if (currentUser.unitsManaged && currentUser.unitsManaged.length > 0) {
        const [managedUnitIds, requesterUnitIds] = await Promise.all([
          this.getExpandedManagedUnitIds(currentUser.unitsManaged),
          this.getEmployeeActiveUnitIds(instance.requesterEmployeeId),
        ]);
        isRequesterUnitHead = requesterUnitIds.some((uid) => managedUnitIds.has(uid));
      }

      const isStepApprover = instance.steps.some((s) => {
        if (s.approverEmployeeId && s.approverEmployeeId === currentUser.employeeId) {
          return true;
        }
        if (s.approverRoleCode && currentUser.roles.includes(s.approverRoleCode)) {
          // Trưởng đơn vị chỉ có quyền xem hồ sơ thuộc cây đơn vị mình quản lý (chống IDOR liên đơn vị)
          if (s.approverRoleCode === "ROLE_UNIT_HEAD") {
            return isRequesterUnitHead;
          }
          return true;
        }
        return false;
      });

      if (!isRequester && !isGlobalHR && !isStepApprover && !isRequesterUnitHead) {
        throw new AppError(403, "FORBIDDEN", "Bạn không có quyền xem thông tin quy trình phê duyệt này.");
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
    try {
      await prisma.$transaction(async (tx) => {
        const step = await tx.workflowStep.findUnique({
          where: { id: stepId },
          include: {
            instance: true,
          },
        });

        if (!step) {
          throw new AppError(404, "RESOURCE_NOT_FOUND", "Bước phê duyệt không tồn tại.");
        }

        if (step.status !== "WAITING" || step.instance.status !== "PENDING") {
          throw new AppError(409, "CONFLICT_STATE", "Bước phê duyệt hoặc quy trình đã được xử lý trước đó.");
        }

        // 1. Kiểm tra thứ tự bước phê duyệt (Strict Sequential Workflow)
        if (step.stepIndex !== step.instance.currentStepIndex) {
          throw new AppError(
            422,
            "INVALID_STEP_ORDER",
            `Không thể phê duyệt bước ${step.stepIndex} khi tiến trình đang ở bước ${step.instance.currentStepIndex}.`
          );
        }

        // 2. Anti-Self-Approval: Không cho phép người nộp đơn tự duyệt bước của chính mình
        if (currentUser.employeeId && step.instance.requesterEmployeeId === currentUser.employeeId) {
          throw new AppError(
            403,
            "FORBIDDEN",
            "Quy tắc Anti-Self-Approval: Bạn không được tự phê duyệt đơn của chính mình."
          );
        }

        // 3. Kiểm tra quyền duyệt và Scope cây đơn vị
        await this.assertCanActOnStep(step, currentUser, "Bạn không có thẩm quyền phê duyệt bước này.", tx);

        // 4. Cập nhật nguyên tử bước hiện tại thành APPROVED
        const stepUpdate = await tx.workflowStep.updateMany({
          where: { id: stepId, status: "WAITING" },
          data: {
            status: "APPROVED",
            comment: comment || null,
            actionAt: new Date(),
          },
        });

        if (stepUpdate.count === 0) {
          throw new AppError(409, "CONFLICT_STATE", "Bước phê duyệt đã được xử lý bởi thao tác khác.");
        }

        // 5. Kiểm tra xem còn bước tiếp theo không
        const nextStep = await tx.workflowStep.findFirst({
          where: {
            instanceId: step.instanceId,
            stepIndex: step.stepIndex + 1,
          },
        });

        if (nextStep) {
          const instUpdate = await tx.workflowInstance.updateMany({
            where: {
              id: step.instanceId,
              status: "PENDING",
              currentStepIndex: step.stepIndex,
            },
            data: { currentStepIndex: step.stepIndex + 1 },
          });
          if (instUpdate.count === 0) {
            throw new AppError(409, "CONFLICT_STATE", "Trạng thái quy trình đã bị thay đổi.");
          }
          return;
        }

        // Đã duyệt xong bước cuối cùng -> Hoàn tất Workflow
        const instUpdate = await tx.workflowInstance.updateMany({
          where: { id: step.instanceId, status: "PENDING" },
          data: { status: "APPROVED" },
        });
        if (instUpdate.count === 0) {
          throw new AppError(409, "CONFLICT_STATE", "Quy trình đã được xử lý trước đó.");
        }

        // Hook xử lý kết quả hoàn tất cho từng module
        if (step.instance.module === "LEAVE") {
          const leave = await tx.leaveRequest.findUnique({
            where: { id: step.instance.recordId },
          });

          if (leave) {
            await tx.leaveRequest.update({
              where: { id: leave.id },
              data: { status: "APPROVED" },
            });

            // Trừ phép chính thức trên Sổ cái nếu là nghỉ phép năm theo đúng năm bắt đầu nghỉ (VN)
            if (leave.leaveType === "ANNUAL") {
              const leaveYear = getVnDateParts(leave.startDate).year;
              await LeaveLedgerService.recordUse(
                leave.employeeId,
                Number(leave.totalDays),
                leave.id,
                leaveYear,
                tx
              );
            }
          }
        } else if (step.instance.module === "BUSINESS_TRIP") {
          await tx.businessTripRequest.update({
            where: { id: step.instance.recordId },
            data: { status: "APPROVED" },
          });
        } else if (step.instance.module === "ATTENDANCE_ADJUSTMENT") {
          const adj = await tx.attendanceAdjustmentRequest.findUnique({
            where: { id: step.instance.recordId },
          });
          if (adj) {
            const { year, month } = getVnDateParts(adj.workDate);
            const period = await AttendanceService.getOrCreatePeriod(month, year, tx);
            if (period.isLocked) {
              throw new AppError(
                409,
                "PERIOD_LOCKED",
                `Kỳ công tháng ${month}/${year} đã bị khóa, không thể duyệt điều chỉnh công.`
              );
            }

            await tx.attendanceAdjustmentRequest.update({
              where: { id: adj.id },
              data: { status: "APPROVED" },
            });

            const existingRecord = await tx.attendanceRecord.findUnique({
              where: {
                employeeId_workDate: {
                  employeeId: adj.employeeId,
                  workDate: adj.workDate,
                },
              },
            });

            // Bảo toàn checkIn/checkOut hiện hữu nếu chỉ điều chỉnh một mốc
            const checkIn = adj.adjustedCheckIn ?? existingRecord?.checkInTime ?? adj.originalCheckIn ?? null;
            const checkOut = adj.adjustedCheckOut ?? existingRecord?.checkOutTime ?? adj.originalCheckOut ?? null;

            const classified = AttendanceService.classifyAttendanceStatus(checkIn, checkOut);

            await tx.attendanceRecord.upsert({
              where: {
                employeeId_workDate: {
                  employeeId: adj.employeeId,
                  workDate: adj.workDate,
                },
              },
              update: {
                periodId: period.id,
                checkInTime: checkIn,
                checkOutTime: checkOut,
                rawWorkingHours: new Prisma.Decimal(classified.hours),
                status: classified.status,
                adjustmentRequestId: adj.id,
              },
              create: {
                employeeId: adj.employeeId,
                periodId: period.id,
                workDate: adj.workDate,
                checkInTime: checkIn,
                checkOutTime: checkOut,
                rawWorkingHours: new Prisma.Decimal(classified.hours),
                status: classified.status,
                adjustmentRequestId: adj.id,
                deviceSource: "ADJUSTMENT_REQUEST",
              },
            });

            await AttendanceService.recalculateMonthlySummary(
              adj.employeeId,
              period.id,
              month,
              year,
              tx
            );
          }
        }
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
   * Từ chối đơn trong quy trình
   */
  public static async rejectStep(
    stepId: string,
    currentUser: AuthUser,
    reason: string
  ): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const step = await tx.workflowStep.findUnique({
          where: { id: stepId },
          include: {
            instance: true,
          },
        });

        if (!step) {
          throw new AppError(404, "RESOURCE_NOT_FOUND", "Bước phê duyệt không tồn tại.");
        }

        if (step.status !== "WAITING" || step.instance.status !== "PENDING") {
          throw new AppError(409, "CONFLICT_STATE", "Bước phê duyệt hoặc quy trình đã được xử lý trước đó.");
        }

        // 1. Kiểm tra thứ tự bước phê duyệt (Strict Sequential Workflow)
        if (step.stepIndex !== step.instance.currentStepIndex) {
          throw new AppError(
            422,
            "INVALID_STEP_ORDER",
            `Không thể từ chối bước ${step.stepIndex} khi tiến trình đang ở bước ${step.instance.currentStepIndex}.`
          );
        }

        // 2. Anti-Self-Approval
        if (currentUser.employeeId && step.instance.requesterEmployeeId === currentUser.employeeId) {
          throw new AppError(
            403,
            "FORBIDDEN",
            "Quy tắc Anti-Self-Approval: Bạn không được tự xử lý đơn của chính mình."
          );
        }

        // 3. Kiểm tra quyền từ chối và Scope cây đơn vị
        await this.assertCanActOnStep(step, currentUser, "Bạn không có thẩm quyền từ chối bước này.", tx);

        // 4. Cập nhật nguyên tử bước thành REJECTED
        const stepUpdate = await tx.workflowStep.updateMany({
          where: { id: stepId, status: "WAITING" },
          data: {
            status: "REJECTED",
            comment: reason,
            actionAt: new Date(),
          },
        });
        if (stepUpdate.count === 0) {
          throw new AppError(409, "CONFLICT_STATE", "Bước phê duyệt đã được xử lý bởi thao tác khác.");
        }

        await tx.workflowStep.updateMany({
          where: { instanceId: step.instanceId, status: "WAITING" },
          data: { status: "SKIPPED" },
        });

        // 5. Chuyển toàn bộ Instance thành REJECTED
        const instUpdate = await tx.workflowInstance.updateMany({
          where: { id: step.instanceId, status: "PENDING" },
          data: { status: "REJECTED" },
        });
        if (instUpdate.count === 0) {
          throw new AppError(409, "CONFLICT_STATE", "Quy trình đã được xử lý trước đó.");
        }

        // 6. Hook xử lý khi bị từ chối
        if (step.instance.module === "LEAVE") {
          const leave = await tx.leaveRequest.findUnique({
            where: { id: step.instance.recordId },
          });

          if (leave) {
            await tx.leaveRequest.update({
              where: { id: leave.id },
              data: { status: "REJECTED" },
            });

            // Giải phóng ngày phép bị tạm giữ trên Sổ cái theo đúng năm bắt đầu nghỉ (VN)
            if (leave.leaveType === "ANNUAL") {
              const leaveYear = getVnDateParts(leave.startDate).year;
              await LeaveLedgerService.releaseHold(
                leave.employeeId,
                Number(leave.totalDays),
                leave.id,
                leaveYear,
                tx
              );
            }
          }
        } else if (step.instance.module === "BUSINESS_TRIP") {
          await tx.businessTripRequest.update({
            where: { id: step.instance.recordId },
            data: { status: "REJECTED" },
          });
        } else if (step.instance.module === "ATTENDANCE_ADJUSTMENT") {
          await tx.attendanceAdjustmentRequest.update({
            where: { id: step.instance.recordId },
            data: { status: "REJECTED" },
          });
        }
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
   * Trả lại đơn để người nộp bổ sung / chỉnh sửa (RETURNED)
   */
  public static async returnStep(
    stepId: string,
    currentUser: AuthUser,
    reason: string
  ): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const step = await tx.workflowStep.findUnique({
          where: { id: stepId },
          include: { instance: true },
        });

        if (!step) {
          throw new AppError(404, "RESOURCE_NOT_FOUND", "Bước phê duyệt không tồn tại.");
        }

        if (step.status !== "WAITING" || step.instance.status !== "PENDING") {
          throw new AppError(409, "CONFLICT_STATE", "Bước phê duyệt hoặc quy trình đã được xử lý trước đó.");
        }

        if (step.stepIndex !== step.instance.currentStepIndex) {
          throw new AppError(
            422,
            "INVALID_STEP_ORDER",
            `Không thể trả lại bước ${step.stepIndex} khi tiến trình đang ở bước ${step.instance.currentStepIndex}.`
          );
        }

        if (currentUser.employeeId && step.instance.requesterEmployeeId === currentUser.employeeId) {
          throw new AppError(
            403,
            "FORBIDDEN",
            "Quy tắc Anti-Self-Approval: Bạn không được tự xử lý đơn của chính mình."
          );
        }

        await this.assertCanActOnStep(step, currentUser, "Bạn không có thẩm quyền trả lại bước này.", tx);

        const stepUpdate = await tx.workflowStep.updateMany({
          where: { id: stepId, status: "WAITING" },
          data: {
            status: "REJECTED",
            comment: `[Yêu cầu bổ sung] ${reason}`,
            actionAt: new Date(),
          },
        });
        if (stepUpdate.count === 0) {
          throw new AppError(409, "CONFLICT_STATE", "Bước phê duyệt đã được xử lý bởi thao tác khác.");
        }

        await tx.workflowStep.updateMany({
          where: { instanceId: step.instanceId, status: "WAITING" },
          data: { status: "SKIPPED" },
        });

        const instUpdate = await tx.workflowInstance.updateMany({
          where: { id: step.instanceId, status: "PENDING" },
          data: { status: "RETURNED" },
        });
        if (instUpdate.count === 0) {
          throw new AppError(409, "CONFLICT_STATE", "Quy trình đã được xử lý trước đó.");
        }

        if (step.instance.module === "LEAVE") {
          const leave = await tx.leaveRequest.findUnique({
            where: { id: step.instance.recordId },
          });
          if (leave) {
            await tx.leaveRequest.update({
              where: { id: leave.id },
              data: { status: "RETURNED" },
            });
            if (leave.leaveType === "ANNUAL") {
              const leaveYear = getVnDateParts(leave.startDate).year;
              await LeaveLedgerService.releaseHold(
                leave.employeeId,
                Number(leave.totalDays),
                leave.id,
                leaveYear,
                tx
              );
            }
          }
        } else if (step.instance.module === "BUSINESS_TRIP") {
          await tx.businessTripRequest.update({
            where: { id: step.instance.recordId },
            data: { status: "RETURNED" },
          });
        } else if (step.instance.module === "ATTENDANCE_ADJUSTMENT") {
          await tx.attendanceAdjustmentRequest.update({
            where: { id: step.instance.recordId },
            data: { status: "RETURNED" },
          });
        }
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
   * Hủy bỏ quy trình phê duyệt khi đơn còn ở trạng thái PENDING
   */
  public static async cancelWorkflow(
    instanceId: string,
    currentUser: AuthUser
  ): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const instance = await tx.workflowInstance.findUnique({
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
          throw new AppError(409, "CONFLICT_STATE", "Quy trình đã được xử lý trước đó, không thể hủy.");
        }

        // 1. Cập nhật nguyên tử Instance thành CANCELLED
        const instUpdate = await tx.workflowInstance.updateMany({
          where: { id: instanceId, status: "PENDING" },
          data: { status: "CANCELLED" },
        });
        if (instUpdate.count === 0) {
          throw new AppError(409, "CONFLICT_STATE", "Quy trình đã được xử lý bởi thao tác khác.");
        }

        // 2. Cập nhật các bước WAITING thành SKIPPED
        await tx.workflowStep.updateMany({
          where: { instanceId, status: "WAITING" },
          data: { status: "SKIPPED", comment: "Người gửi đã hủy yêu cầu" },
        });

        // 3. Hook giải phóng tài nguyên
        if (instance.module === "LEAVE") {
          const leave = await tx.leaveRequest.findUnique({
            where: { id: instance.recordId },
          });

          if (leave) {
            await tx.leaveRequest.update({
              where: { id: leave.id },
              data: { status: "CANCELLED" },
            });

            if (leave.leaveType === "ANNUAL") {
              const leaveYear = getVnDateParts(leave.startDate).year;
              await LeaveLedgerService.releaseHold(
                leave.employeeId,
                Number(leave.totalDays),
                leave.id,
                leaveYear,
                tx
              );
            }
          }
        } else if (instance.module === "BUSINESS_TRIP") {
          await tx.businessTripRequest.update({
            where: { id: instance.recordId },
            data: { status: "CANCELLED" },
          });
        } else if (instance.module === "ATTENDANCE_ADJUSTMENT") {
          await tx.attendanceAdjustmentRequest.update({
            where: { id: instance.recordId },
            data: { status: "CANCELLED" },
          });
        }
      });
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối cơ sở dữ liệu.");
      }
      throw err;
    }
  }
}
