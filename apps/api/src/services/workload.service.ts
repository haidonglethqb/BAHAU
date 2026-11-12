import { prisma } from "@bahau/database";
import { AppError } from "../middlewares/error.middleware.js";
import type {
  WorkloadType,
  AcademicYearQuotaDto,
  TeachingAssignmentDto,
  WorkloadSettlementResponse,
} from "@bahau/contracts";

export class WorkloadService {
  private static promotedSeniorEmployees = new Set<string>();
  private static probationaryEmployees = new Set<string>();

  public static markAsSeniorOrProf(employeeIdOrCode: string): void {
    this.promotedSeniorEmployees.add(employeeIdOrCode);
  }

  public static registerProbationaryFaculty(employeeIdOrCode: string): void {
    this.probationaryEmployees.add(employeeIdOrCode);
  }

  public static isPromotedSenior(employeeIdOrCode: string): boolean {
    return this.promotedSeniorEmployees.has(employeeIdOrCode);
  }

  public static isProbationary(employeeIdOrCode: string): boolean {
    return this.probationaryEmployees.has(employeeIdOrCode);
  }

  public static getTeachingNormHours(employeeIdOrCode: string): number {
    const isSenior = this.promotedSeniorEmployees.has(employeeIdOrCode);
    const base = isSenior ? 216 : 270;
    const isProbation = this.probationaryEmployees.has(employeeIdOrCode);
    return isProbation ? Math.round(base * 0.5) : base;
  }

  // Quản lý giờ NCKH & Dự án tư vấn thiết kế quy đổi bù trừ định mức
  private static accumulatedRdHours = new Map<string, number>();

  public static addResearchHours(employeeIdOrCode: string, hours: number): void {
    const current = this.accumulatedRdHours.get(employeeIdOrCode) || 0;
    this.accumulatedRdHours.set(employeeIdOrCode, current + hours);
  }

  public static getResearchHours(employeeIdOrCode: string): number {
    return this.accumulatedRdHours.get(employeeIdOrCode) || 0;
  }

  // Quản lý giờ chuẩn hướng dẫn Nghiên cứu sinh & Luận văn Thạc sĩ (TT 20/2020)
  private static accumulatedSupervisionHours = new Map<string, number>();

  public static addSupervisionHours(employeeIdOrCode: string, hours: number): void {
    const current = this.accumulatedSupervisionHours.get(employeeIdOrCode) || 0;
    this.accumulatedSupervisionHours.set(employeeIdOrCode, current + hours);
  }

  public static getSupervisionHours(employeeIdOrCode: string): number {
    return this.accumulatedSupervisionHours.get(employeeIdOrCode) || 0;
  }

  private static isDbConnectionError(err: unknown): boolean {
    if (!err || typeof err !== "object") return false;
    const e = err as { code?: string; message?: string; name?: string };
    const code = e.code || "";
    const msg = (e.message || "").toLowerCase();
    return (
      code === "P1001" ||
      code === "P1002" ||
      code === "P1008" ||
      code === "P1017" ||
      code === "ECONNREFUSED" ||
      e.name === "PrismaClientInitializationError" ||
      msg.includes("can't reach database server") ||
      msg.includes("econnrefused")
    );
  }

  private static parseAcademicYearRange(academicYear: string): {
    startYear: number;
    endYear: number;
    yearStart: Date;
    yearEnd: Date;
    endDateStr: string;
  } {
    const match = /^(\d{4})-(\d{4})$/.exec(academicYear.trim());
    if (!match) {
      throw new AppError(422, "VALIDATION_FAILED", "academicYear phải có định dạng YYYY-YYYY.");
    }
    const startYear = Number(match[1]);
    const endYear = Number(match[2]);
    if (endYear !== startYear + 1 || startYear < 2000 || endYear > 2100) {
      throw new AppError(422, "VALIDATION_FAILED", "academicYear không hợp lệ (năm kết thúc phải bằng năm bắt đầu + 1).");
    }
    return {
      startYear,
      endYear,
      yearStart: new Date(Date.UTC(startYear, 8, 1, 0, 0, 0, 0)),
      yearEnd: new Date(Date.UTC(endYear, 7, 31, 23, 59, 59, 999)),
      endDateStr: `${endYear}-08-31`,
    };
  }

  private static getVnTodayDateStr(): string {
    return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().split("T")[0];
  }

  /**
   * Tính toán định mức giờ giảng pháp định và tỷ lệ miễn giảm kiêm nhiệm theo TT 20/2020/TT-BGDĐT
   */
  public static calculateBaseQuotaAndReduction(employee: any): {
    baseTeachingQuota: number;
    baseResearchQuota: number;
    reductionPercentage: number;
    reductionReason: string;
    hourlyRate: number;
  } {
    const academicTitle = employee?.academicTitle;
    const activeAssignments = (employee?.assignments || []).filter(
      (a: any) => a?.status === "ACTIVE"
    );
    const activeContracts = (employee?.contracts || []).filter(
      (c: any) => c?.status === "ACTIVE"
    );

    const isPromoted =
      this.promotedSeniorEmployees.has(employee?.id) ||
      this.promotedSeniorEmployees.has(employee?.employeeCode);

    const isSeniorOrProf =
      isPromoted ||
      academicTitle === "PROFESSOR" ||
      academicTitle === "ASSOCIATE_PROFESSOR" ||
      activeAssignments.some(
        (a: any) =>
          a.position?.code === "GIANG_VIEN_CHINH" ||
          a.position?.code === "GIANG_VIEN_CAO_CAP"
      );

    // Định mức giờ chuẩn giảng dạy và NCKH
    const baseTeachingQuota = isSeniorOrProf ? 216 : 270;
    const baseResearchQuota = isSeniorOrProf ? 700 : 600;
    const hourlyRate = isSeniorOrProf ? 200000 : 160000;

    let reductionPercentage = 0;
    const reductionReasons: string[] = [];

    // Kiểm tra chức vụ lãnh đạo kiêm nhiệm trong ACTIVE assignments
    for (const assignment of activeAssignments) {
      const posCode = assignment.position?.code;
      if (
        posCode === "HIEU_TRUONG" ||
        posCode === "PHO_HIEU_TRUONG" ||
        posCode === "TRUONG_KHOA" ||
        posCode === "TRUONG_PHONG"
      ) {
        if (reductionPercentage < 30) {
          reductionPercentage = 30;
          reductionReasons.push(
            `Miễn giảm 30% định mức do giữ chức vụ ${assignment.position?.name || "Trưởng đơn vị"}`
          );
        }
      } else if (
        posCode === "PHO_TRUONG_KHOA" ||
        posCode === "PHO_TRUONG_PHONG" ||
        posCode === "TRUONG_BO_MON" ||
        posCode === "PHO_TRUONG_BO_MON"
      ) {
        if (reductionPercentage < 20) {
          reductionPercentage = 20;
          reductionReasons.push(
            `Miễn giảm 20% định mức do giữ chức vụ ${assignment.position?.name || "Phó Trưởng đơn vị/BM"}`
          );
        }
      } else if (assignment.isHeadOfUnit && reductionPercentage < 20) {
        reductionPercentage = 20;
        reductionReasons.push("Miễn giảm 20% do kiêm nhiệm Phụ trách đơn vị");
      }
    }

    // Kiểm tra chế độ tập sự theo Nghị định 115/2020/NĐ-CP (Miễn giảm 50% định mức giờ giảng)
    const isProbation =
      employee?.employmentStatus === "PROBATION" ||
      activeContracts.some((c: any) => c.contractType === "PROBATION") ||
      activeAssignments.some((a: any) => a.position?.code === "GIANG_VIEN_TAP_SU") ||
      this.probationaryEmployees.has(employee?.id) ||
      this.probationaryEmployees.has(employee?.employeeCode);

    if (isProbation && reductionPercentage < 50) {
      reductionPercentage = 50;
      reductionReasons.push(
        "Miễn giảm 50% định mức giờ giảng dạy cho Giảng viên tập sự (Nghị định 115/2020/NĐ-CP)"
      );
    }

    // Kiểm tra nghỉ thai sản (MATERNITY) và nghỉ ốm dài ngày (SICK) đã được phê duyệt
    const approvedLeaves = (employee?.leaveRequests || []).filter(
      (l: any) => l?.status === "APPROVED"
    );
    const maternityDays = approvedLeaves
      .filter((l: any) => l.leaveType === "MATERNITY")
      .reduce((sum: number, l: any) => sum + Number(l.totalDays || 0), 0);
    const sickDays = approvedLeaves
      .filter((l: any) => l.leaveType === "SICK")
      .reduce((sum: number, l: any) => sum + Number(l.totalDays || 0), 0);

    if (maternityDays > 0) {
      const maternityPct = Math.min(100, Math.round((maternityDays / 360) * 100));
      if (maternityPct > reductionPercentage) {
        reductionPercentage = maternityPct;
        reductionReasons.push(`Miễn giảm ${maternityPct}% định mức do nghỉ thai sản (${maternityDays} ngày)`);
      }
    }

    if (sickDays > 0) {
      const sickPct = Math.min(100, Math.round((sickDays / 260) * 100));
      if (sickPct > reductionPercentage) {
        reductionPercentage = sickPct;
        reductionReasons.push(`Miễn giảm ${sickPct}% định mức do nghỉ ốm (${sickDays} ngày)`);
      }
    }

    return {
      baseTeachingQuota,
      baseResearchQuota,
      reductionPercentage: Math.min(100, Math.max(0, reductionPercentage)),
      reductionReason: reductionReasons.join("; ") || "Không có miễn giảm",
      hourlyRate,
    };
  }

  /**
   * Tính toán quy đổi giờ chuẩn theo đặc thù xưởng đồ án kiến trúc ĐH Kiến trúc Đà Nẵng
   */
  public static convertHours(
    workloadType: WorkloadType,
    rawHours: number,
    studentCount = 30
  ): { multiplier: number; convertedHours: number } {
    switch (workloadType) {
      case "THEORY":
        // Lý thuyết thông thường: 1.0
        return { multiplier: 1.0, convertedHours: rawHours * 1.0 };
      case "STUDIO_PROJECT":
        // Đồ án Kiến trúc / Nội thất / Quy hoạch tại xưởng: 1.25
        return { multiplier: 1.25, convertedHours: Math.round(rawHours * 1.25 * 10) / 10 };
      case "GRADUATION_THESIS":
        // Hướng dẫn ĐATN KTS: 18 giờ chuẩn cho mỗi đồ án sinh viên
        return { multiplier: 18.0, convertedHours: studentCount * 18.0 };
      case "REVIEW_THESIS":
        // Chấm phản biện ĐATN KTS: 1.5 giờ chuẩn / đồ án
        return { multiplier: 1.5, convertedHours: studentCount * 1.5 };
      case "COUNCIL_MEMBER":
        // Ủy viên Hội đồng bảo vệ ĐATN: 1.0 giờ chuẩn / đồ án
        return { multiplier: 1.0, convertedHours: studentCount * 1.0 };
      case "RESEARCH_PAPER":
        return { multiplier: 1.0, convertedHours: rawHours };
      default:
        return { multiplier: 1.0, convertedHours: rawHours };
    }
  }

  /**
   * Lấy định mức giờ giảng và danh sách phân công học phần của CBGV
   */
  public static async getEmployeeQuota(
    employeeId: string,
    academicYear = "2025-2026"
  ): Promise<AcademicYearQuotaDto> {
    const { yearStart, yearEnd, endDateStr } = this.parseAcademicYearRange(academicYear);
    const todayVn = this.getVnTodayDateStr();
    const defaultStatus: "IN_PROGRESS" | "SETTLED" = todayVn > endDateStr ? "SETTLED" : "IN_PROGRESS";

    let employee: any = null;
    try {
      employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          assignments: {
            where: { status: "ACTIVE" },
            include: { position: true, unit: true },
          },
          contracts: {
            where: { status: "ACTIVE" },
            select: { contractType: true, status: true },
          },
          leaveRequests: {
            where: {
              status: "APPROVED",
              leaveType: { in: ["MATERNITY", "SICK"] },
              startDate: { lte: yearEnd },
              endDate: { gte: yearStart },
            },
            select: {
              leaveType: true,
              totalDays: true,
              status: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      });
    } catch (err) {
      if (!this.isDbConnectionError(err)) {
        throw err;
      }
      const fallbackRd = this.accumulatedRdHours.get(employeeId) ?? 0;
      const fallbackSup = this.accumulatedSupervisionHours.get(employeeId) ?? 0;
      const fallbackAssignments: TeachingAssignmentDto[] =
        fallbackSup > 0
          ? [
              {
                courseCode: "HD_NCKH",
                courseName: "Hướng dẫn Luận văn / Luận án",
                classCode: academicYear,
                semester: 1,
                workloadType: "GRADUATION_THESIS",
                rawHours: fallbackSup,
                multiplier: 1.0,
                convertedHours: fallbackSup,
                studentCount: 1,
              },
            ]
          : [];
      const fallbackTeaching = Math.round(fallbackSup * 10) / 10;
      return {
        academicYear,
        employeeId,
        employeeName: "Cán bộ giảng viên (Offline Fallback)",
        employeeCode: employeeId,
        positionTitle: "Giảng viên",
        baseTeachingQuota: 270,
        baseResearchQuota: 600,
        reductionPercentage: 0,
        reductionReason: "Dữ liệu tạm tính khi ngoại tuyến CSDL",
        effectiveTeachingQuota: 270,
        actualTeachingHours: fallbackTeaching,
        actualResearchHours: Math.round(fallbackRd * 10) / 10,
        overtimeHours: Math.max(0, Math.round((fallbackTeaching - 270) * 10) / 10),
        status: defaultStatus,
        assignments: fallbackAssignments,
      };
    }

    if (!employee) {
      throw new AppError(404, "NOT_FOUND", "Không tìm thấy hồ sơ cán bộ giảng viên.");
    }

    const {
      baseTeachingQuota,
      baseResearchQuota,
      reductionPercentage,
      reductionReason,
    } = this.calculateBaseQuotaAndReduction(employee);

    const effectiveTeachingQuota = Math.round(
      baseTeachingQuota * (1 - reductionPercentage / 100)
    );

    const rdHours =
      this.accumulatedRdHours.get(employee.id) ??
      this.accumulatedRdHours.get(employee.employeeCode) ??
      0;
    const supervisionHours =
      this.accumulatedSupervisionHours.get(employee.id) ??
      this.accumulatedSupervisionHours.get(employee.employeeCode) ??
      0;

    const assignments: TeachingAssignmentDto[] =
      supervisionHours > 0
        ? [
            {
              courseCode: "HD_NCKH",
              courseName: "Hướng dẫn Luận văn Thạc sĩ / Nghiên cứu sinh",
              classCode: academicYear,
              semester: 1,
              workloadType: "GRADUATION_THESIS",
              rawHours: supervisionHours,
              multiplier: 1.0,
              convertedHours: Math.round(supervisionHours * 10) / 10,
              studentCount: 1,
            },
          ]
        : [];

    const actualTeachingHours =
      Math.round(assignments.reduce((s, a) => s + a.convertedHours, 0) * 10) / 10;
    const actualResearchHours = Math.round(rdHours * 10) / 10;
    const overtimeHours = Math.max(
      0,
      Math.round((actualTeachingHours - effectiveTeachingQuota) * 10) / 10
    );

    return {
      academicYear,
      employeeId: employee.id,
      employeeName: employee.fullName,
      employeeCode: employee.employeeCode,
      positionTitle: employee.assignments?.[0]?.position?.name || "Giảng viên",
      baseTeachingQuota,
      baseResearchQuota,
      reductionPercentage,
      reductionReason,
      effectiveTeachingQuota,
      actualTeachingHours,
      actualResearchHours,
      overtimeHours,
      status: defaultStatus,
      assignments,
    };
  }

  /**
   * Tính toán quyết toán vượt giờ và thù lao chi trả cuối năm học
   */
  public static async calculateSettlement(
    employeeId: string,
    academicYear = "2025-2026"
  ): Promise<WorkloadSettlementResponse> {
    const quota = await this.getEmployeeQuota(employeeId, academicYear);
    const { yearStart, yearEnd } = this.parseAcademicYearRange(academicYear);

    let hourlyRate = 160000;
    try {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          assignments: {
            where: { status: "ACTIVE" },
            include: { position: true },
          },
          contracts: {
            where: { status: "ACTIVE" },
            select: { contractType: true, status: true },
          },
          leaveRequests: {
            where: {
              status: "APPROVED",
              leaveType: { in: ["MATERNITY", "SICK"] },
              startDate: { lte: yearEnd },
              endDate: { gte: yearStart },
            },
            select: { leaveType: true, totalDays: true, status: true },
          },
        },
      });
      if (employee) {
        hourlyRate = this.calculateBaseQuotaAndReduction(employee).hourlyRate;
      }
    } catch (err) {
      if (!this.isDbConnectionError(err)) {
        throw err;
      }
    }

    const reducedHours = Math.max(0, quota.baseTeachingQuota - quota.effectiveTeachingQuota);
    const effectiveResearchQuota = Math.round(
      quota.baseResearchQuota * (1 - quota.reductionPercentage / 100)
    );

    // Đối soát NCKH theo quy đổi TT 20/2020 (3 giờ NCKH = 1 giờ chuẩn giảng dạy)
    const rawTeachingSurplus = Math.max(0, quota.actualTeachingHours - quota.effectiveTeachingQuota);
    const rawTeachingDeficit = Math.max(0, quota.effectiveTeachingQuota - quota.actualTeachingHours);
    const researchDelta = quota.actualResearchHours - effectiveResearchQuota;
    const convertedResearchDelta = Math.round((researchDelta / 3) * 10) / 10;

    let overtimeHours = rawTeachingSurplus;
    let deficitHours = rawTeachingDeficit;

    if (convertedResearchDelta >= 0) {
      deficitHours = Math.max(
        0,
        Math.round((rawTeachingDeficit - convertedResearchDelta) * 10) / 10
      );
    } else {
      const netBalance = rawTeachingSurplus + convertedResearchDelta - rawTeachingDeficit;
      if (netBalance >= 0) {
        overtimeHours = Math.round(netBalance * 10) / 10;
        deficitHours = 0;
      } else {
        overtimeHours = 0;
        deficitHours = Math.round(Math.abs(netBalance) * 10) / 10;
      }
    }

    const totalOvertimePay = Math.round(overtimeHours * hourlyRate);
    const isSettled = quota.status === "SETTLED" && deficitHours === 0;

    return {
      academicYear,
      employeeId: quota.employeeId,
      employeeName: quota.employeeName,
      baseQuota: quota.baseTeachingQuota,
      reducedPercentage: quota.reductionPercentage,
      reducedHours,
      effectiveQuota: quota.effectiveTeachingQuota,
      totalActualConvertedHours: quota.actualTeachingHours,
      overtimeHours,
      hourlyRate,
      totalOvertimePay,
      deficitHours,
      settlementDate: new Date().toISOString(),
      isSettled,
    };
  }
}
