import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runProcess } from "../helpers/exec.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");

export async function runWorkspacesTests(reporter) {
  const tier = "Tier 1: Feature Coverage";
  const criterion = "AC1: Workspaces Linkage";

  // TC-T1-AC1-01: Root package.json workspaces declaration
  await (async () => {
    const testId = "TC-T1-AC1-01";
    const desc = "Root package.json declares valid workspaces array containing packages/* and apps/*";
    const start = Date.now();
    try {
      const rootPkgPath = path.join(ROOT_DIR, "package.json");
      assert.ok(fs.existsSync(rootPkgPath), "Root package.json must exist");
      const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf-8"));
      assert.ok(Array.isArray(rootPkg.workspaces), "Root package.json must define workspaces array");
      assert.ok(rootPkg.workspaces.includes("packages/*"), "Workspaces must include 'packages/*'");
      assert.ok(rootPkg.workspaces.includes("apps/*"), "Workspaces must include 'apps/*'");
      reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
    } catch (err) {
      reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
    }
  })();

  // TC-T1-AC1-02: @bahau/contracts package exists and has correct name
  await (async () => {
    const testId = "TC-T1-AC1-02";
    const desc = "packages/contracts exists with name @bahau/contracts";
    const start = Date.now();
    try {
      const contractsPkgPath = path.join(ROOT_DIR, "packages/contracts/package.json");
      assert.ok(fs.existsSync(contractsPkgPath), "packages/contracts/package.json must exist");
      const contractsPkg = JSON.parse(fs.readFileSync(contractsPkgPath, "utf-8"));
      assert.strictEqual(contractsPkg.name, "@bahau/contracts", "Package name must be '@bahau/contracts'");
      reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
    } catch (err) {
      reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
    }
  })();

  // TC-T1-AC1-03: @bahau/database package exists and has correct name
  await (async () => {
    const testId = "TC-T1-AC1-03";
    const desc = "packages/database exists with name @bahau/database";
    const start = Date.now();
    try {
      const dbPkgPath = path.join(ROOT_DIR, "packages/database/package.json");
      assert.ok(fs.existsSync(dbPkgPath), "packages/database/package.json must exist");
      const dbPkg = JSON.parse(fs.readFileSync(dbPkgPath, "utf-8"));
      assert.strictEqual(dbPkg.name, "@bahau/database", "Package name must be '@bahau/database'");
      reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
    } catch (err) {
      reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
    }
  })();

  // TC-T1-AC1-04: Workspace query command recognizes both packages
  await (async () => {
    const testId = "TC-T1-AC1-04";
    const desc = "npm query recognizes @bahau/contracts and @bahau/database as workspace members";
    const start = Date.now();
    try {
      const result = await runProcess("npm", ["query", ".workspace"], { cwd: ROOT_DIR });
      assert.strictEqual(result.exitCode, 0, `npm query command failed: ${result.stderr}`);
      const json = JSON.parse(result.stdout);
      const pkgNames = json.map((p) => p.name);
      assert.ok(pkgNames.includes("@bahau/contracts"), "Workspace packages must include '@bahau/contracts'");
      assert.ok(pkgNames.includes("@bahau/database"), "Workspace packages must include '@bahau/database'");
      reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
    } catch (err) {
      reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
    }
  })();

  // TC-T1-AC1-05: Node.js workspace linkage in node_modules or path resolution
  await (async () => {
    const testId = "TC-T1-AC1-05";
    const desc = "@bahau/contracts and @bahau/database are linked in root node_modules/@bahau";
    const start = Date.now();
    try {
      const contractsNodeMod = path.join(ROOT_DIR, "node_modules/@bahau/contracts");
      const dbNodeMod = path.join(ROOT_DIR, "node_modules/@bahau/database");
      assert.ok(fs.existsSync(contractsNodeMod), "node_modules/@bahau/contracts must exist");
      assert.ok(fs.existsSync(dbNodeMod), "node_modules/@bahau/database must exist");
      reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
    } catch (err) {
      reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
    }
  })();
}

// Node:test runner hook
if (process.execArgv.includes("--test") || process.env.NODE_TEST === "true") {
  test("Tier 1: Feature Coverage - AC1: Workspaces Linkage", async (t) => {
    await t.test("TC-T1-AC1-01: Root package.json workspaces declaration", async () => {
      const rootPkgPath = path.join(ROOT_DIR, "package.json");
      assert.ok(fs.existsSync(rootPkgPath), "Root package.json must exist");
      const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf-8"));
      assert.ok(Array.isArray(rootPkg.workspaces), "Root package.json must define workspaces array");
      assert.ok(rootPkg.workspaces.includes("packages/*"), "Workspaces must include 'packages/*'");
      assert.ok(rootPkg.workspaces.includes("apps/*"), "Workspaces must include 'apps/*'");
    });

    await t.test("TC-T1-AC1-02: packages/contracts exists with name @bahau/contracts", async () => {
      const contractsPkgPath = path.join(ROOT_DIR, "packages/contracts/package.json");
      assert.ok(fs.existsSync(contractsPkgPath), "packages/contracts/package.json must exist");
      const contractsPkg = JSON.parse(fs.readFileSync(contractsPkgPath, "utf-8"));
      assert.strictEqual(contractsPkg.name, "@bahau/contracts", "Package name must be '@bahau/contracts'");
    });

    await t.test("TC-T1-AC1-03: packages/database exists with name @bahau/database", async () => {
      const dbPkgPath = path.join(ROOT_DIR, "packages/database/package.json");
      assert.ok(fs.existsSync(dbPkgPath), "packages/database/package.json must exist");
      const dbPkg = JSON.parse(fs.readFileSync(dbPkgPath, "utf-8"));
      assert.strictEqual(dbPkg.name, "@bahau/database", "Package name must be '@bahau/database'");
    });

    await t.test("TC-T1-AC1-04: npm query recognizes @bahau/contracts and @bahau/database", async () => {
      const result = await runProcess("npm", ["query", ".workspace"], { cwd: ROOT_DIR });
      assert.strictEqual(result.exitCode, 0, `npm query command failed: ${result.stderr}`);
      const json = JSON.parse(result.stdout);
      const pkgNames = json.map((p) => p.name);
      assert.ok(pkgNames.includes("@bahau/contracts"), "Workspace packages must include '@bahau/contracts'");
      assert.ok(pkgNames.includes("@bahau/database"), "Workspace packages must include '@bahau/database'");
    });

    await t.test("TC-T1-AC1-05: Node.js workspace linkage in node_modules/@bahau", async () => {
      const contractsNodeMod = path.join(ROOT_DIR, "node_modules/@bahau/contracts");
      const dbNodeMod = path.join(ROOT_DIR, "node_modules/@bahau/database");
      assert.ok(fs.existsSync(contractsNodeMod), "node_modules/@bahau/contracts must exist");
      assert.ok(fs.existsSync(dbNodeMod), "node_modules/@bahau/database must exist");
    });
  });
}
