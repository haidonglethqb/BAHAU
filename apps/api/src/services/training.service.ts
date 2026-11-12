import { prisma } from "@bahau/database";
import {
  AuthUser,
  CreateCertificateInput,
  VerifyCertificateInput,
  CreateTrainingCourseInput,
  RegisterTrainingCourseInput,
  UpdateParticipantStatusInput,
  CertificateFilterQuery,
  CertificateDto,
  TrainingCourseDto,
  TrainingParticipantDto,
  CertificateExpiryAlertStatus,
} from "@bahau/contracts";
import { AppError } from "../middlewares/error.middleware.js";
import { UnitService } from "./unit.service.js";

export class TrainingService {
  private static courseMaxParticipants = new Map<string, number>();

  /**
   * Tính toán tình trạng cảnh báo hạn sử dụng của chứng chỉ (so sánh ngày lịch theo UTC+7)
   */
  private static calculateExpiryAlert(expiryDate: Date | null): {
    daysUntilExpiry: number | null;
    alertStatus: CertificateExpiryAlertStatus | null;
  } {
    if (!expiryDate) {
      return { daysUntilExpiry: null, alertStatus: null };
    }

    const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
    const nowVn = new Date(Date.now() + VN_OFFSET_MS);
    const todayUtcMidnight = Date.UTC(
      nowVn.getUTCFullYear(),
      nowVn.getUTCMonth(),
      nowVn.getUTCDate()
    );

    const expDate = new Date(expiryDate);
    const expUtcMidnight = Date.UTC(
      expDate.getUTCFullYear(),
      expDate.getUTCMonth(),
      expDate.getUTCDate()
    );

    const diffTime = expUtcMidnight - todayUtcMidnight;
    const daysUntilExpiry = Math.round(diffTime / (1000 * 60 * 60 * 24));

    let alertStatus: CertificateExpiryAlertStatus;
    if (daysUntilExpiry < 0) {
      alertStatus = "EXPIRED";
    } else if (daysUntilExpiry <= 30) {
      alertStatus = "CRITICAL_30";
    } else if (daysUntilExpiry <= 60) {
      alertStatus = "WARNING_60";
    } else if (daysUntilExpiry <= 90) {
      alertStatus = "WARNING_90";
    } else {
      alertStatus = "VALID";
    }

    return { daysUntilExpiry, alertStatus };
  }

  /**
   * 1. Tra cứu danh sách chứng chỉ của cá nhân CBGV hiện tại
   */
  static async getMyCertificates(employeeId: string): Promise<CertificateDto[]> {
    const certs = await prisma.certificate.findMany({
      where: { employeeId },
      include: {
        employee: {
          include: {
            assignments: {
              where: { assignmentType: "PRIMARY", status: "ACTIVE" },
              include: { unit: true },
            },
          },
        },
        verifiedBy: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return certs.map((c) => {
      const primaryAssignment = c.employee.assignments[0];
      const { daysUntilExpiry, alertStatus } = this.calculateExpiryAlert(c.expiryDate);

      return {
        id: c.id,
        employeeId: c.employeeId,
        employeeCode: c.employee.employeeCode,
        employeeName: c.employee.fullName,
        unitName: primaryAssignment?.unit?.name || "Chưa phân bổ",
        certificateType: c.certificateType,
        name: c.name,
        certificateNumber: c.certificateNumber,
        issuedBy: c.issuedBy,
        issuedDate: c.issuedDate.toISOString().split("T")[0],
        expiryDate: c.expiryDate ? c.expiryDate.toISOString().split("T")[0] : null,
        score: c.score,
        fileUrl: c.fileUrl,
        status: c.status,
        verifiedById: c.verifiedById,
        verifierName: c.verifiedBy?.fullName || null,
        verifiedAt: c.verifiedAt ? c.verifiedAt.toISOString() : null,
        rejectionReason: c.rejectionReason,
        daysUntilExpiry,
        expiryAlertStatus: alertStatus,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });
  }

  /**
   * 2. CBGV nộp / khai báo chứng chỉ mới (Trạng thái mặc định: PENDING)
   */
  static async submitCertificate(employeeId: string, input: CreateCertificateInput): Promise<CertificateDto> {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        assignments: {
          where: { assignmentType: "PRIMARY", status: "ACTIVE" },
          include: { unit: true },
        },
      },
    });

    if (!employee) {
      throw new AppError(404, "NOT_FOUND", "Không tìm thấy hồ sơ nhân sự của bạn trong hệ thống");
    }

    const certNumber = input.certificateNumber.trim();

    // Kiểm tra trùng số hiệu chứng chỉ trên toàn hệ thống (ngoại trừ các chứng chỉ đã REJECTED)
    const existingActive = await prisma.certificate.findFirst({
      where: {
        certificateNumber: certNumber,
        status: { not: "REJECTED" },
      },
    });

    if (existingActive) {
      throw new AppError(
        409,
        "DUPLICATE_ENTRY",
        existingActive.employeeId === employeeId
          ? `Số hiệu chứng chỉ '${input.certificateNumber}' đã được bạn khai báo trước đó`
          : `Số hiệu chứng chỉ '${input.certificateNumber}' đã được khai báo trên hệ thống`
      );
    }

    // Cho phép CBGV nộp lại chứng chỉ nếu bản ghi trước đó của chính họ bị REJECTED
    const existingRejected = await prisma.certificate.findFirst({
      where: {
        employeeId,
        certificateNumber: certNumber,
        status: "REJECTED",
      },
    });

    const certInclude = {
      employee: {
        include: {
          assignments: {
            where: { assignmentType: "PRIMARY" as const, status: "ACTIVE" as const },
            include: { unit: true },
          },
        },
      },
    };

    const created = existingRejected
      ? await prisma.certificate.update({
          where: { id: existingRejected.id },
          data: {
            certificateType: input.certificateType,
            name: input.name.trim(),
            issuedBy: input.issuedBy.trim(),
            issuedDate: new Date(input.issuedDate),
            expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
            score: input.score ? input.score.trim() : null,
            fileUrl: input.fileUrl || null,
            status: "PENDING",
            verifiedById: null,
            verifiedAt: null,
            rejectionReason: null,
          },
          include: certInclude,
        })
      : await prisma.certificate.create({
          data: {
            employeeId,
            certificateType: input.certificateType,
            name: input.name.trim(),
            certificateNumber: certNumber,
            issuedBy: input.issuedBy.trim(),
            issuedDate: new Date(input.issuedDate),
            expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
            score: input.score ? input.score.trim() : null,
            fileUrl: input.fileUrl || null,
            status: "PENDING",
          },
          include: certInclude,
        });

    const primaryAssignment = created.employee.assignments[0];
    const { daysUntilExpiry, alertStatus } = this.calculateExpiryAlert(created.expiryDate);

    return {
      id: created.id,
      employeeId: created.employeeId,
      employeeCode: created.employee.employeeCode,
      employeeName: created.employee.fullName,
      unitName: primaryAssignment?.unit?.name || "Chưa phân bổ",
      certificateType: created.certificateType,
      name: created.name,
      certificateNumber: created.certificateNumber,
      issuedBy: created.issuedBy,
      issuedDate: created.issuedDate.toISOString().split("T")[0],
      expiryDate: created.expiryDate ? created.expiryDate.toISOString().split("T")[0] : null,
      score: created.score,
      fileUrl: created.fileUrl,
      status: created.status,
      verifiedById: null,
      verifierName: null,
      verifiedAt: null,
      rejectionReason: null,
      daysUntilExpiry,
      expiryAlertStatus: alertStatus,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  /**
   * Xác định tập unitId hợp lệ khi tra cứu chứng chỉ theo vai trò và cây đơn vị quản lý
   */
  private static async resolveAllowedCertificateUnitIds(
    requestedUnitId?: string,
    currentUser?: AuthUser
  ): Promise<string[] | null> {
    if (!currentUser) {
      throw new AppError(401, "UNAUTHENTICATED", "Yêu cầu đăng nhập để tra cứu chứng chỉ.");
    }

    const isGlobalHR = currentUser.roles.some((r) =>
      ["ROLE_HR_OFFICER", "ROLE_RECTOR"].includes(r)
    );
    const isUnitHead = currentUser.roles.includes("ROLE_UNIT_HEAD");

    if (!isGlobalHR) {
      if (!isUnitHead) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "Bạn không có quyền tra cứu danh sách chứng chỉ của đơn vị hoặc toàn trường."
        );
      }

      const managedRoots = currentUser.unitsManaged || [];
      if (managedRoots.length === 0) {
        return [];
      }

      const trees = await Promise.all(
        Array.from(new Set(managedRoots)).map((uid) => UnitService.getDescendantUnitIds(uid))
      );
      const allowedSet = new Set<string>();
      for (const tree of trees) {
        for (const id of tree) allowedSet.add(id);
      }

      if (allowedSet.size === 0) {
        return [];
      }

      if (requestedUnitId) {
        if (!allowedSet.has(requestedUnitId)) {
          throw new AppError(
            403,
            "FORBIDDEN",
            "Bạn không có quyền xem chứng chỉ thuộc đơn vị ngoài phạm vi quản lý."
          );
        }
        const requestedTree = await UnitService.getDescendantUnitIds(requestedUnitId);
        return requestedTree.filter((id) => allowedSet.has(id));
      }

      return Array.from(allowedSet);
    }

    if (requestedUnitId) {
      return UnitService.getDescendantUnitIds(requestedUnitId);
    }

    return null;
  }

  /**
   * 3. Tra cứu danh sách chứng chỉ toàn trường / theo đơn vị (Phòng TCHC & Quản lý)
   */
  static async getAllCertificates(
    query: CertificateFilterQuery,
    currentUser?: AuthUser
  ): Promise<CertificateDto[]> {
    const targetUnitIds = await this.resolveAllowedCertificateUnitIds(query.unitId, currentUser);
    if (targetUnitIds !== null && targetUnitIds.length === 0) {
      return [];
    }

    const where: any = {};

    if (query.certificateType) where.certificateType = query.certificateType;
    if (query.status) where.status = query.status;
    if (query.employeeId) where.employeeId = query.employeeId;

    if (targetUnitIds !== null) {
      where.employee = {
        assignments: {
          some: {
            unitId: { in: targetUnitIds },
            status: "ACTIVE",
          },
        },
      };
    }

    if (query.search && query.search.trim() !== "") {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { certificateNumber: { contains: term, mode: "insensitive" } },
        { issuedBy: { contains: term, mode: "insensitive" } },
        { employee: { fullName: { contains: term, mode: "insensitive" } } },
        { employee: { employeeCode: { contains: term, mode: "insensitive" } } },
      ];
    }

    const certs = await prisma.certificate.findMany({
      where,
      include: {
        employee: {
          include: {
            assignments: {
              where: { assignmentType: "PRIMARY", status: "ACTIVE" },
              include: { unit: true },
            },
          },
        },
        verifiedBy: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return certs.map((c) => {
      const primaryAssignment = c.employee.assignments[0];
      const { daysUntilExpiry, alertStatus } = this.calculateExpiryAlert(c.expiryDate);

      return {
        id: c.id,
        employeeId: c.employeeId,
        employeeCode: c.employee.employeeCode,
        employeeName: c.employee.fullName,
        unitName: primaryAssignment?.unit?.name || "Chưa phân bổ",
        certificateType: c.certificateType,
        name: c.name,
        certificateNumber: c.certificateNumber,
        issuedBy: c.issuedBy,
        issuedDate: c.issuedDate.toISOString().split("T")[0],
        expiryDate: c.expiryDate ? c.expiryDate.toISOString().split("T")[0] : null,
        score: c.score,
        fileUrl: c.fileUrl,
        status: c.status,
        verifiedById: c.verifiedById,
        verifierName: c.verifiedBy?.fullName || null,
        verifiedAt: c.verifiedAt ? c.verifiedAt.toISOString() : null,
        rejectionReason: c.rejectionReason,
        daysUntilExpiry,
        expiryAlertStatus: alertStatus,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });
  }

  /**
   * 4. Phòng TCHC thẩm định chứng chỉ (VERIFIED hoặc REJECTED)
   */
  static async verifyCertificate(
    certificateId: string,
    verifierEmployeeId: string,
    input: VerifyCertificateInput
  ): Promise<CertificateDto> {
    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        employee: {
          include: {
            assignments: {
              where: { assignmentType: "PRIMARY", status: "ACTIVE" },
              include: { unit: true },
            },
          },
        },
      },
    });

    if (!certificate) {
      throw new AppError(404, "NOT_FOUND", "Không tìm thấy chứng chỉ yêu cầu thẩm định");
    }

    // Anti-Self-Approval: Không cho phép cán bộ tự thẩm định/phê duyệt chứng chỉ của chính mình
    if (certificate.employeeId === verifierEmployeeId) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Quy tắc Anti-Self-Approval: Bạn không được tự thẩm định chứng chỉ của chính mình."
      );
    }

    if (certificate.status !== "PENDING") {
      throw new AppError(
        409,
        "INVALID_STATE_TRANSITION",
        `Chỉ có thể thẩm định chứng chỉ đang ở trạng thái PENDING (trạng thái hiện tại: ${certificate.status}).`
      );
    }

    if (input.status === "VERIFIED" && certificate.expiryDate) {
      const { alertStatus } = this.calculateExpiryAlert(certificate.expiryDate);
      if (alertStatus === "EXPIRED") {
        throw new AppError(
          422,
          "CERTIFICATE_EXPIRED",
          "Chứng chỉ đã hết hạn sử dụng, không thể phê duyệt VERIFIED."
        );
      }
    }

    const updated = await prisma.certificate.update({
      where: { id: certificateId },
      data: {
        status: input.status,
        verifiedById: verifierEmployeeId,
        verifiedAt: new Date(),
        rejectionReason: input.status === "REJECTED" ? input.rejectionReason : null,
      },
      include: {
        employee: {
          include: {
            assignments: {
              where: { assignmentType: "PRIMARY", status: "ACTIVE" },
              include: { unit: true },
            },
          },
        },
        verifiedBy: true,
      },
    });

    const primaryAssignment = updated.employee.assignments[0];
    const { daysUntilExpiry, alertStatus } = this.calculateExpiryAlert(updated.expiryDate);

    return {
      id: updated.id,
      employeeId: updated.employeeId,
      employeeCode: updated.employee.employeeCode,
      employeeName: updated.employee.fullName,
      unitName: primaryAssignment?.unit?.name || "Chưa phân bổ",
      certificateType: updated.certificateType,
      name: updated.name,
      certificateNumber: updated.certificateNumber,
      issuedBy: updated.issuedBy,
      issuedDate: updated.issuedDate.toISOString().split("T")[0],
      expiryDate: updated.expiryDate ? updated.expiryDate.toISOString().split("T")[0] : null,
      score: updated.score,
      fileUrl: updated.fileUrl,
      status: updated.status,
      verifiedById: updated.verifiedById,
      verifierName: updated.verifiedBy?.fullName || null,
      verifiedAt: updated.verifiedAt ? updated.verifiedAt.toISOString() : null,
      rejectionReason: updated.rejectionReason,
      daysUntilExpiry,
      expiryAlertStatus: alertStatus,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * 5. Tra cứu chứng chỉ sắp hết hạn trong N ngày (mặc định 90 ngày)
   */
  static async getExpiringCertificates(
    days: number = 90,
    currentUser?: AuthUser
  ): Promise<CertificateDto[]> {
    if (!Number.isFinite(days) || days < 0 || days > 3650) {
      throw new AppError(422, "VALIDATION_FAILED", "Tham số days phải nằm trong khoảng 0 đến 3650.");
    }
    const certs = await this.getAllCertificates({}, currentUser);
    return certs.filter(
      (c) =>
        c.status !== "REJECTED" &&
        c.daysUntilExpiry !== null &&
        c.daysUntilExpiry !== undefined &&
        c.daysUntilExpiry <= days
    );
  }

  /**
   * 6. Tra cứu danh sách khóa đào tạo bồi dưỡng
   */
  static async getCourses(currentEmployeeId?: string): Promise<TrainingCourseDto[]> {
    const courses = await prisma.trainingCourse.findMany({
      include: {
        participants: true,
      },
      orderBy: { startDate: "desc" },
    });

    return courses.map((c) => {
      const myParticipation = currentEmployeeId
        ? c.participants.find((p) => p.employeeId === currentEmployeeId)
        : null;

      return {
        id: c.id,
        code: c.code,
        name: c.name,
        category: c.category,
        provider: c.provider,
        startDate: c.startDate.toISOString().split("T")[0],
        endDate: c.endDate.toISOString().split("T")[0],
        location: c.location,
        budget: c.budget ? Number(c.budget) : 0,
        status: c.status,
        description: c.description,
        participantCount: c.participants.length,
        isRegisteredByMe: !!myParticipation,
        myParticipantStatus: myParticipation?.status || null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });
  }

  /**
   * 7. Mở khóa đào tạo bồi dưỡng mới (Phòng TCHC)
   */
  static async createCourse(input: CreateTrainingCourseInput): Promise<TrainingCourseDto> {
    const existing = await prisma.trainingCourse.findUnique({
      where: { code: input.code.trim() },
    });

    if (existing) {
      throw new AppError(409, "DUPLICATE_ENTRY", `Mã khóa đào tạo '${input.code}' đã tồn tại trong hệ thống`);
    }

    const course = await prisma.trainingCourse.create({
      data: {
        code: input.code.trim(),
        name: input.name.trim(),
        category: input.category,
        provider: input.provider.trim(),
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        location: input.location ? input.location.trim() : null,
        budget: input.budget ? input.budget : 0,
        description: input.description ? input.description.trim() : null,
        status: "PLANNING",
      },
      include: {
        participants: true,
      },
    });

    return {
      id: course.id,
      code: course.code,
      name: course.name,
      category: course.category,
      provider: course.provider,
      startDate: course.startDate.toISOString().split("T")[0],
      endDate: course.endDate.toISOString().split("T")[0],
      location: course.location,
      budget: course.budget ? Number(course.budget) : 0,
      status: course.status,
      description: course.description,
      participantCount: 0,
      isRegisteredByMe: false,
      myParticipantStatus: null,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
    };
  }

  /**
   * 8. CBGV đăng ký tham gia khóa đào tạo
   */
  static async registerCourse(
    courseId: string,
    employeeId: string,
    input: RegisterTrainingCourseInput
  ): Promise<TrainingParticipantDto> {
    const course = await prisma.trainingCourse.findUnique({
      where: { id: courseId },
      include: {
        participants: {
          where: { status: { not: "DROPPED" } },
          select: { id: true },
        },
      },
    });

    if (!course) {
      throw new AppError(404, "NOT_FOUND", "Không tìm thấy khóa đào tạo yêu cầu đăng ký");
    }

    if (course.status === "COMPLETED" || course.status === "CANCELLED") {
      throw new AppError(400, "INVALID_STATE", "Khóa đào tạo đã kết thúc hoặc bị hủy, không thể đăng ký");
    }

    if (new Date() > new Date(course.startDate)) {
      throw new AppError(
        409,
        "REGISTRATION_CLOSED",
        "Đã quá thời hạn đăng ký (khóa đào tạo đã bắt đầu)."
      );
    }

    const maxParticipants = this.courseMaxParticipants.get(courseId);
    if (maxParticipants !== undefined && course.participants.length >= maxParticipants) {
      throw new AppError(
        409,
        "COURSE_FULL",
        `Khóa đào tạo đã đạt sĩ số tối đa (${maxParticipants} học viên).`
      );
    }

    const existing = await prisma.trainingParticipant.findUnique({
      where: {
        courseId_employeeId: {
          courseId,
          employeeId,
        },
      },
    });

    if (existing && existing.status !== "DROPPED") {
      throw new AppError(409, "DUPLICATE_ENTRY", "Bạn đã đăng ký tham gia khóa đào tạo này rồi");
    }

    const participantInclude = {
      course: true,
      employee: {
        include: {
          assignments: {
            where: { assignmentType: "PRIMARY" as const, status: "ACTIVE" as const },
            include: { unit: true },
          },
        },
      },
    };

    let participant;
    try {
      participant = existing
        ? await prisma.trainingParticipant.update({
            where: { id: existing.id },
            data: {
              status: "REGISTERED",
              grade: null,
              certificateIssued: false,
              note: input.note || null,
            },
            include: participantInclude,
          })
        : await prisma.trainingParticipant.create({
            data: {
              courseId,
              employeeId,
              status: "REGISTERED",
              note: input.note || null,
            },
            include: participantInclude,
          });
    } catch (err: any) {
      if (err?.code === "P2002") {
        throw new AppError(409, "DUPLICATE_ENTRY", "Bạn đã đăng ký tham gia khóa đào tạo này rồi");
      }
      throw err;
    }

    const primaryAssignment = participant.employee.assignments[0];

    return {
      id: participant.id,
      courseId: participant.courseId,
      courseCode: participant.course.code,
      courseName: participant.course.name,
      employeeId: participant.employeeId,
      employeeCode: participant.employee.employeeCode,
      employeeName: participant.employee.fullName,
      unitName: primaryAssignment?.unit?.name || "Chưa phân bổ",
      status: participant.status,
      grade: participant.grade,
      certificateIssued: participant.certificateIssued,
      note: participant.note,
      createdAt: participant.createdAt.toISOString(),
      updatedAt: participant.updatedAt.toISOString(),
    };
  }

  /**
   * 9. Chuyển đổi trạng thái vòng đời khóa đào tạo (PLANNING -> ONGOING -> COMPLETED | CANCELLED)
   */
  static async updateCourseStatus(
    courseId: string,
    nextStatus: "PLANNING" | "ONGOING" | "COMPLETED" | "CANCELLED"
  ): Promise<TrainingCourseDto> {
    const course = await prisma.trainingCourse.findUnique({
      where: { id: courseId },
      include: { participants: true },
    });

    if (!course) {
      throw new AppError(404, "NOT_FOUND", "Không tìm thấy khóa đào tạo");
    }

    const allowedTransitions: Record<string, string[]> = {
      PLANNING: ["ONGOING", "CANCELLED"],
      ONGOING: ["COMPLETED", "CANCELLED"],
      COMPLETED: [],
      CANCELLED: [],
    };

    const allowed = allowedTransitions[course.status] || [];
    if (!allowed.includes(nextStatus)) {
      throw new AppError(
        409,
        "INVALID_STATE_TRANSITION",
        `Không thể chuyển trạng thái khóa đào tạo từ ${course.status} sang ${nextStatus}.`
      );
    }

    const updated = await prisma.trainingCourse.update({
      where: { id: courseId },
      data: { status: nextStatus },
      include: { participants: true },
    });

    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      category: updated.category,
      provider: updated.provider,
      startDate: updated.startDate.toISOString().split("T")[0],
      endDate: updated.endDate.toISOString().split("T")[0],
      location: updated.location,
      budget: updated.budget ? Number(updated.budget) : 0,
      status: updated.status,
      description: updated.description,
      participantCount: updated.participants.filter((p) => p.status !== "DROPPED").length,
      isRegisteredByMe: false,
      myParticipantStatus: null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * 10. Cập nhật trạng thái học viên, chấm điểm & cấp chứng nhận hoàn thành khóa đào tạo
   */
  static async updateParticipantStatus(
    courseId: string,
    employeeId: string,
    input: UpdateParticipantStatusInput
  ): Promise<TrainingParticipantDto> {
    const existing = await prisma.trainingParticipant.findUnique({
      where: {
        courseId_employeeId: {
          courseId,
          employeeId,
        },
      },
    });

    if (!existing) {
      throw new AppError(
        404,
        "NOT_FOUND",
        "Không tìm thấy học viên trong danh sách khóa đào tạo này"
      );
    }

    const updated = await prisma.trainingParticipant.update({
      where: { id: existing.id },
      data: {
        status: input.status,
        grade: input.grade !== undefined ? input.grade : existing.grade,
        certificateIssued:
          input.certificateIssued !== undefined
            ? input.certificateIssued
            : existing.certificateIssued,
        note: input.note !== undefined ? input.note : existing.note,
      },
      include: {
        course: true,
        employee: {
          include: {
            assignments: {
              where: { assignmentType: "PRIMARY", status: "ACTIVE" },
              include: { unit: true },
            },
          },
        },
      },
    });

    const primaryAssignment = updated.employee.assignments[0];

    return {
      id: updated.id,
      courseId: updated.courseId,
      courseCode: updated.course.code,
      courseName: updated.course.name,
      employeeId: updated.employeeId,
      employeeCode: updated.employee.employeeCode,
      employeeName: updated.employee.fullName,
      unitName: primaryAssignment?.unit?.name || "Chưa phân bổ",
      status: updated.status,
      grade: updated.grade,
      certificateIssued: updated.certificateIssued,
      note: updated.note,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
