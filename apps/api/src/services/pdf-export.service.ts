import fs from "node:fs";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import QRCode from "qrcode";
import type { SignedResolutionResponse } from "@bahau/contracts";

export class PdfExportService {
  /**
   * Sinh mã QR Code dạng Data URL (base64) để hiển thị trên Web
   */
  public static async generateQrDataUrl(text: string): Promise<string> {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 180,
      color: {
        dark: "#1e293b",
        light: "#ffffff",
      },
    });
  }

  /**
   * Sinh mã QR Code dạng PNG Buffer để nhúng vào PDF
   */
  public static async generateQrBuffer(text: string): Promise<Buffer> {
    return await QRCode.toBuffer(text, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 200,
    });
  }

  /**
   * Chuyển đổi chuỗi tiếng Việt sang ASCII an toàn khi không tìm thấy TrueType font
   */
  private static sanitizeText(text: string): string {
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  }

  /**
   * Xuất văn bản Quyết định sang file PDF A4 chuẩn Nghị định 30/2020/NĐ-CP
   */
  public static async generateResolutionPdf(
    doc: SignedResolutionResponse
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // Kích thước chuẩn trang A4 (595.28 x 841.89 points)
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    // Thử nhúng font Times New Roman hoặc Arial từ hệ thống
    let fontRegular: any;
    let fontBold: any;
    let useUnicode = false;

    const fontPaths = [
      { regular: "C:/Windows/Fonts/times.ttf", bold: "C:/Windows/Fonts/timesbd.ttf" },
      { regular: "C:/Windows/Fonts/arial.ttf", bold: "C:/Windows/Fonts/arialbd.ttf" },
      { regular: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", bold: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" },
    ];

    for (const fp of fontPaths) {
      if (fs.existsSync(fp.regular) && fs.existsSync(fp.bold)) {
        try {
          const regBytes = fs.readFileSync(fp.regular);
          const boldBytes = fs.readFileSync(fp.bold);
          fontRegular = await pdfDoc.embedFont(regBytes);
          fontBold = await pdfDoc.embedFont(boldBytes);
          useUnicode = true;
          break;
        } catch {
          // Bỏ qua lỗi và thử font tiếp theo
        }
      }
    }

    if (!fontRegular || !fontBold) {
      fontRegular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
      fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    }

    const t = (text: string) => (useUnicode ? text : this.sanitizeText(text));

    const wrapText = (
      text: string,
      font: any,
      size: number,
      maxWidth: number
    ): string[] => {
      const result: string[] = [];
      const paragraphs = (text || "").split(/\r?\n/);

      for (const para of paragraphs) {
        const words = para.trim().split(/\s+/).filter(Boolean);
        if (words.length === 0) {
          continue;
        }
        let currentLine = "";
        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (font.widthOfTextAtSize(t(testLine), size) > maxWidth && currentLine) {
            result.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) {
          result.push(currentLine);
        }
      }

      return result;
    };

    // Lề chuẩn Nghị định 30
    const marginLeft = 72; // ~25mm
    const marginRight = width - 42; // ~15mm
    const printableWidth = marginRight - marginLeft;
    const bottomMargin = 65;

    let currentPage = page;
    let cursorY = height - 56; // Cách mép trên 20mm

    const ensureSpace = (requiredHeight: number): void => {
      if (cursorY - requiredHeight < bottomMargin) {
        currentPage = pdfDoc.addPage([595.28, 841.89]);
        cursorY = height - 56;
      }
    };

    // =========================================================================
    // 1. HEADER HAI CỘT THEO NGHỊ ĐỊNH 30
    // =========================================================================
    // Cột 1 (Bên trái): Cơ quan ban hành & Số hiệu
    currentPage.drawText(t("BỘ GIÁO DỤC VÀ ĐÀO TẠO"), {
      x: marginLeft,
      y: cursorY,
      size: 10,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });

    currentPage.drawText(t("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"), {
      x: width / 2 - 10,
      y: cursorY,
      size: 10.5,
      font: fontBold,
      color: rgb(0.05, 0.05, 0.05),
    });

    cursorY -= 14;

    currentPage.drawText(t("TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG"), {
      x: marginLeft,
      y: cursorY,
      size: 10,
      font: fontBold,
      color: rgb(0.05, 0.05, 0.05),
    });

    currentPage.drawText(t("Độc lập - Tự do - Hạnh phúc"), {
      x: width / 2 + 30,
      y: cursorY,
      size: 10.5,
      font: fontBold,
      color: rgb(0.05, 0.05, 0.05),
    });

    cursorY -= 6;
    // Đường gạch chân tiêu ngữ
    currentPage.drawLine({
      start: { x: width / 2 + 40, y: cursorY },
      end: { x: width / 2 + 160, y: cursorY },
      thickness: 1,
      color: rgb(0.2, 0.2, 0.2),
    });

    cursorY -= 12;

    currentPage.drawText(t(`Số: ${doc.resolutionNumber}`), {
      x: marginLeft,
      y: cursorY,
      size: 10,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });

    const rawSignDate = (doc.signDate || "").trim();
    const formattedSignDate = rawSignDate
      ? /^(đà nẵng|da nang)/i.test(rawSignDate)
        ? rawSignDate
        : `Đà Nẵng, ngày ${rawSignDate}`
      : "Đà Nẵng, ngày 15 tháng 10 năm 2026";

    currentPage.drawText(t(formattedSignDate), {
      x: width / 2 + 10,
      y: cursorY,
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    cursorY -= 28;

    // =========================================================================
    // 2. TIÊU ĐỀ QUYẾT ĐỊNH (loại bỏ trùng lặp "QUYẾT ĐỊNH" & bọc dòng)
    // =========================================================================
    const titleHeader = t("QUYẾT ĐỊNH");
    const titleWidth = fontBold.widthOfTextAtSize(titleHeader, 14);
    currentPage.drawText(titleHeader, {
      x: (width - titleWidth) / 2,
      y: cursorY,
      size: 14,
      font: fontBold,
      color: rgb(0.8, 0.1, 0.1), // Đỏ đô trang trọng
    });

    cursorY -= 18;

    const subTitleRaw = (doc.title || "")
      .replace(/^\s*QUYẾT\s+ĐỊNH\s*[\r\n:]*/i, "")
      .replace(/^\s*QUYET\s+DINH\s*[\r\n:]*/i, "")
      .trim();

    const subTitleLines = wrapText(subTitleRaw, fontBold, 11, printableWidth);
    for (const line of subTitleLines) {
      ensureSpace(16);
      const renderedLine = t(line);
      const lineWidth = fontBold.widthOfTextAtSize(renderedLine, 11);
      currentPage.drawText(renderedLine, {
        x: Math.max(marginLeft, (width - lineWidth) / 2),
        y: cursorY,
        size: 11,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      cursorY -= 15;
    }

    cursorY -= 6;

    ensureSpace(22);
    const authTitle = t("HIỆU TRƯỞNG TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG");
    const authWidth = fontBold.widthOfTextAtSize(authTitle, 11);
    currentPage.drawText(authTitle, {
      x: (width - authWidth) / 2,
      y: cursorY,
      size: 11,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15),
    });

    cursorY -= 20;

    // =========================================================================
    // 3. CĂN CỨ PHÁP LÝ (LEGAL GROUNDS - CÓ BỌC DÒNG & PHÂN TRANG)
    // =========================================================================
    for (const ground of doc.legalGrounds || []) {
      const normalizedGround = ground.trim().replace(/[;,.]+$/, "");
      const wrappedGround = wrapText(
        `- ${normalizedGround}${ground.trim().endsWith(",") ? "," : ";"}`,
        fontRegular,
        9.5,
        printableWidth
      );
      for (const line of wrappedGround) {
        ensureSpace(14);
        currentPage.drawText(t(line), {
          x: marginLeft,
          y: cursorY,
          size: 9.5,
          font: fontRegular,
          color: rgb(0.2, 0.2, 0.2),
        });
        cursorY -= 13;
      }
      cursorY -= 2;
    }

    cursorY -= 8;
    ensureSpace(24);
    const decideWord = t("QUYẾT ĐỊNH:");
    const decideWidth = fontBold.widthOfTextAtSize(decideWord, 11);
    currentPage.drawText(decideWord, {
      x: (width - decideWidth) / 2,
      y: cursorY,
      size: 11,
      font: fontBold,
      color: rgb(0.05, 0.05, 0.05),
    });

    cursorY -= 18;

    // =========================================================================
    // 4. CÁC ĐIỀU KHOẢN (ARTICLES - CÓ BỌC DÒNG & TỰ ĐỘNG SANG TRANG)
    // =========================================================================
    for (const art of doc.articles || []) {
      ensureSpace(30);
      const artHeader = t(`Điều ${art.articleNumber}. ${art.title}`);
      currentPage.drawText(artHeader, {
        x: marginLeft,
        y: cursorY,
        size: 10,
        font: fontBold,
        color: rgb(0.05, 0.05, 0.05),
      });
      cursorY -= 14;

      const wrappedContent = wrapText(art.content || "", fontRegular, 9.5, printableWidth - 12);
      for (const line of wrappedContent) {
        ensureSpace(14);
        currentPage.drawText(t(line), {
          x: marginLeft + 12,
          y: cursorY,
          size: 9.5,
          font: fontRegular,
          color: rgb(0.15, 0.15, 0.15),
        });
        cursorY -= 13;
      }
      cursorY -= 4;
    }

    // =========================================================================
    // 5. NƠI NHẬN & KHỐI KÝ SỐ / CON DẤU ĐIỆN TỬ
    // =========================================================================
    const recipientMaxWidth = width / 2 - marginLeft + 25;
    const wrappedRecipientLines: string[] = [];
    for (const r of doc.recipients || []) {
      const lines = wrapText(`- ${r}`, fontRegular, 8.5, recipientMaxWidth);
      wrappedRecipientLines.push(...lines);
    }

    const requiredBottomBlockHeight = Math.max(125, wrappedRecipientLines.length * 11 + 24);
    ensureSpace(requiredBottomBlockHeight);
    const bottomSectionY = cursorY - 10;

    // Cột bên trái: Nơi nhận
    currentPage.drawText(t("Nơi nhận:"), {
      x: marginLeft,
      y: bottomSectionY,
      size: 9.5,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    let recipientY = bottomSectionY - 12;
    for (const line of wrappedRecipientLines) {
      currentPage.drawText(t(line), {
        x: marginLeft,
        y: recipientY,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
      });
      recipientY -= 11;
    }

    // Cột bên phải: Chức vụ & Thẩm quyền ký
    const rightColX = width / 2 + 50;

    currentPage.drawText(t("TM. BAN GIÁM HIỆU"), {
      x: rightColX + 15,
      y: bottomSectionY,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    currentPage.drawText(t(doc.signAuthority || "HIỆU TRƯỞNG"), {
      x: rightColX + 30,
      y: bottomSectionY - 14,
      size: 10.5,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Vẽ Con dấu đỏ điện tử (Digital Institutional Seal)
    const sealCenterX = rightColX + 70;
    const sealCenterY = bottomSectionY - 55;

    // Vòng tròn dấu đỏ ngoài
    currentPage.drawCircle({
      x: sealCenterX,
      y: sealCenterY,
      size: 38,
      borderColor: rgb(0.85, 0.15, 0.15),
      borderWidth: 1.5,
    });
    // Vòng tròn dấu đỏ trong
    currentPage.drawCircle({
      x: sealCenterX,
      y: sealCenterY,
      size: 26,
      borderColor: rgb(0.85, 0.15, 0.15),
      borderWidth: 0.8,
    });
    // Chữ trong mộc dấu
    currentPage.drawText(t("ĐH KIẾN TRÚC"), {
      x: sealCenterX - 24,
      y: sealCenterY + 5,
      size: 7.5,
      font: fontBold,
      color: rgb(0.85, 0.15, 0.15),
    });
    currentPage.drawText(t("ĐÀ NẴNG"), {
      x: sealCenterX - 18,
      y: sealCenterY - 5,
      size: 8,
      font: fontBold,
      color: rgb(0.85, 0.15, 0.15),
    });

    // Tên người ký
    currentPage.drawText(t(doc.signerName || "GS.TS. Nguyễn Hiệu Trưởng"), {
      x: rightColX + 10,
      y: bottomSectionY - 105,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // =========================================================================
    // 6. NHÚNG MÃ QR CODE XÁC THỰC VĂN BẢN TRÊN TRANG ĐẦU
    // =========================================================================
    const verifyUrl =
      doc.verificationUrl ||
      `${(process.env.WEB_BASE_URL || "http://localhost:3000").replace(/\/+$/, "")}/verify/${encodeURIComponent(doc.resolutionNumber)}`;

    try {
      const qrPngBuffer = await this.generateQrBuffer(verifyUrl);
      const qrImage = await pdfDoc.embedPng(qrPngBuffer);

      // Đặt QR Code ở góc trên bên phải của trang đầu
      const qrX = width - 85;
      const qrY = height - 125;
      const qrSize = 50;

      page.drawImage(qrImage, {
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
      });

      page.drawText(t("Quét mã QR"), {
        x: qrX + 3,
        y: qrY - 8,
        size: 7,
        font: fontBold,
        color: rgb(0.3, 0.3, 0.3),
      });
      page.drawText(t("xác thực"), {
        x: qrX + 8,
        y: qrY - 16,
        size: 7,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      });
    } catch (err) {
      console.warn("[PdfExportService] Failed to embed QR Code:", err);
    }

    // =========================================================================
    // 7. FOOTER CHỨNG THƯ SỐ PKI TRÊN TẤT CẢ CÁC TRANG
    // =========================================================================
    if (doc.signature) {
      const sig = doc.signature;
      for (const p of pdfDoc.getPages()) {
        p.drawRectangle({
          x: marginLeft,
          y: 20,
          width: printableWidth,
          height: 24,
          color: rgb(0.96, 0.98, 0.96),
          borderColor: rgb(0.3, 0.7, 0.4),
          borderWidth: 0.8,
        });

        p.drawText(
          t(
            `✓ KÝ SỐ XÁC THỰC: ${sig.signerName} (${sig.signerPosition}) · Seri: ${sig.certificateSerial} · ${sig.signedAt.slice(0, 10)}`
          ),
          {
            x: marginLeft + 8,
            y: 28,
            size: 7.5,
            font: fontBold,
            color: rgb(0.1, 0.5, 0.2),
          }
        );
      }
    }

    return await pdfDoc.save();
  }
}
