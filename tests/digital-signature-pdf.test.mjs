import assert from "node:assert/strict";
import { httpRequest } from "./e2e/helpers/http.mjs";
import { ProcessManager, waitForPort } from "./e2e/helpers/process-manager.mjs";

async function runDigitalSignaturePdfTests() {
  console.log("================================================================================");
  console.log("  BAHAU Integration Test: Digital PKI Signatures, Decree 30 PDF & QR Verification");
  console.log("================================================================================");

  const pm = new ProcessManager();
  const testPort = "4018";

  try {
    const entry = pm.spawn("api-pki-test", "npm", ["run", "dev", "--workspace=apps/api"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: testPort, NODE_ENV: "test" },
    });

    console.log(`\n[BOOT] Waiting for API server on port ${testPort}...`);
    const ready = await waitForPort(Number(testPort), "127.0.0.1", 15000, entry);
    assert.ok(ready, `API server must boot on port ${testPort} within 15s`);
    console.log(`[BOOT] API server ready on http://127.0.0.1:${testPort}`);

    // --------------------------------------------------------------------------
    // TEST 1: HTTP Authentication enforcement & Public Endpoint access
    // --------------------------------------------------------------------------
    console.log("\n-> TC-PKI-01: Authentication enforcement & Public verification access...");
    
    // Signing & PDF export require authentication
    const signResUnauth = await httpRequest(
      `http://127.0.0.1:${testPort}/api/v1/executive/sign-resolution`,
      "POST",
      {},
      { resolutionNumber: "TEST-01" }
    );
    assert.strictEqual(signResUnauth.status, 401, "sign-resolution must return 401 without auth");
    assert.strictEqual(signResUnauth.bodyJson?.error?.code, "UNAUTHENTICATED");

    const pdfResUnauth = await httpRequest(
      `http://127.0.0.1:${testPort}/api/v1/executive/export-pdf`,
      "POST",
      {},
      { resolutionNumber: "TEST-01" }
    );
    assert.strictEqual(pdfResUnauth.status, 401, "export-pdf must return 401 without auth");
    assert.strictEqual(pdfResUnauth.bodyJson?.error?.code, "UNAUTHENTICATED");

    // Public verification endpoint does NOT require auth (returns 404 for unknown, NOT 401)
    const verifyUnauth = await httpRequest(
      `http://127.0.0.1:${testPort}/api/v1/executive/verify/NON-EXISTENT-NUM`,
      "GET"
    );
    assert.strictEqual(
      verifyUnauth.status,
      404,
      "Public verify endpoint must be accessible without auth (returning 404 for unknown, NOT 401)"
    );
    console.log("   ✓ Verified auth guard: signing/exporting protected (401), verification portal public (accessible)");

    // --------------------------------------------------------------------------
    // TEST 2: Executive Resolution Generation Engine
    // --------------------------------------------------------------------------
    console.log("\n-> TC-PKI-02: Generating official resolution draft (Decree 30)...");
    const { ExecutiveService } = await import("../apps/api/dist/services/executive.service.js");
    const { PkiService } = await import("../apps/api/dist/services/pki.service.js");
    const { PdfExportService } = await import("../apps/api/dist/services/pdf-export.service.js");

    const resolutionDraft = ExecutiveService.generateOfficialResolution({
      type: "SALARY_PROMOTION",
      recipientName: "ThS. Nguyễn Văn An",
      recipientCode: "DAU260003",
      unitName: "Khoa Kiến trúc",
      contentTitle: "Nâng bậc lương từ bậc 5 (hệ số 4.98) lên bậc 6 (hệ số 5.31)",
    });

    assert.ok(resolutionDraft.resolutionNumber.includes("/QĐ-ĐHKTĐN"));
    assert.strictEqual(resolutionDraft.organizationName, "TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG");
    assert.strictEqual(resolutionDraft.signerName, "GS.TS. Nguyễn Hiệu Trưởng");
    assert.ok(Array.isArray(resolutionDraft.articles) && resolutionDraft.articles.length >= 3);
    assert.ok(resolutionDraft.fullFormattedDocument.includes("QUYẾT ĐỊNH"));
    console.log(`   ✓ Resolution draft created: ${resolutionDraft.resolutionNumber}`);

    // --------------------------------------------------------------------------
    // TEST 3: Cryptographic Digital Signing with PKI Engine (RSA-2048 / SHA-256)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-PKI-03: Digitally signing resolution via SmartCA PKI Engine...");
    const signedResolution = await ExecutiveService.signResolution(resolutionDraft);

    assert.ok(signedResolution.signature, "Must contain signature object");
    assert.strictEqual(signedResolution.signature.signerName, "GS.TS. Nguyễn Hiệu Trưởng");
    assert.strictEqual(signedResolution.signature.signerPosition, "Hiệu trưởng");
    assert.strictEqual(signedResolution.signature.signatureAlgorithm, "SHA256withRSA");
    assert.ok(signedResolution.signature.certificateSerial.includes("DAU-CA-"));
    assert.strictEqual(signedResolution.signature.documentHash.length, 64, "Document hash must be 64-char SHA-256 hex");
    assert.ok(signedResolution.signature.signatureValue.length > 50, "Signature value must be non-empty base64 string");
    assert.ok(signedResolution.verificationUrl.includes(`/verify/${encodeURIComponent(signedResolution.resolutionNumber)}`));
    assert.ok(signedResolution.qrCodeDataUrl.startsWith("data:image/png;base64,"));
    console.log("   ✓ Cryptographic signature generated:");
    console.log(`     - Digest: SHA-256 (${signedResolution.signature.documentHash})`);
    console.log(`     - Algorithm: ${signedResolution.signature.signatureAlgorithm}`);
    console.log(`     - Serial: ${signedResolution.signature.certificateSerial}`);
    console.log(`     - QR Code: Generated base64 data URL (${signedResolution.qrCodeDataUrl.length} chars)`);

    // --------------------------------------------------------------------------
    // TEST 4: Integrity Verification & Tamper Detection
    // --------------------------------------------------------------------------
    console.log("\n-> TC-PKI-04: Verifying document integrity & Tamper resistance...");
    
    // 4.1 Valid Document Verification
    const validVerify = ExecutiveService.verifyResolutionByNumber(signedResolution.resolutionNumber);
    assert.strictEqual(validVerify.isValid, true, "Untampered document must be valid");
    assert.strictEqual(validVerify.isTampered, false, "Untampered document must NOT be flagged as tampered");
    assert.strictEqual(validVerify.resolutionNumber, signedResolution.resolutionNumber);
    assert.strictEqual(validVerify.documentHash, signedResolution.signature.documentHash);
    console.log("   ✓ Valid document passed 100% cryptographic verification");

    // 4.2 Tamper Detection: Changing content invalidates cryptographic signature
    const tamperedDoc = {
      ...signedResolution,
      fullFormattedDocument: signedResolution.fullFormattedDocument + "\n[NỘI DUNG BỊ GIẢ MẠO]",
    };
    const tamperedVerify = PkiService.verifyResolution(tamperedDoc, signedResolution.signature);
    assert.strictEqual(tamperedVerify.isValid, false, "Tampered document must fail verification");
    assert.strictEqual(tamperedVerify.isTampered, true, "Tampered document must be detected");
    console.log("   ✓ Tamper detection confirmed: modified document hash mismatch correctly detected");

    // --------------------------------------------------------------------------
    // TEST 5: Public QR Code Data Generation
    // --------------------------------------------------------------------------
    console.log("\n-> TC-PKI-05: Generating High-Resolution QR Codes for mobile scan...");
    const sampleUrl = `https://dau.edu.vn/verify/${encodeURIComponent(signedResolution.resolutionNumber)}`;
    const qrBuffer = await PdfExportService.generateQrBuffer(sampleUrl);
    assert.ok(Buffer.isBuffer(qrBuffer), "Must return Buffer");
    assert.ok(qrBuffer.length > 500, "QR buffer must be > 500 bytes");
    // Verify PNG header (0x89 0x50 0x4E 0x47)
    assert.strictEqual(qrBuffer[0], 0x89);
    assert.strictEqual(qrBuffer[1], 0x50);
    assert.strictEqual(qrBuffer[2], 0x4E);
    assert.strictEqual(qrBuffer[3], 0x47);
    console.log(`   ✓ QR Code buffer generated with valid PNG signature (${qrBuffer.length} bytes)`);

    // --------------------------------------------------------------------------
    // TEST 6: Decree 30/2020/NĐ-CP PDF Generation
    // --------------------------------------------------------------------------
    console.log("\n-> TC-PKI-06: Exporting official Decree 30 PDF with digital seal & QR code...");
    const pdfBytes = await ExecutiveService.exportResolutionPdf(signedResolution);
    assert.ok(pdfBytes instanceof Uint8Array, "Must return Uint8Array");
    assert.ok(
      pdfBytes.length > 5000,
      `PDF binary size must be > 5KB (embedded seal + QR + fonts), got ${pdfBytes.length} bytes`
    );

    // Verify PDF Magic Bytes (%PDF-)
    const magic = Buffer.from(pdfBytes.subarray(0, 4)).toString("ascii");
    assert.strictEqual(magic, "%PDF", "Exported binary must begin with '%PDF' magic header");
    console.log(`   ✓ Valid PDF document generated (${pdfBytes.length} bytes, Magic: %PDF)`);

    console.log("\n================================================================================");
    console.log("  🎉 ALL DIGITAL SIGNATURE & DECREE 30 PDF TESTS PASSED (6/6 TC)!");
    console.log("================================================================================\n");
  } finally {
    await pm.stopAll();
  }
}

runDigitalSignaturePdfTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
