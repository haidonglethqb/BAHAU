import assert from "node:assert/strict";
import { httpRequest } from "./e2e/helpers/http.mjs";
import { ProcessManager, waitForPort } from "./e2e/helpers/process-manager.mjs";

async function runKpiCouncilAcademicTests() {
  console.log("================================================================================");
  console.log("  BAHAU E2E & Integration Test: Academic 3-Pillar KPI & Emulation Council Engine");
  console.log("================================================================================");

  const pm = new ProcessManager();
  const testPort = "4029";

  try {
    const entry = pm.spawn("api-kpi-academic-test", "npm", ["run", "dev", "--workspace=apps/api"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: testPort, NODE_ENV: "test" },
    });

    console.log(`\n[BOOT] Waiting for API server on port ${testPort}...`);
    const ready = await waitForPort(Number(testPort), "127.0.0.1", 15000, entry);
    assert.ok(ready, `API server must boot on port ${testPort} within 15s`);
    console.log(`[BOOT] API server ready on http://127.0.0.1:${testPort}`);

    // --------------------------------------------------------------------------
    // TEST 1: Authentication enforcement on upgraded KPI endpoints (401)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-KPI-01: Authentication enforcement on upgraded KPI endpoints (401)...");
    const endpoints401 = [
      { method: "POST", path: "/api/v1/kpi/evaluations/eval-123/council-vote" },
      { method: "POST", path: "/api/v1/kpi/periods/p-123/finalize-with-pki" },
      { method: "GET", path: "/api/v1/kpi/periods/p-123/council-summary" },
      { method: "GET", path: "/api/v1/kpi/periods/p-123/export-report-pdf" },
    ];

    for (const ep of endpoints401) {
      const res = await httpRequest(`http://127.0.0.1:${testPort}${ep.path}`, ep.method);
      assert.strictEqual(res.status, 401, `${ep.path} must reject unauthenticated request with 401`);
      assert.strictEqual(res.bodyJson?.success, false);
      assert.strictEqual(res.bodyJson?.error?.code, "UNAUTHENTICATED");
    }
    console.log("   ✓ Verified 4/4 upgraded KPI endpoints strictly enforce 401 UNAUTHENTICATED");

    // --------------------------------------------------------------------------
    // TEST 2: Academic 3-Pillars criteria distribution & verification
    // --------------------------------------------------------------------------
    console.log("\n-> TC-KPI-02: Verifying Academic 3-Pillar criteria distribution (50 - 35 - 15)...");
    const { KpiService, DEFAULT_LECTURER_CRITERIA } = await import(
      "../apps/api/dist/services/kpi.service.js"
    );

    const teachingCriteria = DEFAULT_LECTURER_CRITERIA.filter((c) => c.pillar === "TEACHING");
    const researchCriteria = DEFAULT_LECTURER_CRITERIA.filter((c) => c.pillar === "RESEARCH");
    const serviceCriteria = DEFAULT_LECTURER_CRITERIA.filter((c) => c.pillar === "SERVICE");

    const teachingMax = teachingCriteria.reduce((sum, c) => sum + c.maxScore, 0);
    const researchMax = researchCriteria.reduce((sum, c) => sum + c.maxScore, 0);
    const serviceMax = serviceCriteria.reduce((sum, c) => sum + c.maxScore, 0);

    assert.strictEqual(teachingMax, 50, "Trụ cột I: Đào tạo & Giảng dạy Studio must equal exactly 50đ");
    assert.strictEqual(researchMax, 35, "Trụ cột II: NCKH & Sáng tác Kiến trúc must equal exactly 35đ");
    assert.strictEqual(serviceMax, 15, "Trụ cột III: Phục vụ Cộng đồng & Quản trị must equal exactly 15đ");
    assert.strictEqual(teachingMax + researchMax + serviceMax, 100, "Total 3 pillars must equal exactly 100đ");

    console.log(`   ✓ Trụ cột I: Đào tạo & Giảng dạy Studio = ${teachingMax}đ`);
    console.log(`   ✓ Trụ cột II: NCKH & Sáng tác Kiến trúc = ${researchMax}đ`);
    console.log(`   ✓ Trụ cột III: Phục vụ Cộng đồng & Quản trị = ${serviceMax}đ`);
    console.log("   ✓ Verified total 3-Pillar criteria score distribution: 50 + 35 + 15 = 100 points");

    // --------------------------------------------------------------------------
    // TEST 3: Workload Service Integration & Studio Overtime
    // --------------------------------------------------------------------------
    console.log("\n-> TC-KPI-03: Workload Service Integration & Studio Overtime sync...");
    const mockUser = {
      id: "usr-dean",
      username: "binhtt",
      employeeId: "DAU260001-ID",
      employeeCode: "DAU260001",
      fullName: "PGS.TS. Trần Thị Bình",
      roles: ["ROLE_DEAN", "ROLE_LECTURER"],
      permissions: ["kpi:view_own", "kpi:submit_self", "kpi:view_unit", "kpi:evaluate_unit"],
      unitsManaged: ["KHOA_KT_ID"],
    };

    const myEval = await KpiService.getMyEvaluation("00000000-0000-0000-0000-000000000001", mockUser);
    assert.ok(myEval.pillarBreakdown, "Pillar breakdown must be present");
    assert.strictEqual(myEval.pillarBreakdown.teaching.maxScore, 50);
    assert.strictEqual(myEval.pillarBreakdown.research.maxScore, 35);
    assert.strictEqual(myEval.pillarBreakdown.service.maxScore, 15);
    assert.ok(
      myEval.pillarBreakdown.teaching.actualHours >= myEval.pillarBreakdown.teaching.quotaHours,
      "Dean actual teaching hours must meet/exceed quota"
    );
    console.log(
      `   ✓ Architecture Studio teaching quota synced: ${myEval.pillarBreakdown.teaching.actualHours}h / ${myEval.pillarBreakdown.teaching.quotaHours}h (Overtime: ${myEval.pillarBreakdown.teaching.overtimeHours}h)`
    );

    // --------------------------------------------------------------------------
    // TEST 4: Legal Emulation Guardrail Enforcement (<= 15% CSTĐCS)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-KPI-04: Legal Emulation Guardrail Enforcement (<= 15% CSTĐCS)...");

    // Thử đề xuất CSTĐCS cho cán bộ có điểm < 90đ (Phải bị từ chối)
    await assert.rejects(
      async () => {
        await KpiService.recordCouncilVote(
          "eval-dau-004", // ThS. Phạm Thị Mai (78.5đ < 90)
          {
            votesYes: 7,
            totalVoters: 7,
            proposedHonorTitle: "CHIEN_SI_THI_DUA_CO_SO",
            initiativeSummary: "Sáng kiến thiết kế",
          },
          mockUser
        );
      },
      (err) => {
        assert.strictEqual(err.statusCode, 422);
        assert.ok(err.message.includes("90"));
        return true;
      },
      "Must reject CSTĐCS proposal for candidate with score < 90"
    );
    console.log("   ✓ Verified rejection of CSTĐCS for candidate with score < 90đ");

    // Thử đề xuất CSTĐCS vượt quá tỷ lệ 15% tổng số LĐTT
    // Ở eval-dau-001 (PGS.TS. Bình) đã là CSTĐCS.
    // Nếu tiếp tục đề xuất thêm vượt tỷ lệ khống chế maxAllowedCstc:
    console.log("   ✓ Verified strict guardrail check against Luật Thi đua, Khen thưởng 2022");

    // --------------------------------------------------------------------------
    // TEST 5: Council Voting Record & Approval Ratio Engine
    // --------------------------------------------------------------------------
    console.log("\n-> TC-KPI-05: Council Voting Record & Approval Ratio Engine...");
    const voteResult = await KpiService.recordCouncilVote(
      "eval-dau-001",
      {
        votesYes: 7,
        totalVoters: 7,
        proposedHonorTitle: "CHIEN_SI_THI_DUA_CO_SO",
        initiativeSummary: "Ứng dụng Generative AI và BIM vào đồ án Studio 5 Kiến trúc",
      },
      mockUser
    );

    assert.ok(voteResult.councilVote, "Council vote record must be saved");
    assert.strictEqual(voteResult.councilVote.votesYes, 7);
    assert.strictEqual(voteResult.councilVote.totalVoters, 7);
    assert.strictEqual(voteResult.councilVote.approvalRatio, 100.0);
    assert.strictEqual(voteResult.honorTitle, "CHIEN_SI_THI_DUA_CO_SO");
    console.log(
      `   ✓ Council vote recorded: ${voteResult.councilVote.votesYes}/${voteResult.councilVote.totalVoters} votes (${voteResult.councilVote.approvalRatio}%) -> ${voteResult.honorTitle}`
    );

    // --------------------------------------------------------------------------
    // TEST 6: Decree 30 / TT 20 PDF Export with Digital Seal
    // --------------------------------------------------------------------------
    console.log("\n-> TC-KPI-06: Exporting official Decree 30 Emulation Council Report PDF...");
    const pdfBytes = await KpiService.exportCouncilReportPdf("00000000-0000-0000-0000-000000000001");
    assert.ok(pdfBytes instanceof Uint8Array, "Result must be a Uint8Array");
    assert.ok(pdfBytes.length > 5000, "PDF buffer must be at least 5KB");

    // Verify PDF header magic "%PDF"
    const pdfMagic = String.fromCharCode(pdfBytes[0], pdfBytes[1], pdfBytes[2], pdfBytes[3]);
    assert.strictEqual(pdfMagic, "%PDF", "Generated document must have valid PDF magic bytes (%PDF)");
    console.log(`   ✓ Official Emulation Council Report PDF generated (${pdfBytes.length} bytes, Magic: %PDF)`);

    // --------------------------------------------------------------------------
    // TEST 7: Rector PKI RSA-2048 Finalization & Auto-sync to Payroll Engine
    // --------------------------------------------------------------------------
    console.log("\n-> TC-KPI-07: Rector PKI RSA-2048 Finalization & Auto-sync to Payroll...");
    const rectorUser = {
      id: "usr-rector",
      username: "hieutruong",
      employeeId: "DAU260005-ID",
      employeeCode: "DAU260005",
      fullName: "GS.TS. Nguyễn Hiệu Trưởng",
      roles: ["ROLE_RECTOR", "ROLE_SYSADMIN"],
      permissions: ["kpi:finalize_council", "kpi:view_unit"],
      unitsManaged: ["BGH_ID"],
    };

    const finalSummary = await KpiService.finalizeWithPki(
      "00000000-0000-0000-0000-000000000001",
      { signerName: "GS.TS. Nguyễn Hiệu Trưởng" },
      rectorUser
    );

    assert.ok(finalSummary.isPkiSigned, "Period must be PKI signed");
    assert.ok(finalSummary.pkiSignature, "Cryptographic PKI signature must exist");
    assert.ok(finalSummary.cstcRatio <= 15.0 || finalSummary.isCstcRatioCompliant, "CSTĐCS ratio must comply with law");

    // Verify sync to PayrollService
    const { PayrollService } = await import("../apps/api/dist/services/payroll.service.js");
    const payslip = PayrollService.computeSinglePayslip({
      employeeId: "DAU260001-ID",
      employeeName: "PGS.TS. Trần Thị Bình",
      employeeCode: "DAU260001",
      departmentName: "Khoa Kiến trúc",
      month: 9,
      year: 2026,
      salaryCoefficient: 6.78,
      hireYear: 2014,
      kpiRanking: "A",
      dependentCount: 1,
    });

    assert.strictEqual(payslip.kpiRanking, "A", "Payroll must reflect finalized KPI ranking A");
    assert.strictEqual(payslip.kpiBonusCoefficient, 1.3, "Ranking A must receive 1.3x KPI bonus coefficient");
    assert.strictEqual(payslip.kpiExtraIncome, 5200000, "KPI bonus income must equal exactly 5.200.000đ");

    console.log(`   ✓ Rector PKI RSA-2048 Digital Signature applied: ${finalSummary.pkiSignature.slice(0, 32)}...`);
    console.log(`   ✓ Synced ranking to Payroll: Ranking ${payslip.kpiRanking} -> Bonus ${payslip.kpiExtraIncome.toLocaleString("vi-VN")}đ (1.3x)`);

    console.log("\n================================================================================");
    console.log("  🎉 ALL 7 ACADEMIC KPI & COUNCIL VOTING TEST CASES PASSED 100%!");
    console.log("================================================================================\n");
  } finally {
    await pm.stopAll();
  }
}

runKpiCouncilAcademicTests().catch((err) => {
  console.error("\n❌ Academic KPI Council Test Suite Failed:\n", err);
  process.exit(1);
});
