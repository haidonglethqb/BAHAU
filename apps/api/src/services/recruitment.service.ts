import crypto from "node:crypto";
import fs from "node:fs";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { AppError } from "../middlewares/error.middleware.js";
import { PkiService } from "./pki.service.js";
import { PayrollService } from "./payroll.service.js";
import { WorkloadService } from "./workload.service.js";
import {
  RecruitmentCandidateDto,
  CreateCandidateApplicationInput,
  ScoreRound1Input,
  ScoreRound2Input,
  ApproveRecruitmentWithPkiInput,
  RecruitmentFilterQuery,
  DOMAIN_EVENTS,
} from "@bahau/contracts";
import { DomainEventBus, initEventSubscribers } from "../events/index.js";

export class RecruitmentService {
  // Kho lưu trữ trong bộ nhớ đảm bảo 100% tính sẵn sàng độc lập (Zero-crash Resilience)
  private static candidates = new Map<string, RecruitmentCandidateDto>();

  static {
    initEventSubscribers();
    // Khởi tạo các ứng viên mẫu đại học chuẩn DAU
    const sampleCandidates: RecruitmentCandidateDto[] = [
      {
        id: "cand-dau-001",
        candidateCode: "TD2026-001",
        fullName: "ThS.KTS. Hoàng Minh Trí",
        email: "tri.hm@arch-design.vn",
        phone: "0905123456",
        birthYear: 1993,
        degree: "MASTER",
        graduatedSchool: "Đại học Kiến trúc Hà Nội",
        applyingPosition: "LECTURER_ARCHITECTURE",
        targetDepartment: "Khoa Kiến trúc",
        portfolioUrl: "https://dau.edu.vn/portfolios/tri-hoang-arch",
        cvUrl: "https://dau.edu.vn/cvs/tri-hoang.pdf",
        portfolioSummary: "05 năm kinh nghiệm chủ trì thiết kế tại Studio kiến trúc; 01 giải nhì Festival Sinh viên Kiến trúc; 01 bài báo Tạp chí Kiến trúc.",
        status: "ROUND_2_AUDITION",
        portfolioScore: {
          academicRecordScore: 22.0,
          architecturalProjectsScore: 36.0,
          scientificPapersScore: 14.0,
          foreignLanguageScore: 13.0,
          totalScore: 85.0,
          isPassed: true,
          reviewerName: "PGS.TS. Trần Thị Bình",
          reviewNotes: "Hồ sơ thiết kế đồ án xuất sắc, tư duy không gian tốt, đủ điều kiện vào vòng giảng thử Studio.",
          reviewedAt: "2026-09-20T10:00:00.000Z",
        },
        auditionScore: null,
        appointmentResolutionNumber: null,
        probationSalaryCoeff: null,
        appointedEmployeeCode: null,
        pkiSignature: null,
        pkiSignedAt: null,
        createdAt: "2026-09-10T08:00:00.000Z",
        updatedAt: "2026-09-20T10:00:00.000Z",
      },
      {
        id: "cand-dau-002",
        candidateCode: "TD2026-002",
        fullName: "TS. Vũ Thanh Hà",
        email: "ha.vu@polimi.it",
        phone: "0912345678",
        birthYear: 1989,
        degree: "DOCTOR",
        graduatedSchool: "Politecnico di Milano (Ý)",
        applyingPosition: "LECTURER_URBAN_PLANNING",
        targetDepartment: "Khoa Quy hoạch",
        portfolioUrl: "https://dau.edu.vn/portfolios/ha-vu-urban",
        cvUrl: "https://dau.edu.vn/cvs/ha-vu.pdf",
        portfolioSummary: "Tiến sĩ Đô thị sinh thái tại Ý; 03 bài báo WoS/Scopus Q1; đồ án tái thiết đô thị Venice và sông Hàn.",
        status: "PASSED",
        portfolioScore: {
          academicRecordScore: 24.5,
          architecturalProjectsScore: 38.0,
          scientificPapersScore: 19.0,
          foreignLanguageScore: 14.5,
          totalScore: 96.0,
          isPassed: true,
          reviewerName: "TS. Lê Hoàng Nam",
          reviewNotes: "Hồ sơ xuất sắc, bài báo quốc tế uy tín, chuyên môn quy hoạch sinh thái phù hợp định hướng DAU.",
          reviewedAt: "2026-09-21T14:30:00.000Z",
        },
        auditionScore: {
          pedagogyScore: 28.0,
          studioPracticalScore: 27.5,
          liveSketchingScore: 18.0,
          defenseInterviewScore: 18.5,
          totalScore: 92.0,
          isPassed: true,
          councilPresidentName: "GS.TS. Nguyễn Hiệu Trưởng",
          auditionNotes: "Giảng thử đồ án xưởng lôi cuốn, phương pháp truyền đạt sư phạm tốt, trả lời phản biện xuất sắc.",
          auditionDate: "2026-09-28T09:00:00.000Z",
        },
        appointmentResolutionNumber: null,
        probationSalaryCoeff: null,
        appointedEmployeeCode: null,
        pkiSignature: null,
        pkiSignedAt: null,
        createdAt: "2026-09-12T09:00:00.000Z",
        updatedAt: "2026-09-28T11:00:00.000Z",
      },
      {
        id: "cand-dau-003",
        candidateCode: "TD2026-003",
        fullName: "ThS. Đặng Quốc Bảo",
        email: "bao.dq@civil-eng.com",
        phone: "0934567890",
        birthYear: 1995,
        degree: "MASTER",
        graduatedSchool: "Đại học Bách Khoa Đà Nẵng",
        applyingPosition: "LECTURER_CIVIL_ENG",
        targetDepartment: "Khoa Xây dựng",
        portfolioUrl: null,
        cvUrl: "https://dau.edu.vn/cvs/bao-dang.pdf",
        portfolioSummary: "Thạc sĩ Kỹ thuật Xây dựng; 02 năm kinh nghiệm tính toán kết cấu nhà cao tầng.",
        status: "SUBMITTED",
        portfolioScore: null,
        auditionScore: null,
        appointmentResolutionNumber: null,
        probationSalaryCoeff: null,
        appointedEmployeeCode: null,
        pkiSignature: null,
        pkiSignedAt: null,
        createdAt: "2026-09-15T14:00:00.000Z",
        updatedAt: "2026-09-15T14:00:00.000Z",
      },
    ];

    for (const c of sampleCandidates) {
      this.candidates.set(c.id, c);
    }
  }

  /**
   * Lấy danh sách ứng viên tuyển dụng có bộ lọc
   */
  public static async getAllCandidates(query?: RecruitmentFilterQuery): Promise<RecruitmentCandidateDto[]> {
    let list = Array.from(this.candidates.values());

    if (query?.status) {
      list = list.filter((c) => c.status === query.status);
    }
    if (query?.applyingPosition) {
      list = list.filter((c) => c.applyingPosition === query.applyingPosition);
    }
    if (query?.targetDepartment) {
      list = list.filter((c) => c.targetDepartment.toLowerCase().includes(query.targetDepartment!.toLowerCase()));
    }
    if (query?.search) {
      const q = query.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.candidateCode.toLowerCase().includes(q) ||
          c.graduatedSchool.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Lấy chi tiết hồ sơ ứng viên theo ID
   */
  public static async getCandidateById(id: string): Promise<RecruitmentCandidateDto> {
    const candidate = this.candidates.get(id);
    if (!candidate) {
      throw new AppError(404, "NOT_FOUND", "Không tìm thấy hồ sơ ứng viên tuyển dụng.");
    }
    return candidate;
  }

  /**
   * Ứng viên đăng ký nộp hồ sơ & e-Portfolio trực tuyến
   */
  public static async createApplication(
    input: CreateCandidateApplicationInput
  ): Promise<RecruitmentCandidateDto> {
    const candidateId = `cand-dau-${Date.now()}`;
    const candidateCode = `TD2026-${Math.floor(100 + Math.random() * 900)}`;

    const newCandidate: RecruitmentCandidateDto = {
      id: candidateId,
      candidateCode,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      birthYear: input.birthYear,
      degree: input.degree,
      graduatedSchool: input.graduatedSchool,
      applyingPosition: input.applyingPosition,
      targetDepartment: input.targetDepartment,
      portfolioUrl: input.portfolioUrl || null,
      cvUrl: input.cvUrl || null,
      portfolioSummary: input.portfolioSummary || null,
      status: "SUBMITTED",
      portfolioScore: null,
      auditionScore: null,
      appointmentResolutionNumber: null,
      probationSalaryCoeff: null,
      appointedEmployeeCode: null,
      pkiSignature: null,
      pkiSignedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.candidates.set(newCandidate.id, newCandidate);
    return newCandidate;
  }

  /**
   * Chấm điểm Vòng 1: Thẩm định e-Portfolio Sáng tác & Hồ sơ Khoa học
   * RÀO CHẮN: Tổng điểm phải đạt >= 50.0/100đ mới qua vòng 1.
   */
  public static async scoreRound1(
    id: string,
    input: ScoreRound1Input,
    currentUser: any
  ): Promise<RecruitmentCandidateDto> {
    const candidate = this.candidates.get(id);
    if (!candidate) {
      throw new AppError(404, "NOT_FOUND", "Không tìm thấy hồ sơ ứng viên tuyển dụng.");
    }

    const totalScore = Math.round(
      (input.academicRecordScore +
        input.architecturalProjectsScore +
        input.scientificPapersScore +
        input.foreignLanguageScore) * 10
    ) / 10;

    // Rào chắn pháp lý: Đạt >= 50 điểm
    const isPassed = totalScore >= 50.0;

    candidate.portfolioScore = {
      academicRecordScore: input.academicRecordScore,
      architecturalProjectsScore: input.architecturalProjectsScore,
      scientificPapersScore: input.scientificPapersScore,
      foreignLanguageScore: input.foreignLanguageScore,
      totalScore,
      isPassed,
      reviewerName: input.reviewerName || currentUser?.fullName || "Ban Thẩm định Chuyên môn",
      reviewNotes: input.reviewNotes || (isPassed ? "Đạt điều kiện vào Vòng 2 Giảng thử Studio." : "Chưa đạt tiêu chuẩn Vòng 1."),
      reviewedAt: new Date().toISOString(),
    };

    candidate.status = isPassed ? "ROUND_1_PASSED" : "ROUND_1_FAILED";
    candidate.updatedAt = new Date().toISOString();

    this.candidates.set(candidate.id, candidate);
    return candidate;
  }

  /**
   * Chấm điểm Vòng 2: Giảng thử Đồ án Studio & Phỏng vấn Chuyên môn
   * RÀO CHẮN: Phải đạt Vòng 1 trước; Điểm Vòng 2 phải đạt >= 50.0/100đ để trúng tuyển.
   */
  public static async scoreRound2(
    id: string,
    input: ScoreRound2Input,
    currentUser: any
  ): Promise<RecruitmentCandidateDto> {
    const candidate = this.candidates.get(id);
    if (!candidate) {
      throw new AppError(404, "NOT_FOUND", "Không tìm thấy hồ sơ ứng viên tuyển dụng.");
    }

    if (!candidate.portfolioScore || !candidate.portfolioScore.isPassed) {
      throw new AppError(400, "ROUND_1_NOT_PASSED", "Ứng viên chưa vượt qua Vòng 1 (thẩm định Portfolio).");
    }

    const totalScore = Math.round(
      (input.pedagogyScore +
        input.studioPracticalScore +
        input.liveSketchingScore +
        input.defenseInterviewScore) * 10
    ) / 10;

    // Rào chắn pháp lý: Đạt >= 50 điểm ở Vòng 2
    const isPassed = totalScore >= 50.0;

    candidate.auditionScore = {
      pedagogyScore: input.pedagogyScore,
      studioPracticalScore: input.studioPracticalScore,
      liveSketchingScore: input.liveSketchingScore,
      defenseInterviewScore: input.defenseInterviewScore,
      totalScore,
      isPassed,
      councilPresidentName: input.councilPresidentName || currentUser?.fullName || "Hội đồng Tuyển dụng DAU",
      auditionNotes: input.auditionNotes || (isPassed ? "Đạt tiêu chuẩn trúng tuyển giảng viên." : "Không đạt yêu cầu giảng thử."),
      auditionDate: new Date().toISOString(),
    };

    candidate.status = isPassed ? "PASSED" : "FAILED";
    candidate.updatedAt = new Date().toISOString();

    this.candidates.set(candidate.id, candidate);
    return candidate;
  }

  /**
   * Hiệu trưởng phê duyệt và ký số PKI RSA-2048 ban hành Quyết định Tuyển dụng Tập sự
   * Tự động liên thông toàn hệ thống:
   * 1. Cấp mã CBGV mới (`DAU26...`)
   * 2. Xếp lương tập sự sang PayrollService (85% bậc 1 cho ThS = 1.99; bậc 2 cho TS = 2.67 theo NĐ 115)
   * 3. Giảm 50% giờ chuẩn giảng dạy sang WorkloadService
   */
  public static async appointWithPki(
    id: string,
    input: ApproveRecruitmentWithPkiInput,
    _currentUser: any
  ): Promise<RecruitmentCandidateDto> {
    const candidate = this.candidates.get(id);
    if (!candidate) {
      throw new AppError(404, "NOT_FOUND", "Không tìm thấy hồ sơ ứng viên tuyển dụng.");
    }

    if (candidate.status !== "PASSED" || !candidate.auditionScore || !candidate.auditionScore.isPassed) {
      throw new AppError(
        400,
        "NOT_ELIGIBLE_FOR_APPOINTMENT",
        "Ứng viên chưa trúng tuyển qua 2 vòng thẩm định và giảng thử Studio."
      );
    }

    const resolutionNumber = input.resolutionNumber || `${Math.floor(200 + Math.random() * 800)}/QĐ-ĐHKTĐN`;
    const appointedEmployeeCode = input.appointedEmployeeCode || `DAU26${Math.floor(1000 + Math.random() * 9000)}`;

    // Hệ số lương tập sự theo Điều 23 Nghị định 115/2020/NĐ-CP:
    // Thạc sĩ: Hưởng 85% bậc 1 (2.34 x 85% = 1.989 ~ 1.99)
    // Tiến sĩ: Hưởng 100% bậc 2 (2.67)
    const probationSalaryCoeff =
      candidate.degree === "DOCTOR"
        ? 2.67
        : Math.round(2.34 * 0.85 * 1000) / 1000;

    const signerName = input.signerName || "GS.TS. Nguyễn Hiệu Trưởng";

    // Ký số PKI RSA-2048
    const payloadToSign = [
      resolutionNumber,
      appointedEmployeeCode,
      candidate.fullName,
      candidate.degree,
      candidate.targetDepartment,
      probationSalaryCoeff.toString(),
      signerName,
    ].join("##");

    const signatureResult = PkiService.signData(payloadToSign);

    candidate.status = "APPOINTED_PROBATION";
    candidate.appointmentResolutionNumber = resolutionNumber;
    candidate.appointedEmployeeCode = appointedEmployeeCode;
    candidate.probationSalaryCoeff = probationSalaryCoeff;
    candidate.pkiSignature = signatureResult.signatureValue;
    candidate.pkiSignedAt = signatureResult.signedAt;
    candidate.updatedAt = new Date().toISOString();

    // Phát Domain Event để Decouple sang PayrollService và WorkloadService
    DomainEventBus.getInstance().publishSync(
      DomainEventBus.createEvent(
        DOMAIN_EVENTS.CANDIDATE_APPOINTED,
        candidate.id,
        {
          candidateId: candidate.id,
          candidateCode: candidate.candidateCode,
          fullName: candidate.fullName,
          degree: candidate.degree,
          targetDepartment: candidate.targetDepartment,
          appointedEmployeeCode,
          probationSalaryCoeff,
          isProbation: true,
          quotaReductionPercentage: 50,
          resolutionNumber,
          signedAt: signatureResult.signedAt,
        },
        {
          actorId: _currentUser?.id,
          actorRole: _currentUser?.role,
          source: "BAHAU_RECRUITMENT_SERVICE",
        }
      )
    );

    this.candidates.set(candidate.id, candidate);
    return candidate;
  }

  /**
   * Xuất Quyết định Tuyển dụng và Bổ nhiệm Tập sự viên chức chuẩn thể thức Nghị định 30/2020/NĐ-CP (PDF)
   */
  public static async exportAppointmentPdf(id: string): Promise<Uint8Array> {
    const candidate = this.candidates.get(id);
    if (!candidate) {
      throw new AppError(404, "NOT_FOUND", "Không tìm thấy hồ sơ ứng viên tuyển dụng.");
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
    page.drawText(sanitize(`Số: ${candidate.appointmentResolutionNumber || "205/QĐ-ĐHKTĐN"}`), {
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
    page.drawText(sanitize("Về việc công nhận kết quả tuyển dụng và tuyển dụng tập sự viên chức"), {
      x: 65,
      y: height - 122,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Căn cứ pháp lý
    const grounds = [
      "Căn cứ Luật Viên chức năm 2010 và Luật sửa đổi, bổ sung một số điều của Luật Cán bộ, công chức và Luật Viên chức năm 2019;",
      "Căn cứ Nghị định số 115/2020/NĐ-CP và Nghị định số 85/2023/NĐ-CP của Chính phủ quy định về tuyển dụng, sử dụng và quản lý viên chức;",
      "Căn cứ Thông tư 40/2020/TT-BGDĐT quy định mã số, tiêu chuẩn chức danh nghề nghiệp giảng viên đại học;",
      `Căn cứ Biên bản kết quả kiểm tra sát hạch Vòng 1 (${candidate.portfolioScore?.totalScore || 85}đ) và Giảng thử Studio Vòng 2 (${candidate.auditionScore?.totalScore || 90}đ);`,
      "Xét đề nghị của Trưởng phòng Tổ chức - Cán bộ và Trưởng đơn vị chuyên môn,",
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

    // Điều 1
    page.drawText(sanitize("Điều 1. Công nhận kết quả trúng tuyển và tuyển dụng tập sự đối với:"), {
      x: 45,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 16;
    page.drawText(sanitize(`- Ông/Bà: ${candidate.fullName}        Mã số CBGV: ${candidate.appointedEmployeeCode || "DAU260010"}`), {
      x: 65,
      y: currentY,
      size: 9,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 15;
    page.drawText(sanitize(`- Trình độ đào tạo: ${candidate.degree === "DOCTOR" ? "Tiến sĩ" : "Thạc sĩ"} (${candidate.graduatedSchool})`), {
      x: 65,
      y: currentY,
      size: 9,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 15;
    page.drawText(sanitize(`- Vị trí việc làm: Giảng viên (Hạng III - Mã số V.07.01.03) tại ${candidate.targetDepartment}`), {
      x: 65,
      y: currentY,
      size: 9,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 15;
    page.drawText(sanitize("- Thời gian tập sự: 12 tháng kể từ ngày ký quyết định."), {
      x: 65,
      y: currentY,
      size: 9,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });

    currentY -= 22;

    // Điều 2
    const salary = candidate.probationSalaryCoeff || (candidate.degree === "DOCTOR" ? 2.67 : 1.989);
    page.drawText(sanitize(`Điều 2. Chế độ tiền lương trong thời gian tập sự:`), {
      x: 45,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 16;
    page.drawText(sanitize(`- Hưởng hệ số lương: ${salary.toFixed(3)} (${candidate.degree === "DOCTOR" ? "100% bậc 2 theo NĐ 115" : "85% bậc 1 theo NĐ 115"}).`), {
      x: 65,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });
    currentY -= 15;
    page.drawText(sanitize("- Đóng bảo hiểm xã hội, bảo hiểm y tế và các khoản phụ cấp theo quy định hiện hành."), {
      x: 65,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });

    currentY -= 22;

    // Điều 3
    page.drawText(sanitize("Điều 3. Định mức nhiệm vụ chuyên môn trong thời gian tập sự:"), {
      x: 45,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 16;
    page.drawText(sanitize("- Được giảm 50% định mức giờ giảng dạy (áp dụng 135 giờ chuẩn/năm học)."), {
      x: 65,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });
    currentY -= 15;
    page.drawText(sanitize("- Dành thời gian dự giờ xưởng Studio, nghiên cứu học liệu và bồi dưỡng nghiệp vụ sư phạm."), {
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

    // Footer Nơi nhận & Dấu số PKI
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
    page.drawText(sanitize(`NGÀY KÝ: ${candidate.pkiSignedAt ? new Date(candidate.pkiSignedAt).toLocaleDateString("vi-VN") : "01/10/2026"}`), {
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
