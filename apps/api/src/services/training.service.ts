import { prisma } from "@bahau/database";
import {
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

export class TrainingService {
  /**
   * Tính toán tình trạng cảnh báo hạn sử dụng của chứng chỉ
   */
  private static calculateExpiryAlert(expiryDate: Date | null): {
    daysUntilExpiry: number | null;
    alertStatus: CertificateExpiryAlertStatus | null;
  } {
    if (!expiryDate) {
      return { daysUntilExpiry: null, alertStatus: null };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exp = new Date(expiryDate);
    exp.setHours(0, 0, 0, 0);

    const diffTime = exp.getTime() - today.getTime();
    const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

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

    // Kiểm tra trùng số hiệu chứng chỉ
    const existing = await prisma.certificate.findFirst({
      where: {
        employeeId,
        certificateNumber: input.certificateNumber.trim(),
      },
    });

    if (existing) {
      throw new AppError(409, "DUPLICATE_ENTRY", `Số hiệu chứng chỉ '${input.certificateNumber}' đã được bạn khai báo trước đó`);
    }

    const created = await prisma.certificate.create({
      data: {
        employeeId,
        certificateType: input.certificateType,
        name: input.name.trim(),
        certificateNumber: input.certificateNumber.trim(),
        issuedBy: input.issuedBy.trim(),
        issuedDate: new Date(input.issuedDate),
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        score: input.score ? input.score.trim() : null,
        fileUrl: input.fileUrl || null,
        status: "PENDING",
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
      },
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
   * 3. Tra cứu danh sách chứng chỉ toàn trường / theo đơn vị (Phòng TCHC & Quản lý)
   */
  static async getAllCertificates(
    query: CertificateFilterQuery,
    scopeUnitId?: string | null
  ): Promise<CertificateDto[]> {
    const where: any = {};

    if (query.certificateType) where.certificateType = query.certificateType;
    if (query.status) where.status = query.status;
    if (query.employeeId) where.employeeId = query.employeeId;

    if (query.unitId || scopeUnitId) {
      const targetUnitId = query.unitId || scopeUnitId;
      where.employee = {
        assignments: {
          some: {
            unitId: targetUnitId,
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
    scopeUnitId?: string | null
  ): Promise<CertificateDto[]> {
    const certs = await this.getAllCertificates({}, scopeUnitId);
    return certs.filter(
      (c) =>
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
    });

    if (!course) {
      throw new AppError(404, "NOT_FOUND", "Không tìm thấy khóa đào tạo yêu cầu đăng ký");
    }

    if (course.status === "COMPLETED" || course.status === "CANCELLED") {
      throw new AppError(400, "INVALID_STATE", "Khóa đào tạo đã kết thúc hoặc bị hủy, không thể đăng ký");
    }

    const existing = await prisma.trainingParticipant.findUnique({
      where: {
        courseId_employeeId: {
          courseId,
          employeeId,
        },
      },
    });

    if (existing) {
      throw new AppError(409, "DUPLICATE_ENTRY", "Bạn đã đăng ký tham gia khóa đào tạo này rồi");
    }

    const participant = await prisma.trainingParticipant.create({
      data: {
        courseId,
        employeeId,
        status: "REGISTERED",
        note: input.note || null,
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
}
