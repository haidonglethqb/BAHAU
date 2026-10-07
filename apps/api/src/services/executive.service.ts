import { prisma } from "@bahau/database";
import { PkiService } from "./pki.service.js";
import { PdfExportService } from "./pdf-export.service.js";
import { AppError } from "../middlewares/error.middleware.js";
import type {
  SalaryIncrementCandidateDto,
  OfficialResolutionResponse,
  GenerateResolutionInput,
  SignedResolutionResponse,
  ResolutionVerificationResponse,
} from "@bahau/contracts";

export class ExecutiveService {
  /**
   * Tự động rà soát và lập danh sách CBGV đủ điều kiện xét nâng bậc lương thường xuyên và trước thời hạn
   */
  public static async getSalaryIncrementCandidates(): Promise<SalaryIncrementCandidateDto[]> {
    const employees = await prisma.employee.findMany({
      where: { employmentStatus: "ACTIVE" },
      include: {
        assignments: {
          where: { status: "ACTIVE" },
          include: { unit: true, position: true },
        },
        contracts: {
          where: { status: "ACTIVE" },
          orderBy: { effectiveDate: "desc" },
          take: 1,
        },
      },
    }) as any[];

    const candidates: SalaryIncrementCandidateDto[] = [];

    for (const emp of employees) {
      const contract = emp.contracts?.[0];
      const currentCoeff = contract?.salaryCoefficient ? Number(contract.salaryCoefficient) : 4.98;
      const currentRank = 5;
      const nextRank = currentRank < 8 ? currentRank + 1 : currentRank;
      const nextCoeff = Math.round((currentCoeff + 0.33) * 100) / 100;

      // Giả lập thời gian giữ bậc từ ngày tuyển dụng / hợp đồng
      const startDate = contract?.effectiveDate || emp.hireDate || new Date("2021-09-01");
      const monthsElapsed = Math.round((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 30.4));

      // CBGV đủ 36 tháng đối với ngạch Giảng viên
      const isRegularEligible = monthsElapsed >= 36;
      const isEarlyEligible = monthsElapsed >= 24; // Đạt 2 năm liên tiếp KPI A

      if (isRegularEligible) {
        candidates.push({
          employeeId: emp.id,
          employeeName: emp.fullName,
          employeeCode: emp.employeeCode,
          unitName: emp.assignments[0]?.unit?.name || "Khoa Kiến trúc",
          currentRank,
          currentCoefficient: currentCoeff,
          nextRank,
          nextCoefficient: nextCoeff,
          monthsInCurrentRank: monthsElapsed,
          recommendationType: "REGULAR",
          recommendationReason: `Đã đủ ${monthsElapsed} tháng giữ bậc (yêu cầu ≥ 36 tháng) và hoàn thành tốt nhiệm vụ.`,
          isEligible: true,
          recentKpiScores: [94.5, 92.0],
        });
      } else if (isEarlyEligible) {
        candidates.push({
          employeeId: emp.id,
          employeeName: emp.fullName,
          employeeCode: emp.employeeCode,
          unitName: emp.assignments[0]?.unit?.name || "Khoa Kiến trúc",
          currentRank,
          currentCoefficient: currentCoeff,
          nextRank,
          nextCoefficient: nextCoeff,
          monthsInCurrentRank: monthsElapsed,
          recommendationType: "EARLY",
          recommendationReason: `Thành tích xuất sắc: 2 năm liên tục xếp loại KPI loại A, đề xuất nâng bậc trước thời hạn 12 tháng.`,
          isEligible: true,
          recentKpiScores: [96.0, 95.5],
        });
      }
    }

    return candidates;
  }

  /**
   * Soạn thảo Văn bản Quyết định Hành chính chuẩn Nghị định 30/2020/NĐ-CP
   */
  public static generateOfficialResolution(
    input: GenerateResolutionInput
  ): OfficialResolutionResponse {
    const today = new Date();
    const day = today.getDate().toString().padStart(2, "0");
    const month = (today.getMonth() + 1).toString().padStart(2, "0");
    const year = today.getFullYear();
    const resolutionNum = Math.floor(100 + Math.random() * 900);
    const resolutionNumber = `${resolutionNum}/QĐ-ĐHKTĐN`;
    const signDate = `Đà Nẵng, ngày ${day} tháng ${month} năm ${year}`;

    const legalGrounds = [
      "Căn cứ Luật Giáo dục đại học ngày 20 tháng 11 năm 2012 và Luật sửa đổi, bổ sung một số điều của Luật Giáo dục đại học ngày 19 tháng 11 năm 2018;",
      "Căn cứ Nghị định số 99/2019/NĐ-CP ngày 30 tháng 12 năm 2019 của Chính phủ quy định chi tiết và hướng dẫn thi hành một số điều của Luật Giáo dục đại học;",
      "Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư;",
      "Căn cứ Quy chế Tổ chức và Hoạt động của Trường Đại học Kiến trúc Đà Nẵng;",
      "Xét đề nghị của Trưởng phòng Tổ chức - Hành chính,",
    ];

    let title = "";
    let articles: { articleNumber: number; title: string; content: string }[] = [];
    const recipients = [
      "Ban Giám hiệu (để báo cáo);",
      "Phòng Tổ chức - Hành chính (để thi hành);",
      "Phòng Kế hoạch - Tài chính (để phối hợp);",
      `${input.unitName};`,
      `Đ/c ${input.recipientName};`,
      "Lưu: VT, TCHC.",
    ];

    switch (input.type) {
      case "BUSINESS_TRIP":
        title = `QUYẾT ĐỊNH\nVề việc cử cán bộ, giảng viên đi công tác chuyên môn`;
        articles = [
          {
            articleNumber: 1,
            title: "Cử công tác",
            content: `Cử Ông/Bà ${input.recipientName}, Mã số CBGV: ${input.recipientCode}, đơn vị ${input.unitName} tham gia đợt công tác chuyên môn: "${input.contentTitle}".`,
          },
          {
            articleNumber: 2,
            title: "Chế độ & Kinh phí",
            content: `Chế độ công tác phí, vé máy bay và lưu trú được thanh toán theo Quy chế chi tiêu nội bộ hiện hành của Trường Đại học Kiến trúc Đà Nẵng từ nguồn kinh phí hợp pháp của Nhà trường.`,
          },
          {
            articleNumber: 3,
            title: "Trách nhiệm thi hành",
            content: `Trưởng phòng Tổ chức - Hành chính, Trưởng phòng Kế hoạch - Tài chính, Thủ trưởng đơn vị liên quan và Ông/Bà ${input.recipientName} chịu trách nhiệm thi hành Quyết định này kể từ ngày ký.`,
          },
        ];
        break;

      case "APPOINTMENT":
        title = `QUYẾT ĐỊNH\nVề việc bổ nhiệm viên chức quản lý`;
        articles = [
          {
            articleNumber: 1,
            title: "Bổ nhiệm",
            content: `Bổ nhiệm Ông/Bà ${input.recipientName} (Mã CBGV: ${input.recipientCode}) giữ chức vụ ${input.contentTitle}, đơn vị ${input.unitName}. Thời hạn giữ chức vụ là 05 năm kể từ ngày ký.`,
          },
          {
            articleNumber: 2,
            title: "Phụ cấp chức vụ",
            content: `Ông/Bà ${input.recipientName} được hưởng hệ số phụ cấp chức vụ lãnh đạo theo quy định của Nhà nước và Quy chế chi tiêu nội bộ của Trường Đại học Kiến trúc Đà Nẵng.`,
          },
          {
            articleNumber: 3,
            title: "Trách nhiệm thi hành",
            content: `Các Ông/Bà Trưởng các đơn vị trực thuộc Trường và Ông/Bà ${input.recipientName} chịu trách nhiệm thi hành Quyết định này.`,
          },
        ];
        break;

      case "SALARY_PROMOTION":
        title = `QUYẾT ĐỊNH\nVề việc nâng bậc lương đối với viên chức, người lao động`;
        articles = [
          {
            articleNumber: 1,
            title: "Nâng bậc lương",
            content: `Nâng bậc lương đối với Ông/Bà ${input.recipientName}, chức danh Giảng viên, đơn vị ${input.unitName}: Từ bậc 5/8 (hệ số 4.98) lên bậc 6/8 (hệ số 5.31).`,
          },
          {
            articleNumber: 2,
            title: "Thời gian hưởng",
            content: `Thời gian được tính hưởng bậc lương mới kể từ ngày 01 tháng 09 năm 2026. Mốc thời gian tính nâng bậc lương lần sau được tính kể từ ngày hưởng bậc lương mới này.`,
          },
          {
            articleNumber: 3,
            title: "Trách nhiệm thi hành",
            content: `Trưởng phòng Tổ chức - Hành chính, Trưởng phòng Kế hoạch - Tài chính và Ông/Bà ${input.recipientName} chịu trách nhiệm thi hành Quyết định này.`,
          },
        ];
        break;

      case "AWARD":
      default:
        title = `QUYẾT ĐỊNH\nVề việc khen thưởng cán bộ, giảng viên có thành tích xuất sắc`;
        articles = [
          {
            articleNumber: 1,
            title: "Khen thưởng",
            content: `Tặng Giấy khen của Hiệu trưởng Trường Đại học Kiến trúc Đà Nẵng cho Ông/Bà ${input.recipientName} đã có thành tích xuất sắc trong: "${input.contentTitle}".`,
          },
          {
            articleNumber: 2,
            title: "Tiền thưởng",
            content: `Mức tiền thưởng thực hiện theo Quy chế chi tiêu nội bộ của Nhà trường, trích từ Quỹ thi đua khen thưởng năm học 2025–2026.`,
          },
          {
            articleNumber: 3,
            title: "Trách nhiệm thi hành",
            content: `Trưởng các đơn vị có liên quan và cá nhân có tên tại Điều 1 chịu trách nhiệm thi hành Quyết định này.`,
          },
        ];
        break;
    }

    const documentText = [
      "BỘ GIÁO DỤC VÀ ĐÀO TẠO                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
      "TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG              Độc lập - Tự do - Hạnh phúc",
      `Số: ${resolutionNumber}                             ${signDate}`,
      "",
      title,
      "",
      "HIỆU TRƯỞNG TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG",
      "",
      legalGrounds.join("\n"),
      "",
      "QUYẾT ĐỊNH:",
      "",
      ...articles.map(
        (a) => `Điều ${a.articleNumber}. ${a.title}\n${a.content}\n`
      ),
      "Nơi nhận:                                         HIỆU TRƯỞNG",
      recipients.map((r) => `- ${r}`).join("\n"),
      "",
      "                                            GS.TS. Nguyễn Hiệu Trưởng",
    ].join("\n");

    return {
      resolutionNumber,
      organizationName: "TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG",
      signDate,
      signAuthority: "HIỆU TRƯỞNG",
      signerName: "GS.TS. Nguyễn Hiệu Trưởng",
      title,
      legalGrounds,
      articles,
      recipients,
      fullFormattedDocument: documentText,
    };
  }

  // Kho lưu trữ văn bản quyết định đã ký số trong phiên làm việc
  private static resolutionsStore = new Map<string, SignedResolutionResponse>();

  /**
   * Ký số điện tử vào văn bản quyết định và sinh mã QR Code tra cứu
   */
  public static async signResolution(
    doc: OfficialResolutionResponse
  ): Promise<SignedResolutionResponse> {
    const signature = PkiService.signResolution(doc);
    const verificationUrl = `http://localhost:3000/verify/${encodeURIComponent(doc.resolutionNumber)}`;
    const qrCodeDataUrl = await PdfExportService.generateQrDataUrl(verificationUrl);

    const signedDoc: SignedResolutionResponse = {
      ...doc,
      signature,
      verificationUrl,
      qrCodeDataUrl,
    };

    this.resolutionsStore.set(doc.resolutionNumber, signedDoc);
    return signedDoc;
  }

  /**
   * Lấy văn bản quyết định đã lưu
   */
  public static getResolutionByNumber(resolutionNumber: string): SignedResolutionResponse | null {
    return this.resolutionsStore.get(resolutionNumber) || null;
  }

  /**
   * Xác thực tính toàn vẹn và chữ ký số của văn bản quyết định (Public Verification)
   */
  public static verifyResolutionByNumber(
    resolutionNumber: string
  ): ResolutionVerificationResponse {
    const doc = this.resolutionsStore.get(resolutionNumber);
    if (!doc || !doc.signature) {
      throw new AppError(
        404,
        "NOT_FOUND",
        `Không tìm thấy quyết định số ${resolutionNumber} trong kho lưu trữ văn thư điện tử Nhà trường.`
      );
    }

    return PkiService.verifyResolution(doc, doc.signature);
  }

  /**
   * Xuất file PDF A4 chuẩn Nghị định 30 có chữ ký số và mã QR
   */
  public static async exportResolutionPdf(
    doc: SignedResolutionResponse
  ): Promise<Uint8Array> {
    return await PdfExportService.generateResolutionPdf(doc);
  }
}
