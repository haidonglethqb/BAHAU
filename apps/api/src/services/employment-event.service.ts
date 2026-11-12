import { prisma, EmploymentEventType } from "@bahau/database";
import { AppError } from "../middlewares/error.middleware.js";
import { UnitService } from "./unit.service.js";
import type {
  EmploymentEventDto,
  CreateEmploymentEventInput,
  AuthUser,
} from "@bahau/contracts";

const HEAD_POSITION_CODES = new Set([
  "HIEU_TRUONG",
  "TRUONG_KHOA",
  "TRUONG_PHONG",
  "TRUONG_BO_MON",
]);

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
          orderBy: { startDate: "desc" },
        },
      },
    });

    if (!emp) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy hồ sơ nhân sự.");
    }

    // Kiểm tra quyền
    const isSelf = Boolean(currentUser?.employeeId && currentUser.employeeId === employeeId);
    const isGlobalHR = Boolean(
      currentUser?.roles.some((r) =>
        ["ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_SYSADMIN"].includes(r)
      )
    );

    if (!isSelf && !isGlobalHR) {
      let hasUnitAccess = false;
      if (
        currentUser?.roles.includes("ROLE_UNIT_HEAD") &&
        currentUser.unitsManaged &&
        currentUser.unitsManaged.length > 0
      ) {
        const unitLists = await Promise.all(
          currentUser.unitsManaged.map((unitId) => UnitService.getDescendantUnitIds(unitId))
        );
        const allAllowedUnitIds = new Set(unitLists.flat());
        const activeAssignments = emp.assignments.filter((a) => a.status === "ACTIVE");
        const targetAssignments =
          activeAssignments.length > 0 ? activeAssignments : emp.assignments.slice(0, 1);
        hasUnitAccess = targetAssignments.some((a) => allAllowedUnitIds.has(a.unitId));
      }
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

    const effectiveDateObj = new Date(`${input.effectiveDate}T00:00:00.000Z`);
    const decisionDateObj = input.decisionDate
      ? new Date(`${input.decisionDate}T00:00:00.000Z`)
      : null;

    if (
      input.syncAssignment &&
      ["APPOINTED", "TRANSFERRED", "CONCURRENT_ASSIGNED"].includes(input.eventType) &&
      (!input.toUnitId || !input.toPositionId)
    ) {
      throw new AppError(
        422,
        "VALIDATION_FAILED",
        "Vui lòng cung cấp đầy đủ đơn vị mới (toUnitId) và chức vụ mới (toPositionId) khi đồng bộ phân công công tác."
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Xử lý chấm dứt công tác (RESIGNED / RETIRED): luôn cập nhật trạng thái & thu hồi quyền
      if (["RESIGNED", "RETIRED"].includes(input.eventType)) {
        await tx.employmentAssignment.updateMany({
          where: {
            employeeId: input.employeeId,
            status: "ACTIVE",
          },
          data: {
            status: "TERMINATED",
            endDate: effectiveDateObj,
            isHeadOfUnit: false,
          },
        });

        await tx.employmentContract.updateMany({
          where: {
            employeeId: input.employeeId,
            status: "ACTIVE",
          },
          data: {
            status: "TERMINATED",
          },
        });

        await tx.organizationalUnit.updateMany({
          where: { managerEmployeeId: input.employeeId },
          data: { managerEmployeeId: null },
        });

        await tx.employee.update({
          where: { id: input.employeeId },
          data: {
            employmentStatus: input.eventType as any,
          },
        });

        if (emp.userId) {
          await tx.user.update({
            where: { id: emp.userId },
            data: { status: "INACTIVE" },
          });
          await tx.session.deleteMany({
            where: { userId: emp.userId },
          });
        }
      } else if (input.syncAssignment) {
        if (["APPOINTED", "TRANSFERRED"].includes(input.eventType)) {
          const toUnitId = input.toUnitId!;
          const toPositionId = input.toPositionId!;

          const [toUnit, toPosition] = await Promise.all([
            tx.organizationalUnit.findUnique({ where: { id: toUnitId } }),
            tx.position.findUnique({ where: { id: toPositionId } }),
          ]);

          if (!toUnit) {
            throw new AppError(404, "RESOURCE_NOT_FOUND", "Đơn vị tiếp nhận (toUnitId) không tồn tại.");
          }
          if (!toUnit.isActive) {
            throw new AppError(422, "VALIDATION_FAILED", "Đơn vị tiếp nhận đang ngừng hoạt động.");
          }
          if (!toPosition) {
            throw new AppError(404, "RESOURCE_NOT_FOUND", "Chức vụ mới (toPositionId) không tồn tại.");
          }
          if (!toPosition.isActive) {
            throw new AppError(422, "VALIDATION_FAILED", "Chức vụ mới đang ngừng hoạt động.");
          }

          const isHead = HEAD_POSITION_CODES.has(toPosition.code);
          const priorEndDate = new Date(effectiveDateObj.getTime() - 24 * 60 * 60 * 1000);

          // Đóng phân công PRIMARY cũ với endDate = effectiveDate - 1 ngày
          await tx.employmentAssignment.updateMany({
            where: {
              employeeId: input.employeeId,
              assignmentType: "PRIMARY",
              status: "ACTIVE",
            },
            data: {
              status: "EXPIRED",
              endDate: priorEndDate,
              isHeadOfUnit: false,
            },
          });

          if (isHead) {
            // Bỏ cờ trưởng đơn vị của người tiền nhiệm (nếu có) tại đơn vị mới
            await tx.employmentAssignment.updateMany({
              where: {
                unitId: toUnitId,
                employeeId: { not: input.employeeId },
                status: "ACTIVE",
                isHeadOfUnit: true,
              },
              data: { isHeadOfUnit: false },
            });
          }

          // Tạo phân công PRIMARY mới
          await tx.employmentAssignment.create({
            data: {
              employeeId: input.employeeId,
              unitId: toUnitId,
              positionId: toPositionId,
              assignmentType: "PRIMARY",
              isHeadOfUnit: isHead,
              startDate: effectiveDateObj,
              status: "ACTIVE",
            },
          });

          // Đồng bộ OrganizationalUnit.managerEmployeeId trên các đơn vị cũ không còn là trưởng đơn vị
          const managedUnits = await tx.organizationalUnit.findMany({
            where: { managerEmployeeId: input.employeeId },
            select: { id: true },
          });
          for (const unit of managedUnits) {
            if (isHead && unit.id === toUnitId) continue;
            const stillHeadAtUnit = await tx.employmentAssignment.findFirst({
              where: {
                employeeId: input.employeeId,
                unitId: unit.id,
                status: "ACTIVE",
                isHeadOfUnit: true,
              },
              select: { id: true },
            });
            if (!stillHeadAtUnit) {
              await tx.organizationalUnit.update({
                where: { id: unit.id },
                data: { managerEmployeeId: null },
              });
            }
          }

          if (isHead) {
            await tx.organizationalUnit.update({
              where: { id: toUnitId },
              data: { managerEmployeeId: input.employeeId },
            });
          }
        } else if (input.eventType === "CONCURRENT_ASSIGNED") {
          const toUnitId = input.toUnitId!;
          const toPositionId = input.toPositionId!;

          const [toUnit, toPosition] = await Promise.all([
            tx.organizationalUnit.findUnique({ where: { id: toUnitId } }),
            tx.position.findUnique({ where: { id: toPositionId } }),
          ]);

          if (!toUnit) {
            throw new AppError(404, "RESOURCE_NOT_FOUND", "Đơn vị kiêm nhiệm (toUnitId) không tồn tại.");
          }
          if (!toUnit.isActive) {
            throw new AppError(422, "VALIDATION_FAILED", "Đơn vị kiêm nhiệm đang ngừng hoạt động.");
          }
          if (!toPosition) {
            throw new AppError(404, "RESOURCE_NOT_FOUND", "Chức vụ kiêm nhiệm (toPositionId) không tồn tại.");
          }
          if (!toPosition.isActive) {
            throw new AppError(422, "VALIDATION_FAILED", "Chức vụ kiêm nhiệm đang ngừng hoạt động.");
          }

          const duplicateConcurrent = await tx.employmentAssignment.findFirst({
            where: {
              employeeId: input.employeeId,
              unitId: toUnitId,
              positionId: toPositionId,
              assignmentType: "CONCURRENT",
              status: "ACTIVE",
            },
          });

          if (duplicateConcurrent) {
            throw new AppError(
              409,
              "CONFLICT_STATE",
              "Nhân sự đã có phân công kiêm nhiệm đang hiệu lực tại đơn vị và chức vụ này."
            );
          }

          const isHead = HEAD_POSITION_CODES.has(toPosition.code);
          if (isHead) {
            await tx.employmentAssignment.updateMany({
              where: {
                unitId: toUnitId,
                employeeId: { not: input.employeeId },
                status: "ACTIVE",
                isHeadOfUnit: true,
              },
              data: { isHeadOfUnit: false },
            });
          }

          // Tạo phân công kiêm nhiệm mới mà không hủy phân công PRIMARY
          await tx.employmentAssignment.create({
            data: {
              employeeId: input.employeeId,
              unitId: toUnitId,
              positionId: toPositionId,
              assignmentType: "CONCURRENT",
              isHeadOfUnit: isHead,
              startDate: effectiveDateObj,
              status: "ACTIVE",
            },
          });

          if (isHead) {
            await tx.organizationalUnit.update({
              where: { id: toUnitId },
              data: { managerEmployeeId: input.employeeId },
            });
          }
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

      await tx.auditEvent.create({
        data: {
          userId: currentUser?.id ?? null,
          action: "EMPLOYMENT_EVENT_CREATED",
          entityName: "EmploymentEvent",
          entityId: created.id,
          diffData: {
            employeeId: input.employeeId,
            eventType: input.eventType,
            effectiveDate: input.effectiveDate,
            toUnitId: input.toUnitId || null,
            toPositionId: input.toPositionId || null,
            syncAssignment: input.syncAssignment,
          },
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
