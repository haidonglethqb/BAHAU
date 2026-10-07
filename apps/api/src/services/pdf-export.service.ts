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

    // Lề chuẩn Nghị định 30
    const marginLeft = 72; // ~25mm
    const marginRight = width - 42; // ~15mm
    const printableWidth = marginRight - marginLeft;

    let cursorY = height - 56; // Cách mép trên 20mm

    // =========================================================================
    // 1. HEADER HAI CỘT THEO NGHỊ ĐỊNH 30
    // =========================================================================
    // Cột 1 (Bên trái): Cơ quan ban hành & Số hiệu
    page.drawText(t("BỘ GIÁO DỤC VÀ ĐÀO TẠO"), {
      x: marginLeft,
      y: cursorY,
      size: 10,
      font: fontRegular,
      color: rgb(0.2, 0.2, 0.2),
    });

    page.drawText(t("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"), {
      x: width / 2 - 10,
      y: cursorY,
      size: 10.5,
      font: fontBold,
      color: rgb(0.05, 0.05, 0.05),
    });

    cursorY -= 14;

    page.drawText(t("TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG"), {
      x: marginLeft,
      y: cursorY,
      size: 10,
      font: fontBold,
      color: rgb(0.05, 0.05, 0.05),
    });

    page.drawText(t("Độc lập - Tự do - Hạnh phúc"), {
      x: width / 2 + 30,
      y: cursorY,
      size: 10.5,
      font: fontBold,
      color: rgb(0.05, 0.05, 0.05),
    });

    cursorY -= 6;
    // Đường gạch chân tiêu ngữ
    page.drawLine({
      start: { x: width / 2 + 40, y: cursorY },
      end: { x: width / 2 + 160, y: cursorY },
      thickness: 1,
      color: rgb(0.2, 0.2, 0.2),
    });

    cursorY -= 12;

    page.drawText(t(`Số: ${doc.resolutionNumber}`), {
      x: marginLeft,
      y: cursorY,
      size: 10,
      font: fontRegular,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText(t(`Đà Nẵng, ngày ${doc.signDate || "15 tháng 10 năm 2026"}`), {
      x: width / 2 + 10,
      y: cursorY,
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    cursorY -= 28;

    // =========================================================================
    // 2. TIÊU ĐỀ QUYẾT ĐỊNH
    // =========================================================================
    const titleHeader = t("QUYẾT ĐỊNH");
    const titleWidth = fontBold.widthOfTextAtSize(titleHeader, 14);
    page.drawText(titleHeader, {
      x: (width - titleWidth) / 2,
      y: cursorY,
      size: 14,
      font: fontBold,
      color: rgb(0.8, 0.1, 0.1), // Đỏ đô trang trọng
    });

    cursorY -= 18;

    const subTitle = t(doc.title);
    const subTitleWidth = fontBold.widthOfTextAtSize(subTitle, 11);
    page.drawText(subTitle, {
      x: Math.max(marginLeft, (width - subTitleWidth) / 2),
      y: cursorY,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    cursorY -= 20;

    const authTitle = t("HIỆU TRƯỞNG TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG");
    const authWidth = fontBold.widthOfTextAtSize(authTitle, 11);
    page.drawText(authTitle, {
      x: (width - authWidth) / 2,
      y: cursorY,
      size: 11,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15),
    });

    cursorY -= 20;

    // =========================================================================
    // 3. CĂN CỨ PHÁP LÝ (LEGAL GROUNDS)
    // =========================================================================
    for (const ground of doc.legalGrounds || []) {
      const line = t(`- ${ground};`);
      page.drawText(line, {
        x: marginLeft,
        y: cursorY,
        size: 9.5,
        font: fontRegular,
        color: rgb(0.2, 0.2, 0.2),
      });
      cursorY -= 14;
    }

    cursorY -= 8;
    const decideWord = t("QUYẾT ĐỊNH:");
    const decideWidth = fontBold.widthOfTextAtSize(decideWord, 11);
    page.drawText(decideWord, {
      x: (width - decideWidth) / 2,
      y: cursorY,
      size: 11,
      font: fontBold,
      color: rgb(0.05, 0.05, 0.05),
    });

    cursorY -= 18;

    // =========================================================================
    // 4. CÁC ĐIỀU KHOẢN (ARTICLES)
    // =========================================================================
    for (const art of doc.articles || []) {
      const artHeader = t(`Điều ${art.articleNumber}. ${art.title}`);
      page.drawText(artHeader, {
        x: marginLeft,
        y: cursorY,
        size: 10,
        font: fontBold,
        color: rgb(0.05, 0.05, 0.05),
      });
      cursorY -= 14;

      // Wrap text nội dung
      const words = art.content.split(" ");
      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = fontRegular.widthOfTextAtSize(t(testLine), 9.5);
        if (testWidth > printableWidth) {
          page.drawText(t(currentLine), {
            x: marginLeft + 12,
            y: cursorY,
            size: 9.5,
            font: fontRegular,
            color: rgb(0.15, 0.15, 0.15),
          });
          cursorY -= 13;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        page.drawText(t(currentLine), {
          x: marginLeft + 12,
          y: cursorY,
          size: 9.5,
          font: fontRegular,
          color: rgb(0.15, 0.15, 0.15),
        });
        cursorY -= 16;
      }
    }

    // =========================================================================
    // 5. NƠI NHẬN & KHỐI KÝ SỐ / CON DẤU ĐIỆN TỬ
    // =========================================================================
    const bottomSectionY = Math.max(90, cursorY - 10);

    // Cột bên trái: Nơi nhận
    page.drawText(t("Nơi nhận:"), {
      x: marginLeft,
      y: bottomSectionY,
      size: 9.5,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    let recipientY = bottomSectionY - 12;
    for (const r of doc.recipients || []) {
      page.drawText(t(`- ${r}`), {
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

    page.drawText(t("TM. BAN GIÁM HIỆU"), {
      x: rightColX + 15,
      y: bottomSectionY,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText(t(doc.signAuthority || "HIỆU TRƯỞNG"), {
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
    page.drawCircle({
      x: sealCenterX,
      y: sealCenterY,
      size: 38,
      borderColor: rgb(0.85, 0.15, 0.15),
      borderWidth: 1.5,
    });
    // Vòng tròn dấu đỏ trong
    page.drawCircle({
      x: sealCenterX,
      y: sealCenterY,
      size: 26,
      borderColor: rgb(0.85, 0.15, 0.15),
      borderWidth: 0.8,
    });
    // Chữ trong mộc dấu
    page.drawText(t("ĐH KIẾN TRÚC"), {
      x: sealCenterX - 24,
      y: sealCenterY + 5,
      size: 7.5,
      font: fontBold,
      color: rgb(0.85, 0.15, 0.15),
    });
    page.drawText(t("ĐÀ NẴNG"), {
      x: sealCenterX - 18,
      y: sealCenterY - 5,
      size: 8,
      font: fontBold,
      color: rgb(0.85, 0.15, 0.15),
    });

    // Tên người ký
    page.drawText(t(doc.signerName || "GS.TS. Nguyễn Hiệu Trưởng"), {
      x: rightColX + 10,
      y: bottomSectionY - 105,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    // =========================================================================
    // 6. NHÚNG MÃ QR CODE XÁC THỰC VĂN BẢN (VERIFICATION QR CODE)
    // =========================================================================
    const verifyUrl =
      doc.verificationUrl ||
      `http://localhost:3000/verify/${encodeURIComponent(doc.resolutionNumber)}`;

    try {
      const qrPngBuffer = await this.generateQrBuffer(verifyUrl);
      const qrImage = await pdfDoc.embedPng(qrPngBuffer);

      // Đặt QR Code ở góc trên bên phải (cách mép phải 42pt, mép trên 140pt)
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
    // 7. FOOTER CHỨNG THƯ SỐ PKI
    // =========================================================================
    if (doc.signature) {
      const sig = doc.signature;
      page.drawRectangle({
        x: marginLeft,
        y: 20,
        width: printableWidth,
        height: 24,
        color: rgb(0.96, 0.98, 0.96),
        borderColor: rgb(0.3, 0.7, 0.4),
        borderWidth: 0.8,
      });

      page.drawText(
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

    return await pdfDoc.save();
  }
}
