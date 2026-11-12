import { prisma } from "@bahau/database";
import { hash } from "@node-rs/argon2";
import { AppError } from "../middlewares/error.middleware.js";
import { UnitService } from "./unit.service.js";
import type {
  EmployeeBasicDto,
  EmployeeDetailedDto,
  CreateEmployeeInput,
  UpdateMyContactInput,
  EmployeeFilterQuery,
  AuthUser,
} from "@bahau/contracts";

export class EmployeeService {
  /**
   * Lấy danh sách nhân sự có phân trang, tìm kiếm và lọc theo Scope quyền
   */
  public static async getEmployees(
    query: EmployeeFilterQuery,
    currentUser?: AuthUser
  ): Promise<{
    items: EmployeeBasicDto[];
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

    const where: any = {};

    // 1. Lọc theo trạng thái
    if (query.status) {
      where.employmentStatus = query.status;
    }

    // 2. Tìm kiếm theo tên, mã CBGV, email
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { fullName: { contains: term, mode: "insensitive" } },
        { employeeCode: { contains: term, mode: "insensitive" } },
        { workEmail: { contains: term, mode: "insensitive" } },
      ];
    }

    // 3. Kiểm soát Scope theo vai trò
    const isGlobal = Boolean(
      currentUser?.roles.some((r) =>
        ["ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_SYSADMIN"].includes(r)
      )
    );
    const isUnitHeadWithUnits = Boolean(
      currentUser?.roles.includes("ROLE_UNIT_HEAD") &&
        currentUser.unitsManaged &&
        currentUser.unitsManaged.length > 0
    );

    if (isGlobal) {
      if (query.unitId) {
        where.assignments = {
          some: {
            unitId: query.unitId,
            status: "ACTIVE",
          },
        };
      }
    } else if (isUnitHeadWithUnits) {
      // Trưởng đơn vị: Chỉ thấy nhân sự thuộc các đơn vị mình quản lý hoặc đơn vị con
      const unitLists = await Promise.all(
        currentUser!.unitsManaged.map((unitId) => UnitService.getDescendantUnitIds(unitId))
      );
      const allAllowedUnitIds = new Set(unitLists.flat());

      if (query.unitId) {
        if (!allAllowedUnitIds.has(query.unitId)) {
          throw new AppError(
            403,
            "FORBIDDEN",
            "Bạn không có quyền xem danh sách nhân sự của đơn vị này."
          );
        }
        where.assignments = {
          some: {
            unitId: query.unitId,
            status: "ACTIVE",
          },
        };
      } else {
        where.assignments = {
          some: {
            unitId: { in: Array.from(allAllowedUnitIds) },
            status: "ACTIVE",
          },
        };
      }
    } else {
      // Cán bộ thông thường hoặc Trưởng đơn vị chưa được gán đơn vị: Chỉ thấy hồ sơ của chính mình
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
      where.id = currentUser.employeeId;
    }

    const sortFieldMap: Record<string, string> = {
      createdAt: "createdAt",
      fullName: "fullName",
      employeeCode: "employeeCode",
      hireDate: "hireDate",
    };
    const sortBy = sortFieldMap[query.sortBy || "createdAt"] || "createdAt";
    const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

    const [totalItems, employees] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [sortBy]: sortOrder },
        include: {
          assignments: {
            where: { assignmentType: "PRIMARY", status: "ACTIVE" },
            include: {
              unit: { select: { name: true } },
              position: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const items: EmployeeBasicDto[] = employees.map((emp) => {
      const primaryAssignment = emp.assignments[0];
      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        gender: emp.gender as any,
        workEmail: emp.workEmail,
        phoneNumber: emp.phoneNumber,
        academicTitle: emp.academicTitle as any,
        academicDegree: emp.academicDegree as any,
        employmentStatus: emp.employmentStatus as any,
        hireDate: emp.hireDate.toISOString().split("T")[0],
        primaryUnitName: primaryAssignment?.unit?.name || null,
        primaryPositionName: primaryAssignment?.position?.name || null,
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
   * Lấy chi tiết hồ sơ một nhân sự (tự động phân quyền hiển thị dữ liệu nhạy cảm)
   */
  public static async getEmployeeById(
    id: string,
    currentUser?: AuthUser
  ): Promise<EmployeeDetailedDto | EmployeeBasicDto> {
    const emp = await prisma.employee.findUnique({
      where: { id },
      include: {
        assignments: {
          where: { status: "ACTIVE" },
          include: {
            unit: { select: { name: true } },
            position: { select: { name: true } },
          },
        },
      },
    });

    if (!emp) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy hồ sơ nhân sự yêu cầu.");
    }

    const isSelf = Boolean(currentUser?.employeeId && currentUser.employeeId === id);
    const isGlobalBasic = Boolean(
      currentUser?.roles.some((r) =>
        ["ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_SYSADMIN"].includes(r)
      )
    );

    if (!isSelf && !isGlobalBasic) {
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
        hasUnitAccess = emp.assignments.some((a) => allAllowedUnitIds.has(a.unitId));
      }

      if (!hasUnitAccess) {
        throw new AppError(403, "FORBIDDEN", "Bạn không có quyền xem hồ sơ nhân sự này.");
      }
    }

    const primaryAssignment = emp.assignments.find((a) => a.assignmentType === "PRIMARY");

    // ROLE_SYSADMIN không có quyền employee:read_sensitive (chỉ bản thân, HR, Ban Giám hiệu)
    const canViewSensitive =
      isSelf ||
      Boolean(currentUser?.roles.some((r) => ["ROLE_HR_OFFICER", "ROLE_RECTOR"].includes(r)));

    const basic: EmployeeBasicDto = {
      id: emp.id,
      employeeCode: emp.employeeCode,
      fullName: emp.fullName,
      gender: emp.gender as any,
      workEmail: emp.workEmail,
      phoneNumber: emp.phoneNumber,
      academicTitle: emp.academicTitle as any,
      academicDegree: emp.academicDegree as any,
      employmentStatus: emp.employmentStatus as any,
      hireDate: emp.hireDate.toISOString().split("T")[0],
      primaryUnitName: primaryAssignment?.unit?.name || null,
      primaryPositionName: primaryAssignment?.position?.name || null,
    };

    if (!canViewSensitive) {
      return basic;
    }

    const detailed: EmployeeDetailedDto = {
      ...basic,
      dateOfBirth: emp.dateOfBirth.toISOString().split("T")[0],
      idCardNumber: emp.idCardNumber,
      idCardIssueDate: emp.idCardIssueDate?.toISOString().split("T")[0] || null,
      idCardIssuePlace: emp.idCardIssuePlace || null,
      taxCode: emp.taxCode || null,
      personalEmail: emp.personalEmail || null,
      currentAddress: emp.currentAddress || null,
      userId: emp.userId || null,
    };

    return detailed;
  }

  /**
   * Lấy hồ sơ cá nhân của người dùng đăng nhập hiện tại
   */
  public static async getMyProfile(currentUser: AuthUser): Promise<EmployeeDetailedDto> {
    if (!currentUser.employeeId) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Tài khoản chưa được liên kết với hồ sơ nhân sự.");
    }

    return (await this.getEmployeeById(currentUser.employeeId, currentUser)) as EmployeeDetailedDto;
  }

  /**
   * Tự phục vụ: Giảng viên cập nhật thông tin liên hệ cá nhân (hỗ trợ xóa trường nullable & ghi AuditEvent)
   */
  public static async updateMyContact(
    currentUser: AuthUser,
    input: UpdateMyContactInput
  ): Promise<EmployeeDetailedDto> {
    if (!currentUser.employeeId) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Tài khoản chưa được liên kết với hồ sơ nhân sự.");
    }

    const existing = await prisma.employee.findUnique({
      where: { id: currentUser.employeeId },
      select: {
        id: true,
        phoneNumber: true,
        personalEmail: true,
        currentAddress: true,
      },
    });

    if (!existing) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy hồ sơ nhân sự yêu cầu.");
    }

    const nextPhoneNumber =
      input.phoneNumber === undefined
        ? undefined
        : input.phoneNumber === null
          ? null
          : input.phoneNumber.trim();
    const nextPersonalEmail =
      input.personalEmail === undefined
        ? undefined
        : input.personalEmail === null
          ? null
          : input.personalEmail.toLowerCase().trim();
    const nextCurrentAddress =
      input.currentAddress === undefined
        ? undefined
        : input.currentAddress === null
          ? null
          : input.currentAddress.trim();

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: currentUser.employeeId! },
        data: {
          phoneNumber: nextPhoneNumber,
          personalEmail: nextPersonalEmail,
          currentAddress: nextCurrentAddress,
        },
      });

      await tx.auditEvent.create({
        data: {
          userId: currentUser.id,
          action: "EMPLOYEE_CONTACT_UPDATED",
          entityName: "Employee",
          entityId: currentUser.employeeId!,
          diffData: {
            before: {
              phoneNumber: existing.phoneNumber,
              personalEmail: existing.personalEmail,
              currentAddress: existing.currentAddress,
            },
            after: {
              phoneNumber: nextPhoneNumber !== undefined ? nextPhoneNumber : existing.phoneNumber,
              personalEmail:
                nextPersonalEmail !== undefined ? nextPersonalEmail : existing.personalEmail,
              currentAddress:
                nextCurrentAddress !== undefined ? nextCurrentAddress : existing.currentAddress,
            },
          },
        },
      });
    });

    return (await this.getEmployeeById(currentUser.employeeId, currentUser)) as EmployeeDetailedDto;
  }

  /**
   * Sinh mã nhân sự chuẩn DAU: DAU + 2 số năm + 4 số thứ tự (ví dụ: DAU260001)
   * Chỉ xét các mã đúng mẫu DAU<YY><digits> để không bị reset bởi mã tùy chỉnh (như DAU26TEMP).
   */
  public static async generateEmployeeCode(tx: any = prisma): Promise<string> {
    const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const yearPrefix = `DAU${vnNow.getUTCFullYear().toString().slice(-2)}`;
    const pattern = new RegExp(`^${yearPrefix}(\\d+)$`);

    const existingEmployees = await tx.employee.findMany({
      where: { employeeCode: { startsWith: yearPrefix } },
      select: { employeeCode: true },
    });

    let maxSequence = 0;
    for (const row of existingEmployees) {
      const match = pattern.exec(row.employeeCode);
      if (match) {
        const parsed = Number.parseInt(match[1], 10);
        if (Number.isFinite(parsed) && parsed > maxSequence) {
          maxSequence = parsed;
        }
      }
    }

    const nextSequence = maxSequence + 1;
    return `${yearPrefix}${nextSequence.toString().padStart(4, "0")}`;
  }

  /**
   * Tạo mới hồ sơ nhân sự chính thức trong Transaction (kèm User, RoleAssignment, HIRED event, AuditEvent)
   */
  public static async createEmployee(
    input: CreateEmployeeInput,
    currentUser?: AuthUser
  ): Promise<EmployeeDetailedDto> {
    const normalizedWorkEmail = input.workEmail.toLowerCase().trim();
    const normalizedPersonalEmail = input.personalEmail
      ? input.personalEmail.toLowerCase().trim()
      : null;
    const customCode = input.employeeCode?.trim() || undefined;
    const shouldCreateUser = input.createUserAccount !== false;

    // Kiểm tra đơn vị và chức vụ ban đầu hợp lệ
    const [initialUnit, initialPosition] = await Promise.all([
      prisma.organizationalUnit.findUnique({ where: { id: input.initialUnitId } }),
      prisma.position.findUnique({ where: { id: input.initialPositionId } }),
    ]);

    if (!initialUnit) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Đơn vị trực thuộc ban đầu không tồn tại.");
    }
    if (!initialUnit.isActive) {
      throw new AppError(422, "VALIDATION_FAILED", "Đơn vị trực thuộc ban đầu đang ngừng hoạt động.");
    }
    if (!initialPosition) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Chức vụ / chức danh ban đầu không tồn tại.");
    }
    if (!initialPosition.isActive) {
      throw new AppError(422, "VALIDATION_FAILED", "Chức vụ / chức danh ban đầu đang ngừng hoạt động.");
    }

    let passwordHash: string | null = null;
    if (shouldCreateUser) {
      const defaultPassword = process.env.DEFAULT_EMPLOYEE_PASSWORD || "Admin@123456";
      passwordHash = await hash(defaultPassword, {
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });
    }

    const maxAttempts = customCode ? 1 : 5;
    let created: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        created = await prisma.$transaction(async (tx) => {
          const employeeCode = customCode || (await this.generateEmployeeCode(tx));

          const existing = await tx.employee.findFirst({
            where: {
              OR: [
                { employeeCode },
                { idCardNumber: input.idCardNumber.trim() },
                { workEmail: normalizedWorkEmail },
              ],
            },
          });

          if (existing) {
            if (existing.employeeCode === employeeCode) {
              throw new AppError(
                409,
                "CONFLICT_STATE",
                `Mã nhân sự '${employeeCode}' đã tồn tại.`
              );
            }
            if (existing.idCardNumber === input.idCardNumber.trim()) {
              throw new AppError(
                409,
                "CONFLICT_STATE",
                `Số CCCD '${input.idCardNumber}' đã tồn tại.`
              );
            }
            if (existing.workEmail === normalizedWorkEmail) {
              throw new AppError(
                409,
                "CONFLICT_STATE",
                `Email làm việc '${normalizedWorkEmail}' đã tồn tại.`
              );
            }
          }

          let createdUserId: string | null = null;
          if (shouldCreateUser && passwordHash) {
            const existingUser = await tx.user.findUnique({
              where: { email: normalizedWorkEmail },
            });
            if (existingUser) {
              throw new AppError(
                409,
                "CONFLICT_STATE",
                `Tài khoản đăng nhập với email '${normalizedWorkEmail}' đã tồn tại.`
              );
            }

            const createdUser = await tx.user.create({
              data: {
                email: normalizedWorkEmail,
                passwordHash,
                status: "ACTIVE",
              },
            });
            createdUserId = createdUser.id;

            const employeeRole = await tx.role.findUnique({
              where: { code: "ROLE_EMPLOYEE" },
            });
            if (employeeRole) {
              await tx.roleAssignment.create({
                data: {
                  userId: createdUser.id,
                  roleId: employeeRole.id,
                  validFrom: new Date(),
                },
              });
            }
          }

          const hireDateObj = new Date(`${input.hireDate}T00:00:00.000Z`);
          const dobObj = new Date(`${input.dateOfBirth}T00:00:00.000Z`);
          const idCardIssueDateObj = input.idCardIssueDate
            ? new Date(`${input.idCardIssueDate}T00:00:00.000Z`)
            : null;

          const empRecord = await tx.employee.create({
            data: {
              userId: createdUserId,
              employeeCode,
              fullName: input.fullName.trim(),
              gender: input.gender as any,
              dateOfBirth: dobObj,
              idCardNumber: input.idCardNumber.trim(),
              idCardIssueDate: idCardIssueDateObj,
              idCardIssuePlace: input.idCardIssuePlace || null,
              taxCode: input.taxCode || null,
              personalEmail: normalizedPersonalEmail,
              workEmail: normalizedWorkEmail,
              phoneNumber: input.phoneNumber || null,
              currentAddress: input.currentAddress || null,
              academicTitle: (input.academicTitle as any) || "NONE",
              academicDegree: (input.academicDegree as any) || "BACHELOR",
              employmentStatus: (input.employmentStatus as any) || "ACTIVE",
              hireDate: hireDateObj,
              assignments: {
                create: {
                  unitId: input.initialUnitId,
                  positionId: input.initialPositionId,
                  assignmentType: "PRIMARY",
                  startDate: hireDateObj,
                  status: "ACTIVE",
                },
              },
            },
            include: {
              assignments: {
                include: {
                  unit: { select: { name: true } },
                  position: { select: { name: true } },
                },
              },
            },
          });

          await tx.employmentEvent.create({
            data: {
              employeeId: empRecord.id,
              eventType: "HIRED",
              effectiveDate: hireDateObj,
              toUnitId: input.initialUnitId,
              toPositionId: input.initialPositionId,
              note: "Tiếp nhận nhân sự mới",
            },
          });

          await tx.auditEvent.create({
            data: {
              userId: currentUser?.id ?? null,
              action: "EMPLOYEE_CREATED",
              entityName: "Employee",
              entityId: empRecord.id,
              diffData: {
                after: {
                  employeeCode: empRecord.employeeCode,
                  fullName: empRecord.fullName,
                  workEmail: empRecord.workEmail,
                  employmentStatus: empRecord.employmentStatus,
                  initialUnitId: input.initialUnitId,
                  initialPositionId: input.initialPositionId,
                  createUserAccount: shouldCreateUser,
                  userId: createdUserId,
                },
              },
            },
          });

          return empRecord;
        });
        break;
      } catch (err: any) {
        const isUniqueViolation =
          typeof err === "object" && err !== null && err.code === "P2002";
        const target = Array.isArray(err?.meta?.target) ? err.meta.target.join(",") : "";
        const isCodeCollision =
          isUniqueViolation && (!target || target.includes("employeeCode") || target.includes("employee_code"));
        if (!customCode && isCodeCollision && attempt < maxAttempts) {
          continue;
        }
        throw err;
      }
    }

    return {
      id: created.id,
      employeeCode: created.employeeCode,
      fullName: created.fullName,
      gender: created.gender as any,
      workEmail: created.workEmail,
      phoneNumber: created.phoneNumber,
      academicTitle: created.academicTitle as any,
      academicDegree: created.academicDegree as any,
      employmentStatus: created.employmentStatus as any,
      hireDate: created.hireDate.toISOString().split("T")[0],
      primaryUnitName: created.assignments[0]?.unit?.name || null,
      primaryPositionName: created.assignments[0]?.position?.name || null,
      dateOfBirth: created.dateOfBirth.toISOString().split("T")[0],
      idCardNumber: created.idCardNumber,
      idCardIssueDate: created.idCardIssueDate?.toISOString().split("T")[0] || null,
      idCardIssuePlace: created.idCardIssuePlace || null,
      taxCode: created.taxCode || null,
      personalEmail: created.personalEmail || null,
      currentAddress: created.currentAddress || null,
      userId: created.userId || null,
    };
  }
}
