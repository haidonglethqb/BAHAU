import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runProcess } from "../helpers/exec.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");

export async function runBuildTests(reporter) {
  const tier = "Tier 1: Feature Coverage";
  const criterion = "AC3: Monorepo Build & Types";

  // TC-T1-AC3-01: Root package.json build script exists
  await (async () => {
    const testId = "TC-T1-AC3-01";
    const desc = "Root package.json defines build script with --workspaces flag";
    const start = Date.now();
    try {
      const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "package.json"), "utf-8"));
      assert.ok(rootPkg.scripts && rootPkg.scripts["build"], "Root package.json must define 'build' script");
      assert.ok(rootPkg.scripts["build"].includes("--workspaces"), "build script must specify --workspaces");
      reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
    } catch (err) {
      reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
    }
  })();

  // TC-T1-AC3-02: tsconfig.base.json exists with strict checking
  await (async () => {
    const testId = "TC-T1-AC3-02";
    const desc = "tsconfig.base.json exists and enforces strict type checking";
    const start = Date.now();
    try {
      const tsconfigPath = path.join(ROOT_DIR, "tsconfig.base.json");
      assert.ok(fs.existsSync(tsconfigPath), "tsconfig.base.json must exist at root");
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));
      assert.strictEqual(tsconfig.compilerOptions?.strict, true, "compilerOptions.strict must be true");
      reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
    } catch (err) {
      reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
    }
  })();

  // TC-T1-AC3-03: npm.cmd run build succeeds cleanly
  await (async () => {
    const testId = "TC-T1-AC3-03";
    const desc = "npm run build completes across monorepo with exit code 0";
    const start = Date.now();
    try {
      const result = await runProcess("npm", ["run", "build"], { cwd: ROOT_DIR });
      assert.strictEqual(result.exitCode, 0, `npm run build failed with exit code ${result.exitCode}:\nSTDOUT: ${result.stdout}\nSTDERR: ${result.stderr}`);
      reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
    } catch (err) {
      reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
    }
  })();

  // TC-T1-AC3-04: Zero TypeScript diagnostics errors in build output
  await (async () => {
    const testId = "TC-T1-AC3-04";
    const desc = "Build stdout and stderr contain zero TypeScript error codes (TSxxxx)";
    const start = Date.now();
    try {
      const result = await runProcess("npm", ["run", "build"], { cwd: ROOT_DIR });
      const combined = result.stdout + "\n" + result.stderr;
      const tsErrorMatch = combined.match(/error TS\d{4,5}:/g);
      assert.strictEqual(tsErrorMatch, null, `TypeScript errors detected in build output: ${tsErrorMatch?.join(", ")}`);
      reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
    } catch (err) {
      reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
    }
  })();

  // TC-T1-AC3-05: Compiled distribution artifacts exist for packages
  await (async () => {
    const testId = "TC-T1-AC3-05";
    const desc = "@bahau/contracts emits compiled dist/ artifacts (.js and .d.ts)";
    const start = Date.now();
    try {
      const distDir = path.join(ROOT_DIR, "packages/contracts/dist");
      assert.ok(fs.existsSync(distDir), "packages/contracts/dist must exist after build");
      const files = fs.readdirSync(distDir);
      assert.ok(files.some((f) => f.endsWith(".js")), "dist must contain compiled .js files");
      assert.ok(files.some((f) => f.endsWith(".d.ts")), "dist must contain TypeScript declarations .d.ts");
      reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
    } catch (err) {
      reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
    }
  })();
}

// Node:test runner hook
if (process.execArgv.includes("--test") || process.env.NODE_TEST === "true") {
  test("Tier 1: Feature Coverage - AC3: Monorepo Build & Types", async (t) => {
    await t.test("TC-T1-AC3-01: Root package.json defines build script with --workspaces", () => {
      const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "package.json"), "utf-8"));
      assert.ok(rootPkg.scripts && rootPkg.scripts["build"], "Root package.json must define 'build' script");
      assert.ok(rootPkg.scripts["build"].includes("--workspaces"), "build script must specify --workspaces");
    });

    await t.test("TC-T1-AC3-02: tsconfig.base.json exists and enforces strict type checking", () => {
      const tsconfigPath = path.join(ROOT_DIR, "tsconfig.base.json");
      assert.ok(fs.existsSync(tsconfigPath), "tsconfig.base.json must exist at root");
      const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));
      assert.strictEqual(tsconfig.compilerOptions?.strict, true, "compilerOptions.strict must be true");
    });

    await t.test("TC-T1-AC3-03: npm run build completes across monorepo with exit code 0", async () => {
      const result = await runProcess("npm", ["run", "build"], { cwd: ROOT_DIR });
      assert.strictEqual(result.exitCode, 0, `npm run build failed with exit code ${result.exitCode}`);
    });

    await t.test("TC-T1-AC3-04: Zero TypeScript errors (TSxxxx) in build output", async () => {
      const result = await runProcess("npm", ["run", "build"], { cwd: ROOT_DIR });
      const combined = result.stdout + "\n" + result.stderr;
      const tsErrorMatch = combined.match(/error TS\d{4,5}:/g);
      assert.strictEqual(tsErrorMatch, null, `TypeScript errors detected in build output: ${tsErrorMatch?.join(", ")}`);
    });

    await t.test("TC-T1-AC3-05: @bahau/contracts emits compiled dist/ artifacts (.js and .d.ts)", () => {
      const distDir = path.join(ROOT_DIR, "packages/contracts/dist");
      assert.ok(fs.existsSync(distDir), "packages/contracts/dist must exist after build");
      const files = fs.readdirSync(distDir);
      assert.ok(files.some((f) => f.endsWith(".js")), "dist must contain compiled .js files");
      assert.ok(files.some((f) => f.endsWith(".d.ts")), "dist must contain TypeScript declarations .d.ts");
    });
  });
}
