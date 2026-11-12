import { prisma } from "@bahau/database";
import { AppError } from "../middlewares/error.middleware.js";
import type {
  OrganizationalUnitDto,
  CreateUnitInput,
  UpdateUnitInput,
} from "@bahau/contracts";

export class UnitService {
  /**
   * Lấy toàn bộ danh sách đơn vị dưới dạng cây phân cấp (Tree View)
   */
  public static async getUnitTree(): Promise<OrganizationalUnitDto[]> {
    const units = await prisma.organizationalUnit.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: "asc" },
      include: {
        managerEmployee: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    const unitMap = new Map<string, OrganizationalUnitDto>();

    for (const u of units) {
      unitMap.set(u.id, {
        id: u.id,
        code: u.code,
        name: u.name,
        unitType: u.unitType as any,
        parentId: u.parentId,
        managerEmployeeId: u.managerEmployeeId,
        managerName: u.managerEmployee?.fullName || null,
        isActive: u.isActive,
        orderIndex: u.orderIndex,
        children: [],
      });
    }

    const roots: OrganizationalUnitDto[] = [];

    for (const u of units) {
      const node = unitMap.get(u.id)!;
      if (u.parentId) {
        // Chỉ gắn vào cây khi đơn vị cha cũng đang active; không đẩy con của đơn vị đã ngừng hoạt động lên roots
        if (unitMap.has(u.parentId)) {
          unitMap.get(u.parentId)!.children!.push(node);
        }
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  /**
   * Lấy danh sách phẳng tất cả các đơn vị (cho dropdown chọn đơn vị)
   */
  public static async getAllUnits(): Promise<Array<{ id: string; code: string; name: string; unitType: string; parentId: string | null }>> {
    const units = await prisma.organizationalUnit.findMany({
      where: { isActive: true },
      orderBy: { orderIndex: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        unitType: true,
        parentId: true,
      },
    });
    return units;
  }

  /**
   * Lấy toàn bộ ID của đơn vị và các đơn vị trực thuộc (Descendant Unit IDs)
   */
  public static async getDescendantUnitIds(rootUnitId: string): Promise<string[]> {
    const allUnits = await prisma.organizationalUnit.findMany({
      select: { id: true, parentId: true },
    });

    const result = new Set<string>([rootUnitId]);
    let added = true;

    while (added) {
      added = false;
      for (const u of allUnits) {
        if (u.parentId && result.has(u.parentId) && !result.has(u.id)) {
          result.add(u.id);
          added = true;
        }
      }
    }

    return Array.from(result);
  }

  private static async validateActiveParent(parentId: string): Promise<void> {
    const parent = await prisma.organizationalUnit.findUnique({
      where: { id: parentId },
    });
    if (!parent) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Đơn vị cha không tồn tại.");
    }
    if (!parent.isActive) {
      throw new AppError(
        422,
        "VALIDATION_FAILED",
        "Đơn vị cha đang ngừng hoạt động, không thể gắn đơn vị trực thuộc."
      );
    }
  }

  private static async validateActiveManager(managerEmployeeId: string): Promise<void> {
    const manager = await prisma.employee.findUnique({
      where: { id: managerEmployeeId },
      select: { id: true, employmentStatus: true },
    });
    if (!manager) {
      throw new AppError(
        404,
        "RESOURCE_NOT_FOUND",
        "Nhân sự được chỉ định làm người đứng đầu không tồn tại."
      );
    }
    if (["RESIGNED", "RETIRED"].includes(manager.employmentStatus)) {
      throw new AppError(
        422,
        "VALIDATION_FAILED",
        "Nhân sự đã thôi việc hoặc nghỉ hưu không thể đảm nhiệm chức vụ quản lý đơn vị."
      );
    }
  }

  private static async syncUnitManagerHeadFlag(
    tx: any,
    unitId: string,
    newManagerId: string | null
  ): Promise<void> {
    await tx.employmentAssignment.updateMany({
      where: {
        unitId,
        status: "ACTIVE",
        isHeadOfUnit: true,
        ...(newManagerId ? { employeeId: { not: newManagerId } } : {}),
      },
      data: { isHeadOfUnit: false },
    });

    if (newManagerId) {
      await tx.employmentAssignment.updateMany({
        where: {
          unitId,
          employeeId: newManagerId,
          status: "ACTIVE",
        },
        data: { isHeadOfUnit: true },
      });
    }
  }

  private static async assertCanDeactivateUnit(tx: any, unitId: string): Promise<void> {
    const [activeChildCount, activeEmployeeCount] = await Promise.all([
      tx.organizationalUnit.count({
        where: { parentId: unitId, isActive: true },
      }),
      tx.employmentAssignment.count({
        where: {
          unitId,
          status: "ACTIVE",
          employee: {
            employmentStatus: { notIn: ["RESIGNED", "RETIRED"] },
          },
        },
      }),
    ]);

    if (activeChildCount > 0) {
      throw new AppError(
        409,
        "CONFLICT_STATE",
        "Không thể ngừng hoạt động đơn vị khi vẫn còn đơn vị trực thuộc đang hoạt động."
      );
    }
    if (activeEmployeeCount > 0) {
      throw new AppError(
        409,
        "CONFLICT_STATE",
        "Không thể ngừng hoạt động đơn vị khi vẫn còn nhân sự đang công tác tại đơn vị."
      );
    }
  }

  /**
   * Tạo đơn vị mới
   */
  public static async createUnit(input: CreateUnitInput): Promise<OrganizationalUnitDto> {
    const normalizedCode = input.code.trim().toUpperCase();
    const existing = await prisma.organizationalUnit.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      throw new AppError(409, "CONFLICT_STATE", `Mã đơn vị '${normalizedCode}' đã tồn tại.`);
    }

    if (input.parentId) {
      await this.validateActiveParent(input.parentId);
    }

    if (input.managerEmployeeId) {
      await this.validateActiveManager(input.managerEmployeeId);
    }

    const created = await prisma.$transaction(async (tx) => {
      const unit = await tx.organizationalUnit.create({
        data: {
          code: normalizedCode,
          name: input.name.trim(),
          unitType: input.unitType as any,
          parentId: input.parentId || null,
          managerEmployeeId: input.managerEmployeeId || null,
          orderIndex: input.orderIndex ?? 0,
        },
        include: {
          managerEmployee: {
            select: { fullName: true },
          },
        },
      });

      if (unit.managerEmployeeId) {
        await this.syncUnitManagerHeadFlag(tx, unit.id, unit.managerEmployeeId);
      }

      return unit;
    });

    return {
      id: created.id,
      code: created.code,
      name: created.name,
      unitType: created.unitType as any,
      parentId: created.parentId,
      managerEmployeeId: created.managerEmployeeId,
      managerName: created.managerEmployee?.fullName || null,
      isActive: created.isActive,
      orderIndex: created.orderIndex,
    };
  }

  /**
   * Cập nhật thông tin đơn vị (ngăn vòng lặp cây & đồng bộ trưởng đơn vị)
   */
  public static async updateUnit(
    id: string,
    input: UpdateUnitInput
  ): Promise<OrganizationalUnitDto> {
    const existing = await prisma.organizationalUnit.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy đơn vị yêu cầu.");
    }

    let nextCode = existing.code;
    if (input.code !== undefined) {
      nextCode = input.code.trim().toUpperCase();
      if (nextCode !== existing.code) {
        const duplicate = await prisma.organizationalUnit.findUnique({
          where: { code: nextCode },
        });
        if (duplicate) {
          throw new AppError(409, "CONFLICT_STATE", `Mã đơn vị '${nextCode}' đã tồn tại.`);
        }
      }
    }

    if (input.parentId !== undefined && input.parentId !== null) {
      if (input.parentId === id) {
        throw new AppError(
          422,
          "VALIDATION_FAILED",
          "Đơn vị không thể tự chọn chính mình làm đơn vị cha."
        );
      }

      await this.validateActiveParent(input.parentId);

      // Ngăn vòng lặp cây tổ chức: kiểm tra parentId mới không nằm trong nhánh con cháu của id
      const allUnits = await prisma.organizationalUnit.findMany({
        select: { id: true, parentId: true },
      });
      const parentLookup = new Map(allUnits.map((u) => [u.id, u.parentId]));
      const visited = new Set<string>();
      let cursor: string | null | undefined = input.parentId;
      while (cursor) {
        if (cursor === id) {
          throw new AppError(
            422,
            "VALIDATION_FAILED",
            "Không thể chọn đơn vị trực thuộc làm đơn vị cha (tạo vòng lặp cây tổ chức)."
          );
        }
        if (visited.has(cursor)) break;
        visited.add(cursor);
        cursor = parentLookup.get(cursor) ?? null;
      }
    }

    if (input.managerEmployeeId !== undefined && input.managerEmployeeId !== null) {
      await this.validateActiveManager(input.managerEmployeeId);
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (input.isActive === false && existing.isActive) {
        await this.assertCanDeactivateUnit(tx, id);
      }

      const unit = await tx.organizationalUnit.update({
        where: { id },
        data: {
          code: input.code !== undefined ? nextCode : undefined,
          name: input.name !== undefined ? input.name.trim() : undefined,
          unitType: input.unitType !== undefined ? (input.unitType as any) : undefined,
          parentId: input.parentId !== undefined ? input.parentId : undefined,
          managerEmployeeId:
            input.managerEmployeeId !== undefined ? input.managerEmployeeId : undefined,
          orderIndex: input.orderIndex !== undefined ? input.orderIndex : undefined,
          isActive: input.isActive !== undefined ? input.isActive : undefined,
        },
        include: {
          managerEmployee: {
            select: { fullName: true },
          },
        },
      });

      if (input.managerEmployeeId !== undefined) {
        await this.syncUnitManagerHeadFlag(tx, id, input.managerEmployeeId ?? null);
      }

      return unit;
    });

    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      unitType: updated.unitType as any,
      parentId: updated.parentId,
      managerEmployeeId: updated.managerEmployeeId,
      managerName: updated.managerEmployee?.fullName || null,
      isActive: updated.isActive,
      orderIndex: updated.orderIndex,
    };
  }

  /**
   * Ngừng hoạt động (soft deactivate) một đơn vị nếu không còn nhân sự và đơn vị con hoạt động
   */
  public static async deleteUnit(id: string): Promise<OrganizationalUnitDto> {
    const existing = await prisma.organizationalUnit.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy đơn vị yêu cầu.");
    }

    const deactivated = await prisma.$transaction(async (tx) => {
      await this.assertCanDeactivateUnit(tx, id);

      const unit = await tx.organizationalUnit.update({
        where: { id },
        data: {
          isActive: false,
          managerEmployeeId: null,
        },
        include: {
          managerEmployee: {
            select: { fullName: true },
          },
        },
      });

      await this.syncUnitManagerHeadFlag(tx, id, null);
      return unit;
    });

    return {
      id: deactivated.id,
      code: deactivated.code,
      name: deactivated.name,
      unitType: deactivated.unitType as any,
      parentId: deactivated.parentId,
      managerEmployeeId: deactivated.managerEmployeeId,
      managerName: deactivated.managerEmployee?.fullName || null,
      isActive: deactivated.isActive,
      orderIndex: deactivated.orderIndex,
    };
  }
}
