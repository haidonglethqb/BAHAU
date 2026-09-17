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
      if (u.parentId && unitMap.has(u.parentId)) {
        unitMap.get(u.parentId)!.children!.push(node);
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

  /**
   * Tạo đơn vị mới
   */
  public static async createUnit(input: CreateUnitInput): Promise<OrganizationalUnitDto> {
    const existing = await prisma.organizationalUnit.findUnique({
      where: { code: input.code.toUpperCase() },
    });

    if (existing) {
      throw new AppError(409, "CONFLICT_STATE", `Mã đơn vị '${input.code}' đã tồn tại.`);
    }

    if (input.parentId) {
      const parent = await prisma.organizationalUnit.findUnique({
        where: { id: input.parentId },
      });
      if (!parent) {
        throw new AppError(404, "RESOURCE_NOT_FOUND", "Đơn vị cha không tồn tại.");
      }
    }

    const created = await prisma.organizationalUnit.create({
      data: {
        code: input.code.toUpperCase(),
        name: input.name,
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
}
