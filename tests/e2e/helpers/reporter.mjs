import fs from "node:fs";
import path from "node:path";

export class TestReporter {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  record(tier, criterion, testId, description, status, durationMs, error = null) {
    this.results.push({
      tier,
      criterion,
      testId,
      description,
      status, // "PASS" | "FAIL" | "SKIP"
      durationMs,
      error: error ? (error.stack || error.message || String(error)) : null,
    });
  }

  getSummary() {
    const total = this.results.length;
    const passed = this.results.filter((r) => r.status === "PASS").length;
    const failed = this.results.filter((r) => r.status === "FAIL").length;
    const skipped = this.results.filter((r) => r.status === "SKIP").length;
    const durationMs = Date.now() - this.startTime;

    return {
      total,
      passed,
      failed,
      skipped,
      passRate: total > 0 ? ((passed / total) * 100).toFixed(1) + "%" : "0%",
      durationMs,
    };
  }

  generateMarkdownReport() {
    const summary = this.getSummary();
    const now = new Date().toISOString();

    let md = `# E2E Test Execution Report\n\n`;
    md += `**Execution Time:** ${now}\n`;
    md += `**Total Tests:** ${summary.total} | **Passed:** ${summary.passed} | **Failed:** ${summary.failed} | **Skipped:** ${summary.skipped}\n`;
    md += `**Pass Rate:** ${summary.passRate} | **Duration:** ${(summary.durationMs / 1000).toFixed(2)}s\n\n`;

    // Group by tier
    const tiers = ["Tier 1: Feature Coverage", "Tier 2: Boundary & Corner Cases", "Tier 3: Cross-Feature Combinations", "Tier 4: Real-World Scenarios"];

    for (const tierName of tiers) {
      const tierTests = this.results.filter((r) => r.tier.toLowerCase() === tierName.toLowerCase() || r.tier.includes(tierName.split(":")[0]));
      if (tierTests.length === 0) continue;

      md += `## ${tierName}\n\n`;
      md += `| Test ID | Criterion / Scope | Description | Status | Duration |\n`;
      md += `|---------|-------------------|-------------|--------|----------|\n`;

      for (const t of tierTests) {
        const icon = t.status === "PASS" ? "✅ PASS" : t.status === "FAIL" ? "❌ FAIL" : "⚠️ SKIP";
        md += `| \`${t.testId}\` | ${t.criterion} | ${t.description} | ${icon} | ${t.durationMs}ms |\n`;
      }
      md += `\n`;
    }

    const failedTests = this.results.filter((r) => r.status === "FAIL");
    if (failedTests.length > 0) {
      md += `## Failures & Diagnoses\n\n`;
      for (const f of failedTests) {
        md += `### \`${f.testId}\`: ${f.description}\n`;
        md += `**Criterion:** ${f.criterion}\n`;
        md += `\`\`\`text\n${f.error}\n\`\`\`\n\n`;
      }
    }

    return md;
  }

  saveReport(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, this.generateMarkdownReport(), "utf-8");
  }

  saveJson(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = {
      summary: this.getSummary(),
      results: this.results,
    };
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  }
}
