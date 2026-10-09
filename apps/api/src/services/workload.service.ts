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
    const isPromoted =
      this.promotedSeniorEmployees.has(employee?.id) ||
      this.promotedSeniorEmployees.has(employee?.employeeCode);

    const isSeniorOrProf =
      isPromoted ||
      academicTitle === "PROFESSOR" ||
      academicTitle === "ASSOCIATE_PROFESSOR" ||
      employee?.careerClass === "SENIOR_LECTURER" ||
      employee?.careerClass === "PRINCIPAL_LECTURER" ||
      employee?.assignments?.some((a: any) =>
        a.position?.code === "GIANG_VIEN_CHINH" ||
        a.position?.code === "GIANG_VIEN_CAO_CAP"
      );

    // Định mức giờ chuẩn giảng dạy và NCKH
    const baseTeachingQuota = isSeniorOrProf ? 216 : 270;
    const baseResearchQuota = isSeniorOrProf ? 700 : 600;
    const hourlyRate = isSeniorOrProf ? 200000 : 160000;

    let reductionPercentage = 0;
    const reductionReasons: string[] = [];

    // Kiểm tra chức vụ lãnh đạo kiêm nhiệm trong assignments
    for (const assignment of employee.assignments || []) {
      if (assignment.status !== "ACTIVE") continue;

      const posCode = assignment.position?.code;
      if (posCode === "HIEU_TRUONG" || posCode === "PHO_HIEU_TRUONG" || posCode === "TRUONG_KHOA") {
        if (reductionPercentage < 30) {
          reductionPercentage = 30;
          reductionReasons.push(`Miễn giảm 30% định mức do giữ chức vụ ${assignment.position?.name || "Trưởng đơn vị"}`);
        }
      } else if (posCode === "PHO_TRUONG_KHOA" || posCode === "TRUONG_BO_MON") {
        if (reductionPercentage < 20) {
          reductionPercentage = 20;
          reductionReasons.push(`Miễn giảm 20% định mức do giữ chức vụ ${assignment.position?.name || "Phó Trưởng khoa/BM"}`);
        }
      } else if (assignment.isHeadOfUnit && reductionPercentage < 20) {
        reductionPercentage = 20;
        reductionReasons.push("Miễn giảm 20% do kiêm nhiệm Phụ trách đơn vị");
      }
    }

    // Kiểm tra chế độ tập sự theo Nghị định 115/2020/NĐ-CP (Miễn giảm 50% định mức giờ giảng)
    const isProbation =
      employee?.isProbation ||
      employee?.positionCode === "GIANG_VIEN_TAP_SU" ||
      this.probationaryEmployees.has(employee?.id) ||
      this.probationaryEmployees.has(employee?.employeeCode);

    if (isProbation && reductionPercentage < 50) {
      reductionPercentage = 50;
      reductionReasons.push("Miễn giảm 50% định mức giờ giảng dạy cho Giảng viên tập sự (Nghị định 115/2020/NĐ-CP)");
    }

    return {
      baseTeachingQuota,
      baseResearchQuota,
      reductionPercentage,
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
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        assignments: {
          include: { position: true, unit: true },
        },
      },
    });

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

    // Dữ liệu phân công mẫu đặc thù của giảng viên kiến trúc
    const assignments: TeachingAssignmentDto[] = [
      {
        courseCode: "KT201",
        courseName: "Đồ án Kiến trúc Công trình 1 (Studio Xưởng)",
        classCode: "22KT1",
        semester: 1,
        workloadType: "STUDIO_PROJECT",
        rawHours: 60,
        multiplier: 1.25,
        convertedHours: 75.0,
        studentCount: 28,
        studioLocation: "Xưởng Thiết kế Tầng 4 - Khu A",
      },
      {
        courseCode: "KT105",
        courseName: "Nguyên lý Thiết kế Kiến trúc Nhà ở",
        classCode: "23KT2",
        semester: 1,
        workloadType: "THEORY",
        rawHours: 45,
        multiplier: 1.0,
        convertedHours: 45.0,
        studentCount: 65,
        studioLocation: "Phòng học A302",
      },
      {
        courseCode: "KT500",
        courseName: "Hướng dẫn Đồ án Tốt nghiệp KTS",
        classCode: "20KT_TN",
        semester: 2,
        workloadType: "GRADUATION_THESIS",
        rawHours: 18,
        multiplier: 18.0,
        convertedHours: 90.0, // 5 sinh viên x 18 giờ
        studentCount: 5,
        studioLocation: "Xưởng ĐATN Tầng 5",
      },
      {
        courseCode: "KT501",
        courseName: "Chấm Phản biện ĐATN KTS",
        classCode: "20KT_PB",
        semester: 2,
        workloadType: "REVIEW_THESIS",
        rawHours: 1.5,
        multiplier: 1.5,
        convertedHours: 9.0, // 6 đồ án x 1.5 giờ
        studentCount: 6,
      },
    ];

    const actualTeachingHours = assignments.reduce((s, a) => s + a.convertedHours, 0);
    const actualResearchHours = 620; // 1 đề tài cấp trường + 1 bài báo tạp chí
    const overtimeHours = Math.max(0, actualTeachingHours - effectiveTeachingQuota);

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
      status: "IN_PROGRESS",
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
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { assignments: { include: { position: true } } },
    });

    const { hourlyRate } = this.calculateBaseQuotaAndReduction(employee);
    const reducedHours = quota.baseTeachingQuota - quota.effectiveTeachingQuota;
    const overtimeHours = Math.max(0, quota.actualTeachingHours - quota.effectiveTeachingQuota);
    const deficitHours = Math.max(0, quota.effectiveTeachingQuota - quota.actualTeachingHours);
    const totalOvertimePay = overtimeHours * hourlyRate;

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
      isSettled: true,
    };
  }
}
