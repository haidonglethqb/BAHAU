import assert from "node:assert/strict";
import { httpRequest } from "./e2e/helpers/http.mjs";
import { ProcessManager, waitForPort } from "./e2e/helpers/process-manager.mjs";

async function runTenureAcademicCouncilTests() {
  console.log("================================================================================");
  console.log("  BAHAU E2E & Integration Test: Academic Tenure & Rank Board (GS/PGS/GVC/GVCC)");
  console.log("================================================================================");

  const pm = new ProcessManager();
  const testPort = "4031";

  try {
    const entry = pm.spawn("api-tenure-academic-test", "npm", ["run", "dev", "--workspace=apps/api"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: testPort, NODE_ENV: "test" },
    });

    console.log(`\n[BOOT] Waiting for API server on port ${testPort}...`);
    const ready = await waitForPort(Number(testPort), "127.0.0.1", 15000, entry);
    assert.ok(ready, `API server must boot on port ${testPort} within 15s`);
    console.log(`[BOOT] API server ready on http://127.0.0.1:${testPort}`);

    // --------------------------------------------------------------------------
    // TEST 1: Authentication enforcement on Tenure endpoints (401 UNAUTHENTICATED)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-TENURE-01: Authentication enforcement on Tenure endpoints (401)...");
    const endpoints401 = [
      { method: "GET", path: "/api/v1/tenure/applications" },
      { method: "GET", path: "/api/v1/tenure/applications/tenure-dau-001" },
      { method: "POST", path: "/api/v1/tenure/applications" },
      { method: "POST", path: "/api/v1/tenure/applications/tenure-dau-001/vote" },
      { method: "POST", path: "/api/v1/tenure/applications/tenure-dau-001/appoint" },
      { method: "GET", path: "/api/v1/tenure/applications/tenure-dau-001/resolution/pdf" },
    ];

    for (const ep of endpoints401) {
      const res = await httpRequest(`http://127.0.0.1:${testPort}${ep.path}`, ep.method);
      assert.strictEqual(res.status, 401, `${ep.path} must reject unauthenticated request with 401`);
      assert.strictEqual(res.bodyJson?.success, false);
      assert.strictEqual(res.bodyJson?.error?.code, "UNAUTHENTICATED");
    }
    console.log("   ✓ Verified 6/6 tenure endpoints strictly enforce 401 UNAUTHENTICATED");

    // --------------------------------------------------------------------------
    // TEST 2: Scientific & Architectural Work Point Conversion Logic
    // --------------------------------------------------------------------------
    console.log("\n-> TC-TENURE-02: Scientific & Architectural work point conversion logic...");
    const { TenureService } = await import("../apps/api/dist/services/tenure.service.js");

    const scopusLead = TenureService.calculateWorkScore({
      workType: "SCOPUS_WOS_PAPER",
      title: "Sustainable Architecture",
      publishedYear: 2024,
      role: "MAIN_AUTHOR",
      convertedScore: 0,
    });
    const scopusCo = TenureService.calculateWorkScore({
      workType: "SCOPUS_WOS_PAPER",
      title: "Sustainable Architecture",
      publishedYear: 2024,
      role: "CO_AUTHOR",
      convertedScore: 0,
    });
    const archAwardLead = TenureService.calculateWorkScore({
      workType: "ARCHITECTURAL_AWARD",
      title: "National Architecture Silver Award",
      publishedYear: 2023,
      role: "PRINCIPAL_DESIGNER",
      convertedScore: 0,
    });
    const builtProject = TenureService.calculateWorkScore({
      workType: "BUILT_PROJECT",
      title: "Public Library Building",
      publishedYear: 2022,
      role: "PRINCIPAL_DESIGNER",
      convertedScore: 0,
    });
    const isbnBook = TenureService.calculateWorkScore({
      workType: "BOOK_ISBN",
      title: "Urban Design Textbook",
      publishedYear: 2024,
      role: "MAIN_AUTHOR",
      convertedScore: 0,
    });

    assert.strictEqual(scopusLead, 3.0, "Main author Scopus article must convert to 3.0 points");
    assert.strictEqual(scopusCo, 2.0, "Co-author Scopus article must convert to 2.0 points");
    assert.strictEqual(archAwardLead, 3.0, "Principal designer national architecture award must convert to 3.0 points");
    assert.strictEqual(builtProject, 2.0, "Principal designer built project must convert to 2.0 points");
    assert.strictEqual(isbnBook, 2.0, "ISBN Textbook must convert to 2.0 points");

    console.log(`   ✓ ISI/Scopus Lead Author: ${scopusLead}đ | Co-Author: ${scopusCo}đ`);
    console.log(`   ✓ National Architecture Award Lead: ${archAwardLead}đ`);
    console.log(`   ✓ Built Architecture Project: ${builtProject}đ | ISBN Book: ${isbnBook}đ`);
    console.log("   ✓ Architectural practice equivalency successfully validated");

    // --------------------------------------------------------------------------
    // TEST 3: Legal Criteria Threshold Validation (QĐ 37/2018 & TT 40/2020)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-TENURE-03: Legal criteria threshold validation...");
    const profScoreReq = TenureService.getRequiredScore("PROFESSOR", "SENIOR_LECTURER");
    const assocProfScoreReq = TenureService.getRequiredScore("ASSOCIATE_PROFESSOR", "SENIOR_LECTURER");
    const seniorLecturerReq = TenureService.getRequiredScore("NONE", "SENIOR_LECTURER");
    const principalLecturerReq = TenureService.getRequiredScore("NONE", "PRINCIPAL_LECTURER");

    assert.strictEqual(profScoreReq, 20.0, "Professor (GS) required score must be 20.0đ");
    assert.strictEqual(assocProfScoreReq, 10.0, "Associate Professor (PGS) required score must be 10.0đ");
    assert.strictEqual(seniorLecturerReq, 6.0, "Senior Lecturer (GVCC - Hạng I) required score must be 6.0đ");
    assert.strictEqual(principalLecturerReq, 4.0, "Principal Lecturer (GVC - Hạng II) required score must be 4.0đ");

    console.log(`   ✓ Professor (GS) benchmark: ${profScoreReq}đ`);
    console.log(`   ✓ Associate Professor (PGS) benchmark: ${assocProfScoreReq}đ`);
    console.log(`   ✓ Senior Lecturer (Hạng I) benchmark: ${seniorLecturerReq}đ`);
    console.log(`   ✓ Principal Lecturer (Hạng II) benchmark: ${principalLecturerReq}đ`);

    // --------------------------------------------------------------------------
    // TEST 4: Council Voting Guardrail Enforcement (>= 2/3 Threshold Check)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-TENURE-04: Council Voting Guardrail Enforcement (>= 2/3 or 66.7%)...");

    // Test Case 4A: Đạt ngưỡng biểu quyết (10/15 phiếu = 66.7% >= 66.67%)
    const passVoteApp = await TenureService.recordTenureCouncilVote(
      "tenure-dau-002",
      {
        votesYes: 10,
        totalVoters: 15,
        foreignLanguagePass: true,
        councilNotes: "Hội đồng thông qua với tỷ lệ 10/15 phiếu (66.7%).",
      },
      { id: "usr-council" }
    );
    assert.strictEqual(passVoteApp.councilVote?.approvalRatio, 66.7);
    assert.strictEqual(passVoteApp.councilVote?.isPassed, true);
    assert.strictEqual(passVoteApp.status, "VOTED");
    console.log(`   ✓ Passed vote: 10/15 votes (${passVoteApp.councilVote?.approvalRatio}%) -> Status: VOTED`);

    // Test Case 4B: Không đạt ngưỡng (9/15 phiếu = 60.0% < 66.7%) -> REJECTED
    const failVoteApp = await TenureService.recordTenureCouncilVote(
      "tenure-dau-003",
      {
        votesYes: 9,
        totalVoters: 15,
        foreignLanguagePass: true,
        councilNotes: "Không đủ 2/3 số phiếu tán thành của Hội đồng.",
      },
      { id: "usr-council" }
    );
    assert.strictEqual(failVoteApp.councilVote?.approvalRatio, 60.0);
    assert.strictEqual(failVoteApp.councilVote?.isPassed, false);
    assert.strictEqual(failVoteApp.status, "REJECTED");
    console.log(`   ✓ Failed vote: 9/15 votes (${failVoteApp.councilVote?.approvalRatio}%) -> Status: REJECTED (Guardrail enforced)`);

    // --------------------------------------------------------------------------
    // TEST 5: Rector PKI RSA-2048 Appointment Decision
    // --------------------------------------------------------------------------
    console.log("\n-> TC-TENURE-05: Rector PKI RSA-2048 Appointment Decision...");

    // 5A: Không được phép bổ nhiệm hồ sơ bị REJECTED
    await assert.rejects(
      async () => {
        await TenureService.appointWithPki(
          "tenure-dau-003", // Already REJECTED in TC-4B
          { signerName: "GS.TS. Nguyễn Hiệu Trưởng" },
          { id: "usr-rector" }
        );
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, "COUNCIL_NOT_PASSED");
        return true;
      },
      "Must reject appointment of application not passed by Council"
    );
    console.log("   ✓ Rejected illegal appointment attempt on failed candidate");

    // 5B: Ký số PKI bổ nhiệm thành công cho ứng viên đã đạt biểu quyết (tenure-dau-001)
    const appointedApp = await TenureService.appointWithPki(
      "tenure-dau-001",
      {
        signerName: "GS.TS. Nguyễn Hiệu Trưởng",
        resolutionNumber: "105/QĐ-ĐHKTĐN",
        newSalaryCoeff: 7.10, // Nâng bậc từ 6.78
      },
      { id: "usr-rector" }
    );

    assert.strictEqual(appointedApp.status, "APPOINTED");
    assert.strictEqual(appointedApp.appointmentResolutionNumber, "105/QĐ-ĐHKTĐN");
    assert.strictEqual(appointedApp.appointedSalaryCoeff, 7.10);
    assert.ok(appointedApp.pkiSignature, "PKI RSA-2048 cryptographic signature must be generated");
    assert.ok(appointedApp.pkiSignedAt, "Signed timestamp must be recorded");
    console.log(`   ✓ Rector PKI Signature generated: ${appointedApp.pkiSignature.slice(0, 32)}...`);
    console.log(`   ✓ Resolution issued: ${appointedApp.appointmentResolutionNumber} (New Salary: ${appointedApp.appointedSalaryCoeff})`);

    // --------------------------------------------------------------------------
    // TEST 6: Decree 30 / 2020 PDF Generation & Digital Seal
    // --------------------------------------------------------------------------
    console.log("\n-> TC-TENURE-06: Decree 30/2020/NĐ-CP PDF Resolution generation & Digital Seal...");
    const pdfBytes = await TenureService.exportAppointmentResolutionPdf("tenure-dau-001");
    assert.ok(pdfBytes instanceof Uint8Array, "PDF export must return Uint8Array");
    assert.ok(pdfBytes.length > 3000, "PDF buffer must have valid content (>3KB)");

    // Check %PDF magic bytes
    const pdfMagic = String.fromCharCode(pdfBytes[0], pdfBytes[1], pdfBytes[2], pdfBytes[3]);
    assert.strictEqual(pdfMagic, "%PDF", "PDF document must have %PDF header");
    console.log(`   ✓ Appointment Resolution PDF generated (${pdfBytes.length} bytes, Magic: %PDF)`);

    // --------------------------------------------------------------------------
    // TEST 7: Auto-coupling with Payroll & Workload Engines
    // --------------------------------------------------------------------------
    console.log("\n-> TC-TENURE-07: Auto-coupling with Payroll & Workload Engines...");
    const { PayrollService, DEFAULT_FACULTY_MEMBERS } = await import("../apps/api/dist/services/payroll.service.js");
    const { WorkloadService } = await import("../apps/api/dist/services/workload.service.js");

    // 7A: Verify Payroll updated
    const updatedFaculty = DEFAULT_FACULTY_MEMBERS.find((f) => f.employeeId === "DAU260001-ID");
    assert.strictEqual(updatedFaculty?.salaryCoefficient, 7.10, "Faculty salary coefficient in PayrollService must be updated to 7.10");
    assert.strictEqual(updatedFaculty?.academicTitle, "PROFESSOR", "Academic title must be updated to PROFESSOR");
    console.log(`   ✓ Payroll synced: Salary Coefficient = ${updatedFaculty?.salaryCoefficient}, Title = ${updatedFaculty?.academicTitle}`);

    // 7B: Verify Workload quota adjusted for senior lecturer / professor
    const quotaInfo = WorkloadService.calculateBaseQuotaAndReduction({
      id: "DAU260001-ID",
      employeeCode: "DAU260001",
      academicTitle: "PROFESSOR",
      careerClass: "SENIOR_LECTURER",
    });

    assert.strictEqual(quotaInfo.baseTeachingQuota, 216, "Promoted Prof/Senior Lecturer base teaching quota must be reduced to 216h (from 270h)");
    assert.strictEqual(quotaInfo.baseResearchQuota, 700, "Promoted Prof base research quota must be 700h");
    assert.strictEqual(quotaInfo.hourlyRate, 200000, "Promoted Prof/Senior Lecturer hourly rate must be 200.000đ/h (from 160.000đ/h)");

    console.log(`   ✓ Workload synced: Teaching quota reduced to ${quotaInfo.baseTeachingQuota}h/year`);
    console.log(`   ✓ Overtime compensation rate increased to ${quotaInfo.hourlyRate.toLocaleString("vi-VN")}đ/h`);

    console.log("\n================================================================================");
    console.log("  🎉 ALL 7 ACADEMIC TENURE & RANK BOARD TEST CASES PASSED 100%!");
    console.log("================================================================================\n");
  } finally {
    await pm.stopAll();
  }
}

runTenureAcademicCouncilTests().catch((err) => {
  console.error("\n❌ Academic Tenure Test Suite Failed:\n", err);
  process.exit(1);
});
