import { prisma, ContractStatus, ContractType } from "@bahau/database";
import { AppError } from "../middlewares/error.middleware.js";
import { UnitService } from "./unit.service.js";
import type {
  ContractDto,
  ContractDetailDto,
  ContractAlertSummaryDto,
  ContractFilterQuery,
  CreateContractInput,
  RenewContractInput,
  ContractAlertLevel,
  AuthUser,
} from "@bahau/contracts";

export class ContractService {
  /**
   * Tính toán số ngày còn lại và mức độ cảnh báo của hợp đồng
   */
  public static calculateExpiryAlert(
    contractType: string,
    expiryDate: Date | null,
    now: Date = new Date()
  ): { daysRemaining: number | null; alertLevel: ContractAlertLevel } {
    if (!expiryDate || contractType === "INDEFINITE_TERM") {
      return { daysRemaining: null, alertLevel: "INDEFINITE" };
    }

    const diffTime = expiryDate.getTime() - now.getTime();
    const daysRemaining = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return { daysRemaining, alertLevel: "EXPIRED" };
    }
    if (daysRemaining <= 30) {
      return { daysRemaining, alertLevel: "CRITICAL_30" };
    }
    if (daysRemaining <= 60) {
      return { daysRemaining, alertLevel: "WARNING_60" };
    }
    if (daysRemaining <= 90) {
      return { daysRemaining, alertLevel: "WARNING_90" };
    }
    return { daysRemaining, alertLevel: "NORMAL" };
  }

  /**
   * Lấy danh sách hợp đồng có phân trang, bộ lọc thời hạn 30/60/90 ngày và kiểm soát Scope
   */
  public static async getContracts(
    query: ContractFilterQuery,
    currentUser?: AuthUser
  ): Promise<{
    items: ContractDto[];
    pagination: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;
    const now = new Date();

    const where: any = {};

    // 1. Phân quyền dữ liệu (Scope)
    const isGlobalHR = currentUser?.roles.some((r) =>
      ["ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_SYSADMIN"].includes(r)
    );
    const isEmployeeOnly =
      currentUser?.roles.length === 1 && currentUser.roles[0] === "ROLE_EMPLOYEE";

    if (isEmployeeOnly && currentUser.employeeId) {
      where.employeeId = currentUser.employeeId;
    } else if (!isGlobalHR && currentUser?.unitsManaged && currentUser.unitsManaged.length > 0) {
      // Quản lý đơn vị: Chỉ xem hợp đồng thuộc đơn vị mình hoặc đơn vị con
      const allAllowedUnitIds = new Set<string>();
      for (const unitId of currentUser.unitsManaged) {
        const descendantIds = await UnitService.getDescendantUnitIds(unitId);
        descendantIds.forEach((id) => allAllowedUnitIds.add(id));
      }

      where.employee = {
        assignments: {
          some: {
            unitId: { in: Array.from(allAllowedUnitIds) },
            status: "ACTIVE",
          },
        },
      };
    }

    // 2. Bộ lọc cụ thể từ client
    if (query.employeeId) {
      where.employeeId = query.employeeId;
    }

    if (query.status) {
      where.status = query.status as ContractStatus;
    }

    if (query.contractType) {
      where.contractType = query.contractType as ContractType;
    }

    if (query.unitId) {
      where.employee = {
        ...(where.employee || {}),
        assignments: {
          some: {
            unitId: query.unitId,
            status: "ACTIVE",
          },
        },
      };
    }

    // 3. Lọc theo thời hạn cảnh báo hết hạn (expiringInDays = 30 | 60 | 90)
    if (query.expiringInDays) {
      const targetDate = new Date(now.getTime() + query.expiringInDays * 24 * 60 * 60 * 1000);
      where.status = "ACTIVE";
      where.contractType = { not: "INDEFINITE_TERM" };
      where.expiryDate = {
        not: null,
        gte: now,
        lte: targetDate,
      };
    }

    // 4. Tìm kiếm từ khóa
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { contractNumber: { contains: term, mode: "insensitive" } },
        { employee: { fullName: { contains: term, mode: "insensitive" } } },
        { employee: { employeeCode: { contains: term, mode: "insensitive" } } },
      ];
    }

    const [totalItems, contracts] = await Promise.all([
      prisma.employmentContract.count({ where }),
      prisma.employmentContract.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ status: "asc" }, { expiryDate: "asc" }, { createdAt: "desc" }],
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              fullName: true,
              assignments: {
                where: { assignmentType: "PRIMARY", status: "ACTIVE" },
                include: {
                  unit: { select: { name: true } },
                  position: { select: { name: true } },
                },
                take: 1,
              },
            },
          },
        },
      }),
    ]);

    const items: ContractDto[] = contracts.map((c) => {
      const primaryAssignment = c.employee.assignments[0];
      const { daysRemaining, alertLevel } = this.calculateExpiryAlert(
        c.contractType,
        c.expiryDate,
        now
      );

      return {
        id: c.id,
        employeeId: c.employeeId,
        employeeCode: c.employee.employeeCode,
        employeeName: c.employee.fullName,
        unitName: primaryAssignment?.unit?.name || null,
        positionName: primaryAssignment?.position?.name || null,
        contractNumber: c.contractNumber,
        contractType: c.contractType as any,
        signedDate: c.signedDate.toISOString().split("T")[0],
        effectiveDate: c.effectiveDate.toISOString().split("T")[0],
        expiryDate: c.expiryDate ? c.expiryDate.toISOString().split("T")[0] : null,
        salaryCoefficient: Number(c.salaryCoefficient),
        status: c.status as any,
        daysRemaining,
        alertLevel,
        parentContractId: c.parentContractId,
        createdAt: c.createdAt.toISOString(),
      };
    });

    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    return {
      items,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  /**
   * Thống kê tổng hợp số lượng hợp đồng sắp hết hạn theo các mốc 30, 60, 90 ngày
   */
  public static async getContractAlertSummary(
    currentUser?: AuthUser
  ): Promise<ContractAlertSummaryDto> {
    const now = new Date();
    const date30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const date60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const date90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const baseWhere: any = {};
    const isGlobalHR = currentUser?.roles.some((r) =>
      ["ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_SYSADMIN"].includes(r)
    );

    if (!isGlobalHR && currentUser?.unitsManaged && currentUser.unitsManaged.length > 0) {
      const allAllowedUnitIds = new Set<string>();
      for (const unitId of currentUser.unitsManaged) {
        const descendantIds = await UnitService.getDescendantUnitIds(unitId);
        descendantIds.forEach((id) => allAllowedUnitIds.add(id));
      }

      baseWhere.employee = {
        assignments: {
          some: {
            unitId: { in: Array.from(allAllowedUnitIds) },
            status: "ACTIVE",
          },
        },
      };
    }

    const [
      totalActive,
      totalIndefinite,
      totalExpiring30,
      totalExpiring60,
      totalExpiring90,
    ] = await Promise.all([
      prisma.employmentContract.count({
        where: { ...baseWhere, status: "ACTIVE" },
      }),
      prisma.employmentContract.count({
        where: { ...baseWhere, status: "ACTIVE", contractType: "INDEFINITE_TERM" },
      }),
      prisma.employmentContract.count({
        where: {
          ...baseWhere,
          status: "ACTIVE",
          contractType: { not: "INDEFINITE_TERM" },
          expiryDate: { not: null, gte: now, lte: date30 },
        },
      }),
      prisma.employmentContract.count({
        where: {
          ...baseWhere,
          status: "ACTIVE",
          contractType: { not: "INDEFINITE_TERM" },
          expiryDate: { not: null, gte: now, lte: date60 },
        },
      }),
      prisma.employmentContract.count({
        where: {
          ...baseWhere,
          status: "ACTIVE",
          contractType: { not: "INDEFINITE_TERM" },
          expiryDate: { not: null, gte: now, lte: date90 },
        },
      }),
    ]);

    const totalDefinite = Math.max(0, totalActive - totalIndefinite);

    return {
      totalActive,
      totalDefinite,
      totalIndefinite,
      totalExpiring30,
      totalExpiring60,
      totalExpiring90,
    };
  }

  /**
   * Lấy chi tiết hợp đồng và toàn bộ cây phả hệ chuỗi liên kết (parent & children)
   */
  public static async getContractById(
    id: string,
    currentUser?: AuthUser
  ): Promise<ContractDetailDto> {
    const c = await prisma.employmentContract.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            assignments: {
              where: { assignmentType: "PRIMARY", status: "ACTIVE" },
              include: {
                unit: { select: { name: true } },
                position: { select: { name: true } },
              },
              take: 1,
            },
          },
        },
        parentContract: true,
        renewedContracts: {
          orderBy: { effectiveDate: "asc" },
        },
      },
    });

    if (!c) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy hợp đồng lao động yêu cầu.");
    }

    // Kiểm tra quyền
    const isSelf = currentUser?.employeeId === c.employeeId;
    const isGlobalHR = currentUser?.roles.some((r) =>
      ["ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_SYSADMIN"].includes(r)
    );

    if (!isSelf && !isGlobalHR) {
      // Kiểm tra xem có phải lãnh đạo đơn vị của nhân sự này không
      const empUnit = c.employee.assignments[0]?.unit;
      const hasUnitAccess = currentUser?.unitsManaged?.includes(
        c.employee.assignments[0]?.unitId || ""
      );
      if (!hasUnitAccess) {
        throw new AppError(403, "FORBIDDEN", "Bạn không có quyền xem thông tin hợp đồng này.");
      }
    }

    const primaryAssignment = c.employee.assignments[0];
    const { daysRemaining, alertLevel } = this.calculateExpiryAlert(
      c.contractType,
      c.expiryDate,
      new Date()
    );

    return {
      id: c.id,
      employeeId: c.employeeId,
      employeeCode: c.employee.employeeCode,
      employeeName: c.employee.fullName,
      unitName: primaryAssignment?.unit?.name || null,
      positionName: primaryAssignment?.position?.name || null,
      contractNumber: c.contractNumber,
      contractType: c.contractType as any,
      signedDate: c.signedDate.toISOString().split("T")[0],
      effectiveDate: c.effectiveDate.toISOString().split("T")[0],
      expiryDate: c.expiryDate ? c.expiryDate.toISOString().split("T")[0] : null,
      salaryCoefficient: Number(c.salaryCoefficient),
      status: c.status as any,
      daysRemaining,
      alertLevel,
      parentContractId: c.parentContractId,
      parentContract: c.parentContract
        ? {
            id: c.parentContract.id,
            contractNumber: c.parentContract.contractNumber,
            contractType: c.parentContract.contractType as any,
            status: c.parentContract.status as any,
            signedDate: c.parentContract.signedDate.toISOString().split("T")[0],
            effectiveDate: c.parentContract.effectiveDate.toISOString().split("T")[0],
            expiryDate: c.parentContract.expiryDate
              ? c.parentContract.expiryDate.toISOString().split("T")[0]
              : null,
            salaryCoefficient: Number(c.parentContract.salaryCoefficient),
          }
        : null,
      renewedContracts: c.renewedContracts.map((rc) => ({
        id: rc.id,
        contractNumber: rc.contractNumber,
        contractType: rc.contractType as any,
        status: rc.status as any,
        signedDate: rc.signedDate.toISOString().split("T")[0],
        effectiveDate: rc.effectiveDate.toISOString().split("T")[0],
        expiryDate: rc.expiryDate ? rc.expiryDate.toISOString().split("T")[0] : null,
        salaryCoefficient: Number(rc.salaryCoefficient),
      })),
      fileAssetId: c.fileAssetId,
      createdAt: c.createdAt.toISOString(),
    };
  }

  /**
   * Tạo hợp đồng lao động mới
   */
  public static async createContract(
    input: CreateContractInput,
    currentUser?: AuthUser
  ): Promise<ContractDto> {
    // 1. Kiểm tra tồn tại nhân sự
    const emp = await prisma.employee.findUnique({
      where: { id: input.employeeId },
      include: {
        assignments: {
          where: { assignmentType: "PRIMARY", status: "ACTIVE" },
          include: {
            unit: { select: { name: true } },
            position: { select: { name: true } },
          },
          take: 1,
        },
      },
    });

    if (!emp) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy hồ sơ nhân sự.");
    }

    // 2. Kiểm tra trùng số hợp đồng
    const existing = await prisma.employmentContract.findUnique({
      where: { contractNumber: input.contractNumber },
    });

    if (existing) {
      throw new AppError(409, "RESOURCE_CONFLICT", `Số hợp đồng ${input.contractNumber} đã tồn tại.`);
    }

    // 3. Tạo hợp đồng mới
    const contract = await prisma.employmentContract.create({
      data: {
        employeeId: input.employeeId,
        contractNumber: input.contractNumber,
        contractType: input.contractType as ContractType,
        signedDate: new Date(input.signedDate),
        effectiveDate: new Date(input.effectiveDate),
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        salaryCoefficient: input.salaryCoefficient,
        fileAssetId: input.fileAssetId || null,
        status: "ACTIVE",
      },
    });

    const primaryAssignment = emp.assignments[0];
    const { daysRemaining, alertLevel } = this.calculateExpiryAlert(
      contract.contractType,
      contract.expiryDate,
      new Date()
    );

    return {
      id: contract.id,
      employeeId: contract.employeeId,
      employeeCode: emp.employeeCode,
      employeeName: emp.fullName,
      unitName: primaryAssignment?.unit?.name || null,
      positionName: primaryAssignment?.position?.name || null,
      contractNumber: contract.contractNumber,
      contractType: contract.contractType as any,
      signedDate: contract.signedDate.toISOString().split("T")[0],
      effectiveDate: contract.effectiveDate.toISOString().split("T")[0],
      expiryDate: contract.expiryDate ? contract.expiryDate.toISOString().split("T")[0] : null,
      salaryCoefficient: Number(contract.salaryCoefficient),
      status: contract.status as any,
      daysRemaining,
      alertLevel,
      parentContractId: contract.parentContractId,
      createdAt: contract.createdAt.toISOString(),
    };
  }

  /**
   * Gia hạn hợp đồng / Ký phụ lục chuỗi bất biến trong Prisma Transaction
   */
  public static async renewContract(
    parentContractId: string,
    input: RenewContractInput,
    currentUser?: AuthUser
  ): Promise<ContractDto> {
    // 1. Kiểm tra hợp đồng cũ
    const parentContract = await prisma.employmentContract.findUnique({
      where: { id: parentContractId },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            fullName: true,
            assignments: {
              where: { assignmentType: "PRIMARY", status: "ACTIVE" },
              include: {
                unit: { select: { name: true } },
                position: { select: { name: true } },
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!parentContract) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy hợp đồng gốc cần gia hạn.");
    }

    if (["RENEWED", "TERMINATED"].includes(parentContract.status)) {
      throw new AppError(
        400,
        "INVALID_STATE",
        `Hợp đồng hiện tại đang ở trạng thái ${parentContract.status}, không thể gia hạn thêm.`
      );
    }

    // 2. Kiểm tra trùng số hợp đồng mới
    const duplicate = await prisma.employmentContract.findUnique({
      where: { contractNumber: input.contractNumber },
    });

    if (duplicate) {
      throw new AppError(409, "RESOURCE_CONFLICT", `Số hợp đồng mới ${input.contractNumber} đã tồn tại.`);
    }

    // 3. Thực thi chuỗi bất biến trong một Transaction duy nhất
    const newContract = await prisma.$transaction(async (tx) => {
      // Đổi trạng thái hợp đồng cũ sang RENEWED
      await tx.employmentContract.update({
        where: { id: parentContractId },
        data: { status: "RENEWED" },
      });

      // Tạo hợp đồng mới liên kết cha-con
      const created = await tx.employmentContract.create({
        data: {
          employeeId: parentContract.employeeId,
          contractNumber: input.contractNumber,
          contractType: input.contractType as ContractType,
          signedDate: new Date(input.signedDate),
          effectiveDate: new Date(input.effectiveDate),
          expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
          salaryCoefficient: input.salaryCoefficient,
          fileAssetId: input.fileAssetId || null,
          parentContractId: parentContractId,
          status: "ACTIVE",
        },
      });

      return created;
    });

    const primaryAssignment = parentContract.employee.assignments[0];
    const { daysRemaining, alertLevel } = this.calculateExpiryAlert(
      newContract.contractType,
      newContract.expiryDate,
      new Date()
    );

    return {
      id: newContract.id,
      employeeId: newContract.employeeId,
      employeeCode: parentContract.employee.employeeCode,
      employeeName: parentContract.employee.fullName,
      unitName: primaryAssignment?.unit?.name || null,
      positionName: primaryAssignment?.position?.name || null,
      contractNumber: newContract.contractNumber,
      contractType: newContract.contractType as any,
      signedDate: newContract.signedDate.toISOString().split("T")[0],
      effectiveDate: newContract.effectiveDate.toISOString().split("T")[0],
      expiryDate: newContract.expiryDate ? newContract.expiryDate.toISOString().split("T")[0] : null,
      salaryCoefficient: Number(newContract.salaryCoefficient),
      status: newContract.status as any,
      daysRemaining,
      alertLevel,
      parentContractId: newContract.parentContractId,
      createdAt: newContract.createdAt.toISOString(),
    };
  }
}
