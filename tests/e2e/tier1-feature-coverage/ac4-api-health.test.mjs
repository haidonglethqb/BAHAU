import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ProcessManager, waitForPort } from "../helpers/process-manager.mjs";
import { httpGet } from "../helpers/http.mjs";
import { validateHealthResponseContract, isUUID } from "../helpers/assertions.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");

export async function runApiHealthTests(reporter) {
  const tier = "Tier 1: Feature Coverage";
  const criterion = "AC4: Express API & Health Endpoint";
  const pm = new ProcessManager();

  try {
    // TC-T1-AC4-01: Express API structure exists in apps/api
    await (async () => {
      const testId = "TC-T1-AC4-01";
      const desc = "apps/api package manifest and source entrypoints exist";
      const start = Date.now();
      try {
        const apiPkgPath = path.join(ROOT_DIR, "apps/api/package.json");
        assert.ok(fs.existsSync(apiPkgPath), "apps/api/package.json must exist");
        const apiPkg = JSON.parse(fs.readFileSync(apiPkgPath, "utf-8"));
        assert.ok(apiPkg.scripts && (apiPkg.scripts["dev"] || apiPkg.scripts["start"]), "apps/api must define dev or start script");
        const serverTs = path.join(ROOT_DIR, "apps/api/src/server.ts");
        const appTs = path.join(ROOT_DIR, "apps/api/src/app.ts");
        assert.ok(fs.existsSync(serverTs) || fs.existsSync(appTs), "server.ts or app.ts must exist in apps/api/src");
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      }
    })();

    // Boot API server for remaining tests
    let serverRunning = false;
    try {
      const entry = pm.spawn("api-server", "npm", ["run", "dev", "--workspace=apps/api"], {
        cwd: ROOT_DIR,
        env: { ...process.env, PORT: "4000", NODE_ENV: "test" },
      });
      serverRunning = await waitForPort(4000, "127.0.0.1", 12000, entry);
    } catch {
      serverRunning = false;
    }

    // TC-T1-AC4-02: Express API boots and listens on port 4000
    await (async () => {
      const testId = "TC-T1-AC4-02";
      const desc = "Express API boots successfully and listens on port 4000";
      const start = Date.now();
      try {
        assert.ok(serverRunning, "Express API server must boot and open port 4000 within 12s");
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      }
    })();

    // TC-T1-AC4-03: GET /api/v1/health returns HTTP 200 and Content-Type: application/json
    await (async () => {
      const testId = "TC-T1-AC4-03";
      const desc = "GET /api/v1/health returns HTTP status 200 and application/json";
      const start = Date.now();
      try {
        assert.ok(serverRunning, "Server must be running to test endpoint");
        const res = await httpGet("http://127.0.0.1:4000/api/v1/health");
        assert.strictEqual(res.status, 200, `Expected HTTP 200, received ${res.status}: ${res.bodyText}`);
        assert.ok(res.headers["content-type"]?.includes("application/json"), `Expected application/json, received ${res.headers["content-type"]}`);
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      }
    })();

    // TC-T1-AC4-04: Health JSON body matches standard schema contract
    await (async () => {
      const testId = "TC-T1-AC4-04";
      const desc = "Health response conforms to standard { success: true, data: { status: 'ok', ... }, meta: { ... } }";
      const start = Date.now();
      try {
        assert.ok(serverRunning, "Server must be running to test endpoint");
        const res = await httpGet("http://127.0.0.1:4000/api/v1/health");
        assert.ok(res.bodyJson, "Response body must be parseable JSON");
        validateHealthResponseContract(res.bodyJson);
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      }
    })();

    // TC-T1-AC4-05: Response includes tracing X-Request-Id and security headers
    await (async () => {
      const testId = "TC-T1-AC4-05";
      const desc = "Response includes X-Request-Id and Helmet security headers (nosniff)";
      const start = Date.now();
      try {
        assert.ok(serverRunning, "Server must be running to test endpoint");
        const res = await httpGet("http://127.0.0.1:4000/api/v1/health");
        const reqId = res.headers["x-request-id"] || res.bodyJson?.meta?.requestId;
        assert.ok(reqId, "X-Request-Id header or meta.requestId must be present");
        assert.ok(isUUID(reqId), `Request ID must be valid UUID: received '${reqId}'`);
        assert.strictEqual(res.headers["x-content-type-options"], "nosniff", "Helmet security header X-Content-Type-Options must be 'nosniff'");
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
  test("Tier 1: Feature Coverage - AC4: Express API & Health Endpoint", async (t) => {
    const pm = new ProcessManager();
    try {
      await t.test("TC-T1-AC4-01: apps/api package manifest and source entrypoints exist", () => {
        const apiPkgPath = path.join(ROOT_DIR, "apps/api/package.json");
        assert.ok(fs.existsSync(apiPkgPath), "apps/api/package.json must exist");
        const serverTs = path.join(ROOT_DIR, "apps/api/src/server.ts");
        const appTs = path.join(ROOT_DIR, "apps/api/src/app.ts");
        assert.ok(fs.existsSync(serverTs) || fs.existsSync(appTs), "server.ts or app.ts must exist");
      });

      let serverRunning = false;
      try {
        pm.spawn("api-server", "npm", ["run", "dev", "--workspace=apps/api"], {
          cwd: ROOT_DIR,
          env: { ...process.env, PORT: "4000", NODE_ENV: "test" },
        });
        serverRunning = await waitForPort(4000, "127.0.0.1", 12000);
      } catch {
        serverRunning = false;
      }

      await t.test("TC-T1-AC4-02: Express API boots successfully and listens on port 4000", () => {
        assert.ok(serverRunning, "Express API server must boot on port 4000");
      });

      await t.test("TC-T1-AC4-03: GET /api/v1/health returns HTTP status 200 and application/json", async () => {
        assert.ok(serverRunning, "Server must be running");
        const res = await httpGet("http://127.0.0.1:4000/api/v1/health");
        assert.strictEqual(res.status, 200);
        assert.ok(res.headers["content-type"]?.includes("application/json"));
      });

      await t.test("TC-T1-AC4-04: Health response conforms to standard schema contract", async () => {
        assert.ok(serverRunning, "Server must be running");
        const res = await httpGet("http://127.0.0.1:4000/api/v1/health");
        validateHealthResponseContract(res.bodyJson);
      });

      await t.test("TC-T1-AC4-05: Response includes X-Request-Id and Helmet security headers", async () => {
        assert.ok(serverRunning, "Server must be running");
        const res = await httpGet("http://127.0.0.1:4000/api/v1/health");
        const reqId = res.headers["x-request-id"] || res.bodyJson?.meta?.requestId;
        assert.ok(isUUID(reqId));
        assert.strictEqual(res.headers["x-content-type-options"], "nosniff");
      });
    } finally {
      pm.stopAll();
    }
  });
}
