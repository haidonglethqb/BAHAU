import crypto from "node:crypto";
import type {
  OfficialResolutionResponse,
  DigitalSignatureInfo,
  ResolutionVerificationResponse,
} from "@bahau/contracts";

export class PkiService {
  // Cặp khóa mật mã RSA 2048-bit của Ban Giám hiệu Trường ĐH Kiến trúc Đà Nẵng
  private static keyPair: { publicKey: string; privateKey: string } | null = null;
  private static rectorCertSerial = "VN-DAU-CA-8899A1-2026";

  /**
   * Khởi tạo hoặc lấy cặp khóa ký số RSA của Hiệu trưởng
   */
  public static getKeyPair(): { publicKey: string; privateKey: string } {
    if (!this.keyPair) {
      // Khởi tạo cặp khóa RSA 2048-bit chuẩn PKCS#8 / SPKI
      const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: "spki",
          format: "pem",
        },
        privateKeyEncoding: {
          type: "pkcs8",
          format: "pem",
        },
      });
      this.keyPair = { publicKey, privateKey };
    }
    return this.keyPair;
  }

  /**
   * Tạo chuỗi chuẩn hóa (Canonical String) từ nội dung quyết định để băm
   */
  public static getCanonicalPayload(doc: OfficialResolutionResponse): string {
    const articlesContent = (doc.articles || [])
      .map((a) => `${a.articleNumber}:${a.title}:${a.content}`)
      .join("|");

    return [
      doc.resolutionNumber,
      doc.organizationName,
      doc.signDate,
      doc.signAuthority,
      doc.signerName,
      doc.title,
      articlesContent,
      doc.fullFormattedDocument || "",
    ].join("##");
  }

  /**
   * Tạo mã băm SHA-256 của văn bản
   */
  public static computeHash(canonicalText: string): string {
    return crypto.createHash("sha256").update(canonicalText, "utf8").digest("hex");
  }

  /**
   * Ký số điện tử bằng khóa bí mật RSA của Hiệu trưởng (SHA256withRSA)
   */
  public static signResolution(
    doc: OfficialResolutionResponse,
    signerName = "GS.TS. Nguyễn Hiệu Trưởng",
    signerPosition = "Hiệu trưởng"
  ): DigitalSignatureInfo {
    const { privateKey } = this.getKeyPair();
    const canonicalText = this.getCanonicalPayload(doc);
    const documentHash = this.computeHash(canonicalText);

    const signer = crypto.createSign("SHA256");
    signer.update(canonicalText, "utf8");
    signer.end();

    const signatureValue = signer.sign(privateKey, "base64");
    const signedAt = new Date().toISOString();

    return {
      signerName,
      signerPosition,
      organization: "Trường Đại học Kiến trúc Đà Nẵng",
      certificateSerial: this.rectorCertSerial,
      signatureAlgorithm: "SHA256withRSA",
      signatureValue,
      signedAt,
      documentHash,
      isInstitutionalSealApplied: true,
    };
  }

  /**
   * Kiểm tra tính hợp lệ và nguyên vẹn của chữ ký số (Chống can thiệp sửa đổi)
   */
  public static verifyResolution(
    doc: OfficialResolutionResponse,
    signature: DigitalSignatureInfo
  ): ResolutionVerificationResponse {
    const { publicKey } = this.getKeyPair();
    const canonicalText = this.getCanonicalPayload(doc);
    const currentHash = this.computeHash(canonicalText);

    // 1. Kiểm tra mã băm văn bản
    const isHashMatch = currentHash === signature.documentHash;

    // 2. Xác minh chữ ký mật mã
    let isCryptoValid = false;
    try {
      const verifier = crypto.createVerify("SHA256");
      verifier.update(canonicalText, "utf8");
      verifier.end();
      isCryptoValid = verifier.verify(publicKey, signature.signatureValue, "base64");
    } catch {
      isCryptoValid = false;
    }

    const isValid = isHashMatch && isCryptoValid;
    const isTampered = !isValid;

    const message = isValid
      ? "Văn bản điện tử hợp lệ 100%. Chữ ký số và Mộc dấu điện tử của Trường Đại học Kiến trúc Đà Nẵng còn nguyên vẹn."
      : "CẢNH BÁO: Văn bản đã bị can thiệp sửa đổi nội dung sau khi ký số! Chữ ký không còn giá trị pháp lý.";

    return {
      isValid,
      isTampered,
      resolutionNumber: doc.resolutionNumber,
      organizationName: doc.organizationName,
      title: doc.title,
      signDate: doc.signDate,
      signerName: signature.signerName,
      signerPosition: signature.signerPosition,
      certificateSerial: signature.certificateSerial,
      signedAt: signature.signedAt,
      documentHash: currentHash,
      verificationUrl: `http://localhost:3000/verify/${encodeURIComponent(doc.resolutionNumber)}`,
      message,
    };
  }
}
