# Handoff Report: E2E Test Suite Analysis for Backend Express API (`apps/api`)

- **Author**: `explorer_m2_2`
- **Target**: Orchestrator (`parent`) and Worker M2 (`worker_m2_*`)
- **Date**: 2026-09-16T15:17:00Z
- **Scope**: Tier 1 (AC4), Tier 2 (Boundary), Tier 3 (Cross-Feature), and Tier 4 (Real-World) test cases covering `apps/api`

---

## 1. Observation

Direct observations extracted from `tests/e2e/runner.mjs`, `tests/e2e/tier1-feature-coverage/ac4-api-health.test.mjs`, `tests/e2e/tier2-boundary-corner/boundary-corner.test.mjs`, `tests/e2e/tier3-cross-feature/cross-feature.test.mjs`, `tests/e2e/tier4-real-world/real-world.test.mjs`, and `tests/e2e/helpers/assertions.mjs`:

### 1.1. Summary of Tests Targeting `apps/api`

A total of **13 tests** directly exercise or require `apps/api` across the 4 tiers:

| Tier | Test ID | Description |
| :--- | :--- | :--- |
| **Tier 1 (AC4)** | `TC-T1-AC4-01` | `apps/api` package manifest and source entrypoints exist |
| **Tier 1 (AC4)** | `TC-T1-AC4-02` | Express API boots successfully and listens on port 4000 |
| **Tier 1 (AC4)** | `TC-T1-AC4-03` | `GET /api/v1/health` returns HTTP status 200 and application/json |
| **Tier 1 (AC4)** | `TC-T1-AC4-04` | Health response conforms to standard `{ success: true, data: { status: 'ok', ... }, meta: { ... } }` |
| **Tier 1 (AC4)** | `TC-T1-AC4-05` | Response includes `X-Request-Id` and Helmet security headers (`nosniff`) |
| **Tier 2 (Edge)** | `TC-T2-BC-01` | API respects environment `PORT` override (`PORT=4008`) |
| **Tier 2 (Edge)** | `TC-T2-BC-02` | Unknown route `GET /api/v1/undefined-route` returns 404 with standard error envelope |
| **Tier 2 (Edge)** | `TC-T2-BC-03` | `POST /api/v1/health` is rejected gracefully (404/405/400) without crashing process |
| **Tier 2 (Edge)** | `TC-T2-BC-04` | Incoming `X-Request-Id` header is propagated or tracked in response |
| **Tier 2 (Edge)** | `TC-T2-BC-05` | Health check does not crash when database connection is unavailable |
| **Tier 3 (Integration)**| `TC-T3-XF-01` | Build monorepo cleanly then boot Express API and verify health endpoint |
| **Tier 3 (Integration)**| `TC-T3-XF-02` | `apps/api` declares dependency on `@bahau/contracts` |
| **Tier 3 (Integration)**| `TC-T3-XF-03` | `apps/api` declares dependency on `@bahau/database` |
| **Tier 4 (Real-World)**| `TC-T4-RW-01` | Cold boot readiness: API boots and becomes healthy within 15 seconds |
| **Tier 4 (Real-World)**| `TC-T4-RW-02` | Burst concurrency: 50 concurrent requests to `/api/v1/health` all succeed with unique request IDs |
| **Tier 4 (Real-World)**| `TC-T4-RW-03` | Graceful process termination releases port within 5 seconds |
| **Tier 4 (Real-World)**| `TC-T4-RW-04` | Health response format remains consistent under production environment |

*(Note: Tier 1 AC3 `TC-T1-AC3-03` and `TC-T1-AC3-04` also build the entire monorepo with `npm run build --workspaces`, requiring `apps/api` to compile cleanly without TypeScript errors).*

---

### 1.2. Exact Test Invocations & Assertions

#### A. Tier 1: AC4 Express API & Health Endpoint (`ac4-api-health.test.mjs`)
- **Process Spawn Command** (lines 41-45):
  ```javascript
  pm.spawn("api-server", "npm", ["run", "dev", "--workspace=apps/api"], {
    cwd: ROOT_DIR,
    env: { ...process.env, PORT: "4000", NODE_ENV: "test" },
  });
  ```
- **TC-T1-AC4-01** (lines 25-31):
  - Path: `apps/api/package.json` must exist.
  - Manifest scripts: `apiPkg.scripts["dev"] || apiPkg.scripts["start"]` must be defined.
  - Source entrypoint: `apps/api/src/server.ts` or `apps/api/src/app.ts` must exist.
- **TC-T1-AC4-02** (lines 55-57):
  - Checks port 4000 is open on `127.0.0.1` within 12 seconds (`waitForPort(4000, "127.0.0.1", 12000)`).
- **TC-T1-AC4-03** (lines 70-72):
  - Request: `GET http://127.0.0.1:4000/api/v1/health`
  - Assertions:
    - `res.status === 200`
    - `res.headers["content-type"]?.includes("application/json")`
- **TC-T1-AC4-04** (lines 86-89):
  - Request: `GET http://127.0.0.1:4000/api/v1/health`
  - Body validation: `validateHealthResponseContract(res.bodyJson)` from `assertions.mjs`:
    - `body.success === true` (strict boolean)
    - `body.data` is an object:
      - `body.data.status === "ok"`
      - `typeof body.data.uptime === "number"` and `>= 0`
      - `typeof body.data.version === "string"`
      - `typeof body.data.database === "string"`
    - `body.meta` is an object:
      - `body.meta.timestamp`: valid ISO 8601 string matching `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/`
      - `body.meta.requestId`: valid UUID matching `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
- **TC-T1-AC4-05** (lines 102-106):
  - Request: `GET http://127.0.0.1:4000/api/v1/health`
  - Header checks:
    - `const reqId = res.headers["x-request-id"] || res.bodyJson?.meta?.requestId;`
    - `assert.ok(reqId)`
    - `isUUID(reqId) === true`
    - `res.headers["x-content-type-options"] === "nosniff"` (Helmet security header)

---

#### B. Tier 2: Boundary & Corner Cases (`boundary-corner.test.mjs`)
- **TC-T2-BC-01 (PORT override)** (lines 24-32):
  - Spawn: `npm run dev --workspace=apps/api` with `PORT: "4008"`, `NODE_ENV: "test"`.
  - Assertions:
    - Port 4008 opens within 10,000ms.
    - `GET http://127.0.0.1:4008/api/v1/health` returns `res.status === 200`.
- **TC-T2-BC-02 (Unknown 404 Route)** (lines 58-63):
  - Request: `GET http://127.0.0.1:4000/api/v1/undefined-route-endpoint`
  - Assertions:
    - `res.status === 404`
    - `res.bodyJson` is valid JSON
    - `validateErrorEnvelope(res.bodyJson)`:
      - `body.success === false`
      - `body.error` is an object:
        - `typeof body.error.code === "string"`
        - `typeof body.error.message === "string"`
        - `body.error.requestId` is present and non-empty
- **TC-T2-BC-03 (Invalid HTTP Method)** (lines 75-80):
  - Request: `POST http://127.0.0.1:4000/api/v1/health` with body `{ action: "invalid" }`
  - Assertions:
    - `res.status === 404 || res.status === 405 || res.status === 400`
    - Liveness check: `GET http://127.0.0.1:4000/api/v1/health` returns `res.status === 200` (server must not crash).
- **TC-T2-BC-04 (Custom X-Request-Id Propagation)** (lines 94-101):
  - Request: `GET http://127.0.0.1:4000/api/v1/health` with header:
    `"x-request-id": "0191fa30-e000-7000-8000-123456789abc"`
  - Assertions:
    - `res.status === 200`
    - `const respReqId = res.headers["x-request-id"] || res.bodyJson?.meta?.requestId;`
    - `assert.ok(respReqId)`
    - `isUUID(respReqId) === true`
- **TC-T2-BC-05 (Database Disconnection Resilience)** (lines 114-120):
  - Request: `GET http://127.0.0.1:4000/api/v1/health`
  - Assertions:
    - `assert.ok(res.status === 200 || res.status === 503)`
    - `assert.ok(res.bodyJson)` (must remain valid JSON)
    - Comment in test: `"Status could be 200 (with data.database = 'disconnected' or 'error') or 503 Service Unavailable, but must be standard JSON and server must not crash"`

---

#### C. Tier 3: Cross-Feature Combinations (`cross-feature.test.mjs`)
- **TC-T3-XF-01 (Full Build -> Boot Flow)** (lines 26-39):
  - Command 1: `npm run build` at monorepo root exits with code 0.
  - Command 2: Spawns `npm run dev --workspace=apps/api` with `PORT: "4002"`, `NODE_ENV: "test"`.
  - Assertions:
    - Port 4002 opens within 12,000ms.
    - `GET http://127.0.0.1:4002/api/v1/health` returns `res.status === 200`.
    - `validateHealthResponseContract(res.bodyJson)` passes.
- **TC-T3-XF-02 (Contracts Dependency)** (lines 53-58):
  - Asserts `apps/api/package.json` contains `"@bahau/contracts"` in `dependencies` or `devDependencies`.
- **TC-T3-XF-03 (Database Dependency)** (lines 70-75):
  - Asserts `apps/api/package.json` contains `"@bahau/database"` in `dependencies` or `devDependencies`.

---

#### D. Tier 4: Real-World Scenarios (`real-world.test.mjs`)
- **TC-T4-RW-01 (Cold Boot Latency)** (lines 24-32):
  - Spawn: `npm run dev --workspace=apps/api` with `PORT: "4003"`, `NODE_ENV: "production"`.
  - Assertions:
    - Port 4003 opens within 15,000ms.
    - `GET http://127.0.0.1:4003/api/v1/health` returns `res.status === 200`.
- **TC-T4-RW-02 (Burst Concurrency 50 Requests)** (lines 46-71):
  - Spawn: `npm run dev --workspace=apps/api` with `PORT: "4004"`, `NODE_ENV: "test"`.
  - Execution:
    ```javascript
    const concurrentCount = 50;
    const promises = Array.from({ length: concurrentCount }, () =>
      httpGet("http://127.0.0.1:4004/api/v1/health")
    );
    const responses = await Promise.all(promises);
    ```
  - Assertions:
    - All 50 responses have `res.status === 200`.
    - All 50 responses pass `validateHealthResponseContract(res.bodyJson)`.
    - Every response has a valid UUID in `x-request-id` header or `body.meta.requestId`.
    - `reqIds.size === 50`: **All 50 request IDs must be distinct/unique!**
- **TC-T4-RW-03 (Graceful Termination & Port Release)** (lines 85-105):
  - Spawn: `npm run dev --workspace=apps/api` with `PORT: "4005"`, `NODE_ENV: "test"`.
  - Port 4005 opens.
  - Termination: `pm.stop("api-shutdown")` calls `killProcessTree(entry.pid)` (`taskkill /pid ${pid} /T /F` on Windows).
  - Assertion:
    - Within 5,000ms, `isPortOpen(4005, "127.0.0.1")` must return `false` (port 4005 released).
- **TC-T4-RW-04 (Environment Consistency)** (lines 117-127):
  - Spawn: `npm run dev --workspace=apps/api` with `PORT: "4006"`, `NODE_ENV: "production"`.
  - Assertions:
    - Port 4006 opens within 12,000ms.
    - `GET http://127.0.0.1:4006/api/v1/health` returns `res.status === 200`.
    - `validateHealthResponseContract(res.bodyJson)` passes under `NODE_ENV=production`.

---

## 2. Logic Chain & Critical Technical Inferences

### 2.1. The Database Resilience vs. 200 Status Dilemma (CRITICAL FINDING)
1. **Observation**: PostgreSQL is not currently running locally (port 5432 is closed, verified via `netstat -ano`).
2. **Observation**: `TC-T2-BC-05` accepts `res.status === 200 || res.status === 503`.
3. **Observation**: `TC-T1-AC4-03`, `TC-T1-AC4-04`, `TC-T3-XF-01`, `TC-T4-RW-01`, `TC-T4-RW-02`, and `TC-T4-RW-04` **strictly require** `res.status === 200` AND `body.data.status === "ok"`.
4. **Inference**: If the API returns HTTP 503 when the database is disconnected, `TC-T2-BC-05` passes, but `TC-T1-AC4-03`, `TC-T1-AC4-04`, `TC-T3-XF-01`, `TC-T4-RW-01`, `TC-T4-RW-02`, and `TC-T4-RW-04` will **FAIL**.
5. **Deduction**: The API health check must ALWAYS return HTTP 200 with `body.data.status = "ok"` and `body.data.database = "disconnected"` (or `"connected"` if DB is alive).
6. **Inference on Timeout**: If `prisma.$queryRaw` is called without a short timeout when PostgreSQL is not running, the TCP connection attempt may take 10-30 seconds, causing `TC-T4-RW-01` (15s timeout) and `TC-T4-RW-02` (10s `httpGet` timeout) to abort.
7. **Deduction**: Database ping must be wrapped with a strict 800ms-1000ms timeout via `Promise.race` AND cached in-memory for 2-3 seconds.

### 2.2. Burst Concurrency (50 Requests) Resilience
1. **Observation**: `TC-T4-RW-02` sends 50 requests simultaneously via `Promise.all` and checks that all 50 return 200, each with a unique UUID.
2. **Inference**: If all 50 requests independently invoke Prisma queries without caching, they could exhaust Node.js event loop resources or thread pool limits, especially when DB is unavailable.
3. **Deduction**: In-memory caching of the DB status check for ~2 seconds ensures that the 50 concurrent requests share the cached status string (`"connected"` or `"disconnected"`), returning in < 5ms.
4. **Deduction**: The `requestId` middleware must generate a fresh UUID (`crypto.randomUUID()`) per request before responding, ensuring `reqIds.size === 50`.

### 2.3. Request-Id Tracing and Custom Header Propagation
1. **Observation**: `TC-T2-BC-04` sends a custom `x-request-id: "0191fa30-e000-7000-8000-123456789abc"`.
2. **Observation**: `TC-T1-AC4-05` asserts that `res.headers["x-content-type-options"] === "nosniff"` and `x-request-id` is a valid UUID.
3. **Deduction**: The middleware must check `req.headers["x-request-id"]`. If present and matches UUID format, adopt it as `req.id`. If missing or invalid, generate a new UUID. Then set `res.setHeader("X-Request-Id", req.id)` and populate `meta.requestId = req.id` (or `error.requestId = req.id` on errors).

### 2.4. 404 Unknown Routes & Invalid Methods
1. **Observation**: `TC-T2-BC-02` expects 404 with standard error envelope (`body.success === false`, `body.error.code`, `body.error.message`, `body.error.requestId`).
2. **Observation**: `TC-T2-BC-03` sends `POST /api/v1/health` and expects `404`, `405`, or `400` without server crash.
3. **Deduction**: An Express 404 handler placed after all route definitions will catch both unknown endpoints (`/api/v1/undefined-route-endpoint`) and unhandled methods (`POST /api/v1/health`), returning HTTP 404 with code `"RESOURCE_NOT_FOUND"`, satisfying both test cases seamlessly.

### 2.5. Process Lifecycle & Port Release
1. **Observation**: `TC-T4-RW-03` starts the API on port 4005, kills it with `pm.stop()`, and polls `isPortOpen(4005)` for up to 5 seconds.
2. **Observation**: `pm.stop()` uses `taskkill /pid ${pid} /T /F` on Windows.
3. **Deduction**: In addition to handling `SIGTERM` / `SIGINT` with `server.close()`, the process must not hang child threads or unref timers that prevent the port from closing immediately. Running `"dev": "tsx src/server.ts"` (without unnecessary detached watcher loops) ensures clean termination.

---

## 3. Caveats

1. **PostgreSQL Availability**: The test runner runs opaque-box without requiring Docker or a live database. Tests assume the API handles missing databases gracefully.
2. **NodeNext Resolution**: monorepo root enforces `"moduleResolution": "NodeNext"`. In TypeScript source files under `apps/api/src/`, all relative imports MUST include the `.js` extension (e.g. `import { app } from "./app.js";`), otherwise `npm run build` (`tsc`) will fail with `TS2835` / `TS2834`.
3. **Workspace Linking**: When `apps/api/package.json` is created, `npm install` must be run from monorepo root so that `npm` links workspaces (`packages/*` and `apps/*`) and resolves dependencies.

---

## 4. Conclusion & Recommendations for Worker M2

To achieve a 100% first-attempt pass rate across all 13 `apps/api` tests, Worker M2 should implement the following specifications:

### Recommendation 1: Package Manifest (`apps/api/package.json`)
```json
{
  "name": "@bahau/api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/server.js",
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/server.ts",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@bahau/contracts": "*",
    "@bahau/database": "*",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "express": "^4.21.2",
    "helmet": "^8.0.0",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.8",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/node": "^22.13.9",
    "tsx": "^4.19.3",
    "typescript": "^5.7.3"
  }
}
```

### Recommendation 2: TypeScript Configuration (`apps/api/tsconfig.json`)
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

### Recommendation 3: Request-Id Middleware (`src/middlewares/requestId.middleware.ts`)
- Use native `crypto.randomUUID()`.
- Validate incoming `req.headers["x-request-id"]` with `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`.
- If valid, use it; otherwise generate new UUID.
- Set `req.id = requestId` and `res.setHeader("X-Request-Id", requestId)`.

### Recommendation 4: Security Middleware (`src/middlewares/security.middleware.ts`)
- `helmet()` (guarantees `x-content-type-options: nosniff`).
- `cors({ origin: true, credentials: true })`.
- `cookieParser()`.
- `express.json()`.

### Recommendation 5: Resilient Health Service (`src/services/health.service.ts`)
- Implement 2-second in-memory cache for DB status.
- Wrap `prisma.$queryRaw` in `Promise.race` with 800ms timeout.
- Return `"connected"` on success, `"disconnected"` on timeout/error.
- Always return HTTP 200 with:
  ```json
  {
    "success": true,
    "data": {
      "status": "ok",
      "uptime": process.uptime(),
      "version": "1.0.0",
      "database": dbStatus
    },
    "meta": {
      "timestamp": new Date().toISOString(),
      "requestId": req.id
    }
  }
  ```

### Recommendation 6: 404 & Centralized Error Handler (`src/middlewares/errorHandler.middleware.ts`)
- 404 handler:
  ```typescript
  export function notFoundHandler(req: Request, res: Response) {
    res.status(404).json({
      success: false,
      error: {
        code: "RESOURCE_NOT_FOUND",
        message: `Route ${req.method} ${req.originalUrl} not found`,
        requestId: (req as any).id || crypto.randomUUID(),
        timestamp: new Date().toISOString()
      }
    });
  }
  ```
- Error handler:
  ```typescript
  export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
    const status = err.statusCode || err.status || 500;
    res.status(status).json({
      success: false,
      error: {
        code: err.code || "INTERNAL_SERVER_ERROR",
        message: err.message || "Internal server error",
        requestId: (req as any).id || crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        ...(err.details ? { details: err.details } : {})
      }
    });
  }
  ```

### Recommendation 7: Server Lifecycle (`src/server.ts`)
- `const PORT = parseInt(process.env.PORT || "4000", 10);`
- `const server = app.listen(PORT, "0.0.0.0", () => { ... });`
- Attach `SIGTERM` and `SIGINT` handlers with `server.close()`.

---

## 5. Verification Method

To verify the implementation against the full E2E test suite:

1. **Verify AC4 (Tier 1 API Health)**:
   ```powershell
   node tests/e2e/runner.mjs --criterion=ac4
   ```
   *Expected*: 5/5 tests pass (`TC-T1-AC4-01` through `05`).

2. **Verify Tier 2 (Boundary & Corner Cases)**:
   ```powershell
   node tests/e2e/runner.mjs --tier=2
   ```
   *Expected*: 5/5 API tests pass (`TC-T2-BC-01` through `05`).

3. **Verify Tier 4 (Real-World Production Scenarios)**:
   ```powershell
   node tests/e2e/runner.mjs --tier=4
   ```
   *Expected*: 4/4 tests pass (`TC-T4-RW-01` through `04`).

4. **Verify TypeScript Monorepo Build**:
   ```powershell
   npm run build
   ```
   *Expected*: Exit code 0, zero TS errors (`TSxxxx`).
