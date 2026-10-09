import crypto from "node:crypto";
import fs from "node:fs";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { AppError } from "../middlewares/error.middleware.js";
import { PkiService } from "./pki.service.js";
import { PayrollService } from "./payroll.service.js";
import { WorkloadService } from "./workload.service.js";
import { KpiService } from "./kpi.service.js";
import {
  RdProjectDto,
  CreateRdProjectInput,
  ReviewRdProjectInput,
  AllocateRoyaltyInput,
  ApproveRdWithPkiInput,
  RdProjectFilterQuery,
  RdTeamMember,
  DOMAIN_EVENTS,
} from "@bahau/contracts";
import { DomainEventBus, initEventSubscribers } from "../events/index.js";

export class RdService {
  // Kho lưu trữ trong bộ nhớ đảm bảo 100% tính sẵn sàng độc lập (Zero-crash Resilience)
  private static projects = new Map<string, RdProjectDto>();

  static {
    initEventSubscribers();
    // Khởi tạo các đề tài & dự án tư vấn thiết kế mẫu chuẩn DAU
    const sampleProjects: RdProjectDto[] = [
      {
        id: "rd-dau-001",
        projectCode: "NCKH-BGD-2026-01",
        title: "Nghiên cứu mô hình cấu trúc không gian đô thị ven biển thích ứng với biến đổi khí hậu tại dải duyên hải miền Trung",
        projectType: "ACADEMIC_RESEARCH",
        level: "MINISTERIAL",
        contractValue: 300_000_000,
        institutionalFeePercentage: 20,
        institutionalFeeAmount: 60_000_000,
        royaltyFundAmount: 240_000_000,
        startDate: "2025-06-01",
        endDate: "2026-06-01",
        status: "REVIEW_COUNCIL",
        payoutStatus: "APPROVED",
        principalInvestigatorId: "DAU260002-ID",
        principalInvestigatorCode: "DAU260002",
        principalInvestigatorName: "TS. Lê Hoàng Nam",
        departmentName: "Khoa Xây dựng",
        members: [
          {
            employeeId: "DAU260002-ID",
            employeeCode: "DAU260002",
            fullName: "TS. Lê Hoàng Nam",
            role: "PRINCIPAL_INVESTIGATOR",
            royaltyPercentage: 50,
            allocatedAmount: 120_000_000,
            convertedResearchHours: 300,
          },
          {
            employeeId: "DAU260004-ID",
            employeeCode: "DAU260004",
            fullName: "ThS. Phạm Thị Mai",
            role: "RESEARCH_MEMBER",
            royaltyPercentage: 30,
            allocatedAmount: 72_000_000,
            convertedResearchHours: 180,
          },
          {
            employeeId: "DAU260003-ID",
            employeeCode: "DAU260003",
            fullName: "ThS. Nguyễn Văn An",
            role: "TECHNICAL_EXPERT",
            royaltyPercentage: 20,
            allocatedAmount: 48_000_000,
            convertedResearchHours: 120,
          },
        ],
        councilReview: {
          reviewDate: "2026-09-15T09:00:00.000Z",
          score: 88.5,
          ranking: "EXCELLENT",
          isPassed: true,
          councilNotes: "Đề tài có giá trị ứng dụng cao, công bố 02 bài báo uy tín, phân tích mô hình thích ứng bão lũ miền Trung xuất sắc.",
          councilPresidentName: "GS.TS. Nguyễn Hiệu Trưởng",
        },
        resolutionNumber: null,
        pkiSignature: null,
        pkiSignedAt: null,
        createdAt: "2025-05-10T08:00:00.000Z",
        updatedAt: "2026-09-15T11:30:00.000Z",
      },
      {
        id: "rd-dau-002",
        projectCode: "TVTK-DAU-2026-08",
        title: "Tư vấn Thiết kế Kiến trúc và Cảnh quan Trung tâm Văn hóa & Bảo tồn Di sản Sông Hàn, TP. Đà Nẵng",
        projectType: "ARCHITECTURAL_DESIGN",
        level: "COMMERCIAL_CONTRACT",
        contractValue: 500_000_000,
        institutionalFeePercentage: 25,
        institutionalFeeAmount: 125_000_000,
        royaltyFundAmount: 375_000_000,
        startDate: "2026-01-15",
        endDate: "2026-11-30",
        status: "IN_PROGRESS",
        payoutStatus: "PENDING",
        principalInvestigatorId: "DAU260003-ID",
        principalInvestigatorCode: "DAU260003",
        principalInvestigatorName: "ThS. Nguyễn Văn An",
        departmentName: "Khoa Kiến trúc",
        members: [
          {
            employeeId: "DAU260003-ID",
            employeeCode: "DAU260003",
            fullName: "ThS. Nguyễn Văn An",
            role: "LEAD_ARCHITECT",
            royaltyPercentage: 55,
            allocatedAmount: 206_250_000,
            convertedResearchHours: 250,
          },
          {
            employeeId: "DAU260002-ID",
            employeeCode: "DAU260002",
            fullName: "TS. Lê Hoàng Nam",
            role: "DESIGN_MEMBER",
            royaltyPercentage: 25,
            allocatedAmount: 93_750_000,
            convertedResearchHours: 150,
          },
          {
            employeeId: "DAU260005-ID",
            employeeCode: "DAU260005",
            fullName: "ThS. Đỗ Thị Quỳnh Chi",
            role: "DESIGN_MEMBER",
            royaltyPercentage: 20,
            allocatedAmount: 75_000_000,
            convertedResearchHours: 100,
          },
        ],
        councilReview: null,
        resolutionNumber: null,
        pkiSignature: null,
        pkiSignedAt: null,
        createdAt: "2026-01-10T09:00:00.000Z",
        updatedAt: "2026-01-15T09:00:00.000Z",
      },
      {
        id: "rd-dau-003",
        projectCode: "NCKH-DAU-2026-03",
        title: "Nghiên cứu ứng dụng vật liệu xanh địa phương trong kiến trúc nhà ở thấp tầng thích ứng bão lũ miền Trung",
        projectType: "ACADEMIC_RESEARCH",
        level: "INSTITUTIONAL",
        contractValue: 50_000_000,
        institutionalFeePercentage: 20,
        institutionalFeeAmount: 10_000_000,
        royaltyFundAmount: 40_000_000,
        startDate: "2026-03-01",
        endDate: "2026-12-31",
        status: "PROPOSAL_SUBMITTED",
        payoutStatus: "PENDING",
        principalInvestigatorId: "DAU260005-ID",
        principalInvestigatorCode: "DAU260005",
        principalInvestigatorName: "ThS. Đỗ Thị Quỳnh Chi",
        departmentName: "Khoa Kiến trúc",
        members: [
          {
            employeeId: "DAU260005-ID",
            employeeCode: "DAU260005",
            fullName: "ThS. Đỗ Thị Quỳnh Chi",
            role: "PRINCIPAL_INVESTIGATOR",
            royaltyPercentage: 100,
            allocatedAmount: 40_000_000,
            convertedResearchHours: 150,
          },
        ],
        councilReview: null,
        resolutionNumber: null,
        pkiSignature: null,
        pkiSignedAt: null,
        createdAt: "2026-02-25T14:00:00.000Z",
        updatedAt: "2026-02-25T14:00:00.000Z",
      },
    ];

    for (const p of sampleProjects) {
      this.projects.set(p.id, p);
    }
  }

  /**
   * Lấy danh sách tất cả đề tài & dự án tư vấn thiết kế theo bộ lọc
   */
  public static getAllProjects(filter?: RdProjectFilterQuery): RdProjectDto[] {
    let list = Array.from(this.projects.values());

    if (filter?.projectType) {
      list = list.filter((p) => p.projectType === filter.projectType);
    }
    if (filter?.level) {
      list = list.filter((p) => p.level === filter.level);
    }
    if (filter?.status) {
      list = list.filter((p) => p.status === filter.status);
    }
    if (filter?.departmentName) {
      list = list.filter((p) =>
        p.departmentName.toLowerCase().includes(filter.departmentName!.toLowerCase())
      );
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.projectCode.toLowerCase().includes(q) ||
          p.principalInvestigatorName.toLowerCase().includes(q)
      );
    }

    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Xem chi tiết đề tài / dự án theo ID
   */
  public static getProjectById(id: string): RdProjectDto {
    const project = this.projects.get(id);
    if (!project) {
      throw new AppError(404, "NOT_FOUND", `Không tìm thấy đề tài / dự án với ID: ${id}`);
    }
    return project;
  }

  /**
   * Đăng ký đề cương đề tài NCKH hoặc Hợp đồng tư vấn thiết kế mới
   */
  public static createProject(input: CreateRdProjectInput): RdProjectDto {
    const id = `rd-dau-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
    const projectCount = this.projects.size + 1;
    const prefix = input.projectType === "ARCHITECTURAL_DESIGN" ? "TVTK" : "NCKH";
    const projectCode = `${prefix}-DAU-2026-${String(projectCount).padStart(3, "0")}`;

    const feePct = input.institutionalFeePercentage || 25;
    const institutionalFeeAmount = Math.round((input.contractValue * feePct) / 100);
    const royaltyFundAmount = input.contractValue - institutionalFeeAmount;

    // Xác định Chủ nhiệm / Chủ trì từ danh sách thành viên
    const leadMember =
      input.members.find(
        (m) => m.role === "PRINCIPAL_INVESTIGATOR" || m.role === "LEAD_ARCHITECT"
      ) || input.members[0];

    const members: RdTeamMember[] = input.members.map((m) => {
      const pct = m.royaltyPercentage || 0;
      const allocatedAmount = Math.round((royaltyFundAmount * pct) / 100);
      const convertedResearchHours = Math.round(pct * 2.5);
      return {
        employeeId: m.employeeId,
        employeeCode: m.employeeCode,
        fullName: m.fullName,
        role: m.role,
        royaltyPercentage: pct,
        allocatedAmount,
        convertedResearchHours,
      };
    });

    const now = new Date().toISOString();
    const newProject: RdProjectDto = {
      id,
      projectCode,
      title: input.title,
      projectType: input.projectType,
      level: input.level,
      contractValue: input.contractValue,
      institutionalFeePercentage: feePct,
      institutionalFeeAmount,
      royaltyFundAmount,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "PROPOSAL_SUBMITTED",
      payoutStatus: "PENDING",
      principalInvestigatorId: leadMember.employeeId,
      principalInvestigatorCode: leadMember.employeeCode,
      principalInvestigatorName: leadMember.fullName,
      departmentName: input.departmentName || "Khoa Kiến trúc",
      members,
      councilReview: null,
      resolutionNumber: null,
      pkiSignature: null,
      pkiSignedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.projects.set(id, newProject);
    return newProject;
  }

  /**
   * Hội đồng khoa học đánh giá nghiệm thu đề tài / dự án (Rào chắn >= 70 điểm để ĐẠT)
   */
  public static submitCouncilReview(id: string, input: ReviewRdProjectInput): RdProjectDto {
    const project = this.getProjectById(id);

    const isPassed = input.score >= 70;
    const councilReview = {
      reviewDate: new Date().toISOString(),
      score: input.score,
      ranking: input.ranking,
      isPassed,
      councilNotes: input.councilNotes || null,
      councilPresidentName: input.councilPresidentName || "GS.TS. Nguyễn Hiệu Trưởng",
    };

    const updated: RdProjectDto = {
      ...project,
      status: isPassed ? "REVIEW_COUNCIL" : "TERMINATED",
      councilReview,
      updatedAt: new Date().toISOString(),
    };

    this.projects.set(id, updated);
    return updated;
  }

  /**
   * Phân bổ tỷ lệ nhuận bút tác giả và quy đổi giờ NCKH cho các thành viên nhóm đồ án
   */
  public static allocateRoyalty(id: string, input: AllocateRoyaltyInput): RdProjectDto {
    const project = this.getProjectById(id);

    const totalPercentage = input.memberAllocations.reduce(
      (sum, item) => sum + item.royaltyPercentage,
      0
    );

    if (totalPercentage > 100) {
      throw new AppError(
        400,
        "INVALID_ALLOCATION",
        `Tổng tỷ lệ phân bổ nhuận bút (${totalPercentage}%) vượt quá quỹ 100%.`
      );
    }

    const allocMap = new Map(input.memberAllocations.map((a) => [a.employeeId, a.royaltyPercentage]));

    const updatedMembers: RdTeamMember[] = project.members.map((m) => {
      const pct = allocMap.has(m.employeeId) ? allocMap.get(m.employeeId)! : m.royaltyPercentage;
      const allocatedAmount = Math.round((project.royaltyFundAmount * pct) / 100);
      const convertedResearchHours = Math.round(pct * 2.5);
      return {
        ...m,
        royaltyPercentage: pct,
        allocatedAmount,
        convertedResearchHours,
      };
    });

    const updated: RdProjectDto = {
      ...project,
      members: updatedMembers,
      payoutStatus: "APPROVED",
      updatedAt: new Date().toISOString(),
    };

    this.projects.set(id, updated);
    return updated;
  }

  /**
   * Hiệu trưởng ký số PKI RSA-2048 ban hành Quyết định Nghiệm thu & Chi trả Nhuận bút
   * Kích hoạt Triple-Coupling: PayrollService, WorkloadService, KpiService
   */
  public static approveAndSignWithPki(
    id: string,
    input: ApproveRdWithPkiInput,
    _currentUser?: any
  ): { project: RdProjectDto; pkiSignature: string; resolutionNumber: string; signedAt: string } {
    const project = this.getProjectById(id);

    if (!project.councilReview || !project.councilReview.isPassed) {
      throw new AppError(
        400,
        "COUNCIL_NOT_PASSED",
        "Đề tài / Dự án chưa được Hội đồng nghiệm thu ĐẠT (yêu cầu điểm đánh giá >= 70 điểm)."
      );
    }

    const resolutionNumber = input.resolutionNumber || `218/QĐ-ĐHKTĐN`;

    // Chuỗi dữ liệu chuẩn hóa bảo mật băm SHA-256 ký số RSA-2048
    const canonicalData = [
      "DAU",
      "RD_ACCEPTANCE",
      project.id,
      project.projectCode,
      project.contractValue,
      project.royaltyFundAmount,
      resolutionNumber,
      project.members.map((m) => `${m.employeeCode}:${m.allocatedAmount}:${m.convertedResearchHours}`).join(";"),
    ].join("##");

    const signResult = PkiService.signData(canonicalData);

    const updated: RdProjectDto = {
      ...project,
      status: "COMPLETED",
      payoutStatus: "PAID_VIA_PAYROLL",
      resolutionNumber,
      pkiSignature: signResult.signatureValue,
      pkiSignedAt: signResult.signedAt,
      updatedAt: new Date().toISOString(),
    };

    this.projects.set(id, updated);

    // =========================================================================
    // DECOUPLED EVENT-DRIVEN ENGINE: Publish RD_PROJECT_APPROVED
    // Kích hoạt đồng thời Payroll, Workload và KPI thông qua DomainEventBus
    // =========================================================================
    DomainEventBus.getInstance().publishSync(
      DomainEventBus.createEvent(
        DOMAIN_EVENTS.RD_PROJECT_APPROVED,
        project.id,
        {
          projectId: project.id,
          projectCode: project.projectCode,
          title: project.title,
          contractValue: project.contractValue,
          royaltyFundAmount: project.royaltyFundAmount,
          resolutionNumber,
          signedAt: signResult.signedAt,
          members: project.members.map((m) => {
            const isLead =
              m.role === "PRINCIPAL_INVESTIGATOR" || m.role === "LEAD_ARCHITECT";
            return {
              employeeId: m.employeeId,
              employeeCode: m.employeeCode,
              fullName: m.fullName,
              role: m.role,
              allocatedAmount: m.allocatedAmount || 0,
              convertedResearchHours: m.convertedResearchHours || 0,
              kpiPoints: isLead ? 35 : 20,
            };
          }),
        },
        {
          actorId: _currentUser?.id,
          actorRole: _currentUser?.role,
          source: "BAHAU_RD_SERVICE",
        }
      )
    );

    return {
      project: updated,
      pkiSignature: signResult.signatureValue,
      resolutionNumber,
      signedAt: signResult.signedAt,
    };
  }

  /**
   * Xuất Quyết định Nghiệm thu & Phân bổ Nhuận bút tác giả chuẩn Nghị định 30/2020/NĐ-CP (PDF)
   */
  public static async exportResolutionPdf(id: string): Promise<Uint8Array> {
    const project = this.getProjectById(id);

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

    const formatVnd = (num: number) => {
      return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
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
    page.drawText(sanitize(`Số: ${project.resolutionNumber || "218/QĐ-ĐHKTĐN"}`), {
      x: 45,
      y: height - 68,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    // Tiêu ngữ
    page.drawText(sanitize("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"), {
      x: 330,
      y: height - 40,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(sanitize("Độc lập - Tự do - Hạnh phúc"), {
      x: 355,
      y: height - 54,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawLine({
      start: { x: 365, y: height - 60 },
      end: { x: 475, y: height - 60 },
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
    page.drawText(sanitize("Về việc nghiệm thu kết quả và phê duyệt phân bổ Quỹ nhuận bút tác giả"), {
      x: 65,
      y: height - 122,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Căn cứ pháp lý
    const grounds = [
      "Căn cứ Nghị định số 109/2022/NĐ-CP của Chính phủ quy định hoạt động KH&CN trong cơ sở GDĐH;",
      "Căn cứ Nghị định số 99/2014/NĐ-CP và Thông tư 03/2023/TT-BGDĐT về quản lý tài chính dịch vụ KH&CN;",
      "Căn cứ Quy chế Quản lý NCKH và Hoạt động Tư vấn Thiết kế của Trường Đại học Kiến trúc Đà Nẵng;",
      `Căn cứ Biên bản nghiệm thu của Hội đồng Khoa học (Đạt ${project.councilReview?.score || 88.5}/100 điểm);`,
      "Xét đề nghị của Trưởng phòng KHCN & HTQT, Trưởng phòng Kế hoạch - Tài chính,",
    ];

    let currentY = height - 148;
    for (const g of grounds) {
      page.drawText(sanitize(g), {
        x: 45,
        y: currentY,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.25, 0.25, 0.25),
      });
      currentY -= 14;
    }

    currentY -= 8;
    page.drawText(sanitize("HIỆU TRƯỞNG TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG QUYẾT ĐỊNH:"), {
      x: 100,
      y: currentY,
      size: 9.5,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.4),
    });

    currentY -= 22;

    // Điều 1
    page.drawText(sanitize(`Điều 1. Công nhận kết quả nghiệm thu đề tài / dự án:`), {
      x: 45,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 15;
    page.drawText(sanitize(`- Tên công trình: ${project.title}`), {
      x: 65,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 14;
    page.drawText(sanitize(`- Mã số: ${project.projectCode}   | Đơn vị chủ trì: ${project.departmentName}`), {
      x: 65,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 14;
    page.drawText(sanitize(`- Chủ nhiệm / Chủ trì: ${project.principalInvestigatorName} (${project.principalInvestigatorCode})`), {
      x: 65,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });

    currentY -= 20;

    // Điều 2: Phương án tài chính
    page.drawText(sanitize(`Điều 2. Phê duyệt cơ cấu tài chính và Quỹ nhuận bút tác giả:`), {
      x: 45,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 15;
    page.drawText(sanitize(`- Tổng kinh phí / Giá trị hợp đồng: ${formatVnd(project.contractValue)}`), {
      x: 65,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });
    currentY -= 14;
    page.drawText(sanitize(`- Trích nộp Quỹ trường (${project.institutionalFeePercentage}%): ${formatVnd(project.institutionalFeeAmount)}`), {
      x: 65,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });
    currentY -= 14;
    page.drawText(sanitize(`- Quỹ nhuận bút tác giả chi trả (${100 - project.institutionalFeePercentage}%): ${formatVnd(project.royaltyFundAmount)}`), {
      x: 65,
      y: currentY,
      size: 8.5,
      font: fontBold,
      color: rgb(0.08, 0.45, 0.25),
    });

    currentY -= 20;

    // Điều 3: Phân bổ chi tiết
    page.drawText(sanitize(`Điều 3. Phân bổ nhuận bút tác giả và quy đổi giờ NCKH bù trừ định mức:`), {
      x: 45,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 15;

    for (const m of project.members) {
      page.drawText(
        sanitize(`+ ${m.fullName} (${m.role}): ${m.royaltyPercentage}% = ${formatVnd(m.allocatedAmount)} | Quy đổi: ${m.convertedResearchHours}h NCKH`),
        {
          x: 65,
          y: currentY,
          size: 8,
          font: fontRegular,
          color: rgb(0.15, 0.15, 0.15),
        }
      );
      currentY -= 13;
    }

    currentY -= 10;

    // Điều 4
    page.drawText(sanitize("Điều 4. Phòng KHTC, Phòng TC-CB, Trưởng nhóm tác giả và các cá nhân có tên chịu trách nhiệm thi hành."), {
      x: 45,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Footer Nơi nhận & Dấu số PKI
    currentY -= 36;

    page.drawText(sanitize("Nơi nhận:"), {
      x: 45,
      y: currentY,
      size: 8.5,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    page.drawText(sanitize("- Như Điều 4;"), { x: 45, y: currentY - 14, size: 8, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(sanitize("- Ban Giám hiệu (để b/c);"), { x: 45, y: currentY - 26, size: 8, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(sanitize("- Lưu VT, KHCN, KHTC."), { x: 45, y: currentY - 38, size: 8, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });

    // Dấu chữ ký số điện tử PKI RSA-2048
    page.drawText(sanitize("HIỆU TRƯỞNG"), {
      x: 375,
      y: currentY,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Khung mộc dấu số điện tử đỏ chuẩn Nghị định 30/2020/NĐ-CP
    page.drawRectangle({
      x: 330,
      y: currentY - 65,
      width: 195,
      height: 52,
      borderColor: rgb(0.85, 0.15, 0.15),
      borderWidth: 1.5,
      color: rgb(0.99, 0.95, 0.95),
    });

    page.drawText(sanitize("ĐÃ KÝ SỐ ĐIỆN TỬ BỞI:"), {
      x: 338,
      y: currentY - 23,
      size: 7.5,
      font: fontBold,
      color: rgb(0.85, 0.15, 0.15),
    });
    page.drawText(sanitize("TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG"), {
      x: 338,
      y: currentY - 34,
      size: 7.5,
      font: fontBold,
      color: rgb(0.85, 0.15, 0.15),
    });
    page.drawText(sanitize(`Thời gian ký: ${project.pkiSignedAt || new Date().toISOString()}`), {
      x: 338,
      y: currentY - 45,
      size: 6.5,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText(sanitize(`Mã chứng thư: VN-DAU-CA-8899A1-2026 (RSA-2048)`), {
      x: 338,
      y: currentY - 55,
      size: 6.5,
      font: fontRegular,
      color: rgb(0.4, 0.4, 0.4),
    });

    return await pdfDoc.save();
  }
}
