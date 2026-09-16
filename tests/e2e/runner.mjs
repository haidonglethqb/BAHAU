#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { TestReporter } from "./helpers/reporter.mjs";
import { runWorkspacesTests } from "./tier1-feature-coverage/ac1-workspaces.test.mjs";
import { runDbGenerateTests } from "./tier1-feature-coverage/ac2-db-generate.test.mjs";
import { runBuildTests } from "./tier1-feature-coverage/ac3-build.test.mjs";
import { runApiHealthTests } from "./tier1-feature-coverage/ac4-api-health.test.mjs";
import { runWebRenderTests } from "./tier1-feature-coverage/ac5-web-render.test.mjs";
import { runBoundaryCornerTests } from "./tier2-boundary-corner/boundary-corner.test.mjs";
import { runCrossFeatureTests } from "./tier3-cross-feature/cross-feature.test.mjs";
import { runRealWorldTests } from "./tier4-real-world/real-world.test.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../..");

async function main() {
  const args = process.argv.slice(2);
  const reporter = new TestReporter();

  const tierArg = args.find((a) => a.startsWith("--tier="))?.split("=")[1];
  const critArg = args.find((a) => a.startsWith("--criterion="))?.split("=")[1]?.toLowerCase();
  const runAll = !tierArg && !critArg;

  console.log("=".repeat(80));
  console.log("  BAHAU E2E Test Suite - 4-Tier Requirement-Driven Opaque-Box Runner");
  console.log("=".repeat(80));
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`Working Directory: ${ROOT_DIR}`);
  console.log(`Filter: ${tierArg ? `Tier ${tierArg}` : critArg ? `Criterion ${critArg}` : "All Tiers (1 to 4)"}\n`);

  // Tier 1 execution
  if (runAll || tierArg === "1" || critArg) {
    if (!critArg || critArg === "ac1" || critArg === "workspaces") {
      console.log("\n[RUNNING] Tier 1: Feature Coverage - AC1 (Workspaces Linkage)...");
      try {
        await runWorkspacesTests(reporter);
      } catch {
        // Logged by reporter
      }
    }

    if (!critArg || critArg === "ac2" || critArg === "db:generate" || critArg === "prisma") {
      console.log("\n[RUNNING] Tier 1: Feature Coverage - AC2 (db:generate)...");
      try {
        await runDbGenerateTests(reporter);
      } catch {
        // Logged by reporter
      }
    }

    if (!critArg || critArg === "ac3" || critArg === "build") {
      console.log("\n[RUNNING] Tier 1: Feature Coverage - AC3 (Monorepo Build & Types)...");
      try {
        await runBuildTests(reporter);
      } catch {
        // Logged by reporter
      }
    }

    if (!critArg || critArg === "ac4" || critArg === "api" || critArg === "health") {
      console.log("\n[RUNNING] Tier 1: Feature Coverage - AC4 (Express API Health)...");
      try {
        await runApiHealthTests(reporter);
      } catch {
        // Logged by reporter
      }
    }

    if (!critArg || critArg === "ac5" || critArg === "web" || critArg === "render") {
      console.log("\n[RUNNING] Tier 1: Feature Coverage - AC5 (Next.js Web Rendering)...");
      try {
        await runWebRenderTests(reporter);
      } catch {
        // Logged by reporter
      }
    }
  }

  // Tier 2 execution
  if (runAll || tierArg === "2") {
    console.log("\n[RUNNING] Tier 2: Boundary & Corner Cases...");
    try {
      await runBoundaryCornerTests(reporter);
    } catch {
      // Logged by reporter
    }
  }

  // Tier 3 execution
  if (runAll || tierArg === "3") {
    console.log("\n[RUNNING] Tier 3: Cross-Feature Combinations...");
    try {
      await runCrossFeatureTests(reporter);
    } catch {
      // Logged by reporter
    }
  }

  // Tier 4 execution
  if (runAll || tierArg === "4") {
    console.log("\n[RUNNING] Tier 4: Real-World Scenarios...");
    try {
      await runRealWorldTests(reporter);
    } catch {
      // Logged by reporter
    }
  }

  // Generate and save reports
  const summary = reporter.getSummary();
  const reportDir = path.join(__dirname, "reports");
  const reportMdPath = path.join(reportDir, "test-report.md");
  const reportJsonPath = path.join(reportDir, "test-report.json");
  reporter.saveReport(reportMdPath);
  reporter.saveJson(reportJsonPath);

  console.log("\n" + "=".repeat(80));
  console.log("  E2E TEST RUN SUMMARY");
  console.log("=".repeat(80));
  console.log(`Total Tests Executed: ${summary.total}`);
  console.log(`Passed:               ${summary.passed} (${summary.passRate})`);
  console.log(`Failed:               ${summary.failed}`);
  console.log(`Skipped:              ${summary.skipped}`);
  console.log(`Total Duration:       ${(summary.durationMs / 1000).toFixed(2)}s`);
  console.log(`Report Generated:     ${reportMdPath}`);
  console.log("=".repeat(80));

  if (summary.failed > 0) {
    console.log("\nFAILED TESTS LIST:");
    for (const f of reporter.results.filter((r) => r.status === "FAIL")) {
      console.log(` - [${f.testId}] ${f.criterion}: ${f.description}`);
      if (f.error) {
        console.log(`   Error: ${f.error.split("\n")[0]}`);
      }
    }
    process.exit(1);
  } else {
    console.log("\n🎉 ALL TESTS PASSED!");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
