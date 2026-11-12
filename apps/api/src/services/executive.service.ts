import crypto from "node:crypto";
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

interface CachedEmployeeSalaryInfo {
  positionName: string;
  currentRank: number;
  currentCoefficient: number;
  nextRank: number;
  nextCoefficient: number;
}

export class ExecutiveService {
  private static resolutionSeq = 0;
  private static employeeSalaryCache = new Map<string, CachedEmployeeSalaryInfo>();
  private static salaryCacheWarming: Promise<void> | null = null;

  private static getWebBaseUrl(): string {
    return (process.env.WEB_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
  }

  private static computeMonthsElapsed(fromDate: Date, toDate: Date = new Date()): number {
    const startYear = fromDate.getUTCFullYear();
    const startMonth = fromDate.getUTCMonth();
    const startDay = fromDate.getUTCDate();

    const endYear = toDate.getUTCFullYear();
    const endMonth = toDate.getUTCMonth();
    const endDay = toDate.getUTCDate();

    let months = (endYear - startYear) * 12 + (endMonth - startMonth);
    if (endDay < startDay) {
      months -= 1;
    }
    return Math.max(0, months);
  }

  private static inferSalaryRank(coeff: number): {
    currentRank: number;
    nextRank: number;
    nextCoefficient: number;
  } {
    const inferredRank = Math.min(8, Math.max(1, Math.round((coeff - 2.34) / 0.33) + 1));
    const nextRank = inferredRank < 8 ? inferredRank + 1 : 8;
    const nextCoefficient =
      inferredRank < 8 ? Math.round((coeff + 0.33) * 100) / 100 : coeff;
    return { currentRank: inferredRank, nextRank, nextCoefficient };
  }

  private static async warmSalaryCache(): Promise<void> {
    if (this.salaryCacheWarming) return this.salaryCacheWarming;
    this.salaryCacheWarming = (async () => {
      try {
        await this.getSalaryIncrementCandidates();
      } catch {
        // Bỏ qua nếu DB offline
      } finally {
        this.salaryCacheWarming = null;
      }
    })();
    return this.salaryCacheWarming;
  }

  private static nextResolutionNumber(year: number): string {
    let candidate = "";
    do {
      this.resolutionSeq += 1;
      const seqPart = this.resolutionSeq.toString().padStart(4, "0");
      const uniqueSuffix = crypto.randomBytes(2).toString("hex").toUpperCase();
      candidate = `${year}${seqPart}-${uniqueSuffix}/QĐ-ĐHKTĐN`;
    } while (this.resolutionsStore.has(candidate));
    return candidate;
  }

  /**
   * Tự động rà soát và lập danh sách CBGV đủ điều kiện xét nâng bậc lương thường xuyên và trước thời hạn
   */
  public static async getSalaryIncrementCandidates(): Promise<SalaryIncrementCandidateDto[]> {
    let employees: any[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("DATABASE_TIMEOUT")), 3000);
        if (typeof (timer as any).unref === "function") {
          (timer as any).unref();
        }
      });

      employees = await Promise.race([
        prisma.employee.findMany({
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
            events: {
              where: { eventType: "PROMOTED" },
              orderBy: { effectiveDate: "desc" },
              take: 1,
            },
            kpiEvaluations: {
              where: { status: "FINALIZED" },
              include: { period: { select: { endDate: true } } },
              orderBy: { createdAt: "desc" },
              take: 2,
            },
          },
        }),
        timeoutPromise,
      ]);
    } catch (err) {
      console.warn(
        "[ExecutiveService] Không thể truy vấn danh sách xét nâng lương từ CSDL, trả về danh sách rỗng:",
        err instanceof Error ? err.message : String(err)
      );
      return [];
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }

    const candidates: SalaryIncrementCandidateDto[] = [];
    const now = new Date();

    for (const emp of employees) {
      const primaryAssignment =
        emp.assignments?.find((a: any) => a.assignmentType === "PRIMARY") || emp.assignments?.[0];
      const contract = emp.contracts?.[0];
      const lastPromotedEvent = emp.events?.[0];

      const currentCoeff = contract?.salaryCoefficient ? Number(contract.salaryCoefficient) : 2.34;
      const { currentRank, nextRank, nextCoefficient } = this.inferSalaryRank(currentCoeff);
      const positionName = primaryAssignment?.position?.name || "Giảng viên";

      this.employeeSalaryCache.set(emp.employeeCode, {
        positionName,
        currentRank,
        currentCoefficient: currentCoeff,
        nextRank,
        nextCoefficient,
      });

      if (currentRank >= 8) {
        continue;
      }

      const rankStartDateRaw =
        lastPromotedEvent?.effectiveDate || contract?.effectiveDate || emp.hireDate;
      if (!rankStartDateRaw) continue;

      const monthsElapsed = this.computeMonthsElapsed(new Date(rankStartDateRaw), now);
      const kpiList: any[] = emp.kpiEvaluations || [];
      const recentKpiScores = kpiList
        .map((k) => Number(k.totalFinalScore ?? k.totalManagerScore ?? k.totalSelfScore ?? 0))
        .filter((s) => Number.isFinite(s) && s > 0);

      const latestRanking = kpiList[0]?.ranking;
      const hasTwoExcellentKpi =
        kpiList.length >= 2 &&
        kpiList.slice(0, 2).every((k) => k.ranking === "EXCELLENT");

      const isRegularEligible =
        monthsElapsed >= 36 && latestRanking !== "UNSATISFACTORY";
      const isEarlyEligible =
        !isRegularEligible && monthsElapsed >= 24 && hasTwoExcellentKpi;

      const unitName = primaryAssignment?.unit?.name || "Chưa phân công đơn vị";

      if (isRegularEligible) {
        candidates.push({
          employeeId: emp.id,
          employeeName: emp.fullName,
          employeeCode: emp.employeeCode,
          unitName,
          currentRank,
          currentCoefficient: currentCoeff,
          nextRank,
          nextCoefficient,
          monthsInCurrentRank: monthsElapsed,
          recommendationType: "REGULAR",
          recommendationReason: `Đã đủ ${monthsElapsed} tháng giữ bậc (yêu cầu ≥ 36 tháng) và hoàn thành nhiệm vụ.`,
          isEligible: true,
          recentKpiScores,
        });
      } else if (isEarlyEligible) {
        candidates.push({
          employeeId: emp.id,
          employeeName: emp.fullName,
          employeeCode: emp.employeeCode,
          unitName,
          currentRank,
          currentCoefficient: currentCoeff,
          nextRank,
          nextCoefficient,
          monthsInCurrentRank: monthsElapsed,
          recommendationType: "EARLY",
          recommendationReason: `Thành tích xuất sắc: 2 kỳ liên tiếp đạt KPI xếp loại Xuất sắc, đề xuất nâng bậc trước thời hạn.`,
          isEligible: true,
          recentKpiScores,
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
    if (this.employeeSalaryCache.size === 0) {
      void this.warmSalaryCache();
    }

    const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const day = vnNow.getUTCDate().toString().padStart(2, "0");
    const monthNum = vnNow.getUTCMonth() + 1;
    const month = monthNum.toString().padStart(2, "0");
    const year = vnNow.getUTCFullYear();
    const resolutionNumber = this.nextResolutionNumber(year);
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

      case "SALARY_PROMOTION": {
        const details = (input.details || {}) as Record<string, any>;
        const cached = this.employeeSalaryCache.get(input.recipientCode);
        const contentMatch =
          /bậc\s*(\d+).*?hệ số\s*([\d.]+).*?bậc\s*(\d+).*?hệ số\s*([\d.]+)/i.exec(
            input.contentTitle
          );

        const positionName =
          typeof details.positionName === "string" && details.positionName.trim()
            ? details.positionName.trim()
            : cached?.positionName || "Giảng viên";
        const currentRank = Number(
          details.currentRank ?? cached?.currentRank ?? (contentMatch ? contentMatch[1] : 5)
        );
        const currentCoeff = Number(
          details.currentCoefficient ??
            cached?.currentCoefficient ??
            (contentMatch ? contentMatch[2] : 4.98)
        );
        const nextRank = Number(
          details.nextRank ?? cached?.nextRank ?? (contentMatch ? contentMatch[3] : currentRank + 1)
        );
        const nextCoeff = Number(
          details.nextCoefficient ??
            cached?.nextCoefficient ??
            (contentMatch ? contentMatch[4] : Math.round((currentCoeff + 0.33) * 100) / 100)
        );

        const nextMonthNum = monthNum === 12 ? 1 : monthNum + 1;
        const nextMonthYear = monthNum === 12 ? year + 1 : year;
        const effectiveDateText =
          typeof details.effectiveDate === "string" && details.effectiveDate.trim()
            ? details.effectiveDate.trim()
            : `ngày 01 tháng ${nextMonthNum.toString().padStart(2, "0")} năm ${nextMonthYear}`;

        title = `QUYẾT ĐỊNH\nVề việc nâng bậc lương đối với viên chức, người lao động`;
        articles = [
          {
            articleNumber: 1,
            title: "Nâng bậc lương",
            content: `Nâng bậc lương đối với Ông/Bà ${input.recipientName}, chức danh ${positionName}, đơn vị ${input.unitName}: Từ bậc ${currentRank}/8 (hệ số ${currentCoeff}) lên bậc ${nextRank}/8 (hệ số ${nextCoeff}).`,
          },
          {
            articleNumber: 2,
            title: "Thời gian hưởng",
            content: `Thời gian được tính hưởng bậc lương mới kể từ ${effectiveDateText}. Mốc thời gian tính nâng bậc lương lần sau được tính kể từ ngày hưởng bậc lương mới này.`,
          },
          {
            articleNumber: 3,
            title: "Trách nhiệm thi hành",
            content: `Trưởng phòng Tổ chức - Hành chính, Trưởng phòng Kế hoạch - Tài chính và Ông/Bà ${input.recipientName} chịu trách nhiệm thi hành Quyết định này.`,
          },
        ];
        break;
      }

      case "AWARD":
      default: {
        const academicStartYear = monthNum >= 9 ? year : year - 1;
        const academicYearLabel = `${academicStartYear}–${academicStartYear + 1}`;
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
            content: `Mức tiền thưởng thực hiện theo Quy chế chi tiêu nội bộ của Nhà trường, trích từ Quỹ thi đua khen thưởng năm học ${academicYearLabel}.`,
          },
          {
            articleNumber: 3,
            title: "Trách nhiệm thi hành",
            content: `Trưởng các đơn vị có liên quan và cá nhân có tên tại Điều 1 chịu trách nhiệm thi hành Quyết định này.`,
          },
        ];
        break;
      }
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
    const verificationUrl = `${this.getWebBaseUrl()}/verify/${encodeURIComponent(doc.resolutionNumber)}`;
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
   * Xuất file PDF A4 chuẩn Nghị định 30 có chữ ký số và mã QR (bắt buộc đã ký số & xác thực hợp lệ)
   */
  public static async exportResolutionPdf(
    doc: SignedResolutionResponse
  ): Promise<Uint8Array> {
    if (!doc.signature || !doc.signature.signatureValue || !doc.signature.documentHash) {
      throw new AppError(
        422,
        "VALIDATION_FAILED",
        "Văn bản quyết định chưa được ký số PKI hợp lệ, không thể xuất PDF chính thức."
      );
    }

    const verification = PkiService.verifyResolution(doc, doc.signature);
    if (!verification.isValid) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Chữ ký số PKI của văn bản không hợp lệ hoặc nội dung đã bị thay đổi."
      );
    }

    const stored = this.resolutionsStore.get(doc.resolutionNumber);
    if (stored && stored.signature && doc.signature.signatureValue !== stored.signature.signatureValue) {
      throw new AppError(
        403,
        "FORBIDDEN",
        "Chữ ký số không khớp với bản quyết định đã ký lưu trữ."
      );
    }

    return await PdfExportService.generateResolutionPdf(stored || doc);
  }
}
