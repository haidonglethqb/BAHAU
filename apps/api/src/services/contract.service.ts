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
  private static getVnTodayUtcDate(now: Date = new Date()): Date {
    const vnNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return new Date(Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate()));
  }

  private static toUtcDateOnly(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private static addDaysUtc(utcDate: Date, days: number): Date {
    return new Date(utcDate.getTime() + days * 24 * 60 * 60 * 1000);
  }

  /**
   * Tính toán số ngày còn lại và mức độ cảnh báo của hợp đồng theo ranh giới ngày dương lịch (UTC+7)
   */
  public static calculateExpiryAlert(
    contractType: string,
    expiryDate: Date | null,
    now: Date = new Date()
  ): { daysRemaining: number | null; alertLevel: ContractAlertLevel } {
    if (!expiryDate || contractType === "INDEFINITE_TERM") {
      return { daysRemaining: null, alertLevel: "INDEFINITE" };
    }

    const todayUtc = this.getVnTodayUtcDate(now);
    const expiryUtc = this.toUtcDateOnly(expiryDate);
    const diffTime = expiryUtc.getTime() - todayUtc.getTime();
    const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));

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

    // 1. Phân quyền dữ liệu (Scope) - ROLE_SYSADMIN không có quyền truy cập hợp đồng
    const isGlobalHR = Boolean(
      currentUser?.roles.some((r) => ["ROLE_HR_OFFICER", "ROLE_RECTOR"].includes(r))
    );
    const isUnitHeadWithUnits = Boolean(
      currentUser?.roles.includes("ROLE_UNIT_HEAD") &&
        currentUser.unitsManaged &&
        currentUser.unitsManaged.length > 0
    );

    if (isGlobalHR) {
      // Global HR / Ban Giám hiệu có thể lọc theo bất kỳ employeeId hoặc unitId nào
      if (query.employeeId) {
        where.employeeId = query.employeeId;
      }
      if (query.unitId) {
        where.employee = {
          assignments: {
            some: {
              unitId: query.unitId,
              status: "ACTIVE",
            },
          },
        };
      }
    } else if (isUnitHeadWithUnits) {
      // Quản lý đơn vị: Chỉ xem hợp đồng thuộc đơn vị mình hoặc đơn vị con
      const unitLists = await Promise.all(
        currentUser!.unitsManaged.map((unitId) => UnitService.getDescendantUnitIds(unitId))
      );
      const allAllowedUnitIds = new Set(unitLists.flat());

      if (query.unitId) {
        if (!allAllowedUnitIds.has(query.unitId)) {
          throw new AppError(403, "FORBIDDEN", "Bạn không có quyền xem hợp đồng của đơn vị này.");
        }
        where.employee = {
          assignments: {
            some: {
              unitId: query.unitId,
              status: "ACTIVE",
            },
          },
        };
      } else {
        where.employee = {
          assignments: {
            some: {
              unitId: { in: Array.from(allAllowedUnitIds) },
              status: "ACTIVE",
            },
          },
        };
      }

      if (query.employeeId) {
        where.employeeId = query.employeeId;
      }
    } else {
      const isPureSysAdmin =
        currentUser?.roles.includes("ROLE_SYSADMIN") &&
        !currentUser.roles.some((r) => ["ROLE_EMPLOYEE", "ROLE_UNIT_HEAD"].includes(r));
      if (isPureSysAdmin) {
        throw new AppError(403, "FORBIDDEN", "Bạn không có quyền truy cập phân hệ hợp đồng.");
      }

      // Cán bộ thông thường (hoặc Trưởng đơn vị chưa có đơn vị quản lý): Chỉ xem hợp đồng của chính mình
      if (query.employeeId && query.employeeId !== currentUser?.employeeId) {
        throw new AppError(403, "FORBIDDEN", "Bạn không có quyền xem hợp đồng của nhân sự khác.");
      }
      if (!currentUser?.employeeId) {
        return {
          items: [],
          pagination: {
            page,
            pageSize,
            totalItems: 0,
            totalPages: 1,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        };
      }
      where.employeeId = currentUser.employeeId;
    }

    if (query.status) {
      where.status = query.status as ContractStatus;
    }

    if (query.contractType) {
      where.contractType = query.contractType as ContractType;
    }

    // 3. Lọc theo thời hạn cảnh báo hết hạn (expiringInDays = 30 | 60 | 90) theo ranh giới ngày dương lịch
    if (query.expiringInDays) {
      const todayUtc = this.getVnTodayUtcDate(now);
      const targetDate = this.addDaysUtc(todayUtc, query.expiringInDays);
      where.status = "ACTIVE";
      where.contractType = { not: "INDEFINITE_TERM" };
      where.expiryDate = {
        not: null,
        gte: todayUtc,
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
    const todayUtc = this.getVnTodayUtcDate(new Date());
    const date30 = this.addDaysUtc(todayUtc, 30);
    const date31 = this.addDaysUtc(todayUtc, 31);
    const date60 = this.addDaysUtc(todayUtc, 60);
    const date61 = this.addDaysUtc(todayUtc, 61);
    const date90 = this.addDaysUtc(todayUtc, 90);

    const baseWhere: any = {};
    const isGlobalHR = Boolean(
      currentUser?.roles.some((r) => ["ROLE_HR_OFFICER", "ROLE_RECTOR"].includes(r))
    );
    const isUnitHead = Boolean(currentUser?.roles.includes("ROLE_UNIT_HEAD"));

    if (!isGlobalHR && !isUnitHead) {
      throw new AppError(403, "FORBIDDEN", "Bạn không có quyền xem thống kê cảnh báo hợp đồng.");
    }

    if (!isGlobalHR) {
      if (!currentUser?.unitsManaged || currentUser.unitsManaged.length === 0) {
        return {
          totalActive: 0,
          totalDefinite: 0,
          totalIndefinite: 0,
          totalExpiring30: 0,
          totalExpiring60: 0,
          totalExpiring90: 0,
        };
      }

      const unitLists = await Promise.all(
        currentUser.unitsManaged.map((unitId) => UnitService.getDescendantUnitIds(unitId))
      );
      const allAllowedUnitIds = Array.from(new Set(unitLists.flat()));

      baseWhere.employee = {
        assignments: {
          some: {
            unitId: { in: allAllowedUnitIds },
            status: "ACTIVE",
          },
        },
      };
    }

    const [
      totalActive,
      totalDefinite,
      totalIndefinite,
      totalExpiring30,
      totalExpiring60,
      totalExpiring90,
    ] = await Promise.all([
      prisma.employmentContract.count({
        where: { ...baseWhere, status: "ACTIVE" },
      }),
      prisma.employmentContract.count({
        where: {
          ...baseWhere,
          status: "ACTIVE",
          contractType: { in: ["DEFINITE_TERM_12M", "DEFINITE_TERM_36M"] },
        },
      }),
      prisma.employmentContract.count({
        where: { ...baseWhere, status: "ACTIVE", contractType: "INDEFINITE_TERM" },
      }),
      prisma.employmentContract.count({
        where: {
          ...baseWhere,
          status: "ACTIVE",
          contractType: { not: "INDEFINITE_TERM" },
          expiryDate: { not: null, gte: todayUtc, lte: date30 },
        },
      }),
      prisma.employmentContract.count({
        where: {
          ...baseWhere,
          status: "ACTIVE",
          contractType: { not: "INDEFINITE_TERM" },
          expiryDate: { not: null, gte: date31, lte: date60 },
        },
      }),
      prisma.employmentContract.count({
        where: {
          ...baseWhere,
          status: "ACTIVE",
          contractType: { not: "INDEFINITE_TERM" },
          expiryDate: { not: null, gte: date61, lte: date90 },
        },
      }),
    ]);

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
              orderBy: { startDate: "desc" },
              include: {
                unit: { select: { name: true } },
                position: { select: { name: true } },
              },
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

    // Kiểm tra quyền (ROLE_SYSADMIN không có quyền truy cập phân hệ hợp đồng)
    const isGlobalHR = Boolean(
      currentUser?.roles.some((r) => ["ROLE_HR_OFFICER", "ROLE_RECTOR"].includes(r))
    );
    const isSelf = Boolean(
      currentUser?.employeeId &&
        currentUser.employeeId === c.employeeId &&
        currentUser.roles.some((r) =>
          ["ROLE_EMPLOYEE", "ROLE_UNIT_HEAD", "ROLE_HR_OFFICER", "ROLE_RECTOR"].includes(r)
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
        const activeAssignments = c.employee.assignments.filter((a) => a.status === "ACTIVE");
        const targetAssignments =
          activeAssignments.length > 0 ? activeAssignments : c.employee.assignments.slice(0, 1);
        hasUnitAccess = targetAssignments.some((a) => allAllowedUnitIds.has(a.unitId));
      }
      if (!hasUnitAccess) {
        throw new AppError(403, "FORBIDDEN", "Bạn không có quyền xem thông tin hợp đồng này.");
      }
    }

    const primaryAssignment = c.employee.assignments.find(
      (a) => a.assignmentType === "PRIMARY" && a.status === "ACTIVE"
    );
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
   * Tạo hợp đồng lao động mới (chặn nhân sự đã nghỉ việc & chặn hợp đồng hiệu lực chồng chéo)
   */
  public static async createContract(
    input: CreateContractInput,
    currentUser?: AuthUser
  ): Promise<ContractDto> {
    const signedDateObj = new Date(`${input.signedDate}T00:00:00.000Z`);
    const effectiveDateObj = new Date(`${input.effectiveDate}T00:00:00.000Z`);
    const expiryDateObj =
      input.contractType === "INDEFINITE_TERM" || !input.expiryDate
        ? null
        : new Date(`${input.expiryDate}T00:00:00.000Z`);

    const { emp, contract } = await prisma.$transaction(async (tx) => {
      // 1. Kiểm tra tồn tại và trạng thái nhân sự
      const employee = await tx.employee.findUnique({
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

      if (!employee) {
        throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy hồ sơ nhân sự.");
      }

      if (["RESIGNED", "RETIRED"].includes(employee.employmentStatus)) {
        throw new AppError(
          409,
          "CONFLICT_STATE",
          "Không thể tạo hợp đồng hiệu lực cho nhân sự đã thôi việc hoặc nghỉ hưu."
        );
      }

      // 2. Kiểm tra trùng số hợp đồng
      const existing = await tx.employmentContract.findUnique({
        where: { contractNumber: input.contractNumber },
      });

      if (existing) {
        throw new AppError(
          409,
          "CONFLICT_STATE",
          `Số hợp đồng ${input.contractNumber} đã tồn tại.`
        );
      }

      // 3. Kiểm tra trùng lặp khoảng thời gian với hợp đồng ACTIVE hiện có của nhân sự
      const overlapping = await tx.employmentContract.findFirst({
        where: {
          employeeId: input.employeeId,
          status: "ACTIVE",
          AND: [
            {
              OR: [{ expiryDate: null }, { expiryDate: { gte: effectiveDateObj } }],
            },
            ...(expiryDateObj ? [{ effectiveDate: { lte: expiryDateObj } }] : []),
          ],
        },
      });

      if (overlapping) {
        throw new AppError(
          409,
          "CONFLICT_STATE",
          `Nhân sự đã có hợp đồng đang hiệu lực (${overlapping.contractNumber}) trong khoảng thời gian này.`
        );
      }

      if (input.fileAssetId) {
        const asset = await tx.fileAsset.findUnique({
          where: { id: input.fileAssetId },
          select: { id: true },
        });
        if (!asset) {
          throw new AppError(422, "VALIDATION_FAILED", "Tệp đính kèm (fileAssetId) không tồn tại.");
        }
      }

      // 4. Tạo hợp đồng mới
      const created = await tx.employmentContract.create({
        data: {
          employeeId: input.employeeId,
          contractNumber: input.contractNumber,
          contractType: input.contractType as ContractType,
          signedDate: signedDateObj,
          effectiveDate: effectiveDateObj,
          expiryDate: expiryDateObj,
          salaryCoefficient: input.salaryCoefficient,
          fileAssetId: input.fileAssetId || null,
          status: "ACTIVE",
        },
      });

      await tx.auditEvent.create({
        data: {
          userId: currentUser?.id ?? null,
          action: "CONTRACT_CREATED",
          entityName: "EmploymentContract",
          entityId: created.id,
          diffData: {
            employeeId: input.employeeId,
            contractNumber: created.contractNumber,
            contractType: created.contractType,
            effectiveDate: input.effectiveDate,
            expiryDate: input.expiryDate ?? null,
          },
        },
      });

      return { emp: employee, contract: created };
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
    const signedDateObj = new Date(`${input.signedDate}T00:00:00.000Z`);
    const effectiveDateObj = new Date(`${input.effectiveDate}T00:00:00.000Z`);
    const expiryDateObj =
      input.contractType === "INDEFINITE_TERM" || !input.expiryDate
        ? null
        : new Date(`${input.expiryDate}T00:00:00.000Z`);

    // Toàn bộ kiểm tra trạng thái + cập nhật có điều kiện + tạo hợp đồng mới chạy nguyên tử trong $transaction
    const { parentContract, newContract } = await prisma.$transaction(async (tx) => {
      const parent = await tx.employmentContract.findUnique({
        where: { id: parentContractId },
        include: {
          employee: {
            select: {
              id: true,
              employeeCode: true,
              fullName: true,
              employmentStatus: true,
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

      if (!parent) {
        throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy hợp đồng gốc cần gia hạn.");
      }

      if (["RESIGNED", "RETIRED"].includes(parent.employee.employmentStatus)) {
        throw new AppError(
          409,
          "CONFLICT_STATE",
          "Không thể gia hạn hợp đồng cho nhân sự đã thôi việc hoặc nghỉ hưu."
        );
      }

      if (parent.contractType === "INDEFINITE_TERM") {
        throw new AppError(
          409,
          "CONFLICT_STATE",
          "Hợp đồng không xác định thời hạn không thể thực hiện gia hạn."
        );
      }

      if (!["ACTIVE", "EXPIRED"].includes(parent.status)) {
        throw new AppError(
          409,
          "CONFLICT_STATE",
          `Hợp đồng hiện tại đang ở trạng thái ${parent.status}, không thể gia hạn.`
        );
      }

      // Kiểm tra trùng số hợp đồng mới
      const duplicate = await tx.employmentContract.findUnique({
        where: { contractNumber: input.contractNumber },
      });

      if (duplicate) {
        throw new AppError(
          409,
          "CONFLICT_STATE",
          `Số hợp đồng mới ${input.contractNumber} đã tồn tại.`
        );
      }

      if (input.fileAssetId) {
        const asset = await tx.fileAsset.findUnique({
          where: { id: input.fileAssetId },
          select: { id: true },
        });
        if (!asset) {
          throw new AppError(422, "VALIDATION_FAILED", "Tệp đính kèm (fileAssetId) không tồn tại.");
        }
      }

      // Cập nhật có điều kiện chống race-condition khi 2 request gia hạn cùng lúc
      const updatedParent = await tx.employmentContract.updateMany({
        where: {
          id: parentContractId,
          status: { in: ["ACTIVE", "EXPIRED"] },
        },
        data: { status: "RENEWED" },
      });

      if (updatedParent.count !== 1) {
        throw new AppError(
          409,
          "CONFLICT_STATE",
          "Hợp đồng gốc đã được gia hạn hoặc thay đổi trạng thái bởi giao dịch khác."
        );
      }

      // Chặn trường hợp nhân sự còn hợp đồng ACTIVE khác chồng chéo thời gian
      const overlappingOther = await tx.employmentContract.findFirst({
        where: {
          employeeId: parent.employeeId,
          id: { not: parentContractId },
          status: "ACTIVE",
          AND: [
            {
              OR: [{ expiryDate: null }, { expiryDate: { gte: effectiveDateObj } }],
            },
            ...(expiryDateObj ? [{ effectiveDate: { lte: expiryDateObj } }] : []),
          ],
        },
      });

      if (overlappingOther) {
        throw new AppError(
          409,
          "CONFLICT_STATE",
          `Nhân sự đã có hợp đồng hiệu lực khác (${overlappingOther.contractNumber}) trùng thời gian.`
        );
      }

      // Tạo hợp đồng mới liên kết cha-con
      const created = await tx.employmentContract.create({
        data: {
          employeeId: parent.employeeId,
          contractNumber: input.contractNumber,
          contractType: input.contractType as ContractType,
          signedDate: signedDateObj,
          effectiveDate: effectiveDateObj,
          expiryDate: expiryDateObj,
          salaryCoefficient: input.salaryCoefficient,
          fileAssetId: input.fileAssetId || null,
          parentContractId: parentContractId,
          status: "ACTIVE",
        },
      });

      await tx.auditEvent.create({
        data: {
          userId: currentUser?.id ?? null,
          action: "CONTRACT_RENEWED",
          entityName: "EmploymentContract",
          entityId: created.id,
          diffData: {
            parentContractId,
            parentContractNumber: parent.contractNumber,
            contractNumber: created.contractNumber,
            contractType: created.contractType,
            effectiveDate: input.effectiveDate,
            expiryDate: input.expiryDate ?? null,
            note: input.note ?? null,
          },
        },
      });

      return { parentContract: parent, newContract: created };
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
