import { prisma } from "@bahau/database";
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
    const isGlobalHR = currentUser?.roles.some((r) =>
      ["ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_SYSADMIN"].includes(r)
    );

    if (query.unitId) {
      // Lọc theo đơn vị cụ thể
      where.assignments = {
        some: {
          unitId: query.unitId,
          status: "ACTIVE",
        },
      };
    } else if (!isGlobalHR && currentUser?.unitsManaged && currentUser.unitsManaged.length > 0) {
      // Trưởng đơn vị: Chỉ thấy nhân sự thuộc các đơn vị mình quản lý hoặc đơn vị con
      const allAllowedUnitIds = new Set<string>();
      for (const unitId of currentUser.unitsManaged) {
        const descendantIds = await UnitService.getDescendantUnitIds(unitId);
        descendantIds.forEach((id) => allAllowedUnitIds.add(id));
      }

      where.assignments = {
        some: {
          unitId: { in: Array.from(allAllowedUnitIds) },
          status: "ACTIVE",
        },
      };
    }

    const [totalItems, employees] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
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

    const primaryAssignment = emp.assignments.find((a) => a.assignmentType === "PRIMARY");

    const isSelf = currentUser?.employeeId === id;
    const canViewSensitive =
      isSelf ||
      currentUser?.roles.some((r) => ["ROLE_HR_OFFICER", "ROLE_SYSADMIN"].includes(r));

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
   * Tự phục vụ: Giảng viên cập nhật thông tin liên hệ cá nhân
   */
  public static async updateMyContact(
    currentUser: AuthUser,
    input: UpdateMyContactInput
  ): Promise<EmployeeDetailedDto> {
    if (!currentUser.employeeId) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Tài khoản chưa được liên kết với hồ sơ nhân sự.");
    }

    await prisma.employee.update({
      where: { id: currentUser.employeeId },
      data: {
        phoneNumber: input.phoneNumber !== undefined ? input.phoneNumber : undefined,
        personalEmail: input.personalEmail !== undefined ? input.personalEmail : undefined,
        currentAddress: input.currentAddress !== undefined ? input.currentAddress : undefined,
      },
    });

    return (await this.getEmployeeById(currentUser.employeeId, currentUser)) as EmployeeDetailedDto;
  }

  /**
   * Sinh mã nhân sự chuẩn DAU: DAU + 2 số năm + 4 số thứ tự (ví dụ: DAU260001)
   */
  public static async generateEmployeeCode(): Promise<string> {
    const yearPrefix = `DAU${new Date().getFullYear().toString().slice(-2)}`;
    const lastEmployee = await prisma.employee.findFirst({
      where: { employeeCode: { startsWith: yearPrefix } },
      orderBy: { employeeCode: "desc" },
      select: { employeeCode: true },
    });

    let sequence = 1;
    if (lastEmployee?.employeeCode) {
      const numStr = lastEmployee.employeeCode.replace(yearPrefix, "");
      const parsed = parseInt(numStr, 10);
      if (!isNaN(parsed)) {
        sequence = parsed + 1;
      }
    }

    return `${yearPrefix}${sequence.toString().padStart(4, "0")}`;
  }

  /**
   * Tạo mới hồ sơ nhân sự chính thức
   */
  public static async createEmployee(input: CreateEmployeeInput): Promise<EmployeeDetailedDto> {
    const employeeCode = input.employeeCode || (await this.generateEmployeeCode());

    // Kiểm tra trùng mã hoặc CCCD
    const existing = await prisma.employee.findFirst({
      where: {
        OR: [{ employeeCode }, { idCardNumber: input.idCardNumber }, { workEmail: input.workEmail }],
      },
    });

    if (existing) {
      if (existing.employeeCode === employeeCode) {
        throw new AppError(409, "CONFLICT_STATE", `Mã nhân sự '${employeeCode}' đã tồn tại.`);
      }
      if (existing.idCardNumber === input.idCardNumber) {
        throw new AppError(409, "CONFLICT_STATE", `Số CCCD '${input.idCardNumber}' đã tồn tại.`);
      }
      if (existing.workEmail === input.workEmail) {
        throw new AppError(409, "CONFLICT_STATE", `Email làm việc '${input.workEmail}' đã tồn tại.`);
      }
    }

    const created = await prisma.employee.create({
      data: {
        employeeCode,
        fullName: input.fullName,
        gender: input.gender as any,
        dateOfBirth: new Date(input.dateOfBirth),
        idCardNumber: input.idCardNumber,
        idCardIssueDate: input.idCardIssueDate ? new Date(input.idCardIssueDate) : null,
        idCardIssuePlace: input.idCardIssuePlace || null,
        taxCode: input.taxCode || null,
        personalEmail: input.personalEmail || null,
        workEmail: input.workEmail,
        phoneNumber: input.phoneNumber || null,
        currentAddress: input.currentAddress || null,
        academicTitle: (input.academicTitle as any) || "NONE",
        academicDegree: (input.academicDegree as any) || "BACHELOR",
        employmentStatus: (input.employmentStatus as any) || "ACTIVE",
        hireDate: new Date(input.hireDate),
        assignments: {
          create: {
            unitId: input.initialUnitId,
            positionId: input.initialPositionId,
            assignmentType: "PRIMARY",
            startDate: new Date(input.hireDate),
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
