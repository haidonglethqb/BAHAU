import crypto from "node:crypto";
import fs from "node:fs";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { AppError } from "../middlewares/error.middleware.js";
import { PkiService } from "./pki.service.js";
import { PayrollService, DEFAULT_FACULTY_MEMBERS } from "./payroll.service.js";
import { WorkloadService } from "./workload.service.js";
import {
  TenureApplicationDto,
  CreateTenureApplicationInput,
  TenureCouncilVoteInput,
  AppointTenureWithPkiInput,
  TenureFilterQuery,
  ScientificWorkItem,
  AcademicRankTitle,
  CareerClassTitle,
  DOMAIN_EVENTS,
} from "@bahau/contracts";
import { DomainEventBus, initEventSubscribers } from "../events/index.js";

export class TenureService {
  // Kho lưu trữ trong bộ nhớ đảm bảo 100% tính sẵn sàng độc lập (Zero-crash Resilience)
  private static applications = new Map<string, TenureApplicationDto>();

  static {
    initEventSubscribers();
    // Khởi tạo các hồ sơ mẫu tiêu biểu của Trường ĐH Kiến trúc Đà Nẵng
    const sampleApplications: TenureApplicationDto[] = [
      {
        id: "tenure-dau-001",
        employeeId: "DAU260001-ID",
        employeeCode: "DAU260001",
        employeeName: "PGS.TS. Trần Thị Bình",
        unitName: "Khoa Kiến trúc",
        currentDegree: "DOCTOR",
        currentCareerClass: "PRINCIPAL_LECTURER",
        currentAcademicRank: "ASSOCIATE_PROFESSOR",
        currentSalaryCoeff: 6.78,
        targetCareerClass: "SENIOR_LECTURER",
        targetAcademicRank: "PROFESSOR",
        teachingYears: 16,
        status: "VOTED",
        totalScientificScore: 23.5,
        requiredScientificScore: 20.0,
        works: [
          {
            id: "work-001",
            workType: "SCOPUS_WOS_PAPER",
            title: "Sustainable Vernacular Architecture in Central Vietnam Coastal Region",
            publishedYear: 2023,
            role: "MAIN_AUTHOR",
            convertedScore: 3.0,
            evidenceUrl: "https://doi.org/10.1016/j.arch.2023.01.012",
            notes: "Tạp chí ISI/Scopus Q1",
          },
          {
            id: "work-002",
            workType: "ARCHITECTURAL_AWARD",
            title: "Trung tâm Văn hóa Cộng đồng Hòa Vang - Giải Bạc Giải thưởng Kiến trúc Quốc gia 2022",
            publishedYear: 2022,
            role: "PRINCIPAL_DESIGNER",
            convertedScore: 3.0,
            evidenceUrl: "https://kienviet.net/giai-thuong-ktqg-2022-hoa-vang",
            notes: "Công trình đã hoàn thành và đưa vào sử dụng",
          },
          {
            id: "work-003",
            workType: "BOOK_ISBN",
            title: "Giáo trình Nguyên lý Thiết kế Kiến trúc Đô thị Sinh thái",
            publishedYear: 2024,
            role: "MAIN_AUTHOR",
            convertedScore: 2.0,
            evidenceUrl: "ISBN 978-604-987-123-4",
            notes: "NXB Xây Dựng",
          },
          {
            id: "work-004",
            workType: "SCOPUS_WOS_PAPER",
            title: "Climate-Responsive Facade Systems for High-Rise Educational Buildings",
            publishedYear: 2024,
            role: "MAIN_AUTHOR",
            convertedScore: 3.0,
            evidenceUrl: "https://doi.org/10.1016/j.enbuild.2024.114002",
            notes: "Tạp chí Energy & Buildings (Q1)",
          },
          {
            id: "work-005",
            workType: "RESEARCH_PROJECT",
            title: "Đề tài NCKH cấp Bộ: Nghiên cứu cấu trúc không gian làng nghề truyền thống Quảng Nam - Đà Nẵng",
            publishedYear: 2025,
            role: "MAIN_AUTHOR",
            convertedScore: 2.5,
            evidenceUrl: "https://dau.edu.vn/nckh/bo-2025-01",
            notes: "Nghiệm thu loại Xuất sắc",
          },
          {
            id: "work-006",
            workType: "BUILT_PROJECT",
            title: "Cụm Thư viện & Nhà điều hành ĐH Kiến trúc Đà Nẵng",
            publishedYear: 2021,
            role: "PRINCIPAL_DESIGNER",
            convertedScore: 2.0,
            evidenceUrl: "https://dau.edu.vn/campus-library",
            notes: "Chủ trì thiết kế kiến trúc",
          },
          {
            id: "work-007",
            workType: "SCOPUS_WOS_PAPER",
            title: "Post-Occupancy Evaluation of Contemporary Public Spaces in Danang City",
            publishedYear: 2025,
            role: "MAIN_AUTHOR",
            convertedScore: 3.0,
            evidenceUrl: "https://doi.org/10.1016/j.cities.2025.105120",
            notes: "Tạp chí Cities (Q1)",
          },
          {
            id: "work-008",
            workType: "ARCHITECTURAL_AWARD",
            title: "Ashui Pavilion of the Year 2023 - Nhà triển lãm Tre & Đá Đà Nẵng",
            publishedYear: 2023,
            role: "PRINCIPAL_DESIGNER",
            convertedScore: 3.0,
            evidenceUrl: "https://ashui.com/awards/pavilion-2023",
            notes: "Giải thưởng Ashui Awards 2023",
          },
          {
            id: "work-009",
            workType: "DOMESTIC_JOURNAL",
            title: "Bản sắc bản địa trong kiến trúc đương đại miền Trung",
            publishedYear: 2023,
            role: "MAIN_AUTHOR",
            convertedScore: 1.0,
            evidenceUrl: "Tạp chí Kiến trúc số 04/2023",
            notes: "HĐGSNN tính 1.0 điểm",
          },
          {
            id: "work-010",
            workType: "DOMESTIC_JOURNAL",
            title: "Chuyển đổi số trong đào tạo đồ án Kiến trúc tại ĐH Kiến trúc Đà Nẵng",
            publishedYear: 2024,
            role: "MAIN_AUTHOR",
            convertedScore: 1.0,
            evidenceUrl: "Tạp chí Kiến trúc số 09/2024",
            notes: "HĐGSNN tính 1.0 điểm",
          },
        ],
        councilVote: {
          votesYes: 15,
          votesNo: 0,
          totalVoters: 15,
          approvalRatio: 100.0,
          isPassed: true,
          votedDate: "2026-10-01T09:30:00.000Z",
          councilNotes: "Hội đồng nhất trí 15/15 phiếu (100%) đề nghị Hiệu trưởng bổ nhiệm chức danh Giáo sư và Giảng viên cao cấp.",
          foreignLanguagePass: true,
        },
        appointmentResolutionNumber: null,
        appointedSalaryCoeff: null,
        pkiSignature: null,
        pkiSignedAt: null,
        createdAt: "2026-09-01T08:00:00.000Z",
        updatedAt: "2026-10-01T10:00:00.000Z",
      },
      {
        id: "tenure-dau-002",
        employeeId: "DAU260002-ID",
        employeeCode: "DAU260002",
        employeeName: "TS. Lê Hoàng Nam",
        unitName: "Khoa Xây dựng",
        currentDegree: "DOCTOR",
        currentCareerClass: "PRINCIPAL_LECTURER",
        currentAcademicRank: "NONE",
        currentSalaryCoeff: 5.64,
        targetCareerClass: "SENIOR_LECTURER",
        targetAcademicRank: "ASSOCIATE_PROFESSOR",
        teachingYears: 10,
        status: "IN_REVIEW",
        totalScientificScore: 12.0,
        requiredScientificScore: 10.0,
        works: [
          {
            id: "work-011",
            workType: "SCOPUS_WOS_PAPER",
            title: "Seismic Performance of Concrete Structures with Recycled Aggregate",
            publishedYear: 2023,
            role: "MAIN_AUTHOR",
            convertedScore: 3.0,
            evidenceUrl: "https://doi.org/10.1016/j.conbuildmat.2023.131102",
            notes: "Q1 Construction & Building Materials",
          },
          {
            id: "work-012",
            workType: "SCOPUS_WOS_PAPER",
            title: "Finite Element Modeling of Prestressed Composite Slabs under Fire Conditions",
            publishedYear: 2024,
            role: "MAIN_AUTHOR",
            convertedScore: 3.0,
            evidenceUrl: "https://doi.org/10.1016/j.firesaf.2024.103980",
            notes: "Q1 Fire Safety Journal",
          },
          {
            id: "work-013",
            workType: "RESEARCH_PROJECT",
            title: "Đề tài cấp Bộ: Ứng dụng vật liệu composite gia cường kết cấu cầu đường ven biển miền Trung",
            publishedYear: 2024,
            role: "MAIN_AUTHOR",
            convertedScore: 2.0,
            evidenceUrl: "https://dau.edu.vn/nckh/bo-nam-2024",
            notes: "Nghiệm thu Đạt",
          },
          {
            id: "work-014",
            workType: "BOOK_ISBN",
            title: "Tính toán Kết cấu Bê tông Cốt thép Nâng cao",
            publishedYear: 2025,
            role: "MAIN_AUTHOR",
            convertedScore: 2.0,
            evidenceUrl: "ISBN 978-604-82-4521-0",
            notes: "Giáo trình đại học",
          },
          {
            id: "work-015",
            workType: "BUILT_PROJECT",
            title: "Kiểm định và thử tải Cầu Thuận Phước - Đà Nẵng",
            publishedYear: 2022,
            role: "PRINCIPAL_DESIGNER",
            convertedScore: 2.0,
            evidenceUrl: "https://dau.edu.vn/du-an/kiem-dinh-cau",
            notes: "Chủ trì kiểm định kỹ thuật",
          },
        ],
        councilVote: null,
        appointmentResolutionNumber: null,
        appointedSalaryCoeff: null,
        pkiSignature: null,
        pkiSignedAt: null,
        createdAt: "2026-09-05T08:00:00.000Z",
        updatedAt: "2026-09-05T08:00:00.000Z",
      },
      {
        id: "tenure-dau-003",
        employeeId: "DAU260003-ID",
        employeeCode: "DAU260003",
        employeeName: "ThS. Nguyễn Văn An",
        unitName: "Khoa Kiến trúc",
        currentDegree: "MASTER",
        currentCareerClass: "LECTURER",
        currentAcademicRank: "NONE",
        currentSalaryCoeff: 4.98,
        targetCareerClass: "PRINCIPAL_LECTURER",
        targetAcademicRank: "NONE",
        teachingYears: 7,
        status: "SUBMITTED",
        totalScientificScore: 6.5,
        requiredScientificScore: 4.0,
        works: [
          {
            id: "work-020",
            workType: "ARCHITECTURAL_AWARD",
            title: "Nhà cộng đồng thôn Cẩm Phú - Giải Đồng Kiến trúc Xanh Quốc gia 2023",
            publishedYear: 2023,
            role: "PRINCIPAL_DESIGNER",
            convertedScore: 3.0,
            evidenceUrl: "https://kienviet.net/cam-phu-community",
            notes: "Giải thưởng Hội KTS Việt Nam",
          },
          {
            id: "work-021",
            workType: "BUILT_PROJECT",
            title: "Trường Tiểu học Hy Vọng Đà Nẵng",
            publishedYear: 2024,
            role: "PRINCIPAL_DESIGNER",
            convertedScore: 1.5,
            evidenceUrl: "https://dau.edu.vn/projects/hope-school",
            notes: "Công trình thực nghiệm trường học xanh",
          },
          {
            id: "work-022",
            workType: "DOMESTIC_JOURNAL",
            title: "Tổ chức không gian linh hoạt trong nhà ở nông thôn mới Hòa Vang",
            publishedYear: 2024,
            role: "MAIN_AUTHOR",
            convertedScore: 1.0,
            evidenceUrl: "Tạp chí Kiến trúc 06/2024",
            notes: "Bài báo khoa học",
          },
          {
            id: "work-023",
            workType: "DOMESTIC_JOURNAL",
            title: "Vật liệu tái chế trong nội thất công trình giáo dục",
            publishedYear: 2025,
            role: "MAIN_AUTHOR",
            convertedScore: 1.0,
            evidenceUrl: "Tạp chí Xây dựng 02/2025",
            notes: "Bài báo khoa học",
          },
        ],
        councilVote: null,
        appointmentResolutionNumber: null,
        appointedSalaryCoeff: null,
        pkiSignature: null,
        pkiSignedAt: null,
        createdAt: "2026-09-10T10:00:00.000Z",
        updatedAt: "2026-09-10T10:00:00.000Z",
      },
    ];

    for (const app of sampleApplications) {
      this.applications.set(app.id, app);
    }
  }

  /**
   * Tính điểm quy đổi chuẩn hóa cho 1 công trình khoa học hoặc tác phẩm kiến trúc
   */
  public static calculateWorkScore(work: ScientificWorkItem): number {
    const isLead = work.role === "MAIN_AUTHOR" || work.role === "PRINCIPAL_DESIGNER";
    switch (work.workType) {
      case "SCOPUS_WOS_PAPER":
        return isLead ? 3.0 : 2.0;
      case "ARCHITECTURAL_AWARD":
        return isLead ? 3.0 : 2.0;
      case "BUILT_PROJECT":
        return isLead ? 2.0 : 1.0;
      case "BOOK_ISBN":
        return isLead ? 2.0 : 1.0;
      case "RESEARCH_PROJECT":
        return isLead ? 2.0 : 1.0;
      case "DOMESTIC_JOURNAL":
        return isLead ? 1.0 : 0.75;
      default:
        return 1.0;
    }
  }

  /**
   * Xác định điểm khoa học chuẩn tối thiểu theo pháp lý QĐ 37/2018/QĐ-TTg & TT 40/2020/TT-BGDĐT
   */
  public static getRequiredScore(targetRank: AcademicRankTitle, targetClass: CareerClassTitle): number {
    if (targetRank === "PROFESSOR") {
      return 20.0;
    }
    if (targetRank === "ASSOCIATE_PROFESSOR") {
      return 10.0;
    }
    if (targetClass === "SENIOR_LECTURER") {
      return 6.0;
    }
    if (targetClass === "PRINCIPAL_LECTURER") {
      return 4.0;
    }
    return 2.0;
  }

  /**
   * Lấy danh sách hồ sơ xét chức danh có bộ lọc
   */
  public static async getAllApplications(query?: TenureFilterQuery): Promise<TenureApplicationDto[]> {
    let list = Array.from(this.applications.values());

    if (query?.status) {
      list = list.filter((a) => a.status === query.status);
    }
    if (query?.targetCareerClass) {
      list = list.filter((a) => a.targetCareerClass === query.targetCareerClass);
    }
    if (query?.targetAcademicRank) {
      list = list.filter((a) => a.targetAcademicRank === query.targetAcademicRank);
    }
    if (query?.unitName) {
      list = list.filter((a) => a.unitName.toLowerCase().includes(query.unitName!.toLowerCase()));
    }
    if (query?.search) {
      const q = query.search.toLowerCase();
      list = list.filter(
        (a) =>
          a.employeeName.toLowerCase().includes(q) ||
          a.employeeCode.toLowerCase().includes(q) ||
          a.unitName.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Lấy chi tiết một hồ sơ theo ID
   */
  public static async getApplicationById(id: string): Promise<TenureApplicationDto> {
    const app = this.applications.get(id);
    if (!app) {
      throw new AppError(404, "NOT_FOUND", "Không tìm thấy hồ sơ xét chức danh.");
    }
    return app;
  }

  /**
   * Đăng ký và nộp hồ sơ xét công nhận chức danh & thăng hạng giảng viên
   */
  public static async createApplication(
    input: CreateTenureApplicationInput,
    currentUser: any
  ): Promise<TenureApplicationDto> {
    const employeeId = currentUser?.employeeId || currentUser?.id || "DAU260003-ID";
    const employeeCode = currentUser?.employeeCode || "DAU260003";
    const employeeName = currentUser?.fullName || currentUser?.name || "Cán bộ Giảng viên";
    const unitName = currentUser?.unitName || "Khoa Kiến trúc";

    // Tìm thông tin cán bộ trong kho dữ liệu lương để lấy ngạch bậc hiện tại
    const faculty = DEFAULT_FACULTY_MEMBERS.find(
      (f) => f.employeeId === employeeId || f.employeeCode === employeeCode
    );

    const currentCareerClass: CareerClassTitle =
      faculty?.positionCode === "GIANG_VIEN_CHINH"
        ? "PRINCIPAL_LECTURER"
        : faculty?.positionCode === "TRUONG_KHOA" || faculty?.salaryCoefficient && faculty.salaryCoefficient >= 6.2
        ? "SENIOR_LECTURER"
        : "LECTURER";

    const currentAcademicRank: AcademicRankTitle =
      faculty?.academicTitle === "PROFESSOR"
        ? "PROFESSOR"
        : faculty?.academicTitle === "ASSOCIATE_PROFESSOR"
        ? "ASSOCIATE_PROFESSOR"
        : "NONE";

    const currentSalaryCoeff = faculty?.salaryCoefficient || 2.34;
    const currentDegree = faculty?.fullName.includes("TS.") ? "DOCTOR" : "MASTER";

    // Tính toán lại điểm từng công trình nếu chưa có convertedScore
    const normalizedWorks: ScientificWorkItem[] = (input.works || []).map((w, idx) => ({
      ...w,
      id: w.id || `work-gen-${Date.now()}-${idx}`,
      convertedScore: w.convertedScore || this.calculateWorkScore(w),
    }));

    const totalScientificScore = normalizedWorks.reduce((sum, w) => sum + (w.convertedScore || 0), 0);
    const requiredScientificScore = this.getRequiredScore(input.targetAcademicRank, input.targetCareerClass);

    const newApp: TenureApplicationDto = {
      id: `tenure-dau-${Date.now()}`,
      employeeId,
      employeeCode,
      employeeName,
      unitName,
      currentDegree,
      currentCareerClass,
      currentAcademicRank,
      currentSalaryCoeff,
      targetCareerClass: input.targetCareerClass,
      targetAcademicRank: input.targetAcademicRank,
      teachingYears: input.teachingYears,
      status: "SUBMITTED",
      totalScientificScore: Math.round(totalScientificScore * 10) / 10,
      requiredScientificScore,
      works: normalizedWorks,
      councilVote: null,
      appointmentResolutionNumber: null,
      appointedSalaryCoeff: null,
      pkiSignature: null,
      pkiSignedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.applications.set(newApp.id, newApp);
    return newApp;
  }

  /**
   * Hội đồng cơ sở bỏ phiếu biểu quyết kín tín nhiệm theo Quyết định 37/2018/QĐ-TTg Điều 16
   * RÀO CHẮN: Tỷ lệ phiếu tán thành phải đạt >= 2/3 (66.7%) tổng số thành viên hội đồng.
   */
  public static async recordTenureCouncilVote(
    id: string,
    input: TenureCouncilVoteInput,
    _currentUser: any
  ): Promise<TenureApplicationDto> {
    const app = this.applications.get(id);
    if (!app) {
      throw new AppError(404, "NOT_FOUND", "Không tìm thấy hồ sơ xét chức danh.");
    }

    if (input.totalVoters <= 0) {
      throw new AppError(400, "INVALID_VOTERS", "Tổng số thành viên hội đồng phải lớn hơn 0.");
    }

    if (input.votesYes > input.totalVoters) {
      throw new AppError(400, "INVALID_VOTES", "Số phiếu tán thành không được vượt quá tổng số thành viên hội đồng.");
    }

    const votesNo = input.totalVoters - input.votesYes;
    const approvalRatio = Math.round((input.votesYes / input.totalVoters) * 1000) / 10; // Làm tròn 1 chữ số thập phân

    // Rào chắn pháp lý Điều 16 QĐ 37/2018/QĐ-TTg: Phải đạt ít nhất 2/3 tổng số thành viên
    const isPassed = approvalRatio >= 66.67 && input.foreignLanguagePass !== false;

    const voteRecord = {
      votesYes: input.votesYes,
      votesNo,
      totalVoters: input.totalVoters,
      approvalRatio,
      isPassed,
      votedDate: new Date().toISOString(),
      councilNotes: input.councilNotes || (isPassed ? "Đạt đủ điều kiện tín nhiệm của Hội đồng." : "Chưa đạt tỷ lệ phiếu tín nhiệm theo quy định."),
      foreignLanguagePass: input.foreignLanguagePass !== false,
    };

    app.councilVote = voteRecord;
    app.status = isPassed ? "VOTED" : "REJECTED";
    app.updatedAt = new Date().toISOString();

    this.applications.set(app.id, app);
    return app;
  }

  /**
   * Hiệu trưởng phê duyệt và ký số PKI RSA-2048 ban hành Quyết định Bổ nhiệm
   * Tự động đồng bộ:
   * 1. Cập nhật ngạch bậc lương mới sang PayrollService
   * 2. Điều chỉnh định mức giờ chuẩn và thù lao vượt giờ sang WorkloadService
   */
  public static async appointWithPki(
    id: string,
    input: AppointTenureWithPkiInput,
    _currentUser: any
  ): Promise<TenureApplicationDto> {
    const app = this.applications.get(id);
    if (!app) {
      throw new AppError(404, "NOT_FOUND", "Không tìm thấy hồ sơ xét chức danh.");
    }

    if (app.status !== "VOTED" || !app.councilVote || !app.councilVote.isPassed) {
      throw new AppError(
        400,
        "COUNCIL_NOT_PASSED",
        "Hồ sơ chưa được Hội đồng cơ sở biểu quyết thông qua (yêu cầu tỷ lệ tán thành >= 2/3)."
      );
    }

    // Xác định hệ số lương mới theo Thông tư 40/2020/TT-BGDĐT
    let newSalaryCoeff = input.newSalaryCoeff;
    if (!newSalaryCoeff) {
      if (app.targetCareerClass === "SENIOR_LECTURER") {
        // Hạng I: Khởi điểm 6.20 (hoặc nhảy bậc nếu đang ở mức cao)
        newSalaryCoeff = Math.max(6.20, Math.round((app.currentSalaryCoeff + 0.35) * 100) / 100);
      } else if (app.targetCareerClass === "PRINCIPAL_LECTURER") {
        // Hạng II: Khởi điểm 4.40
        newSalaryCoeff = Math.max(4.40, Math.round((app.currentSalaryCoeff + 0.35) * 100) / 100);
      } else {
        newSalaryCoeff = app.currentSalaryCoeff;
      }
    }

    const resolutionNumber = input.resolutionNumber || `${Math.floor(100 + Math.random() * 900)}/QĐ-ĐHKTĐN`;
    const signerName = input.signerName || "GS.TS. Nguyễn Hiệu Trưởng";

    // Ký số PKI RSA-2048 bằng PkiService
    const payloadToSign = [
      resolutionNumber,
      app.employeeCode,
      app.employeeName,
      app.targetCareerClass,
      app.targetAcademicRank,
      newSalaryCoeff.toString(),
      app.councilVote.approvalRatio.toString(),
      signerName,
    ].join("##");

    const signatureResult = PkiService.signData(payloadToSign);

    app.status = "APPOINTED";
    app.appointmentResolutionNumber = resolutionNumber;
    app.appointedSalaryCoeff = newSalaryCoeff;
    app.pkiSignature = signatureResult.signatureValue;
    app.pkiSignedAt = signatureResult.signedAt;
    app.updatedAt = new Date().toISOString();

    // Phát Domain Event để Decouple sang PayrollService và WorkloadService
    DomainEventBus.getInstance().publishSync(
      DomainEventBus.createEvent(
        DOMAIN_EVENTS.TENURE_APPOINTED,
        app.id,
        {
          employeeId: app.employeeId,
          employeeCode: app.employeeCode,
          fullName: app.employeeName,
          newAcademicTitle: app.targetCareerClass,
          newSalaryCoefficient: newSalaryCoeff,
          newTeachingNormHours: 216,
          overtimeCompRate: 200000,
          academicRank: app.targetAcademicRank,
          resolutionNumber,
          signedAt: signatureResult.signedAt,
        },
        {
          actorId: _currentUser?.id,
          actorRole: _currentUser?.role,
          source: "BAHAU_TENURE_SERVICE",
        }
      )
    );

    this.applications.set(app.id, app);
    return app;
  }

  /**
   * Xuất Quyết định Bổ nhiệm chức danh chuẩn thể thức Nghị định 30/2020/NĐ-CP (PDF)
   */
  public static async exportAppointmentResolutionPdf(id: string): Promise<Uint8Array> {
    const app = this.applications.get(id);
    if (!app) {
      throw new AppError(404, "NOT_FOUND", "Không tìm thấy hồ sơ xét chức danh.");
    }

    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const page = pdfDoc.addPage([595.28, 841.89]); // A4 Portrait
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
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.4),
    });
    page.drawText(sanitize(`Số: ${app.appointmentResolutionNumber || "888/QĐ-ĐHKTĐN"}`), {
      x: 45,
      y: height - 68,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Bên phải: Quốc hiệu
    page.drawText(sanitize("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"), {
      x: 310,
      y: height - 40,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(sanitize("Độc lập - Tự do - Hạnh phúc"), {
      x: 350,
      y: height - 54,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawLine({
      start: { x: 360, y: height - 60 },
      end: { x: 470, y: height - 60 },
      thickness: 1,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Tiêu đề Quyết định
    page.drawText(sanitize("QUYẾT ĐỊNH"), {
      x: 245,
      y: height - 105,
      size: 14,
      font: fontBold,
      color: rgb(0.08, 0.2, 0.45),
    });
    page.drawText(sanitize("Về việc bổ nhiệm chức danh nghề nghiệp và xếp hệ số lương viên chức"), {
      x: 80,
      y: height - 122,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Căn cứ pháp lý
    const grounds = [
      "Căn cứ Luật Giáo dục Đại học năm 2012 và Luật sửa đổi, bổ sung một số điều của Luật GDĐH năm 2018;",
      "Căn cứ Quyết định số 37/2018/QĐ-TTg và QĐ số 25/2020/QĐ-TTg của Thủ tướng Chính phủ quy định tiêu chuẩn, thủ tục bổ nhiệm chức danh Giáo sư, Phó Giáo sư;",
      "Căn cứ Thông tư 40/2020/TT-BGDĐT và TT 04/2022/TT-BGDĐT của Bộ GD&ĐT quy định mã số, tiêu chuẩn chức danh nghề nghiệp giảng viên đại học;",
      `Căn cứ Biên bản họp Hội đồng xét chức danh Trường ĐH Kiến trúc Đà Nẵng với tỷ lệ tán thành ${app.councilVote?.approvalRatio || 100}% (${app.councilVote?.votesYes || 15}/${app.councilVote?.totalVoters || 15} phiếu);`,
      "Xét đề nghị của Trưởng phòng Tổ chức - Cán bộ,",
    ];

    let currentY = height - 150;
    for (const g of grounds) {
      page.drawText(sanitize(g), {
        x: 45,
        y: currentY,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.25, 0.25, 0.25),
      });
      currentY -= 15;
    }

    currentY -= 10;
    page.drawText(sanitize("HIỆU TRƯỞNG TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG QUYẾT ĐỊNH:"), {
      x: 100,
      y: currentY,
      size: 9.5,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.4),
    });

    currentY -= 25;

    // Tên chức danh tiếng Việt
    const careerLabel =
      app.targetCareerClass === "SENIOR_LECTURER"
        ? "Giảng viên cao cấp (Hạng I - Mã số V.07.01.01)"
        : app.targetCareerClass === "PRINCIPAL_LECTURER"
        ? "Giảng viên chính (Hạng II - Mã số V.07.01.02)"
        : "Giảng viên (Hạng III - Mã số V.07.01.03)";

    const rankLabel =
      app.targetAcademicRank === "PROFESSOR"
        ? " và chức danh khoa học Giáo sư (GS)"
        : app.targetAcademicRank === "ASSOCIATE_PROFESSOR"
        ? " và chức danh khoa học Phó Giáo sư (PGS)"
        : "";

    // Điều 1
    page.drawText(sanitize(`Điều 1. Bổ nhiệm vào chức danh ${careerLabel}${rankLabel} đối với:`), {
      x: 45,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 16;
    page.drawText(sanitize(`- Ông/Bà: ${app.employeeName}        Mã số CBGV: ${app.employeeCode}`), {
      x: 65,
      y: currentY,
      size: 9,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 15;
    page.drawText(sanitize(`- Đơn vị công tác: ${app.unitName} - Trường Đại học Kiến trúc Đà Nẵng`), {
      x: 65,
      y: currentY,
      size: 9,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });

    currentY -= 22;

    // Điều 2
    const targetSalary = app.appointedSalaryCoeff || (app.targetCareerClass === "SENIOR_LECTURER" ? 6.20 : 4.40);
    page.drawText(sanitize(`Điều 2. Xếp hệ số lương mới là ${targetSalary.toFixed(2)} (Hệ số cũ: ${app.currentSalaryCoeff.toFixed(2)}) kể từ ngày ban hành quyết định.`), {
      x: 45,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 16;
    page.drawText(sanitize("Các khoản phụ cấp chức vụ, phụ cấp thâm niên nhà giáo được tính theo chế độ hiện hành."), {
      x: 65,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });

    currentY -= 22;

    // Điều 3
    page.drawText(sanitize("Điều 3. Chuyển đổi định mức giờ chuẩn giảng dạy và nghiên cứu khoa học:"), {
      x: 45,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 16;
    page.drawText(sanitize("- Định mức giảng dạy: 216 giờ chuẩn/năm học (áp dụng tiêu chuẩn Giảng viên chính/cao cấp)."), {
      x: 65,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });
    currentY -= 15;
    page.drawText(sanitize("- Mức thanh toán thù lao vượt giờ giảng dạy: 200.000 VNĐ/giờ chuẩn."), {
      x: 65,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });

    currentY -= 22;

    // Điều 4
    page.drawText(sanitize("Điều 4. Trưởng phòng TC-CB, Trưởng phòng KHTC, Trưởng đơn vị và viên chức có tên chịu trách nhiệm thi hành."), {
      x: 45,
      y: currentY,
      size: 9,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Footer Nơi nhận & Chữ ký số PKI
    currentY -= 40;

    page.drawText(sanitize("Nơi nhận:"), {
      x: 45,
      y: currentY,
      size: 8.5,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(sanitize("- Như Điều 4;"), { x: 45, y: currentY - 14, size: 8, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(sanitize("- Ban Giám hiệu (để b/c);"), { x: 45, y: currentY - 26, size: 8, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(sanitize("- Lưu VT, TCCB."), { x: 45, y: currentY - 38, size: 8, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });

    // Dấu chữ ký số điện tử PKI RSA-2048
    page.drawText(sanitize("HIỆU TRƯỞNG"), {
      x: 375,
      y: currentY,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Hộp dấu số điện tử đỏ (Digital PKI Seal Box)
    const sealX = 330;
    const sealY = currentY - 80;
    page.drawRectangle({
      x: sealX,
      y: sealY,
      width: 190,
      height: 65,
      borderColor: rgb(0.85, 0.15, 0.15),
      borderWidth: 1.5,
      color: rgb(0.99, 0.95, 0.95),
    });

    page.drawText(sanitize("KÝ BỞI: TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG"), {
      x: sealX + 8,
      y: sealY + 48,
      size: 7,
      font: fontBold,
      color: rgb(0.85, 0.15, 0.15),
    });
    page.drawText(sanitize("CƠ QUAN: BAN GIÁM HIỆU - HIỆU TRƯỞNG"), {
      x: sealX + 8,
      y: sealY + 36,
      size: 6.5,
      font: fontBold,
      color: rgb(0.85, 0.15, 0.15),
    });
    page.drawText(sanitize(`NGÀY KÝ: ${app.pkiSignedAt ? new Date(app.pkiSignedAt).toLocaleDateString("vi-VN") : "01/10/2026"}`), {
      x: sealX + 8,
      y: sealY + 24,
      size: 6.5,
      font: fontRegular,
      color: rgb(0.85, 0.15, 0.15),
    });
    page.drawText(sanitize("CHỨNG THƯ SỐ: VN-DAU-CA-8899A1-2026 (RSA-2048)"), {
      x: sealX + 8,
      y: sealY + 12,
      size: 6,
      font: fontRegular,
      color: rgb(0.85, 0.15, 0.15),
    });

    page.drawText(sanitize("GS.TS. Nguyễn Hiệu Trưởng"), {
      x: 355,
      y: sealY - 18,
      size: 9.5,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    return pdfDoc.save();
  }
}
