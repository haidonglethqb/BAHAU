import assert from "node:assert/strict";
import { httpRequest } from "./e2e/helpers/http.mjs";
import { ProcessManager, waitForPort } from "./e2e/helpers/process-manager.mjs";

async function runRdDesignRoyaltyTests() {
  console.log("================================================================================");
  console.log("  BAHAU E2E & Integration Test: R&D Projects, Design Consultancy & Royalty Engine");
  console.log("  (Nghị định 109/2022/NĐ-CP, Nghị định 99/2014/NĐ-CP & TT 03/2023/TT-BGDĐT)");
  console.log("================================================================================");

  const pm = new ProcessManager();
  const testPort = "4034";

  try {
    const entry = pm.spawn("api-rd-test", "npm", ["run", "dev", "--workspace=apps/api"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: testPort, NODE_ENV: "test" },
    });

    console.log(`\n[BOOT] Waiting for API server on port ${testPort}...`);
    const ready = await waitForPort(Number(testPort), "127.0.0.1", 30000, entry);
    assert.ok(ready, `API server must boot on port ${testPort} within 30s`);
    console.log(`[BOOT] API server ready on http://127.0.0.1:${testPort}`);

    // --------------------------------------------------------------------------
    // TEST 1: Authentication enforcement on R&D endpoints (401 UNAUTHENTICATED)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-RD-01: Authentication enforcement on R&D & Design Royalty endpoints (401)...");
    const endpoints401 = [
      { method: "GET", path: "/api/v1/rd/projects" },
      { method: "GET", path: "/api/v1/rd/projects/rd-dau-001" },
      { method: "POST", path: "/api/v1/rd/projects" },
      { method: "POST", path: "/api/v1/rd/projects/rd-dau-001/review" },
      { method: "POST", path: "/api/v1/rd/projects/rd-dau-001/allocate" },
      { method: "POST", path: "/api/v1/rd/projects/rd-dau-001/approve" },
      { method: "GET", path: "/api/v1/rd/projects/rd-dau-001/resolution/pdf" },
    ];

    for (const ep of endpoints401) {
      const res = await httpRequest(`http://127.0.0.1:${testPort}${ep.path}`, ep.method);
      assert.strictEqual(res.status, 401, `${ep.path} must reject unauthenticated request with 401`);
      assert.strictEqual(res.bodyJson?.success, false);
      assert.strictEqual(res.bodyJson?.error?.code, "UNAUTHENTICATED");
    }
    console.log("   ✓ Verified 7/7 R&D endpoints strictly enforce 401 UNAUTHENTICATED");

    // --------------------------------------------------------------------------
    // TEST 2: Register R&D project & verify institutional fee (20-30%) and royalty fund
    // --------------------------------------------------------------------------
    console.log("\n-> TC-RD-02: Register project & verify institutional fee (25%) vs author royalty fund (75%)...");
    const { RdService } = await import("../apps/api/dist/services/rd.service.js");

    const newProject = RdService.createProject({
      title: "Thiết kế Đô thị & Cảnh quan Công viên APEC Đà Nẵng mở rộng ven sông Hàn",
      projectType: "ARCHITECTURAL_DESIGN",
      level: "COMMERCIAL_CONTRACT",
      contractValue: 400_000_000,
      institutionalFeePercentage: 25,
      startDate: "2026-10-01",
      endDate: "2027-04-30",
      departmentName: "Khoa Kiến trúc",
      members: [
        {
          employeeId: "DAU260003-ID",
          employeeCode: "DAU260003",
          fullName: "ThS. Nguyễn Văn An",
          role: "LEAD_ARCHITECT",
          royaltyPercentage: 60,
        },
        {
          employeeId: "DAU260002-ID",
          employeeCode: "DAU260002",
          fullName: "TS. Lê Hoàng Nam",
          role: "DESIGN_MEMBER",
          royaltyPercentage: 40,
        },
      ],
    });

    assert.ok(newProject.id.startsWith("rd-dau-"));
    assert.strictEqual(newProject.contractValue, 400_000_000);
    assert.strictEqual(newProject.institutionalFeePercentage, 25);
    assert.strictEqual(newProject.institutionalFeeAmount, 100_000_000, "DAU retention fee must be 25% = 100M VND");
    assert.strictEqual(newProject.royaltyFundAmount, 300_000_000, "Author royalty fund must be 75% = 300M VND");
    assert.strictEqual(newProject.status, "PROPOSAL_SUBMITTED");
    console.log(`   ✓ Project registered: ${newProject.projectCode} (Total: 400M -> DAU Fund: 100M, Author Royalty: 300M)`);

    // --------------------------------------------------------------------------
    // TEST 3: Council Acceptance Review & >= 70 points threshold guardrail
    // --------------------------------------------------------------------------
    console.log("\n-> TC-RD-03: Council acceptance review scoring & >= 70 threshold guardrail...");

    // 3A: Create a separate project that fails council review (< 70đ)
    const failProject = RdService.createProject({
      title: "Đề cương thử nghiệm vật liệu chưa đạt chuẩn",
      projectType: "ACADEMIC_RESEARCH",
      level: "INSTITUTIONAL",
      contractValue: 30_000_000,
      institutionalFeePercentage: 20,
      startDate: "2026-05-01",
      endDate: "2026-10-01",
      departmentName: "Khoa Xây dựng",
      members: [
        {
          employeeId: "DAU260004-ID",
          employeeCode: "DAU260004",
          fullName: "ThS. Phạm Thị Mai",
          role: "PRINCIPAL_INVESTIGATOR",
          royaltyPercentage: 100,
        },
      ],
    });

    const reviewedFail = RdService.submitCouncilReview(failProject.id, {
      score: 58.0,
      ranking: "UNSATISFACTORY",
      councilPresidentName: "GS.TS. Nguyễn Hiệu Trưởng",
      councilNotes: "Hồ sơ chưa đạt yêu cầu thực tiễn",
    });

    assert.strictEqual(reviewedFail.councilReview?.score, 58.0);
    assert.strictEqual(reviewedFail.councilReview?.isPassed, false);
    assert.strictEqual(reviewedFail.status, "TERMINATED");
    console.log(`   ✓ Council rejected low score (58đ < 70đ): Status set to TERMINATED`);

    // 3B: Phải chặn không cho ký số phê duyệt đề tài chưa đạt nghiệm thu
    assert.throws(
      () => {
        RdService.approveAndSignWithPki(failProject.id, {
          signerName: "GS.TS. Nguyễn Hiệu Trưởng",
          resolutionNumber: "999/QĐ-ĐHKTĐN",
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, "COUNCIL_NOT_PASSED");
        return true;
      },
      "Must block PKI approval on projects that failed council acceptance"
    );
    console.log("   ✓ Guardrail enforced: Cannot approve with PKI without passing Council review (>= 70đ)");

    // 3C: Đánh giá ĐẠT cho dự án chính (score >= 70đ, ví dụ 91.5đ)
    const reviewedPass = RdService.submitCouncilReview(newProject.id, {
      score: 91.5,
      ranking: "EXCELLENT",
      councilPresidentName: "GS.TS. Nguyễn Hiệu Trưởng",
      councilNotes: "Đồ án xuất sắc, ý tưởng kiến trúc công viên thích ứng biến đổi khí hậu sông Hàn độc đáo.",
    });

    assert.strictEqual(reviewedPass.councilReview?.score, 91.5);
    assert.strictEqual(reviewedPass.councilReview?.isPassed, true);
    assert.strictEqual(reviewedPass.status, "REVIEW_COUNCIL");
    console.log(`   ✓ Project passed Council acceptance: 91.5/100đ -> Status: REVIEW_COUNCIL`);

    // --------------------------------------------------------------------------
    // TEST 4: Royalty allocation & converted workload hours (<= 100% check)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-RD-04: Royalty allocation & converted workload hours (<= 100% check)...");

    // 4A: Thử phân bổ vượt quá 100% (65% + 45% = 110%) -> Phải ném lỗi 400
    assert.throws(
      () => {
        RdService.allocateRoyalty(newProject.id, {
          memberAllocations: [
            { employeeId: "DAU260003-ID", royaltyPercentage: 65 },
            { employeeId: "DAU260002-ID", royaltyPercentage: 45 },
          ],
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, "INVALID_ALLOCATION");
        return true;
      },
      "Must reject allocation sum exceeding 100%"
    );
    console.log("   ✓ Guardrail enforced: Total allocation percentage cannot exceed 100%");

    // 4B: Phân bổ hợp lệ (60% cho Chủ trì và 40% cho Thành viên = 100%)
    const allocated = RdService.allocateRoyalty(newProject.id, {
      memberAllocations: [
        { employeeId: "DAU260003-ID", royaltyPercentage: 60 },
        { employeeId: "DAU260002-ID", royaltyPercentage: 40 },
      ],
    });

    const leadMember = allocated.members.find((m) => m.employeeCode === "DAU260003");
    const subMember = allocated.members.find((m) => m.employeeCode === "DAU260002");

    assert.strictEqual(leadMember?.royaltyPercentage, 60);
    assert.strictEqual(leadMember?.allocatedAmount, 180_000_000, "Lead gets 60% of 300M = 180M VND");
    assert.strictEqual(leadMember?.convertedResearchHours, 150, "Lead gets 60 * 2.5 = 150 hours");

    assert.strictEqual(subMember?.royaltyPercentage, 40);
    assert.strictEqual(subMember?.allocatedAmount, 120_000_000, "Member gets 40% of 300M = 120M VND");
    assert.strictEqual(subMember?.convertedResearchHours, 100, "Member gets 40 * 2.5 = 100 hours");

    assert.strictEqual(allocated.payoutStatus, "APPROVED");
    console.log(`   ✓ Royalty allocation confirmed: Lead=180M (150h NCKH), Member=120M (100h NCKH)`);

    // --------------------------------------------------------------------------
    // TEST 5: Rector PKI RSA-2048 Digital Signing & Resolution Issuance
    // --------------------------------------------------------------------------
    console.log("\n-> TC-RD-05: Rector PKI RSA-2048 Digital Signing & Resolution issuance...");

    const signResult = RdService.approveAndSignWithPki(newProject.id, {
      signerName: "GS.TS. Nguyễn Hiệu Trưởng",
      resolutionNumber: "218/QĐ-ĐHKTĐN",
    });

    assert.strictEqual(signResult.project.status, "COMPLETED");
    assert.strictEqual(signResult.project.payoutStatus, "PAID_VIA_PAYROLL");
    assert.strictEqual(signResult.resolutionNumber, "218/QĐ-ĐHKTĐN");
    assert.ok(signResult.pkiSignature.length > 50, "PKI signature must be a valid base64 RSA signature");
    assert.ok(signResult.signedAt, "Signing timestamp must be recorded");
    console.log(`   ✓ Signed by Rector with PKI RSA-2048: Resolution ${signResult.resolutionNumber} (Status: COMPLETED / PAID_VIA_PAYROLL)`);

    // --------------------------------------------------------------------------
    // TEST 6: Decree 30/2020/NĐ-CP PDF Resolution generation with digital seal
    // --------------------------------------------------------------------------
    console.log("\n-> TC-RD-06: Decree 30/2020/NĐ-CP PDF Resolution generation with digital seal...");

    const pdfBytes = await RdService.exportResolutionPdf(newProject.id);
    assert.ok(pdfBytes instanceof Uint8Array, "PDF export must return Uint8Array");
    assert.ok(pdfBytes.length > 3000, "PDF buffer must have valid content (>3KB)");

    const pdfMagic = String.fromCharCode(pdfBytes[0], pdfBytes[1], pdfBytes[2], pdfBytes[3]);
    assert.strictEqual(pdfMagic, "%PDF", "PDF document must have %PDF header");
    console.log(`   ✓ Official Resolution PDF generated (${pdfBytes.length} bytes, Magic: %PDF)`);

    // --------------------------------------------------------------------------
    // TEST 7: Triple-Coupling Engine verification (Payroll, Workload, KPI)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-RD-07: Triple-Coupling Engine verification (Payroll, Workload, KPI)...");
    const { PayrollService } = await import("../apps/api/dist/services/payroll.service.js");
    const { WorkloadService } = await import("../apps/api/dist/services/workload.service.js");
    const { KpiService } = await import("../apps/api/dist/services/kpi.service.js");

    // 7A: Payroll Engine Coupling
    const leadRoyalty = PayrollService.getRoyaltyPayment("DAU260003");
    assert.ok(leadRoyalty >= 180_000_000, `Lead architect DAU260003 must have >= 180M royalty payment in Payroll (Actual: ${leadRoyalty})`);
    console.log(`   ✓ Payroll synced: DAU260003 received ${leadRoyalty.toLocaleString("vi-VN")} VNĐ into monthly income`);

    // 7B: Workload Engine Coupling
    const leadWorkloadHours = WorkloadService.getResearchHours("DAU260003");
    assert.ok(leadWorkloadHours >= 150, `Lead architect DAU260003 must have >= 150 converted research hours in Workload (Actual: ${leadWorkloadHours})`);
    console.log(`   ✓ Workload synced: DAU260003 credited with ${leadWorkloadHours} research hours`);

    // 7C: KPI Engine Coupling (Pillar II Academic Research & Architecture)
    const leadKpiPoints = KpiService.getResearchKpiPoints("DAU260003");
    assert.ok(leadKpiPoints >= 35, `Lead architect DAU260003 must have >= 35 KPI points in Pillar II (Actual: ${leadKpiPoints})`);
    console.log(`   ✓ KPI synced: DAU260003 credited with +${leadKpiPoints} points into Pillar II`);

    console.log("\n================================================================================");
    console.log("  🎉 ALL 7 R&D, ARCHITECTURAL DESIGN & ROYALTY TEST CASES PASSED 100%!");
    console.log("================================================================================\n");
  } finally {
    await pm.stopAll();
  }
}

runRdDesignRoyaltyTests().catch((err) => {
  console.error("\n❌ R&D & Design Royalty Test Suite Failed:\n", err);
  process.exit(1);
});
