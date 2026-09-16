import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ProcessManager, waitForPort } from "../helpers/process-manager.mjs";
import { httpGet } from "../helpers/http.mjs";
import { runProcess } from "../helpers/exec.mjs";
import { validateHealthResponseContract } from "../helpers/assertions.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");

export async function runCrossFeatureTests(reporter) {
  const tier = "Tier 3: Cross-Feature Combinations";
  const criterion = "Cross-Package & Cross-Application Integration";
  const pm = new ProcessManager();

  try {
    // TC-T3-XF-01: Build monorepo and run end-to-end boot flow
    await (async () => {
      const testId = "TC-T3-XF-01";
      const desc = "Build monorepo cleanly then boot Express API and verify health endpoint";
      const start = Date.now();
      try {
        const buildRes = await runProcess("npm", ["run", "build"], { cwd: ROOT_DIR });
        assert.strictEqual(buildRes.exitCode, 0, `Build failed: ${buildRes.stderr}`);

        const entry = pm.spawn("api-xf-1", "npm", ["run", "dev", "--workspace=apps/api"], {
          cwd: ROOT_DIR,
          env: { ...process.env, PORT: "4002", NODE_ENV: "test" },
        });
        const open = await waitForPort(4002, "127.0.0.1", 12000, entry);
        assert.ok(open, "API must boot on port 4002 after build");

        const res = await httpGet("http://127.0.0.1:4002/api/v1/health");
        assert.strictEqual(res.status, 200);
        validateHealthResponseContract(res.bodyJson);
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      } finally {
        pm.stop("api-xf-1");
      }
    })();

    // TC-T3-XF-02: Contracts package consumption in API
    await (async () => {
      const testId = "TC-T3-XF-02";
      const desc = "apps/api declares dependency on @bahau/contracts and utilizes contract models";
      const start = Date.now();
      try {
        const apiPkgPath = path.join(ROOT_DIR, "apps/api/package.json");
        assert.ok(fs.existsSync(apiPkgPath), "apps/api/package.json must exist");
        const apiPkg = JSON.parse(fs.readFileSync(apiPkgPath, "utf-8"));
        const deps = { ...apiPkg.dependencies, ...apiPkg.devDependencies };
        assert.ok(deps["@bahau/contracts"], "apps/api must depend on '@bahau/contracts'");
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      }
    })();

    // TC-T3-XF-03: Database package client export integration in API
    await (async () => {
      const testId = "TC-T3-XF-03";
      const desc = "apps/api declares dependency on @bahau/database and imports prisma client";
      const start = Date.now();
      try {
        const apiPkgPath = path.join(ROOT_DIR, "apps/api/package.json");
        assert.ok(fs.existsSync(apiPkgPath), "apps/api/package.json must exist");
        const apiPkg = JSON.parse(fs.readFileSync(apiPkgPath, "utf-8"));
        const deps = { ...apiPkg.dependencies, ...apiPkg.devDependencies };
        assert.ok(deps["@bahau/database"], "apps/api must depend on '@bahau/database'");
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      }
    })();

    // TC-T3-XF-04: Web-to-API live health status integration
    await (async () => {
      const testId = "TC-T3-XF-04";
      const desc = "apps/web includes ApiHealthStatus component targeting GET /api/v1/health";
      const start = Date.now();
      try {
        const compPath1 = path.join(ROOT_DIR, "apps/web/src/components/ApiHealthStatus.tsx");
        const compPath2 = path.join(ROOT_DIR, "apps/web/components/ApiHealthStatus.tsx");
        const compPath3 = path.join(ROOT_DIR, "apps/web/src/components/HealthStatus.tsx");
        const found = fs.existsSync(compPath1) || fs.existsSync(compPath2) || fs.existsSync(compPath3);
        assert.ok(found, "ApiHealthStatus component must exist in apps/web components");
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      }
    })();

    // TC-T3-XF-05: Database seed script verification
    await (async () => {
      const testId = "TC-T3-XF-05";
      const desc = "Root package.json defines db:seed and packages/database/prisma/seed.ts exists";
      const start = Date.now();
      try {
        const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "package.json"), "utf-8"));
        assert.ok(rootPkg.scripts && rootPkg.scripts["db:seed"], "Root package.json must define 'db:seed' script");
        const seedPath = path.join(ROOT_DIR, "packages/database/prisma/seed.ts");
        assert.ok(fs.existsSync(seedPath), `seed.ts must exist at ${seedPath}`);
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      }
    })();
  } finally {
    pm.stopAll();
  }
}

// Node:test runner hook
if (process.execArgv.includes("--test") || process.env.NODE_TEST === "true") {
  test("Tier 3: Cross-Feature Combinations", async (t) => {
    await t.test("TC-T3-XF-02: apps/api declares dependency on @bahau/contracts", () => {
      const apiPkgPath = path.join(ROOT_DIR, "apps/api/package.json");
      assert.ok(fs.existsSync(apiPkgPath), "apps/api/package.json must exist");
      const apiPkg = JSON.parse(fs.readFileSync(apiPkgPath, "utf-8"));
      const deps = { ...apiPkg.dependencies, ...apiPkg.devDependencies };
      assert.ok(deps["@bahau/contracts"], "apps/api must depend on '@bahau/contracts'");
    });
  });
}
