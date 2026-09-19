import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ProcessManager, waitForPort } from "../helpers/process-manager.mjs";
import { httpGet } from "../helpers/http.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");

export async function runWebRenderTests(reporter) {
  const tier = "Tier 1: Feature Coverage";
  const criterion = "AC5: Next.js Web App Rendering";
  const pm = new ProcessManager();

  try {
    // TC-T1-AC5-01: Next.js app structure exists in apps/web
    await (async () => {
      const testId = "TC-T1-AC5-01";
      const desc = "apps/web package manifest and App Router structure exist (layout.tsx, page.tsx)";
      const start = Date.now();
      try {
        const webPkgPath = path.join(ROOT_DIR, "apps/web/package.json");
        assert.ok(fs.existsSync(webPkgPath), "apps/web/package.json must exist");
        const webPkg = JSON.parse(fs.readFileSync(webPkgPath, "utf-8"));
        assert.ok(webPkg.scripts && (webPkg.scripts["dev"] || webPkg.scripts["start"]), "apps/web must define dev or start script");
        const pagePath1 = path.join(ROOT_DIR, "apps/web/src/app/page.tsx");
        const pagePath2 = path.join(ROOT_DIR, "apps/web/app/page.tsx");
        assert.ok(fs.existsSync(pagePath1) || fs.existsSync(pagePath2), "page.tsx must exist in apps/web/src/app or apps/web/app");
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      }
    })();

    // Boot Next.js server for remaining tests
    let serverRunning = false;
    try {
      const entry = pm.spawn("web-server", "npm", ["run", "dev", "--workspace=apps/web"], {
        cwd: ROOT_DIR,
        env: { ...process.env, PORT: "3000", NODE_ENV: "development" },
      });
      serverRunning = await waitForPort(3000, "127.0.0.1", 20000, entry);
    } catch {
      serverRunning = false;
    }

    // TC-T1-AC5-02: Next.js app starts and listens on port 3000
    await (async () => {
      const testId = "TC-T1-AC5-02";
      const desc = "Next.js web app starts successfully and listens on port 3000";
      const start = Date.now();
      try {
        assert.ok(serverRunning, "Next.js web app must boot and open port 3000 within 20s");
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      }
    })();

    // TC-T1-AC5-03: GET http://localhost:3000/ responds with HTTP 200 OK
    await (async () => {
      const testId = "TC-T1-AC5-03";
      const desc = "GET http://127.0.0.1:3000/ responds with HTTP status 200 OK";
      const start = Date.now();
      try {
        assert.ok(serverRunning, "Server must be running to test endpoint");
        const res = await httpGet("http://127.0.0.1:3000/", {}, 20000);
        assert.strictEqual(res.status, 200, `Expected HTTP 200, received ${res.status}: ${res.bodyText.slice(0, 300)}`);
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      }
    })();

    // TC-T1-AC5-04: Rendered HTML contains valid document structure and university branding
    await (async () => {
      const testId = "TC-T1-AC5-04";
      const desc = "Rendered HTML contains valid <!DOCTYPE html> and DAU/BAHAU branding elements";
      const start = Date.now();
      try {
        assert.ok(serverRunning, "Server must be running to test endpoint");
        const res = await httpGet("http://127.0.0.1:3000/");
        const body = res.bodyText.toLowerCase();
        assert.ok(body.includes("<!doctype html") || body.includes("<html"), "Response must be valid HTML document");
        assert.ok(
          body.includes("bahau") || body.includes("kiến trúc") || body.includes("nhân sự") || body.includes("dau"),
          "Page content must include BAHAU / University branding"
        );
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      }
    })();

    // TC-T1-AC5-05: Response is free of runtime errors and unhandled exceptions
    await (async () => {
      const testId = "TC-T1-AC5-05";
      const desc = "HTML response contains zero unhandled exception overlays or runtime crash markers";
      const start = Date.now();
      try {
        assert.ok(serverRunning, "Server must be running to test endpoint");
        const res = await httpGet("http://127.0.0.1:3000/");
        const body = res.bodyText;
        assert.ok(!body.includes("Unhandled Runtime Error"), "Response should not contain 'Unhandled Runtime Error'");
        assert.ok(!body.includes("Internal Server Error"), "Response should not contain 'Internal Server Error'");
        assert.ok(!body.includes("Application error: a client-side exception has occurred"), "Response should not contain client-side exception banner");
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
  test("Tier 1: Feature Coverage - AC5: Next.js Web App Rendering", async (t) => {
    const pm = new ProcessManager();
    try {
      await t.test("TC-T1-AC5-01: apps/web package manifest and App Router structure exist", () => {
        const webPkgPath = path.join(ROOT_DIR, "apps/web/package.json");
        assert.ok(fs.existsSync(webPkgPath), "apps/web/package.json must exist");
        const pagePath1 = path.join(ROOT_DIR, "apps/web/src/app/page.tsx");
        const pagePath2 = path.join(ROOT_DIR, "apps/web/app/page.tsx");
        assert.ok(fs.existsSync(pagePath1) || fs.existsSync(pagePath2));
      });

      let serverRunning = false;
      try {
        pm.spawn("web-server", "npm", ["run", "dev", "--workspace=apps/web"], {
          cwd: ROOT_DIR,
          env: { ...process.env, PORT: "3000", NODE_ENV: "development" },
        });
        serverRunning = await waitForPort(3000, "127.0.0.1", 15000);
      } catch {
        serverRunning = false;
      }

      await t.test("TC-T1-AC5-02: Next.js web app starts and listens on port 3000", () => {
        assert.ok(serverRunning, "Next.js web app must boot on port 3000");
      });

      await t.test("TC-T1-AC5-03: GET http://127.0.0.1:3000/ responds with HTTP status 200 OK", async () => {
        assert.ok(serverRunning);
        const res = await httpGet("http://127.0.0.1:3000/");
        assert.strictEqual(res.status, 200);
      });

      await t.test("TC-T1-AC5-04: Rendered HTML contains valid <!DOCTYPE html> and DAU/BAHAU branding", async () => {
        assert.ok(serverRunning);
        const res = await httpGet("http://127.0.0.1:3000/");
        const body = res.bodyText.toLowerCase();
        assert.ok(body.includes("<!doctype html") || body.includes("<html"));
        assert.ok(body.includes("bahau") || body.includes("kiến trúc") || body.includes("nhân sự") || body.includes("dau"));
      });

      await t.test("TC-T1-AC5-05: HTML response contains zero unhandled exception overlays", async () => {
        assert.ok(serverRunning);
        const res = await httpGet("http://127.0.0.1:3000/");
        const body = res.bodyText;
        assert.ok(!body.includes("Unhandled Runtime Error"));
        assert.ok(!body.includes("Internal Server Error"));
      });
    } finally {
      pm.stopAll();
    }
  });
}
