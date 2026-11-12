import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "node:fs";
import {
  prisma,
  KpiPeriodStatus,
  KpiTargetType,
  KpiEvaluationStatus,
  KpiRanking,
  Prisma,
} from "@bahau/database";
import { AppError } from "../middlewares/error.middleware.js";
import { UnitService } from "./unit.service.js";
import { WorkloadService } from "./workload.service.js";
import { PkiService } from "./pki.service.js";
import { PayrollService } from "./payroll.service.js";
import type {
  AuthUser,
  KpiPeriodDto,
  KpiTemplateDto,
  KpiEvaluationDto,
  KpiEvaluationDetailDto,
  CouncilSummaryReportDto,
  CreateKpiPeriodInput,
  SubmitSelfEvaluationInput,
  ScoreManagerEvaluationInput,
  FinalizeCouncilEvaluationInput,
  CouncilVoteInput,
  FinalizePeriodWithPkiInput,
  KpiFilterQuery,
  AcademicHonorTitle,
  AcademicPillarBreakdownDto,
} from "@bahau/contracts";

/**
 * Danh mục Tiêu chí Chuẩn 3 Trụ Cột Học thuật ĐH Kiến trúc Đà Nẵng
 * (Theo TT 20/2020/TT-BGDĐT, NĐ 90/2020/NĐ-CP & Luật Thi đua, Khen thưởng 2022)
 * Trụ cột 1: Đào tạo & Giảng dạy Studio (50đ)
 * Trụ cột 2: NCKH & Sáng tác Kiến trúc (35đ)
 * Trụ cột 3: Phục vụ Cộng đồng & Quản trị Đoàn thể (15đ)
 */
export const DEFAULT_LECTURER_CRITERIA = [
  {
    id: "00000000-0000-0000-0001-000000000001",
    templateId: "00000000-0000-0000-0000-000000000001",
    orderIndex: 1,
    category: "TRỤ CỘT I: ĐÀO TẠO & GIẢNG DẠY STUDIO",
    pillar: "TEACHING" as const,
    name: "Định mức giờ chuẩn giảng dạy & hướng dẫn đồ án Studio (kết nối Trục 1 Workload)",
    description: "Hoàn thành và vượt định mức giờ chuẩn theo Thông tư 20/2020/TT-BGDĐT",
    maxScore: 25,
    weight: 1.0,
  },
  {
    id: "00000000-0000-0000-0001-000000000002",
    templateId: "00000000-0000-0000-0000-000000000001",
    orderIndex: 2,
    category: "TRỤ CỘT I: ĐÀO TẠO & GIẢNG DẠY STUDIO",
    pillar: "TEACHING" as const,
    name: "Hướng dẫn Đồ án tốt nghiệp KTS / Luận văn Thạc sĩ",
    description: "Hướng dẫn sinh viên tốt nghiệp KTS/Kỹ sư, học viên cao học đúng tiến độ, chất lượng",
    maxScore: 15,
    weight: 1.0,
  },
  {
    id: "00000000-0000-0000-0001-000000000003",
    templateId: "00000000-0000-0000-0000-000000000001",
    orderIndex: 3,
    category: "TRỤ CỘT I: ĐÀO TẠO & GIẢNG DẠY STUDIO",
    pillar: "TEACHING" as const,
    name: "Khảo thí, chấm thi vấn đáp & phản biện đồ án kiến trúc đúng quy chế",
    description: "Tham gia hội đồng chấm thi, phản biện đồ án công tâm, đúng thời hạn quy định",
    maxScore: 5,
    weight: 1.0,
  },
  {
    id: "00000000-0000-0000-0001-000000000004",
    templateId: "00000000-0000-0000-0000-000000000001",
    orderIndex: 4,
    category: "TRỤ CỘT I: ĐÀO TẠO & GIẢNG DẠY STUDIO",
    pillar: "TEACHING" as const,
    name: "Đổi mới phương pháp giảng dạy, ứng dụng BIM / Generative AI / Digital Design",
    description: "Ứng dụng mô hình hóa thông tin công trình BIM, AI, số hóa bài giảng và học liệu điện tử",
    maxScore: 5,
    weight: 1.0,
  },
  {
    id: "00000000-0000-0000-0002-000000000001",
    templateId: "00000000-0000-0000-0000-000000000001",
    orderIndex: 5,
    category: "TRỤ CỘT II: NCKH & SÁNG TÁC KIẾN TRÚC",
    pillar: "RESEARCH" as const,
    name: "Bài báo khoa học quốc tế WoS/Scopus hoặc Tạp chí chuyên ngành Hội KTS VN",
    description: "Công bố bài báo khoa học trên các tạp chí uy tín thuộc danh mục Scopus, WoS hoặc Hội đồng GSNN tính điểm",
    maxScore: 15,
    weight: 1.0,
  },
  {
    id: "00000000-0000-0000-0002-000000000002",
    templateId: "00000000-0000-0000-0000-000000000001",
    orderIndex: 6,
    category: "TRỤ CỘT II: NCKH & SÁNG TÁC KIẾN TRÚC",
    pillar: "RESEARCH" as const,
    name: "Công trình kiến trúc thực tế được nghiệm thu / Đạt giải thưởng kiến trúc",
    description: "Chủ trì thiết kế công trình kiến trúc xây dựng thực tế hoặc đạt Giải thưởng Kiến trúc Quốc gia, Ashui, Quốc tế",
    maxScore: 10,
    weight: 1.0,
  },
  {
    id: "00000000-0000-0000-0002-000000000003",
    templateId: "00000000-0000-0000-0000-000000000001",
    orderIndex: 7,
    category: "TRỤ CỘT II: NCKH & SÁNG TÁC KIẾN TRÚC",
    pillar: "RESEARCH" as const,
    name: "Chủ trì hoặc tham gia đề tài NCKH các cấp (Bộ, Tỉnh/Thành phố, Cơ sở)",
    description: "Đề tài NCKH đã nghiệm thu đạt yêu cầu trở lên",
    maxScore: 5,
    weight: 1.0,
  },
  {
    id: "00000000-0000-0000-0002-000000000004",
    templateId: "00000000-0000-0000-0000-000000000001",
    orderIndex: 8,
    category: "TRỤ CỘT II: NCKH & SÁNG TÁC KIẾN TRÚC",
    pillar: "RESEARCH" as const,
    name: "Biên soạn giáo trình, sách chuyên khảo, bài giảng chuyên đề có mã số ISBN",
    description: "Giáo trình, sách tham khảo phục vụ đào tạo tại Trường ĐH Kiến trúc Đà Nẵng",
    maxScore: 5,
    weight: 1.0,
  },
  {
    id: "00000000-0000-0000-0003-000000000001",
    templateId: "00000000-0000-0000-0000-000000000001",
    orderIndex: 9,
    category: "TRỤ CỘT III: PHỤC VỤ CỘNG ĐỒNG & QUẢN TRỊ ĐOÀN THỂ",
    pillar: "SERVICE" as const,
    name: "Cố vấn học tập, hướng dẫn SV tham gia Festival Sinh viên Kiến trúc toàn quốc",
    description: "Cố vấn học tập tận tâm, dẫn dắt đội tuyển SV tham gia các cuộc thi thiết kế kiến trúc toàn quốc",
    maxScore: 5,
    weight: 1.0,
  },
  {
    id: "00000000-0000-0000-0003-000000000002",
    templateId: "00000000-0000-0000-0000-000000000001",
    orderIndex: 10,
    category: "TRỤ CỘT III: PHỤC VỤ CỘNG ĐỒNG & QUẢN TRỊ ĐOÀN THỂ",
    pillar: "SERVICE" as const,
    name: "Tư vấn thiết kế, phản biện xã hội về quy hoạch kiến trúc TP. Đà Nẵng & Miền Trung",
    description: "Tham gia hội đồng tư vấn, phản biện các đồ án quy hoạch phát triển đô thị địa phương",
    maxScore: 5,
    weight: 1.0,
  },
  {
    id: "00000000-0000-0000-0003-000000000003",
    templateId: "00000000-0000-0000-0000-000000000001",
    orderIndex: 11,
    category: "TRỤ CỘT III: PHỤC VỤ CỘNG ĐỒNG & QUẢN TRỊ ĐOÀN THỂ",
    pillar: "SERVICE" as const,
    name: "Chấp hành kỷ luật, đạo đức nhà giáo, văn hóa công sở và hoạt động đoàn thể DAU",
    description: "Thực hiện tốt nội quy, quy chế làm việc của Nhà trường, tham gia đầy đủ các phong trào thi đua",
    maxScore: 5,
    weight: 1.0,
  },
];

export const DEFAULT_STAFF_CRITERIA = [
  {
    id: "00000000-0000-0000-0004-000000000001",
    templateId: "00000000-0000-0000-0000-000000000002",
    orderIndex: 1,
    category: "KHỐI LƯỢNG & TIẾN ĐỘ CÔNG VIỆC",
    pillar: "SERVICE" as const,
    name: "Khối lượng & Tiến độ công việc",
    description: "Hoàn thành 100% nhiệm vụ được giao đúng hạn",
    maxScore: 35,
    weight: 1.0,
  },
  {
    id: "00000000-0000-0000-0004-000000000002",
    templateId: "00000000-0000-0000-0000-000000000002",
    orderIndex: 2,
    category: "CHẤT LƯỢNG CÔNG VIỆC & CẢI TIẾN",
    pillar: "SERVICE" as const,
    name: "Chất lượng công việc & Cải tiến/Sáng kiến",
    description: "Công việc đạt chất lượng cao, có sáng kiến cải tiến hành chính",
    maxScore: 30,
    weight: 1.0,
  },
  {
    id: "00000000-0000-0000-0004-000000000003",
    templateId: "00000000-0000-0000-0000-000000000002",
    orderIndex: 3,
    category: "PHỤC VỤ & VĂN HÓA CÔNG SỞ",
    pillar: "SERVICE" as const,
    name: "Phục vụ, phối hợp & Văn hóa công sở DAU",
    description: "Tác phong chuyên nghiệp, tinh thần phối hợp tốt giữa các phòng ban",
    maxScore: 20,
    weight: 1.0,
  },
  {
    id: "00000000-0000-0000-0004-000000000004",
    templateId: "00000000-0000-0000-0000-000000000002",
    orderIndex: 4,
    category: "KỶ LUẬT LAO ĐỘNG",
    pillar: "SERVICE" as const,
    name: "Kỷ luật lao động, đạo đức công vụ",
    description: "Chấp hành nghiêm kỷ luật lao động và quy chế văn hóa công sở",
    maxScore: 15,
    weight: 1.0,
  },
];

export class KpiService {
  // Kho lưu trữ trong bộ nhớ keyed theo `${periodId}:${employeeId}` + index theo evaluation.id
  private static inMemoryEvaluations = new Map<string, KpiEvaluationDto>();
  private static inMemoryEvaluationIdIndex = new Map<string, string>();
  private static inMemoryEvaluationItems = new Map<string, any[]>();
  private static inMemoryPeriods = new Map<string, KpiPeriodDto>();
  private static inMemoryPeriodSigned = new Map<string, { signature: string; signedAt: string }>();

  private static makeEvalKey(periodId: string, employeeId: string): string {
    return `${periodId}:${employeeId}`;
  }

  private static upsertInMemoryEvaluation(item: KpiEvaluationDto): void {
    const key = this.makeEvalKey(item.periodId, item.employeeId);
    this.inMemoryEvaluations.set(key, item);
    this.inMemoryEvaluationIdIndex.set(item.id, key);
  }

  private static findInMemoryEvaluationById(evaluationId: string): KpiEvaluationDto | undefined {
    const key = this.inMemoryEvaluationIdIndex.get(evaluationId);
    if (key) {
      return this.inMemoryEvaluations.get(key);
    }
    return this.inMemoryEvaluations.get(evaluationId);
  }

  private static findInMemoryEvaluationForUser(
    periodId: string,
    employeeId: string,
    employeeCode?: string | null
  ): KpiEvaluationDto | undefined {
    const direct = this.inMemoryEvaluations.get(this.makeEvalKey(periodId, employeeId));
    if (direct) return direct;
    if (employeeCode) {
      for (const item of this.inMemoryEvaluations.values()) {
        if (item.periodId === periodId && item.employeeCode === employeeCode) {
          return item;
        }
      }
    }
    return undefined;
  }

  // Tích lũy điểm Trụ cột II từ Đề tài NCKH & Dự án tư vấn thiết kế đã nghiệm thu
  private static accumulatedRdPoints = new Map<string, number>();

  public static addResearchKpiPoints(employeeIdOrCode: string, points: number): void {
    const current = this.accumulatedRdPoints.get(employeeIdOrCode) || 0;
    this.accumulatedRdPoints.set(employeeIdOrCode, current + points);
  }

  public static getResearchKpiPoints(employeeIdOrCode: string): number {
    return this.accumulatedRdPoints.get(employeeIdOrCode) || 0;
  }

  // Tích lũy điểm Trụ cột I & II từ hướng dẫn Luận văn Thạc sĩ & Nghiên cứu sinh
  private static accumulatedSupervisionPoints = new Map<string, number>();

  public static addSupervisionKpiPoints(employeeIdOrCode: string, points: number): void {
    const current = this.accumulatedSupervisionPoints.get(employeeIdOrCode) || 0;
    this.accumulatedSupervisionPoints.set(employeeIdOrCode, current + points);
  }

  public static getSupervisionKpiPoints(employeeIdOrCode: string): number {
    return this.accumulatedSupervisionPoints.get(employeeIdOrCode) || 0;
  }

  static {
    // Khởi tạo các đánh giá mẫu đại học chuẩn DAU
    const mockList: KpiEvaluationDto[] = [
      {
        id: "eval-dau-001",
        periodId: "00000000-0000-0000-0000-000000000001",
        periodName: "Đánh giá & Xếp loại Cán bộ, Giảng viên Năm học 2025-2026",
        academicYear: "2025-2026",
        templateId: "00000000-0000-0000-0000-000000000001",
        templateName: "Tiêu chuẩn Đánh giá 3 Trụ Cột Giảng viên DAU",
        targetType: "LECTURER",
        employeeId: "DAU260001-ID",
        employeeCode: "DAU260001",
        employeeName: "PGS.TS. Trần Thị Bình",
        unitName: "Khoa Kiến trúc",
        positionName: "Trưởng khoa",
        managerEmployeeId: "DAU260005-ID",
        managerName: "GS.TS. Nguyễn Hiệu Trưởng",
        status: "IN_REVIEW",
        totalSelfScore: 94.0,
        totalManagerScore: 95.0,
        totalFinalScore: 95.0,
        ranking: "EXCELLENT",
        teachingScore: 48.0,
        researchScore: 33.0,
        serviceScore: 14.0,
        honorTitle: "LAO_DONG_TIEN_TIEN",
        councilVote: null,
        managerComment: "Hoàn thành xuất sắc nhiệm vụ quản lý khoa và giảng dạy đồ án Studio kiến trúc.",
        councilComment: null,
        submittedAt: "2026-09-10T10:00:00.000Z",
        reviewedAt: "2026-09-14T14:20:00.000Z",
        finalizedAt: null,
        createdAt: "2026-09-01T08:00:00.000Z",
      },
      {
        id: "eval-dau-002",
        periodId: "00000000-0000-0000-0000-000000000001",
        periodName: "Đánh giá & Xếp loại Cán bộ, Giảng viên Năm học 2025-2026",
        academicYear: "2025-2026",
        templateId: "00000000-0000-0000-0000-000000000001",
        templateName: "Tiêu chuẩn Đánh giá 3 Trụ Cột Giảng viên DAU",
        targetType: "LECTURER",
        employeeId: "DAU260003-ID",
        employeeCode: "DAU260003",
        employeeName: "ThS. Nguyễn Văn An",
        unitName: "Khoa Kiến trúc",
        positionName: "Giảng viên",
        managerEmployeeId: "DAU260001-ID",
        managerName: "PGS.TS. Trần Thị Bình",
        status: "SUBMITTED",
        totalSelfScore: 91.5,
        totalManagerScore: 90.0,
        totalFinalScore: null,
        ranking: "EXCELLENT",
        teachingScore: 47.0,
        researchScore: 30.5,
        serviceScore: 14.0,
        honorTitle: "LAO_DONG_TIEN_TIEN",
        managerComment: "Giảng dạy nhiệt huyết, vượt giờ đồ án Studio xưởng.",
        submittedAt: "2026-09-12T09:15:00.000Z",
        reviewedAt: null,
        finalizedAt: null,
        createdAt: "2026-09-01T08:00:00.000Z",
      },
      {
        id: "eval-dau-003",
        periodId: "00000000-0000-0000-0000-000000000001",
        periodName: "Đánh giá & Xếp loại Cán bộ, Giảng viên Năm học 2025-2026",
        academicYear: "2025-2026",
        templateId: "00000000-0000-0000-0000-000000000001",
        templateName: "Tiêu chuẩn Đánh giá 3 Trụ Cột Giảng viên DAU",
        targetType: "LECTURER",
        employeeId: "DAU260002-ID",
        employeeCode: "DAU260002",
        employeeName: "TS. Lê Hoàng Nam",
        unitName: "Khoa Xây dựng",
        positionName: "Phó Trưởng khoa",
        managerEmployeeId: "DAU260005-ID",
        managerName: "GS.TS. Nguyễn Hiệu Trưởng",
        status: "IN_REVIEW",
        totalSelfScore: 86.0,
        totalManagerScore: 86.0,
        totalFinalScore: 86.0,
        ranking: "GOOD",
        teachingScore: 43.0,
        researchScore: 29.0,
        serviceScore: 14.0,
        honorTitle: "LAO_DONG_TIEN_TIEN",
        councilVote: {
          votesYes: 6,
          votesNo: 1,
          totalVoters: 7,
          approvalRatio: 85.7,
          proposedHonorTitle: "LAO_DONG_TIEN_TIEN",
          votedAt: "2026-09-15T09:00:00.000Z",
        },
        managerComment: "Hoàn thành tốt công tác quản lý chuyên môn và đào tạo.",
        submittedAt: "2026-09-11T14:30:00.000Z",
        reviewedAt: "2026-09-14T15:00:00.000Z",
        finalizedAt: null,
        createdAt: "2026-09-01T08:00:00.000Z",
      },
      {
        id: "eval-dau-004",
        periodId: "00000000-0000-0000-0000-000000000001",
        periodName: "Đánh giá & Xếp loại Cán bộ, Giảng viên Năm học 2025-2026",
        academicYear: "2025-2026",
        templateId: "00000000-0000-0000-0000-000000000001",
        templateName: "Tiêu chuẩn Đánh giá 3 Trụ Cột Giảng viên DAU",
        targetType: "LECTURER",
        employeeId: "DAU260004-ID",
        employeeCode: "DAU260004",
        employeeName: "ThS. Phạm Thị Mai",
        unitName: "Khoa Quy hoạch",
        positionName: "Giảng viên",
        managerEmployeeId: "DAU260005-ID",
        managerName: "GS.TS. Nguyễn Hiệu Trưởng",
        status: "SUBMITTED",
        totalSelfScore: 78.5,
        totalManagerScore: 78.0,
        totalFinalScore: null,
        ranking: "GOOD",
        teachingScore: 40.0,
        researchScore: 25.0,
        serviceScore: 13.0,
        honorTitle: "LAO_DONG_TIEN_TIEN",
        submittedAt: "2026-09-12T16:00:00.000Z",
        reviewedAt: null,
        finalizedAt: null,
        createdAt: "2026-09-01T08:00:00.000Z",
      },
      {
        id: "eval-dau-005",
        periodId: "00000000-0000-0000-0000-000000000001",
        periodName: "Đánh giá & Xếp loại Cán bộ, Giảng viên Năm học 2025-2026",
        academicYear: "2025-2026",
        templateId: "00000000-0000-0000-0000-000000000001",
        templateName: "Tiêu chuẩn Đánh giá 3 Trụ Cột Giảng viên DAU",
        targetType: "LECTURER",
        employeeId: "DAU260005-ID",
        employeeCode: "DAU260005",
        employeeName: "GS.TS. Nguyễn Hiệu Trưởng",
        unitName: "Ban Giám hiệu",
        positionName: "Hiệu trưởng",
        managerEmployeeId: null,
        managerName: null,
        status: "FINALIZED",
        totalSelfScore: 98.0,
        totalManagerScore: 98.0,
        totalFinalScore: 98.0,
        ranking: "EXCELLENT",
        teachingScore: 49.0,
        researchScore: 35.0,
        serviceScore: 14.0,
        honorTitle: "LAO_DONG_TIEN_TIEN",
        councilVote: null,
        submittedAt: "2026-09-10T08:00:00.000Z",
        reviewedAt: "2026-09-14T09:00:00.000Z",
        finalizedAt: "2026-09-16T10:00:00.000Z",
        createdAt: "2026-09-01T08:00:00.000Z",
      },
      {
        id: "eval-dau-006",
        periodId: "00000000-0000-0000-0000-000000000001",
        periodName: "Đánh giá & Xếp loại Cán bộ, Giảng viên Năm học 2025-2026",
        academicYear: "2025-2026",
        templateId: "00000000-0000-0000-0000-000000000001",
        templateName: "Tiêu chuẩn Đánh giá 3 Trụ Cột Giảng viên DAU",
        targetType: "LECTURER",
        employeeId: "DAU260006-ID",
        employeeCode: "DAU260006",
        employeeName: "TS. Hoàng Minh Đức",
        unitName: "Khoa Kiến trúc",
        positionName: "Giảng viên",
        status: "IN_REVIEW",
        totalSelfScore: 82.0,
        totalManagerScore: 82.0,
        totalFinalScore: 82.0,
        ranking: "GOOD",
        teachingScore: 42.0,
        researchScore: 26.0,
        serviceScore: 14.0,
        honorTitle: "LAO_DONG_TIEN_TIEN",
        createdAt: "2026-09-01T08:00:00.000Z",
      },
      {
        id: "eval-dau-007",
        periodId: "00000000-0000-0000-0000-000000000001",
        periodName: "Đánh giá & Xếp loại Cán bộ, Giảng viên Năm học 2025-2026",
        academicYear: "2025-2026",
        templateId: "00000000-0000-0000-0000-000000000001",
        templateName: "Tiêu chuẩn Đánh giá 3 Trụ Cột Giảng viên DAU",
        targetType: "LECTURER",
        employeeId: "DAU260007-ID",
        employeeCode: "DAU260007",
        employeeName: "ThS. Lê Thùy Vân",
        unitName: "Khoa Kiến trúc",
        positionName: "Giảng viên",
        status: "IN_REVIEW",
        totalSelfScore: 79.0,
        totalManagerScore: 79.0,
        totalFinalScore: 79.0,
        ranking: "GOOD",
        teachingScore: 41.0,
        researchScore: 25.0,
        serviceScore: 13.0,
        honorTitle: "LAO_DONG_TIEN_TIEN",
        createdAt: "2026-09-01T08:00:00.000Z",
      },
      {
        id: "eval-dau-008",
        periodId: "00000000-0000-0000-0000-000000000001",
        periodName: "Đánh giá & Xếp loại Cán bộ, Giảng viên Năm học 2025-2026",
        academicYear: "2025-2026",
        templateId: "00000000-0000-0000-0000-000000000001",
        templateName: "Tiêu chuẩn Đánh giá 3 Trụ Cột Giảng viên DAU",
        targetType: "LECTURER",
        employeeId: "DAU260008-ID",
        employeeCode: "DAU260008",
        employeeName: "KTS. Vũ Quang Minh",
        unitName: "Khoa Kiến trúc",
        positionName: "Giảng viên",
        status: "IN_REVIEW",
        totalSelfScore: 75.0,
        totalManagerScore: 75.0,
        totalFinalScore: 75.0,
        ranking: "GOOD",
        teachingScore: 40.0,
        researchScore: 22.0,
        serviceScore: 13.0,
        honorTitle: "LAO_DONG_TIEN_TIEN",
        createdAt: "2026-09-01T08:00:00.000Z",
      },
    ];

    this.inMemoryPeriods.set("00000000-0000-0000-0000-000000000001", {
      id: "00000000-0000-0000-0000-000000000001",
      code: "KPI-2025-2026",
      name: "Đánh giá & Xếp loại Cán bộ, Giảng viên Năm học 2025-2026",
      academicYear: "2025-2026",
      semester: null,
      startDate: "2026-06-01",
      endDate: "2026-10-31",
      status: "OPEN",
      totalEvaluations: mockList.length,
      submittedCount: mockList.filter((e) => e.status !== "DRAFT").length,
      finalizedCount: mockList.filter((e) => e.status === "FINALIZED").length,
      isPkiSigned: false,
      pkiSignature: null,
      pkiSignedAt: null,
      createdAt: "2026-06-01T00:00:00.000Z",
    });

    for (const item of mockList) {
      this.upsertInMemoryEvaluation(item);
    }
  }

  /**
   * Tính toán xếp loại thi đua tự động dựa trên tổng điểm chuẩn DAU
   */
  public static calculateRanking(score: number): KpiRanking {
    if (score >= 90) return "EXCELLENT" as KpiRanking;
    if (score >= 70) return "GOOD" as KpiRanking;
    if (score >= 50) return "SATISFACTORY" as KpiRanking;
    return "UNSATISFACTORY" as KpiRanking;
  }

  /**
   * Lấy danh sách các kỳ đánh giá (KpiPeriod)
   */
  public static async getPeriods(): Promise<KpiPeriodDto[]> {
    try {
      const periods = await prisma.kpiPeriod.findMany({
        orderBy: [{ academicYear: "desc" }, { createdAt: "desc" }],
        include: {
          _count: {
            select: { evaluations: true },
          },
        },
      });

      const result: KpiPeriodDto[] = [];
      for (const p of periods) {
        const submittedCount = await prisma.kpiEvaluation.count({
          where: {
            periodId: p.id,
            status: { in: ["SUBMITTED", "IN_REVIEW", "FINALIZED"] },
          },
        });
        const finalizedCount = await prisma.kpiEvaluation.count({
          where: { periodId: p.id, status: "FINALIZED" },
        });

        const pkiInfo = this.inMemoryPeriodSigned.get(p.id);

        result.push({
          id: p.id,
          code: p.code,
          name: p.name,
          academicYear: p.academicYear,
          semester: p.semester,
          startDate: p.startDate.toISOString().split("T")[0],
          endDate: p.endDate.toISOString().split("T")[0],
          status: p.status as any,
          totalEvaluations: p._count.evaluations,
          submittedCount,
          finalizedCount,
          isPkiSigned: Boolean(pkiInfo),
          pkiSignature: pkiInfo?.signature || null,
          pkiSignedAt: pkiInfo?.signedAt || null,
          createdAt: p.createdAt.toISOString(),
        });
      }

      return result;
    } catch {
      // Resilience fallback
      const allPeriods = Array.from(this.inMemoryPeriods.values()).map((p) => {
        const pkiInfo = this.inMemoryPeriodSigned.get(p.id);
        const periodEvals = Array.from(this.inMemoryEvaluations.values()).filter(
          (e) => e.periodId === p.id
        );
        return {
          ...p,
          totalEvaluations: periodEvals.length || p.totalEvaluations,
          submittedCount:
            periodEvals.filter((e) => e.status !== "DRAFT").length || p.submittedCount,
          finalizedCount:
            periodEvals.filter((e) => e.status === "FINALIZED").length || p.finalizedCount,
          isPkiSigned: Boolean(pkiInfo),
          pkiSignature: pkiInfo?.signature || p.pkiSignature || null,
          pkiSignedAt: pkiInfo?.signedAt || p.pkiSignedAt || null,
        };
      });
      return allPeriods;
    }
  }

  /**
   * Mở kỳ đánh giá mới (Dành cho Phòng TCHC / SysAdmin)
   */
  public static async createPeriod(
    input: CreateKpiPeriodInput,
    currentUser: AuthUser
  ): Promise<KpiPeriodDto> {
    const isHR = currentUser.roles.some((r) =>
      ["ROLE_HR_OFFICER", "ROLE_SYSADMIN"].includes(r)
    );

    if (!isHR) {
      throw new AppError(403, "FORBIDDEN", "Chỉ Phòng TCHC mới có quyền tạo mới kỳ đánh giá.");
    }

    try {
      const existing = await prisma.kpiPeriod.findUnique({
        where: { code: input.code },
      });

      if (existing) {
        throw new AppError(409, "RESOURCE_CONFLICT", `Mã kỳ đánh giá ${input.code} đã tồn tại.`);
      }

      const period = await prisma.kpiPeriod.create({
        data: {
          code: input.code,
          name: input.name,
          academicYear: input.academicYear,
          semester: input.semester || null,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          status: KpiPeriodStatus.OPEN,
        },
      });

      const dto: KpiPeriodDto = {
        id: period.id,
        code: period.code,
        name: period.name,
        academicYear: period.academicYear,
        semester: period.semester,
        startDate: period.startDate.toISOString().split("T")[0],
        endDate: period.endDate.toISOString().split("T")[0],
        status: period.status as any,
        totalEvaluations: 0,
        submittedCount: 0,
        finalizedCount: 0,
        isPkiSigned: false,
        createdAt: period.createdAt.toISOString(),
      };
      this.inMemoryPeriods.set(dto.id, dto);
      return dto;
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      const dto: KpiPeriodDto = {
        id: `period-${Date.now()}`,
        code: input.code,
        name: input.name,
        academicYear: input.academicYear,
        semester: input.semester || null,
        startDate: input.startDate,
        endDate: input.endDate,
        status: "OPEN",
        totalEvaluations: 0,
        submittedCount: 0,
        finalizedCount: 0,
        isPkiSigned: false,
        createdAt: new Date().toISOString(),
      };
      this.inMemoryPeriods.set(dto.id, dto);
      return dto;
    }
  }

  /**
   * Lấy danh mục mẫu tiêu chí (KpiTemplate & Criteria 3 Trụ Cột)
   */
  public static async getTemplates(targetType?: KpiTargetType): Promise<KpiTemplateDto[]> {
    try {
      const templates = await prisma.kpiTemplate.findMany({
        where: targetType ? { targetType } : undefined,
        include: {
          criteria: {
            orderBy: { orderIndex: "asc" },
          },
        },
      });

      if (templates.length > 0) {
        return templates.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          targetType: t.targetType as any,
          description: t.description,
          totalMaxScore: Number(t.totalMaxScore),
          criteria: t.criteria.map((c) => ({
            id: c.id,
            templateId: c.templateId,
            orderIndex: c.orderIndex,
            category: c.category,
            name: c.name,
            description: c.description,
            maxScore: Number(c.maxScore),
            weight: Number(c.weight),
            pillar: c.category.includes("TRỤ CỘT I")
              ? "TEACHING"
              : c.category.includes("TRỤ CỘT II")
              ? "RESEARCH"
              : "SERVICE",
          })),
        }));
      }
    } catch {
      // Proceed to default templates
    }

    // Default Templates with 3 Pillars
    const defaultTemplates: KpiTemplateDto[] = [
      {
        id: "00000000-0000-0000-0000-000000000001",
        code: "KPI_LECTURER_3PILLARS",
        name: "Bộ Tiêu chuẩn 3 Trụ Cột Đánh giá Giảng viên DAU",
        targetType: "LECTURER",
        description: "Đánh giá Giảng dạy Studio (50đ), NCKH & Sáng tác kiến trúc (35đ), Phục vụ cộng đồng (15đ)",
        totalMaxScore: 100,
        criteria: DEFAULT_LECTURER_CRITERIA,
      },
      {
        id: "00000000-0000-0000-0000-000000000002",
        code: "KPI_STAFF_DEFAULT",
        name: "Tiêu chuẩn Đánh giá Chuyên viên & Nhân viên Hành chính DAU",
        targetType: "STAFF",
        description: "Đánh giá Tiến độ (35đ), Chất lượng (30đ), Phục vụ (20đ), Kỷ luật (15đ)",
        totalMaxScore: 100,
        criteria: DEFAULT_STAFF_CRITERIA,
      },
    ];

    if (targetType) {
      return defaultTemplates.filter((t) => t.targetType === targetType);
    }
    return defaultTemplates;
  }

  /**
   * Xem hoặc tự động khởi tạo phiếu đánh giá cá nhân (Không gian Cá nhân)
   * Tự động kết nối Trục 1 Workload để nạp giờ chuẩn Studio
   */
  private static async resolveActivePeriodId(periodIdOpt?: string): Promise<string> {
    if (periodIdOpt && periodIdOpt !== "undefined") {
      return periodIdOpt;
    }
    try {
      const activeDbPeriod = await prisma.kpiPeriod.findFirst({
        where: { status: KpiPeriodStatus.OPEN },
        orderBy: { createdAt: "desc" },
      });
      if (activeDbPeriod) return activeDbPeriod.id;
    } catch {
      // fallback to memory
    }
    for (const p of this.inMemoryPeriods.values()) {
      if (p.status === "OPEN") return p.id;
    }
    return "00000000-0000-0000-0000-000000000001";
  }

  private static async ensurePeriodIsOpen(periodId: string): Promise<void> {
    if (this.inMemoryPeriodSigned.has(periodId)) {
      throw new AppError(
        409,
        "PERIOD_CLOSED",
        "Kỳ đánh giá đã ký số chốt kết quả, không thể chỉnh sửa."
      );
    }
    const memPeriod = this.inMemoryPeriods.get(periodId);
    if (memPeriod && memPeriod.status !== "OPEN") {
      throw new AppError(
        409,
        "PERIOD_CLOSED",
        `Kỳ đánh giá đã đóng (${memPeriod.status}), không thể chỉnh sửa.`
      );
    }
    try {
      const dbPeriod = await prisma.kpiPeriod.findUnique({
        where: { id: periodId },
        select: { status: true },
      });
      if (dbPeriod && dbPeriod.status !== KpiPeriodStatus.OPEN) {
        throw new AppError(
          409,
          "PERIOD_CLOSED",
          `Kỳ đánh giá đã đóng (${dbPeriod.status}), không thể chỉnh sửa.`
        );
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
    }
  }

  private static async resolveTemplateForEmployee(
    employeeId: string,
    currentUser: AuthUser,
    forcedTargetType?: "LECTURER" | "STAFF"
  ): Promise<KpiTemplateDto> {
    let targetType: "LECTURER" | "STAFF" = forcedTargetType || "LECTURER";

    if (!forcedTargetType) {
      let resolvedFromDb = false;
      try {
        const emp = await prisma.employee.findUnique({
          where: { id: employeeId },
          include: {
            assignments: {
              where: { status: "ACTIVE" },
              include: { position: true },
              take: 1,
            },
          },
        });
        const pos = emp?.assignments?.[0]?.position;
        if (pos) {
          resolvedFromDb = true;
          const adminCodes = new Set([
            "CHUYEN_VIEN",
            "NHAN_VIEN",
            "KE_TOAN",
            "VAN_THU",
            "THU_KY",
            "TRUONG_PHONG",
            "PHO_TRUONG_PHONG",
          ]);
          if (pos.positionType === "ADMINISTRATIVE" || adminCodes.has(pos.code)) {
            targetType = "STAFF";
          } else {
            targetType = "LECTURER";
          }
        }
      } catch {
        // fallback to roles
      }

      if (!resolvedFromDb) {
        const isTeachingRole = currentUser.roles.some((r) =>
          ["ROLE_LECTURER", "ROLE_DEAN"].includes(r)
        );
        const isStaffRole = currentUser.roles.some((r) =>
          ["ROLE_HR_OFFICER", "ROLE_STAFF"].includes(r)
        );
        if (!isTeachingRole && isStaffRole) {
          targetType = "STAFF";
        }
      }
    }

    try {
      const dbTemplate = await prisma.kpiTemplate.findFirst({
        where: { targetType: targetType as KpiTargetType },
        include: {
          criteria: { orderBy: { orderIndex: "asc" } },
        },
      });
      if (dbTemplate && dbTemplate.criteria.length > 0) {
        return {
          id: dbTemplate.id,
          code: dbTemplate.code,
          name: dbTemplate.name,
          targetType: dbTemplate.targetType as any,
          totalMaxScore: Number(dbTemplate.totalMaxScore),
          criteria: dbTemplate.criteria.map((c) => ({
            id: c.id,
            templateId: c.templateId,
            orderIndex: c.orderIndex,
            category: c.category,
            pillar:
              c.category.toUpperCase().includes("NCKH") || c.category.toUpperCase().includes("RESEARCH")
                ? ("RESEARCH" as const)
                : c.category.toUpperCase().includes("ĐÀO TẠO") || c.category.toUpperCase().includes("TEACHING")
                  ? ("TEACHING" as const)
                  : ("SERVICE" as const),
            name: c.name,
            description: c.description,
            maxScore: Number(c.maxScore),
            weight: Number(c.weight),
          })),
        };
      }
    } catch {
      // fallback to defaults
    }

    if (targetType === "STAFF") {
      return {
        id: "00000000-0000-0000-0000-000000000002",
        code: "KPI_STAFF_DIGNITY",
        name: "Bộ Tiêu chuẩn Đánh giá Chuyên viên & Hành chính DAU",
        targetType: "STAFF",
        totalMaxScore: 100,
        criteria: DEFAULT_STAFF_CRITERIA,
      };
    }

    return {
      id: "00000000-0000-0000-0000-000000000001",
      code: "KPI_LECTURER_3PILLARS",
      name: "Bộ Tiêu chuẩn 3 Trụ Cột Đánh giá Giảng viên DAU",
      targetType: "LECTURER",
      totalMaxScore: 100,
      criteria: DEFAULT_LECTURER_CRITERIA,
    };
  }

  public static async getMyEvaluation(
    periodIdQuery: string | undefined,
    currentUser: AuthUser
  ): Promise<KpiEvaluationDetailDto> {
    const employeeId = currentUser.employeeId;
    if (!employeeId) {
      throw new AppError(400, "BAD_REQUEST", "Tài khoản chưa được gán với hồ sơ CBGV.");
    }

    const periodId = await this.resolveActivePeriodId(periodIdQuery);

    try {
      const dbEval = await prisma.kpiEvaluation.findUnique({
        where: { periodId_employeeId: { periodId, employeeId } },
        include: {
          period: true,
          template: { include: { criteria: { orderBy: { orderIndex: "asc" } } } },
          items: { include: { criterion: true } },
          employee: {
            include: {
              assignments: {
                where: { status: "ACTIVE" },
                include: { unit: true, position: true },
                take: 1,
              },
            },
          },
        },
      });

      if (dbEval) {
        const template = await this.resolveTemplateForEmployee(
          employeeId,
          currentUser,
          dbEval.template.targetType as "LECTURER" | "STAFF"
        );
        const itemByCrit = new Map(dbEval.items.map((it) => [it.criterionId, it]));
        let teachingScore = 0;
        let researchScore = 0;
        let serviceScore = 0;

        const items = (template.criteria || []).map((crit) => {
          const saved = itemByCrit.get(crit.id);
          const effective = Number(
            saved?.finalScore ?? saved?.managerScore ?? saved?.selfScore ?? 0
          );
          if (crit.pillar === "TEACHING") teachingScore += effective;
          else if (crit.pillar === "RESEARCH") researchScore += effective;
          else serviceScore += effective;

          return {
            id: saved?.id || `item-${crit.id}`,
            criterionId: crit.id,
            criterionName: crit.name,
            category: crit.category,
            pillar: crit.pillar,
            maxScore: crit.maxScore,
            selfScore: saved?.selfScore != null ? Number(saved.selfScore) : null,
            managerScore: saved?.managerScore != null ? Number(saved.managerScore) : null,
            finalScore: saved?.finalScore != null ? Number(saved.finalScore) : null,
            selfNote: saved?.selfNote ?? null,
            evidenceUrl: saved?.evidenceUrl ?? null,
            managerNote: saved?.managerNote ?? null,
          };
        });

        let workloadHours = { actualHours: 0, quotaHours: 270, overtimeHours: 0 };
        try {
          const settlement = await WorkloadService.calculateSettlement(employeeId);
          workloadHours = {
            actualHours: settlement.totalActualConvertedHours,
            quotaHours: settlement.effectiveQuota,
            overtimeHours: settlement.overtimeHours,
          };
        } catch {
          // ignore
        }

        const evalDto: KpiEvaluationDto = {
          id: dbEval.id,
          periodId: dbEval.periodId,
          periodName: dbEval.period.name,
          academicYear: dbEval.period.academicYear,
          templateId: dbEval.templateId,
          templateName: dbEval.template.name,
          targetType: dbEval.template.targetType as any,
          employeeId: dbEval.employeeId,
          employeeCode: dbEval.employee.employeeCode,
          employeeName: dbEval.employee.fullName,
          unitName: dbEval.employee.assignments?.[0]?.unit?.name || "Đơn vị",
          positionName: dbEval.employee.assignments?.[0]?.position?.name || "Cán bộ",
          status: dbEval.status as any,
          totalSelfScore: dbEval.totalSelfScore != null ? Number(dbEval.totalSelfScore) : null,
          totalManagerScore: dbEval.totalManagerScore != null ? Number(dbEval.totalManagerScore) : null,
          totalFinalScore: dbEval.totalFinalScore != null ? Number(dbEval.totalFinalScore) : null,
          ranking: dbEval.ranking as any,
          teachingScore,
          researchScore,
          serviceScore,
          managerComment: dbEval.managerComment,
          councilComment: dbEval.councilComment,
          submittedAt: dbEval.submittedAt?.toISOString() ?? null,
          reviewedAt: dbEval.reviewedAt?.toISOString() ?? null,
          finalizedAt: dbEval.finalizedAt?.toISOString() ?? null,
          createdAt: dbEval.createdAt.toISOString(),
        };
        this.upsertInMemoryEvaluation(evalDto);
        this.inMemoryEvaluationItems.set(evalDto.id, items);

        return {
          evaluation: evalDto,
          template,
          items,
          pillarBreakdown: {
            teaching: {
              score: teachingScore,
              maxScore: template.targetType === "LECTURER" ? 50 : 0,
              quotaHours: workloadHours.quotaHours,
              actualHours: workloadHours.actualHours,
              overtimeHours: workloadHours.overtimeHours,
            },
            research: {
              score: researchScore,
              maxScore: template.targetType === "LECTURER" ? 35 : 0,
              papersCount: 0,
              projectsCount: 0,
            },
            service: {
              score: serviceScore,
              maxScore: template.targetType === "LECTURER" ? 15 : 100,
              activitiesCount: 0,
            },
          },
        };
      }
    } catch {
      // Fallback to memory store
    }

    const memEval = this.findInMemoryEvaluationForUser(
      periodId,
      employeeId,
      currentUser.employeeCode
    );

    const template = await this.resolveTemplateForEmployee(
      employeeId,
      currentUser,
      memEval?.targetType as "LECTURER" | "STAFF" | undefined
    );

    let workloadHours = {
      actualHours: 324.0,
      quotaHours: 270.0,
      overtimeHours: 54.0,
    };

    try {
      const settlement = await WorkloadService.calculateSettlement(employeeId);
      workloadHours = {
        actualHours: settlement.totalActualConvertedHours,
        quotaHours: settlement.effectiveQuota,
        overtimeHours: settlement.overtimeHours,
      };
    } catch {
      // Keep sensible default for architecture faculty
    }

    // Tạo items tương ứng với template và khôi phục điểm thực đã lưu (không giả lập 0.9 * maxScore)
    const savedItems = memEval ? this.inMemoryEvaluationItems.get(memEval.id) || [] : [];
    const savedByCrit = new Map(savedItems.map((it) => [it.criterionId, it]));

    const items = (template.criteria || []).map((crit) => {
      const saved = savedByCrit.get(crit.id);
      return {
        id: saved?.id || `item-${crit.id}`,
        criterionId: crit.id,
        criterionName: crit.name,
        category: crit.category,
        pillar: crit.pillar,
        maxScore: crit.maxScore,
        selfScore: saved?.selfScore ?? null,
        managerScore: saved?.managerScore ?? null,
        finalScore: saved?.finalScore ?? null,
        selfNote:
          saved?.selfNote ??
          (crit.id === "00000000-0000-0000-0001-000000000001"
            ? `Tự động đồng bộ từ Trục 1 Workload: Hoàn thành ${workloadHours.actualHours}/${workloadHours.quotaHours} giờ chuẩn (Vượt ${workloadHours.overtimeHours}h)`
            : null),
        evidenceUrl: saved?.evidenceUrl ?? null,
        managerNote: saved?.managerNote ?? null,
      };
    });

    const teachingScore = memEval?.teachingScore ?? 0;
    const researchScore = memEval?.researchScore ?? 0;
    const serviceScore = memEval?.serviceScore ?? 0;
    const totalScore = teachingScore + researchScore + serviceScore;

    const pillarBreakdown: AcademicPillarBreakdownDto = {
      teaching: {
        score: teachingScore,
        maxScore: template.targetType === "LECTURER" ? 50 : 0,
        quotaHours: workloadHours.quotaHours,
        actualHours: workloadHours.actualHours,
        overtimeHours: workloadHours.overtimeHours,
      },
      research: {
        score: researchScore,
        maxScore: template.targetType === "LECTURER" ? 35 : 0,
        papersCount: memEval ? 2 : 0,
        projectsCount: memEval ? 1 : 0,
      },
      service: {
        score: serviceScore,
        maxScore: template.targetType === "LECTURER" ? 15 : 100,
        activitiesCount: memEval ? 3 : 0,
      },
    };

    const memPeriod = this.inMemoryPeriods.get(periodId);
    const evaluationDto: KpiEvaluationDto = memEval || {
      id: `eval-${periodId}-${employeeId}`,
      periodId,
      periodName: memPeriod?.name || "Đánh giá & Xếp loại Cán bộ, Giảng viên Năm học 2025-2026",
      academicYear: memPeriod?.academicYear || "2025-2026",
      templateId: template.id,
      templateName: template.name,
      targetType: template.targetType,
      employeeId,
      employeeCode: currentUser.employeeCode || "DAU260001",
      employeeName: currentUser.fullName || "CBGV",
      unitName: "Khoa Kiến trúc",
      positionName: template.targetType === "STAFF" ? "Chuyên viên" : "Giảng viên",
      status: "DRAFT",
      totalSelfScore: memEval ? totalScore : null,
      totalManagerScore: null,
      totalFinalScore: null,
      ranking: null,
      teachingScore,
      researchScore,
      serviceScore,
      honorTitle: "NONE",
      createdAt: new Date().toISOString(),
    };

    return {
      evaluation: evaluationDto,
      template,
      items,
      pillarBreakdown,
    };
  }

  /**
   * Nộp hoặc lưu nháp phiếu tự đánh giá cá nhân (Bước 2)
   */
  public static async submitSelfEvaluation(
    periodIdOpt: string | undefined,
    input: SubmitSelfEvaluationInput,
    currentUser: AuthUser
  ): Promise<KpiEvaluationDetailDto> {
    const employeeId = currentUser.employeeId;
    if (!employeeId) {
      throw new AppError(400, "BAD_REQUEST", "Tài khoản chưa được liên kết hồ sơ CBGV.");
    }

    const periodId = await this.resolveActivePeriodId(periodIdOpt);
    await this.ensurePeriodIsOpen(periodId);

    const existingMem = this.findInMemoryEvaluationForUser(
      periodId,
      employeeId,
      currentUser.employeeCode
    );

    const template = await this.resolveTemplateForEmployee(
      employeeId,
      currentUser,
      existingMem?.targetType as "LECTURER" | "STAFF" | undefined
    );
    const criteriaMap = new Map((template.criteria || []).map((c) => [c.id, c]));

    const seenCriteria = new Set<string>();
    let totalSelfScore = 0;
    let teachingScore = 0;
    let researchScore = 0;
    let serviceScore = 0;

    for (const item of input.items) {
      if (seenCriteria.has(item.criterionId)) {
        throw new AppError(
          422,
          "VALIDATION_ERROR",
          `Tiêu chí (${item.criterionId}) bị trùng lặp trong phiếu đánh giá.`
        );
      }
      seenCriteria.add(item.criterionId);

      const crit = criteriaMap.get(item.criterionId);
      if (!crit) {
        throw new AppError(
          422,
          "VALIDATION_ERROR",
          `Tiêu chí (${item.criterionId}) không thuộc biểu mẫu ${template.name}.`
        );
      }
      if (item.selfScore < 0 || item.selfScore > crit.maxScore) {
        throw new AppError(
          422,
          "VALIDATION_ERROR",
          `Điểm tự chấm (${item.selfScore}) cho tiêu chí "${crit.name}" không hợp lệ (0 - ${crit.maxScore}).`
        );
      }
      if (!input.isDraft && crit.pillar === "RESEARCH" && item.selfScore > 0) {
        const evidence = item.evidenceUrl?.trim();
        if (!evidence) {
          throw new AppError(
            422,
            "VALIDATION_ERROR",
            `Tiêu chí NCKH "${crit.name}" yêu cầu minh chứng (evidenceUrl) khi nộp đánh giá.`
          );
        }
      }

      totalSelfScore += item.selfScore;
      if (crit.pillar === "TEACHING") teachingScore += item.selfScore;
      else if (crit.pillar === "RESEARCH") researchScore += item.selfScore;
      else if (crit.pillar === "SERVICE") serviceScore += item.selfScore;
    }

    let existing = existingMem;
    if (!existing) {
      const detail = await this.getMyEvaluation(periodId, currentUser);
      existing = detail.evaluation;
    }
    if (
      (existing.status as string) === "FINALIZED" ||
      (existing.status as string) === "APPROVED"
    ) {
      throw new AppError(
        409,
        "INVALID_STATE_TRANSITION",
        "Phiếu đánh giá đã được Hội đồng chốt điểm (FINALIZED), không thể chỉnh sửa."
      );
    }

    const newStatus: KpiEvaluationStatus = input.isDraft ? "DRAFT" : "SUBMITTED";
    const nowIso = new Date().toISOString();

    const priorItems = new Map<string, any>(
      (this.inMemoryEvaluationItems.get(existing.id) || []).map((it) => [it.criterionId, it])
    );
    const savedItems = (template.criteria || []).map((crit) => {
      const submitted = input.items.find((i) => i.criterionId === crit.id);
      const prev = priorItems.get(crit.id);
      return {
        id: prev?.id || `item-${crit.id}`,
        criterionId: crit.id,
        criterionName: crit.name,
        category: crit.category,
        pillar: crit.pillar,
        maxScore: crit.maxScore,
        selfScore: submitted ? submitted.selfScore : (prev?.selfScore ?? null),
        managerScore: prev?.managerScore ?? null,
        finalScore: prev?.finalScore ?? null,
        selfNote: submitted ? (submitted.selfNote ?? null) : (prev?.selfNote ?? null),
        evidenceUrl: submitted ? (submitted.evidenceUrl ?? null) : (prev?.evidenceUrl ?? null),
        managerNote: prev?.managerNote ?? null,
      };
    });

    try {
      const [dbPeriod, dbEmp, dbTpl] = await Promise.all([
        prisma.kpiPeriod.findUnique({ where: { id: periodId }, select: { id: true } }),
        prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } }),
        prisma.kpiTemplate.findUnique({ where: { id: template.id }, select: { id: true } }),
      ]);
      if (dbPeriod && dbEmp && dbTpl) {
        const upsertedEval = await prisma.$transaction(async (tx) => {
          const ev = await tx.kpiEvaluation.upsert({
            where: { periodId_employeeId: { periodId, employeeId } },
            update: {
              totalSelfScore,
              status: newStatus,
              ranking: this.calculateRanking(totalSelfScore),
              submittedAt: input.isDraft ? undefined : new Date(),
            },
            create: {
              periodId,
              templateId: template.id,
              employeeId,
              status: newStatus,
              totalSelfScore,
              ranking: this.calculateRanking(totalSelfScore),
              submittedAt: input.isDraft ? null : new Date(),
            },
          });

          for (const item of input.items) {
            await tx.kpiEvaluationItem.upsert({
              where: {
                evaluationId_criterionId: {
                  evaluationId: ev.id,
                  criterionId: item.criterionId,
                },
              },
              update: {
                selfScore: item.selfScore,
                selfNote: item.selfNote ?? null,
                evidenceUrl: item.evidenceUrl ?? null,
              },
              create: {
                evaluationId: ev.id,
                criterionId: item.criterionId,
                selfScore: item.selfScore,
                selfNote: item.selfNote ?? null,
                evidenceUrl: item.evidenceUrl ?? null,
              },
            });
          }

          return ev;
        });

        existing = { ...existing, id: upsertedEval.id };
      }
    } catch {
      // Fallback safely when DB is offline or using mock IDs
    }

    const updatedEval: KpiEvaluationDto = {
      ...existing,
      periodId,
      templateId: template.id,
      templateName: template.name,
      targetType: template.targetType,
      totalSelfScore,
      teachingScore,
      researchScore,
      serviceScore,
      ranking: this.calculateRanking(totalSelfScore),
      status: newStatus as any,
      submittedAt: input.isDraft ? existing.submittedAt : nowIso,
    };

    this.inMemoryEvaluationItems.set(updatedEval.id, savedItems);
    this.upsertInMemoryEvaluation(updatedEval);

    return await this.getMyEvaluation(periodId, currentUser);
  }

  /**
   * Lấy danh sách phiếu đánh giá toàn đơn vị (Dành cho Quản lý đơn vị & Hội đồng)
   */
  /**
   * Mở rộng danh sách unitId quản lý và tra cứu tên đơn vị tương ứng cho phạm vi KPI
   */
  private static async expandManagedUnitScope(unitsManaged: string[]): Promise<{
    unitIds: Set<string>;
    unitNames: Set<string>;
  }> {
    const unitIds = new Set<string>();
    const unitNames = new Set<string>();

    for (const rootUnitId of unitsManaged) {
      unitIds.add(rootUnitId);
      try {
        const descendants = await UnitService.getDescendantUnitIds(rootUnitId);
        for (const id of descendants) {
          unitIds.add(id);
        }
      } catch {
        // Fallback when DB is unreachable during isolated unit tests
      }
    }

    if (unitIds.size > 0) {
      try {
        const units = await prisma.organizationalUnit.findMany({
          where: { id: { in: Array.from(unitIds) } },
          select: { id: true, name: true },
        });
        for (const u of units) {
          unitNames.add(u.name);
        }
      } catch {
        // Fallback when DB is unreachable
      }
    }

    return { unitIds, unitNames };
  }

  /**
   * Kiểm tra một phiếu KPI có thuộc phạm vi cây đơn vị quản lý hay không
   */
  private static async filterEvaluationsByManagedUnits(
    evaluations: KpiEvaluationDto[],
    unitsManaged: string[]
  ): Promise<KpiEvaluationDto[]> {
    if (unitsManaged.length === 0) {
      return [];
    }

    const { unitIds, unitNames } = await this.expandManagedUnitScope(unitsManaged);
    const employeeUnitMap = new Map<string, string[]>();

    try {
      const empIds = Array.from(new Set(evaluations.map((e) => e.employeeId)));
      if (empIds.length > 0) {
        const employees = await prisma.employee.findMany({
          where: { id: { in: empIds } },
          select: {
            id: true,
            assignments: {
              where: { status: "ACTIVE" },
              select: { unitId: true },
            },
          },
        });
        for (const emp of employees) {
          employeeUnitMap.set(
            emp.id,
            emp.assignments.map((a) => a.unitId)
          );
        }
      }
    } catch {
      // Fallback to unitName matching if DB is unavailable
    }

    return evaluations.filter((e) => {
      const assignedUnitIds = employeeUnitMap.get(e.employeeId);
      if (assignedUnitIds && assignedUnitIds.length > 0) {
        return assignedUnitIds.some((uid) => unitIds.has(uid));
      }
      return Boolean(e.unitName && unitNames.has(e.unitName));
    });
  }

  /**
   * Danh sách phiếu đánh giá toàn đơn vị (Trưởng khoa / Hội đồng / TCHC)
   */
  public static async getUnitEvaluations(
    query: KpiFilterQuery,
    currentUser: AuthUser
  ): Promise<KpiEvaluationDto[]> {
    const isGlobalHR = currentUser.roles.some((r) =>
      ["ROLE_HR_OFFICER", "ROLE_RECTOR"].includes(r)
    );

    let list = Array.from(new Set(this.inMemoryEvaluations.values()));

    // Filter duplicates by id
    const uniqueMap = new Map<string, KpiEvaluationDto>();
    for (const item of list) {
      uniqueMap.set(item.id, item);
    }
    let evaluations = Array.from(uniqueMap.values());

    if (!isGlobalHR) {
      const managed = currentUser.unitsManaged ?? [];
      if (managed.length === 0) {
        return [];
      }
      evaluations = await this.filterEvaluationsByManagedUnits(evaluations, managed);
    }

    if (query.periodId) {
      evaluations = evaluations.filter((e) => e.periodId === query.periodId);
    }
    if (query.ranking) {
      evaluations = evaluations.filter((e) => e.ranking === query.ranking);
    }
    if (query.status) {
      evaluations = evaluations.filter((e) => e.status === query.status);
    }
    if (query.honorTitle) {
      evaluations = evaluations.filter((e) => e.honorTitle === query.honorTitle);
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      evaluations = evaluations.filter(
        (e) =>
          e.employeeName?.toLowerCase().includes(q) ||
          e.employeeCode?.toLowerCase().includes(q) ||
          e.unitName?.toLowerCase().includes(q)
      );
    }

    return evaluations;
  }

  /**
   * Trưởng đơn vị chấm điểm quản lý & ghi nhận xét (Bước 3)
   */
  public static async scoreManagerEvaluation(
    evaluationId: string,
    input: ScoreManagerEvaluationInput,
    currentUser: AuthUser
  ): Promise<KpiEvaluationDetailDto> {
    const evaluation = this.findInMemoryEvaluationById(evaluationId);
    if (!evaluation) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy phiếu đánh giá cần chấm điểm.");
    }

    if (
      (evaluation.status as string) === "FINALIZED" ||
      (evaluation.status as string) === "APPROVED"
    ) {
      throw new AppError(
        409,
        "INVALID_STATE_TRANSITION",
        "Phiếu đánh giá đã được chốt điểm (FINALIZED), không thể chấm lại."
      );
    }
    if (evaluation.status === "DRAFT") {
      throw new AppError(
        409,
        "INVALID_STATE_TRANSITION",
        "Cán bộ chưa nộp phiếu tự đánh giá (trạng thái hiện tại: DRAFT)."
      );
    }

    // 1. Anti-Self-Approval
    if (currentUser.employeeId && currentUser.employeeId === evaluation.employeeId) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Quy tắc chống tự chấm: Bạn không được tự chấm điểm quản lý cho chính mình."
      );
    }

    // 2. Unit-tree scoping for ROLE_UNIT_HEAD / ROLE_DEAN
    const isGlobalScorer = currentUser.roles.some((r) =>
      ["ROLE_HR_OFFICER", "ROLE_RECTOR"].includes(r)
    );
    const isUnitManager = currentUser.roles.some((r) =>
      ["ROLE_UNIT_HEAD", "ROLE_DEAN"].includes(r)
    );
    if (!isGlobalScorer) {
      const managed = currentUser.unitsManaged ?? [];
      if (!isUnitManager || managed.length === 0) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "Bạn không có quyền hoặc chưa được phân công đơn vị quản lý để chấm điểm KPI."
        );
      }
      const inScope = await this.filterEvaluationsByManagedUnits([evaluation], managed);
      if (inScope.length === 0) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "Bạn chỉ được phép chấm điểm KPI cho cán bộ thuộc đơn vị mình quản lý."
        );
      }
    }

    const template = await this.resolveTemplateForEmployee(
      evaluation.employeeId,
      currentUser,
      evaluation.targetType as "LECTURER" | "STAFF" | undefined
    );
    const criteriaMap = new Map((template.criteria || []).map((c) => [c.id, c]));

    let totalManagerScore = 0;
    const seen = new Set<string>();
    for (const item of input.items) {
      if (seen.has(item.criterionId)) {
        throw new AppError(422, "VALIDATION_ERROR", `Tiêu chí (${item.criterionId}) bị trùng lặp.`);
      }
      seen.add(item.criterionId);

      const crit = criteriaMap.get(item.criterionId);
      if (!crit) {
        throw new AppError(422, "VALIDATION_ERROR", `Tiêu chí (${item.criterionId}) không hợp lệ.`);
      }
      if (item.managerScore < 0 || item.managerScore > crit.maxScore) {
        throw new AppError(
          422,
          "VALIDATION_ERROR",
          `Điểm quản lý chấm (${item.managerScore}) vượt quá điểm tối đa (${crit.maxScore}) của tiêu chí "${crit.name}".`
        );
      }
      totalManagerScore += item.managerScore;
    }

    evaluation.totalManagerScore = totalManagerScore;
    evaluation.managerComment = input.managerComment;
    evaluation.managerEmployeeId = currentUser.employeeId || "MANAGER-001";
    evaluation.managerName = currentUser.fullName;
    evaluation.status = "IN_REVIEW";
    evaluation.reviewedAt = new Date().toISOString();

    const priorItems = new Map<string, any>(
      (this.inMemoryEvaluationItems.get(evaluation.id) || []).map((it) => [it.criterionId, it])
    );
    const updatedItems = (template.criteria || []).map((crit) => {
      const scored = input.items.find((i) => i.criterionId === crit.id);
      const prev = priorItems.get(crit.id);
      return {
        id: prev?.id || `item-${crit.id}`,
        criterionId: crit.id,
        criterionName: crit.name,
        category: crit.category,
        pillar: crit.pillar,
        maxScore: crit.maxScore,
        selfScore: prev?.selfScore ?? null,
        managerScore: scored ? scored.managerScore : (prev?.managerScore ?? null),
        finalScore: prev?.finalScore ?? null,
        selfNote: prev?.selfNote ?? null,
        evidenceUrl: prev?.evidenceUrl ?? null,
        managerNote: scored ? (scored.managerNote ?? null) : (prev?.managerNote ?? null),
      };
    });
    this.inMemoryEvaluationItems.set(evaluation.id, updatedItems);
    this.upsertInMemoryEvaluation(evaluation);

    try {
      const dbEval = await prisma.kpiEvaluation.findUnique({ where: { id: evaluation.id } });
      if (dbEval) {
        await prisma.kpiEvaluation.update({
          where: { id: evaluation.id },
          data: {
            totalManagerScore,
            managerComment: input.managerComment ?? null,
            managerEmployeeId: currentUser.employeeId ?? null,
            status: KpiEvaluationStatus.IN_REVIEW,
            reviewedAt: new Date(),
          },
        });
      }
    } catch {
      // fallback safely
    }

    return await this.getMyEvaluation(evaluation.periodId, {
      ...currentUser,
      employeeId: evaluation.employeeId,
      employeeCode: evaluation.employeeCode ?? null,
      fullName: evaluation.employeeName ?? currentUser.fullName,
    });
  }

  /**
   * Hội đồng Khoa / Trường Bỏ phiếu Bình bầu Danh hiệu Thi đua (Bước 3.5)
   * Rào chắn khống chế CSTĐCS <= 15% tổng số Lao động tiên tiến (Luật Thi đua, Khen thưởng 2022)
   */
  public static async recordCouncilVote(
    evaluationId: string,
    input: CouncilVoteInput,
    currentUser: AuthUser
  ): Promise<KpiEvaluationDto> {
    const isCouncil = currentUser.roles.some((r) =>
      ["ROLE_UNIT_HEAD", "ROLE_DEAN", "ROLE_HR_OFFICER", "ROLE_RECTOR"].includes(r)
    );

    if (!isCouncil) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Chỉ Hội đồng Thi đua - Khen thưởng hoặc Trưởng khoa mới có quyền ghi nhận kết quả bỏ phiếu."
      );
    }

    const evaluation = this.findInMemoryEvaluationById(evaluationId);
    if (!evaluation) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy phiếu đánh giá để bình bầu.");
    }

    if (
      (evaluation.status as string) === "FINALIZED" ||
      (evaluation.status as string) === "APPROVED"
    ) {
      throw new AppError(
        409,
        "INVALID_STATE_TRANSITION",
        "Phiếu đánh giá đã chốt kết quả, không thể bỏ phiếu lại."
      );
    }

    if (input.votesYes > input.totalVoters) {
      throw new AppError(422, "VALIDATION_ERROR", "Số phiếu tán thành không thể vượt quá tổng số phiếu cử tri.");
    }

    const score = evaluation.totalFinalScore ?? evaluation.totalManagerScore ?? evaluation.totalSelfScore ?? 0;

    // 1. Kiểm tra tiêu chuẩn điểm danh hiệu
    if (input.proposedHonorTitle === "CHIEN_SI_THI_DUA_CO_SO") {
      if (score < 90) {
        throw new AppError(
          422,
          "VALIDATION_ERROR",
          "Danh hiệu Chiến sĩ thi đua cơ sở yêu cầu hoàn thành xuất sắc nhiệm vụ (Tổng điểm >= 90 điểm)."
        );
      }
    } else if (input.proposedHonorTitle === "LAO_DONG_TIEN_TIEN") {
      if (score < 70) {
        throw new AppError(
          422,
          "VALIDATION_ERROR",
          "Danh hiệu Lao động tiên tiến yêu cầu hoàn thành tốt nhiệm vụ trở lên (Tổng điểm >= 70 điểm)."
        );
      }
    }

    // 2. Rào chắn khống chế tỷ lệ <= 15% Chiến sĩ thi đua cơ sở (theo kỳ đánh giá & đơn vị cơ sở)
    if (input.proposedHonorTitle === "CHIEN_SI_THI_DUA_CO_SO") {
      const allInPeriod = Array.from(this.inMemoryEvaluations.values()).filter(
        (e) => e.periodId === evaluation.periodId
      );
      const relevantFaculty = evaluation.unitName
        ? allInPeriod.filter((e) => e.unitName === evaluation.unitName)
        : allInPeriod;

      // Đếm số Lao động tiên tiến (điểm >= 70)
      const ldttCount = relevantFaculty.filter(
        (e) => (e.totalFinalScore ?? e.totalManagerScore ?? e.totalSelfScore ?? 0) >= 70
      ).length;

      // Đếm số CSTĐCS hiện tại (loại trừ chính cá nhân đang xét)
      const currentCstcCount = relevantFaculty.filter(
        (e) => e.id !== evaluation.id && e.honorTitle === "CHIEN_SI_THI_DUA_CO_SO"
      ).length;

      // Luật Thi đua Khen thưởng: Tối đa 15% số LĐTT (với đơn vị nhỏ, cho phép tối đa 1 người)
      const maxAllowedCstc = Math.max(1, Math.floor(ldttCount * 0.15));

      if (currentCstcCount + 1 > maxAllowedCstc) {
        throw new AppError(
          422,
          "QUOTA_EXCEEDED",
          `Tỷ lệ đề xuất Chiến sĩ thi đua cơ sở vượt quá rào chắn 15% (${currentCstcCount + 1}/${ldttCount} = ${Math.round(
            ((currentCstcCount + 1) / ldttCount) * 100
          )}% > 15%) theo quy định của Luật Thi đua, Khen thưởng.`
        );
      }
    }

    const approvalRatio = Math.round((input.votesYes / input.totalVoters) * 1000) / 10;
    const isApproved = approvalRatio >= 50.0;

    evaluation.councilVote = {
      votesYes: input.votesYes,
      votesNo: input.totalVoters - input.votesYes,
      totalVoters: input.totalVoters,
      approvalRatio,
      proposedHonorTitle: input.proposedHonorTitle,
      initiativeSummary: input.initiativeSummary || null,
      councilMeetingDate: input.councilMeetingDate || new Date().toISOString().split("T")[0],
      votedAt: new Date().toISOString(),
    };

    if (isApproved) {
      evaluation.honorTitle = input.proposedHonorTitle;
    } else {
      evaluation.honorTitle = "NONE";
    }

    this.upsertInMemoryEvaluation(evaluation);

    return evaluation;
  }

  /**
   * Hội đồng Thi đua chốt điểm và xếp loại A/B/C/D thủ công từng cá nhân
   */
  public static async finalizeEvaluation(
    evaluationId: string,
    input: FinalizeCouncilEvaluationInput,
    currentUser: AuthUser
  ): Promise<KpiEvaluationDto> {
    const isCouncil = currentUser.roles.some((r) =>
      ["ROLE_HR_OFFICER", "ROLE_RECTOR"].includes(r)
    );

    if (!isCouncil) {
      throw new AppError(403, "FORBIDDEN", "Chỉ Hội đồng Thi đua hoặc Phòng TCHC mới có quyền chốt xếp loại thi đua.");
    }

    const evaluation = this.findInMemoryEvaluationById(evaluationId);
    if (!evaluation) {
      throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy phiếu đánh giá cần phê duyệt.");
    }

    if (
      (evaluation.status as string) === "FINALIZED" ||
      (evaluation.status as string) === "APPROVED"
    ) {
      throw new AppError(
        409,
        "INVALID_STATE_TRANSITION",
        "Phiếu đánh giá đã được chốt điểm (FINALIZED)."
      );
    }
    if (evaluation.status === "DRAFT") {
      throw new AppError(
        409,
        "INVALID_STATE_TRANSITION",
        "Không thể chốt điểm cho phiếu đánh giá đang ở trạng thái DRAFT."
      );
    }

    const expectedRanking = this.calculateRanking(input.finalScore);
    if (input.ranking !== expectedRanking) {
      throw new AppError(
        422,
        "VALIDATION_ERROR",
        `Xếp loại (${input.ranking}) không khớp với tổng điểm (${input.finalScore}, xếp loại đúng: ${expectedRanking}).`
      );
    }

    evaluation.totalFinalScore = input.finalScore;
    evaluation.ranking = input.ranking;
    evaluation.councilComment = input.councilComment || null;
    evaluation.status = "FINALIZED";
    evaluation.finalizedAt = new Date().toISOString();

    if (input.honorTitle) {
      evaluation.honorTitle = input.honorTitle;
    }

    // Tự động đồng bộ sang Phân hệ Lương
    const rankingLetter = input.ranking === "EXCELLENT" ? "A" : input.ranking === "GOOD" ? "B" : input.ranking === "SATISFACTORY" ? "C" : "D";
    PayrollService.updateFacultyKpiRanking(evaluation.employeeId, rankingLetter);
    if (evaluation.employeeCode) {
      PayrollService.updateFacultyKpiRanking(evaluation.employeeCode, rankingLetter);
    }

    this.upsertInMemoryEvaluation(evaluation);

    try {
      const dbEval = await prisma.kpiEvaluation.findUnique({ where: { id: evaluation.id } });
      if (dbEval) {
        await prisma.kpiEvaluation.update({
          where: { id: evaluation.id },
          data: {
            totalFinalScore: input.finalScore,
            ranking: input.ranking as KpiRanking,
            councilComment: input.councilComment ?? null,
            status: KpiEvaluationStatus.FINALIZED,
            finalizedAt: new Date(),
          },
        });
      }
    } catch {
      // fallback safely
    }

    return evaluation;
  }

  /**
   * Phê duyệt Quyết nghị Toàn thể Kỳ Thi đua & Ký Số PKI RSA-2048 (Bước 4 Toàn thể)
   * Tự động đồng bộ toàn bộ xếp loại A/B/C/D sang Phân hệ Lương (PayrollService)
   */
  public static async finalizeWithPki(
    periodId: string,
    input: FinalizePeriodWithPkiInput,
    currentUser: AuthUser
  ): Promise<CouncilSummaryReportDto> {
    const isRector = currentUser.roles.includes("ROLE_RECTOR");

    if (!isRector) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Chỉ Hiệu trưởng / Chủ tịch Hội đồng Thi đua mới có quyền ký số phê duyệt kỳ thi đua."
      );
    }

    const periodEvaluations = Array.from(this.inMemoryEvaluations.values()).filter(
      (e) => e.periodId === periodId
    );
    const signerName = input.signerName || currentUser.fullName || "GS.TS. Nguyễn Hiệu Trưởng";

    // Ký số PKI RSA-2048
    const canonicalPayload = `KPI_COUNCIL_RESOLUTION##PERIOD:${periodId}##ACADEMIC_YEAR:2025-2026##TOTAL:${periodEvaluations.length}##SIGNER:${signerName}##TIMESTAMP:${new Date().toISOString()}`;
    const pkiResult = PkiService.signData(canonicalPayload);

    this.inMemoryPeriodSigned.set(periodId, {
      signature: pkiResult.signatureValue,
      signedAt: pkiResult.signedAt,
    });

    const memPeriod = this.inMemoryPeriods.get(periodId);
    if (memPeriod) {
      this.inMemoryPeriods.set(periodId, {
        ...memPeriod,
        status: "FINALIZED",
        isPkiSigned: true,
        pkiSignature: pkiResult.signatureValue,
        pkiSignedAt: pkiResult.signedAt,
      });
    }

    // Chốt kết quả và đồng bộ Payroll (cô lập theo periodId)
    for (const item of periodEvaluations) {
      const finalScore = item.totalFinalScore ?? item.totalManagerScore ?? item.totalSelfScore ?? 80;
      item.totalFinalScore = finalScore;
      item.status = "FINALIZED";
      item.finalizedAt = pkiResult.signedAt;
      item.pkiSignature = pkiResult.signatureValue;
      item.pkiSignedAt = pkiResult.signedAt;

      if (!item.ranking) {
        item.ranking = this.calculateRanking(finalScore);
      }

      const rankingLetter = item.ranking === "EXCELLENT" ? "A" : item.ranking === "GOOD" ? "B" : item.ranking === "SATISFACTORY" ? "C" : "D";
      PayrollService.updateFacultyKpiRanking(item.employeeId, rankingLetter);
      if (item.employeeCode) {
        PayrollService.updateFacultyKpiRanking(item.employeeCode, rankingLetter);
      }

      this.upsertInMemoryEvaluation(item);
    }

    try {
      const dbPeriod = await prisma.kpiPeriod.findUnique({ where: { id: periodId } });
      if (dbPeriod) {
        await prisma.$transaction([
          prisma.kpiPeriod.update({
            where: { id: periodId },
            data: { status: KpiPeriodStatus.FINALIZED },
          }),
          prisma.kpiEvaluation.updateMany({
            where: { periodId },
            data: { status: KpiEvaluationStatus.FINALIZED, finalizedAt: new Date() },
          }),
        ]);
      }
    } catch {
      // fallback safely
    }

    return await this.getCouncilSummary(periodId, currentUser);
  }

  /**
   * Lấy Báo cáo Tổng kết Hội đồng Thi đua & Thống kê Tỷ lệ Chấp hành Pháp luật
   */
  public static async getCouncilSummary(
    periodId: string,
    _currentUser?: AuthUser
  ): Promise<CouncilSummaryReportDto> {
    const allFaculty = Array.from(this.inMemoryEvaluations.values()).filter(
      (e) => e.periodId === periodId
    );
    const pkiInfo = this.inMemoryPeriodSigned.get(periodId);
    const memPeriod = this.inMemoryPeriods.get(periodId);

    const excellentCount = allFaculty.filter((e) => e.ranking === "EXCELLENT").length;
    const goodCount = allFaculty.filter((e) => e.ranking === "GOOD").length;
    const satisfactoryCount = allFaculty.filter((e) => e.ranking === "SATISFACTORY").length;
    const unsatisfactoryCount = allFaculty.filter((e) => e.ranking === "UNSATISFACTORY").length;

    const laoDongTienTienCount = allFaculty.filter(
      (e) => e.honorTitle === "LAO_DONG_TIEN_TIEN" || e.honorTitle === "CHIEN_SI_THI_DUA_CO_SO"
    ).length;

    const chienSiThiDuaCoSoCount = allFaculty.filter(
      (e) => e.honorTitle === "CHIEN_SI_THI_DUA_CO_SO"
    ).length;

    const cstcRatio = laoDongTienTienCount > 0
      ? Math.round((chienSiThiDuaCoSoCount / laoDongTienTienCount) * 1000) / 10
      : 0;

    const isCstcRatioCompliant = cstcRatio <= 15.0;

    return {
      periodId,
      periodName: memPeriod?.name || "Đánh giá & Xếp loại Cán bộ, Giảng viên Năm học 2025-2026",
      academicYear: memPeriod?.academicYear || "2025-2026",
      totalFaculty: allFaculty.length,
      excellentCount,
      goodCount,
      satisfactoryCount,
      unsatisfactoryCount,
      laoDongTienTienCount,
      chienSiThiDuaCoSoCount,
      cstcRatio,
      isCstcRatioCompliant,
      isPkiSigned: Boolean(pkiInfo),
      pkiSignature: pkiInfo?.signature || null,
      pkiSignedAt: pkiInfo?.signedAt || null,
      evaluations: allFaculty,
    };
  }

  /**
   * Xuất Biên bản Họp Bình bầu Thi đua & Đánh giá Viên chức A4 (Chuẩn Nghị định 30/2020/NĐ-CP)
   */
  public static async exportCouncilReportPdf(
    periodId: string,
    unitId?: string
  ): Promise<Uint8Array> {
    const summary = await this.getCouncilSummary(periodId);
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    let page = pdfDoc.addPage([595.28, 841.89]); // A4 Portrait
    const { width, height } = page.getSize();

    let fontRegular: any;
    let fontBold: any;
    let isUnicode = false;

    try {
      const candidates = [
        "C:/Windows/Fonts/times.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      ];
      for (const fontPath of candidates) {
        if (fs.existsSync(fontPath)) {
          const fontBytes = fs.readFileSync(fontPath);
          fontRegular = await pdfDoc.embedFont(fontBytes);
          fontBold = fontRegular;
          isUnicode = true;
          break;
        }
      }
    } catch {
      isUnicode = false;
    }

    if (!fontRegular) {
      fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }

    const sanitize = (text: string) => {
      if (isUnicode) return text;
      return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
    };

    // Header Quốc huy / Bộ GD&ĐT
    page.drawText(sanitize("BỘ GIÁO DỤC VÀ ĐÀO TẠO"), {
      x: 45,
      y: height - 40,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(sanitize("TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG"), {
      x: 45,
      y: height - 54,
      size: 10.5,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.4),
    });
    page.drawText(sanitize("HỘI ĐỒNG THI ĐUA - KHEN THƯỞNG"), {
      x: 45,
      y: height - 68,
      size: 9.5,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15),
    });

    // Bên phải: Quốc hiệu
    page.drawText(sanitize("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"), {
      x: 320,
      y: height - 40,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(sanitize("Độc lập - Tự do - Hạnh phúc"), {
      x: 360,
      y: height - 54,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawLine({
      start: { x: 375, y: height - 60 },
      end: { x: 475, y: height - 60 },
      thickness: 1,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Tiêu đề biên bản
    page.drawText(sanitize("BIÊN BẢN HỌP BÌNH BẦU THI ĐUA & ĐÁNH GIÁ VIÊN CHỨC"), {
      x: 80,
      y: height - 105,
      size: 13,
      font: fontBold,
      color: rgb(0.08, 0.2, 0.45),
    });
    page.drawText(sanitize("NĂM HỌC 2025 - 2026 (THEO NGHỊ ĐỊNH 90/2020/NĐ-CP & TT 20/2020/TT-BGDĐT)"), {
      x: 95,
      y: height - 122,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Khung thống kê chỉ tiêu pháp lý (Box thống kê)
    page.drawRectangle({
      x: 45,
      y: height - 185,
      width: width - 90,
      height: 52,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: rgb(0.8, 0.85, 0.9),
      borderWidth: 1,
    });

    page.drawText(
      sanitize(`Tổng số CBGV đánh giá: ${summary.totalFaculty} | Hoàn thành xuất sắc (A): ${summary.excellentCount} | Hoàn thành tốt (B): ${summary.goodCount}`),
      {
        x: 55,
        y: height - 150,
        size: 9,
        font: fontRegular,
        color: rgb(0.15, 0.15, 0.15),
      }
    );
    page.drawText(
      sanitize(`Danh hiệu Lao động tiên tiến: ${summary.laoDongTienTienCount} | Chiến sĩ thi đua cơ sở: ${summary.chienSiThiDuaCoSoCount}`),
      {
        x: 55,
        y: height - 165,
        size: 9,
        font: fontRegular,
        color: rgb(0.15, 0.15, 0.15),
      }
    );
    page.drawText(
      sanitize(`Tỷ lệ CSTĐCS: ${summary.cstcRatio}% (Rào chắn Luật Thi đua Khen thưởng: <= 15% - ${summary.isCstcRatioCompliant ? "HỢP LỆ" : "CẢNH BÁO VƯỢT CHỈ TIÊU"})`),
      {
        x: 55,
        y: height - 180,
        size: 9,
        font: fontBold,
        color: summary.isCstcRatioCompliant ? rgb(0.05, 0.45, 0.15) : rgb(0.7, 0.1, 0.1),
      }
    );

    // Bảng danh sách cán bộ
    let y = height - 215;
    const rowHeight = 22;

    const drawTableHeader = (targetPage: any, headerY: number) => {
      targetPage.drawRectangle({
        x: 45,
        y: headerY,
        width: width - 90,
        height: rowHeight,
        color: rgb(0.1, 0.2, 0.4),
      });

      const headers = [
        { text: "STT", x: 50 },
        { text: "Mã CB", x: 75 },
        { text: "Họ và tên", x: 130 },
        { text: "Đơn vị", x: 250 },
        { text: "3 Trụ cột", x: 330 },
        { text: "Tổng", x: 395 },
        { text: "Xếp loại", x: 430 },
        { text: "Danh hiệu", x: 480 },
      ];

      for (const h of headers) {
        targetPage.drawText(sanitize(h.text), {
          x: h.x,
          y: headerY + 6,
          size: 8.5,
          font: fontBold,
          color: rgb(1, 1, 1),
        });
      }
    };

    // Header bảng
    drawTableHeader(page, y);
    y -= rowHeight;

    const filteredEvaluations = unitId
      ? (summary.evaluations || []).filter(
          (e) => (e as any).unitId === unitId || e.unitName === unitId
        )
      : summary.evaluations || [];

    // Dòng dữ liệu (hỗ trợ phân trang nhiều trang)
    let index = 1;
    for (const emp of filteredEvaluations) {
      if (y < 140) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = height - 60;
        drawTableHeader(page, y);
        y -= rowHeight;
      }

      const isEven = index % 2 === 0;
      if (isEven) {
        page.drawRectangle({
          x: 45,
          y,
          width: width - 90,
          height: rowHeight,
          color: rgb(0.97, 0.98, 0.99),
        });
      }

      page.drawText(String(index++), { x: 50, y: y + 6, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(sanitize(emp.employeeCode || "CB"), { x: 75, y: y + 6, size: 8, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
      page.drawText(sanitize(emp.employeeName || "CB"), { x: 130, y: y + 6, size: 8, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      page.drawText(sanitize(emp.unitName || "DAU"), { x: 250, y: y + 6, size: 8, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });

      const pillarsText = `${emp.teachingScore || 0}-${emp.researchScore || 0}-${emp.serviceScore || 0}`;
      page.drawText(pillarsText, { x: 335, y: y + 6, size: 8, font: fontRegular, color: rgb(0.2, 0.4, 0.6) });

      const scoreText = String(emp.totalFinalScore ?? emp.totalSelfScore ?? 0);
      page.drawText(scoreText, { x: 395, y: y + 6, size: 8, font: fontBold, color: rgb(0.1, 0.3, 0.1) });

      const rankText = emp.ranking === "EXCELLENT" ? "Loại A" : emp.ranking === "GOOD" ? "Loại B" : emp.ranking === "SATISFACTORY" ? "Loại C" : "Loại D";
      page.drawText(sanitize(rankText), { x: 430, y: y + 6, size: 8, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });

      const honorText = emp.honorTitle === "CHIEN_SI_THI_DUA_CO_SO" ? "CSTĐCS" : emp.honorTitle === "LAO_DONG_TIEN_TIEN" ? "LĐTT" : "-";
      page.drawText(sanitize(honorText), {
        x: 485,
        y: y + 6,
        size: 8,
        font: fontBold,
        color: emp.honorTitle === "CHIEN_SI_THI_DUA_CO_SO" ? rgb(0.8, 0.3, 0.0) : rgb(0.2, 0.2, 0.2),
      });

      y -= rowHeight;
    }

    if (y < 140) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = height - 80;
    }

    // Khối chữ ký & Dấu điện tử PKI RSA-2048 (chỉ in con dấu PKI khi thực sự đã ký số)
    const signY = Math.min(100, y - 30);
    page.drawText(sanitize("THƯ KÝ HỘI ĐỒNG"), {
      x: 70,
      y: signY,
      size: 9.5,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });
    page.drawText(sanitize("(Đã ký xác nhận)"), {
      x: 75,
      y: signY - 14,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    page.drawText(sanitize("CHỦ TỊCH HỘI ĐỒNG - HIỆU TRƯỞNG"), {
      x: 340,
      y: signY,
      size: 9.5,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.4),
    });

    if (summary.isPkiSigned) {
      // Con dấu số điện tử PKI SmartCA (Red Seal) chỉ in khi isPkiSigned === true
      page.drawRectangle({
        x: 330,
        y: signY - 60,
        width: 200,
        height: 42,
        color: rgb(0.99, 0.94, 0.94),
        borderColor: rgb(0.85, 0.15, 0.15),
        borderWidth: 1.5,
      });

      page.drawText(sanitize("[ ĐÃ KÝ SỐ PKI RSA-2048 ]"), {
        x: 350,
        y: signY - 30,
        size: 8.5,
        font: fontBold,
        color: rgb(0.8, 0.1, 0.1),
      });
      page.drawText(sanitize("Trường Đại học Kiến trúc Đà Nẵng"), {
        x: 345,
        y: signY - 42,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.6, 0.1, 0.1),
      });
      page.drawText(sanitize(`Thời gian: ${(summary.pkiSignedAt || new Date().toISOString()).split("T")[0]}`), {
        x: 345,
        y: signY - 54,
        size: 7,
        font: fontRegular,
        color: rgb(0.5, 0.1, 0.1),
      });
    } else {
      page.drawText(sanitize("(Chưa ký số PKI - Bản dự thảo biên bản)"), {
        x: 340,
        y: signY - 18,
        size: 8,
        font: fontRegular,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    return await pdfDoc.save();
  }
}
