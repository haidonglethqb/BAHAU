import { prisma, EmploymentEventType } from "@bahau/database";
import { AppError } from "../middlewares/error.middleware.js";
import { UnitService } from "./unit.service.js";
import type {
  EmploymentEventDto,
  CreateEmploymentEventInput,
  AuthUser,
} from "@bahau/contracts";

export class EmploymentEventService {
  /**
   * Lấy toàn bộ dòng thời gian diễn biến công tác của một nhân sự (Timeline)
   */
  public static async getEmployeeEvents(
    employeeId: string,
    currentUser?: AuthUser
  ): Promise<EmploymentEventDto[]> {
    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        assignments: {
          where: { assignmentType: "PRIMARY", status: "ACTIVE" },
          take: 1,
        },
      },
    });

    if (!emp) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy hồ sơ nhân sự.");
    }

    // Kiểm tra quyền
    const isSelf = currentUser?.employeeId === employeeId;
    const isGlobalHR = currentUser?.roles.some((r) =>
      ["ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_SYSADMIN"].includes(r)
    );

    if (!isSelf && !isGlobalHR) {
      const primaryAssignment = emp.assignments[0];
      const hasUnitAccess = currentUser?.unitsManaged?.includes(primaryAssignment?.unitId || "");
      if (!hasUnitAccess) {
        throw new AppError(403, "FORBIDDEN", "Bạn không có quyền xem diễn biến công tác của nhân sự này.");
      }
    }

    const events = await prisma.employmentEvent.findMany({
      where: { employeeId },
      orderBy: [{ effectiveDate: "desc" }, { createdAt: "desc" }],
      include: {
        fromUnit: { select: { name: true } },
        toUnit: { select: { name: true } },
        fromPosition: { select: { name: true } },
        toPosition: { select: { name: true } },
        employee: { select: { employeeCode: true, fullName: true } },
      },
    });

    return events.map((ev) => ({
      id: ev.id,
      employeeId: ev.employeeId,
      employeeCode: ev.employee.employeeCode,
      employeeName: ev.employee.fullName,
      eventType: ev.eventType as any,
      decisionNumber: ev.decisionNumber,
      decisionDate: ev.decisionDate ? ev.decisionDate.toISOString().split("T")[0] : null,
      effectiveDate: ev.effectiveDate.toISOString().split("T")[0],
      fromUnitId: ev.fromUnitId,
      fromUnitName: ev.fromUnit?.name || null,
      toUnitId: ev.toUnitId,
      toUnitName: ev.toUnit?.name || null,
      fromPositionId: ev.fromPositionId,
      fromPositionName: ev.fromPosition?.name || null,
      toPositionId: ev.toPositionId,
      toPositionName: ev.toPosition?.name || null,
      note: ev.note,
      fileAssetId: ev.fileAssetId,
      createdAt: ev.createdAt.toISOString(),
    }));
  }

  /**
   * Ghi nhận một quyết định / sự kiện biến động công tác mới
   * Hỗ trợ tự động đồng bộ sang phân công công tác (EmploymentAssignment)
   */
  public static async createEmploymentEvent(
    input: CreateEmploymentEventInput,
    currentUser?: AuthUser
  ): Promise<EmploymentEventDto> {
    const emp = await prisma.employee.findUnique({
      where: { id: input.employeeId },
      include: {
        assignments: {
          where: { assignmentType: "PRIMARY", status: "ACTIVE" },
          take: 1,
        },
      },
    });

    if (!emp) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy hồ sơ nhân sự.");
    }

    const effectiveDateObj = new Date(input.effectiveDate);
    const decisionDateObj = input.decisionDate ? new Date(input.decisionDate) : null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Tự động đồng bộ phân công công tác nếu bật cờ syncAssignment
      if (input.syncAssignment) {
        if (
          ["APPOINTED", "TRANSFERRED"].includes(input.eventType) &&
          input.toUnitId &&
          input.toPositionId
        ) {
          // Hết hạn phân công PRIMARY cũ
          await tx.employmentAssignment.updateMany({
            where: {
              employeeId: input.employeeId,
              assignmentType: "PRIMARY",
              status: "ACTIVE",
            },
            data: {
              status: "EXPIRED",
              endDate: effectiveDateObj,
            },
          });

          // Tạo phân công PRIMARY mới
          await tx.employmentAssignment.create({
            data: {
              employeeId: input.employeeId,
              unitId: input.toUnitId,
              positionId: input.toPositionId,
              assignmentType: "PRIMARY",
              startDate: effectiveDateObj,
              status: "ACTIVE",
            },
          });
        } else if (
          input.eventType === "CONCURRENT_ASSIGNED" &&
          input.toUnitId &&
          input.toPositionId
        ) {
          // Tạo phân công kiêm nhiệm mới mà không hủy phân công PRIMARY
          await tx.employmentAssignment.create({
            data: {
              employeeId: input.employeeId,
              unitId: input.toUnitId,
              positionId: input.toPositionId,
              assignmentType: "CONCURRENT",
              startDate: effectiveDateObj,
              status: "ACTIVE",
            },
          });
        } else if (["RESIGNED", "RETIRED"].includes(input.eventType)) {
          // Hết hạn toàn bộ phân công công tác và chuyển trạng thái nhân sự
          await tx.employmentAssignment.updateMany({
            where: {
              employeeId: input.employeeId,
              status: "ACTIVE",
            },
            data: {
              status: "TERMINATED",
              endDate: effectiveDateObj,
            },
          });

          await tx.employee.update({
            where: { id: input.employeeId },
            data: {
              employmentStatus: input.eventType as any,
            },
          });
        }
      }

      // 2. Tạo bản ghi diễn biến công tác
      const created = await tx.employmentEvent.create({
        data: {
          employeeId: input.employeeId,
          eventType: input.eventType as EmploymentEventType,
          decisionNumber: input.decisionNumber || null,
          decisionDate: decisionDateObj,
          effectiveDate: effectiveDateObj,
          fromUnitId: input.fromUnitId || null,
          toUnitId: input.toUnitId || null,
          fromPositionId: input.fromPositionId || null,
          toPositionId: input.toPositionId || null,
          note: input.note || null,
          fileAssetId: input.fileAssetId || null,
        },
        include: {
          fromUnit: { select: { name: true } },
          toUnit: { select: { name: true } },
          fromPosition: { select: { name: true } },
          toPosition: { select: { name: true } },
          employee: { select: { employeeCode: true, fullName: true } },
        },
      });

      return created;
    });

    return {
      id: result.id,
      employeeId: result.employeeId,
      employeeCode: result.employee.employeeCode,
      employeeName: result.employee.fullName,
      eventType: result.eventType as any,
      decisionNumber: result.decisionNumber,
      decisionDate: result.decisionDate ? result.decisionDate.toISOString().split("T")[0] : null,
      effectiveDate: result.effectiveDate.toISOString().split("T")[0],
      fromUnitId: result.fromUnitId,
      fromUnitName: result.fromUnit?.name || null,
      toUnitId: result.toUnitId,
      toUnitName: result.toUnit?.name || null,
      fromPositionId: result.fromPositionId,
      fromPositionName: result.fromPosition?.name || null,
      toPositionId: result.toPositionId,
      toPositionName: result.toPosition?.name || null,
      note: result.note,
      fileAssetId: result.fileAssetId,
      createdAt: result.createdAt.toISOString(),
    };
  }
}
