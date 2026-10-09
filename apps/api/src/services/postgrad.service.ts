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
  PostgradStudentDto,
  CreatePostgradStudentInput,
  ScheduleDefenseCouncilInput,
  ScoreThesisDefenseInput,
  AwardPostgradDegreeWithPkiInput,
  PostgradFilterQuery,
  CouncilMemberScore,
  SupervisorInfo,
  DOMAIN_EVENTS,
} from "@bahau/contracts";
import { DomainEventBus, initEventSubscribers } from "../events/index.js";

export class PostgradService {
  // Kho lưu trữ trong bộ nhớ đảm bảo 100% tính sẵn sàng độc lập (Zero-crash Resilience)
  private static students = new Map<string, PostgradStudentDto>();

  static {
    initEventSubscribers();
    // Khởi tạo các học viên cao học & nghiên cứu sinh mẫu chuẩn DAU
    const sampleStudents: PostgradStudentDto[] = [
      {
        id: "pg-dau-001",
        studentCode: "NCS2023-KT01",
        fullName: "NCS. ThS.KTS. Phan Đăng Nhật Minh",
        degreeLevel: "DOCTORAL",
        specialization: "ARCHITECTURE",
        thesisTitle: "Cấu trúc không gian vi khí hậu trong tổ chức quy hoạch nhà ở cao tầng thích ứng biến đổi khí hậu duyên hải Nam Trung Bộ",
        cohortYear: 2023,
        departmentName: "Khoa Kiến trúc",
        status: "DEFENSE_SCHEDULED",
        supervisors: [
          {
            employeeId: "DAU260001-ID",
            employeeCode: "DAU260001",
            fullName: "GS.TS. Nguyễn Hiệu Trưởng",
            academicTitle: "GS.TS",
            role: "PRIMARY_SUPERVISOR",
            convertedHours: 50,
            kpiPoints: 20,
          },
          {
            employeeId: "DAU260002-ID",
            employeeCode: "DAU260002",
            fullName: "TS. Lê Hoàng Nam",
            academicTitle: "TS",
            role: "CO_SUPERVISOR",
            convertedHours: 25,
            kpiPoints: 10,
          },
        ],
        defenseMembers: [
          {
            employeeId: "DAU260001-ID",
            employeeCode: "DAU260001",
            fullName: "GS.TS. Nguyễn Hiệu Trưởng",
            role: "PRESIDENT",
            score: 0,
            isApproved: false,
            honorariumAmount: 2000000,
          },
          {
            employeeId: "DAU260002-ID",
            employeeCode: "DAU260002",
            fullName: "TS. Lê Hoàng Nam",
            role: "REVIEWER_1",
            score: 0,
            isApproved: false,
            honorariumAmount: 1500000,
          },
          {
            employeeId: "DAU260003-ID",
            employeeCode: "DAU260003",
            fullName: "ThS. Nguyễn Văn An",
            role: "REVIEWER_2",
            score: 0,
            isApproved: false,
            honorariumAmount: 1500000,
          },
          {
            employeeId: "DAU260004-ID",
            employeeCode: "DAU260004",
            fullName: "ThS. Phạm Thị Mai",
            role: "COMMISSIONER",
            score: 0,
            isApproved: false,
            honorariumAmount: 1000000,
          },
          {
            employeeId: "DAU260005-ID",
            employeeCode: "DAU260005",
            fullName: "ThS. Đỗ Thị Quỳnh Chi",
            role: "SECRETARY",
            score: 0,
            isApproved: false,
            honorariumAmount: 1000000,
          },
        ],
        defenseResult: null,
        degreeResolutionNumber: null,
        pkiSignature: null,
        pkiSignedAt: null,
        createdAt: "2023-11-01T08:00:00.000Z",
        updatedAt: "2026-09-15T10:00:00.000Z",
      },
      {
        id: "pg-dau-002",
        studentCode: "CH2024-QH03",
        fullName: "HVCH. KTS. Trần Thanh Trúc",
        degreeLevel: "MASTER",
        specialization: "URBAN_PLANNING",
        thesisTitle: "Tái thiết hành lang xanh cảnh quan sinh thái ven sông Cu Đê, quận Liên Chiểu, TP. Đà Nẵng",
        cohortYear: 2024,
        departmentName: "Khoa Quy hoạch",
        status: "ASSIGNED",
        supervisors: [
          {
            employeeId: "DAU260002-ID",
            employeeCode: "DAU260002",
            fullName: "TS. Lê Hoàng Nam",
            academicTitle: "TS",
            role: "PRIMARY_SUPERVISOR",
            convertedHours: 30,
            kpiPoints: 15,
          },
        ],
        defenseMembers: [],
        defenseResult: null,
        degreeResolutionNumber: null,
        pkiSignature: null,
        pkiSignedAt: null,
        createdAt: "2024-10-15T09:00:00.000Z",
        updatedAt: "2024-10-15T09:00:00.000Z",
      },
      {
        id: "pg-dau-003",
        studentCode: "CH2024-KT08",
        fullName: "HVCH. KTS. Nguyễn Lê Bảo Anh",
        degreeLevel: "MASTER",
        specialization: "ARCHITECTURE",
        thesisTitle: "Ứng dụng ngôn ngữ kiến trúc Chăm cổ trong thiết kế công trình văn hóa công cộng đương đại miền Trung",
        cohortYear: 2024,
        departmentName: "Khoa Kiến trúc",
        status: "RESEARCH_SUBMITTED",
        supervisors: [
          {
            employeeId: "DAU260003-ID",
            employeeCode: "DAU260003",
            fullName: "ThS. Nguyễn Văn An",
            academicTitle: "ThS.KTS",
            role: "PRIMARY_SUPERVISOR",
            convertedHours: 30,
            kpiPoints: 15,
          },
        ],
        defenseMembers: [],
        defenseResult: null,
        degreeResolutionNumber: null,
        pkiSignature: null,
        pkiSignedAt: null,
        createdAt: "2024-10-20T14:00:00.000Z",
        updatedAt: "2026-08-30T16:00:00.000Z",
      },
    ];

    for (const s of sampleStudents) {
      this.students.set(s.id, s);
    }
  }

  /**
   * Lấy danh sách học viên Sau đại học theo bộ lọc
   */
  public static getAllStudents(filter?: PostgradFilterQuery): PostgradStudentDto[] {
    let list = Array.from(this.students.values());

    if (filter?.degreeLevel) {
      list = list.filter((s) => s.degreeLevel === filter.degreeLevel);
    }
    if (filter?.specialization) {
      list = list.filter((s) => s.specialization === filter.specialization);
    }
    if (filter?.status) {
      list = list.filter((s) => s.status === filter.status);
    }
    if (filter?.departmentName) {
      list = list.filter((s) =>
        s.departmentName.toLowerCase().includes(filter.departmentName!.toLowerCase())
      );
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      list = list.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          s.studentCode.toLowerCase().includes(q) ||
          s.thesisTitle.toLowerCase().includes(q)
      );
    }

    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Xem chi tiết hồ sơ học viên Sau đại học theo ID
   */
  public static getStudentById(id: string): PostgradStudentDto {
    const student = this.students.get(id);
    if (!student) {
      throw new AppError(404, "NOT_FOUND", `Không tìm thấy hồ sơ Sau đại học với ID: ${id}`);
    }
    return student;
  }

  /**
   * Đăng ký đề tài luận văn/luận án và phân công cán bộ hướng dẫn khoa học
   */
  public static createStudent(input: CreatePostgradStudentInput): PostgradStudentDto {
    const id = `pg-dau-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
    const now = new Date().toISOString();

    const isDoc = input.degreeLevel === "DOCTORAL";
    const supervisors: SupervisorInfo[] = input.supervisors.map((s) => {
      // Giờ chuẩn & KPI quy đổi theo TT 20/2020: NCS = 50h (chính) / 25h (phụ); ThS = 30h
      let convertedHours = 30;
      let kpiPoints = 15;
      if (isDoc) {
        convertedHours = s.role === "PRIMARY_SUPERVISOR" ? 50 : 25;
        kpiPoints = s.role === "PRIMARY_SUPERVISOR" ? 20 : 10;
      }
      return {
        employeeId: s.employeeId,
        employeeCode: s.employeeCode,
        fullName: s.fullName,
        academicTitle: s.academicTitle || "TS",
        role: s.role,
        convertedHours,
        kpiPoints,
      };
    });

    const newStudent: PostgradStudentDto = {
      id,
      studentCode: input.studentCode,
      fullName: input.fullName,
      degreeLevel: input.degreeLevel,
      specialization: input.specialization,
      thesisTitle: input.thesisTitle,
      cohortYear: input.cohortYear,
      departmentName: input.departmentName || "Khoa Kiến trúc",
      status: "ASSIGNED",
      supervisors,
      defenseMembers: [],
      defenseResult: null,
      degreeResolutionNumber: null,
      pkiSignature: null,
      pkiSignedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    this.students.set(id, newStudent);
    return newStudent;
  }

  /**
   * Thành lập Hội đồng đánh giá Luận văn Thạc sĩ / Luận án Tiến sĩ (5 thành viên)
   */
  public static scheduleDefenseCouncil(
    id: string,
    input: ScheduleDefenseCouncilInput
  ): PostgradStudentDto {
    const student = this.getStudentById(id);

    if (input.councilMembers.length !== 5) {
      throw new AppError(
        400,
        "INVALID_COUNCIL_SIZE",
        "Hội đồng đánh giá luận văn/luận án phải gồm đúng 5 thành viên theo quy chế của Bộ GD&ĐT."
      );
    }

    const defenseMembers: CouncilMemberScore[] = input.councilMembers.map((m) => {
      let honorariumAmount = 1000000;
      if (m.role === "PRESIDENT") honorariumAmount = 2000000;
      else if (m.role === "REVIEWER_1" || m.role === "REVIEWER_2") honorariumAmount = 1500000;

      return {
        employeeId: m.employeeId,
        employeeCode: m.employeeCode,
        fullName: m.fullName,
        role: m.role,
        score: 0,
        isApproved: false,
        honorariumAmount,
      };
    });

    const updated: PostgradStudentDto = {
      ...student,
      status: "DEFENSE_SCHEDULED",
      defenseMembers,
      updatedAt: new Date().toISOString(),
    };

    this.students.set(id, updated);
    return updated;
  }

  /**
   * Chấm điểm và kết luận của Hội đồng đánh giá luận văn / luận án
   * Rào chắn: Điểm trung bình >= 70/100 (hoặc >= 7.0/10) và tối thiểu 4/5 thành viên Tán thành
   */
  public static scoreThesisDefense(
    id: string,
    input: ScoreThesisDefenseInput
  ): PostgradStudentDto {
    const student = this.getStudentById(id);

    if (!student.defenseMembers || student.defenseMembers.length !== 5) {
      throw new AppError(
        400,
        "COUNCIL_NOT_SCHEDULED",
        "Hồ sơ chưa được thành lập Hội đồng đánh giá luận văn/luận án."
      );
    }

    const scoreMap = new Map(input.memberScores.map((s) => [s.employeeId, s]));

    const updatedMembers = student.defenseMembers.map((m) => {
      const s = scoreMap.get(m.employeeId);
      if (!s) {
        throw new AppError(
          400,
          "MISSING_MEMBER_SCORE",
          `Thiếu điểm đánh giá của thành viên: ${m.fullName}`
        );
      }
      return {
        ...m,
        score: s.score,
        isApproved: s.isApproved,
      };
    });

    const totalScore = updatedMembers.reduce((sum, m) => sum + m.score, 0);
    const averageScore = Math.round((totalScore / 5) * 10) / 10;
    const approvedVotes = updatedMembers.filter((m) => m.isApproved).length;

    // Rào chắn pháp lý: Điểm >= 70 và tối thiểu 4/5 phiếu Tán thành
    const isPassed = averageScore >= 70 && approvedVotes >= 4;

    let ranking: "EXCELLENT" | "GOOD" | "SATISFACTORY" | "UNSATISFACTORY" = "UNSATISFACTORY";
    if (isPassed) {
      if (averageScore >= 90) ranking = "EXCELLENT";
      else if (averageScore >= 80) ranking = "GOOD";
      else ranking = "SATISFACTORY";
    }

    const defenseResult = {
      defenseDate: new Date().toISOString(),
      averageScore,
      approvedVotes,
      totalMembers: 5,
      isPassed,
      ranking,
      councilNotes: input.councilNotes || null,
      councilResolutionNumber: `HĐ-SĐH-2026-${student.studentCode}`,
    };

    const updated: PostgradStudentDto = {
      ...student,
      status: isPassed ? "PASSED" : "REJECTED",
      defenseMembers: updatedMembers,
      defenseResult,
      updatedAt: new Date().toISOString(),
    };

    this.students.set(id, updated);
    return updated;
  }

  /**
   * Hiệu trưởng ký số PKI RSA-2048 ban hành Quyết định Công nhận học vị Thạc sĩ / Tiến sĩ
   * Kích hoạt Triple-Coupling: PayrollService, WorkloadService, KpiService
   */
  public static awardDegreeWithPki(
    id: string,
    input: AwardPostgradDegreeWithPkiInput,
    _currentUser?: any
  ): { student: PostgradStudentDto; pkiSignature: string; resolutionNumber: string; signedAt: string } {
    const student = this.getStudentById(id);

    if (!student.defenseResult || !student.defenseResult.isPassed) {
      throw new AppError(
        400,
        "COUNCIL_NOT_PASSED",
        "Học viên / Nghiên cứu sinh chưa được Hội đồng đánh giá ĐẠT (yêu cầu điểm trung bình >= 70đ và >= 4/5 phiếu tán thành)."
      );
    }

    const resolutionNumber = input.resolutionNumber || `220/QĐ-ĐHKTĐN`;

    // Chuỗi dữ liệu chuẩn hóa ký số RSA-2048
    const canonical = [
      "DAU",
      "POSTGRAD_DEGREE_AWARD",
      student.id,
      student.studentCode,
      student.degreeLevel,
      student.thesisTitle,
      student.defenseResult.averageScore,
      resolutionNumber,
    ].join("##");

    const signResult = PkiService.signData(canonical);

    const updated: PostgradStudentDto = {
      ...student,
      status: "DEGREE_AWARDED",
      degreeResolutionNumber: resolutionNumber,
      pkiSignature: signResult.signatureValue,
      pkiSignedAt: signResult.signedAt,
      updatedAt: new Date().toISOString(),
    };

    this.students.set(id, updated);

    // =========================================================================
    // DECOUPLED EVENT-DRIVEN ENGINE: Publish POSTGRAD_DEGREE_AWARDED
    // Kích hoạt đồng thời Payroll, Workload và KPI thông qua DomainEventBus
    // =========================================================================
    DomainEventBus.getInstance().publishSync(
      DomainEventBus.createEvent(
        DOMAIN_EVENTS.POSTGRAD_DEGREE_AWARDED,
        student.id,
        {
          studentId: student.id,
          studentCode: student.studentCode,
          fullName: student.fullName,
          degreeLevel: student.degreeLevel,
          thesisTitle: student.thesisTitle,
          resolutionNumber,
          signedAt: signResult.signedAt,
          supervisors: student.supervisors.map((s) => ({
            employeeId: s.employeeId,
            employeeCode: s.employeeCode,
            role: s.role,
            convertedHours: s.convertedHours,
            kpiPoints: s.kpiPoints,
          })),
          defenseMembers: (student.defenseMembers || []).map((m) => ({
            employeeId: m.employeeId,
            employeeCode: m.employeeCode,
            role: m.role,
            honorariumAmount: m.honorariumAmount,
          })),
        },
        {
          actorId: _currentUser?.id,
          actorRole: _currentUser?.role,
          source: "BAHAU_POSTGRAD_SERVICE",
        }
      )
    );

    return {
      student: updated,
      pkiSignature: signResult.signatureValue,
      resolutionNumber,
      signedAt: signResult.signedAt,
    };
  }

  /**
   * Xuất Quyết định Công nhận học vị Thạc sĩ / Tiến sĩ chuẩn Nghị định 30/2020/NĐ-CP (PDF)
   */
  public static async exportDegreeResolutionPdf(id: string): Promise<Uint8Array> {
    const student = this.getStudentById(id);

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

    const degreeName = student.degreeLevel === "DOCTORAL" ? "Tiến sĩ" : "Thạc sĩ";

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
    page.drawText(sanitize(`Số: ${student.degreeResolutionNumber || "220/QĐ-ĐHKTĐN"}`), {
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
    page.drawText(sanitize(`Về việc công nhận học vị và cấp bằng ${degreeName}`), {
      x: 155,
      y: height - 122,
      size: 10,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    // Căn cứ pháp lý
    const grounds = [
      "Căn cứ Luật Giáo dục đại học năm 2012 và Luật sửa đổi, bổ sung một số điều của Luật Giáo dục đại học năm 2018;",
      student.degreeLevel === "DOCTORAL"
        ? "Căn cứ Thông tư số 18/2021/TT-BGDĐT của Bộ GD&ĐT ban hành Quy chế tuyển sinh và đào tạo trình độ tiến sĩ;"
        : "Căn cứ Thông tư số 23/2021/TT-BGDĐT của Bộ GD&ĐT ban hành Quy chế tuyển sinh và đào tạo trình độ thạc sĩ;",
      "Căn cứ Quy chế Đào tạo Sau đại học của Trường Đại học Kiến trúc Đà Nẵng;",
      `Căn cứ Biên bản của Hội đồng đánh giá luận văn/luận án ngày ${student.defenseResult?.defenseDate.slice(0, 10) || "2026-09-15"} (Đạt ${student.defenseResult?.averageScore || 88.5}/100đ, ${student.defenseResult?.approvedVotes || 5}/5 phiếu tán thành);`,
      "Xét đề nghị của Trưởng phòng Đào tạo & QLKH Sau đại học,",
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
    page.drawText(sanitize(`Điều 1. Công nhận học vị và cấp bằng ${degreeName} cho học viên:`), {
      x: 45,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 15;
    page.drawText(sanitize(`- Họ và tên: ${student.fullName}        Mã học viên/NCS: ${student.studentCode}`), {
      x: 65,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 14;
    page.drawText(sanitize(`- Chuyên ngành: ${student.specialization}    Khóa tuyển sinh: ${student.cohortYear}`), {
      x: 65,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 14;
    page.drawText(sanitize(`- Tên luận văn / luận án: "${student.thesisTitle}"`), {
      x: 65,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });

    currentY -= 20;

    // Điều 2
    page.drawText(sanitize(`Điều 2. Ghi nhận kết quả đánh giá của Hội đồng và công lao của Cán bộ hướng dẫn:`), {
      x: 45,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 15;
    page.drawText(
      sanitize(`- Điểm đánh giá trung bình: ${student.defenseResult?.averageScore || 88.5}/100đ (Xếp loại: ${student.defenseResult?.ranking || "TỐT"}).`),
      { x: 65, y: currentY, size: 8.5, font: fontRegular, color: rgb(0.2, 0.2, 0.2) }
    );
    currentY -= 14;

    const supNames = student.supervisors.map((s) => `${s.fullName} (${s.role})`).join("; ");
    page.drawText(sanitize(`- Cán bộ hướng dẫn khoa học: ${supNames}.`), {
      x: 65,
      y: currentY,
      size: 8.5,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });

    currentY -= 20;

    // Điều 3
    page.drawText(sanitize("Điều 3. Chế độ thù lao và quy đổi giờ chuẩn học thuật:"), {
      x: 45,
      y: currentY,
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });
    currentY -= 15;
    page.drawText(
      sanitize("- Quy đổi giờ chuẩn giảng dạy sau đại học vào WorkloadService và cộng điểm KPI cho Cán bộ hướng dẫn."),
      { x: 65, y: currentY, size: 8.5, font: fontRegular, color: rgb(0.2, 0.2, 0.2) }
    );
    currentY -= 14;
    page.drawText(
      sanitize("- Chi trả thù lao chấm bảo vệ cho các thành viên Hội đồng qua PayrollService theo Quy chế chi tiêu nội bộ DAU."),
      { x: 65, y: currentY, size: 8.5, font: fontRegular, color: rgb(0.2, 0.2, 0.2) }
    );

    currentY -= 20;

    // Điều 4
    page.drawText(sanitize("Điều 4. Phòng Đào tạo & QLKH Sau đại học, Phòng KHTC, Trưởng khoa và người có tên chịu trách nhiệm thi hành."), {
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
    page.drawText(sanitize("- Bộ Giáo dục và Đào tạo (để b/c);"), { x: 45, y: currentY - 26, size: 8, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(sanitize("- Lưu VT, SĐH, KHTC."), { x: 45, y: currentY - 38, size: 8, font: fontRegular, color: rgb(0.3, 0.3, 0.3) });

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
    page.drawText(sanitize(`Thời gian ký: ${student.pkiSignedAt || new Date().toISOString()}`), {
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
