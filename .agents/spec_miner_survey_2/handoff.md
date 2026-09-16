# SPECIFICATION MINING REPORT: BACKEND API (apps/api)
**Archetype**: Specification Miner (`spec_miner_survey_2`)  
**Target Requirement**: R2: Khởi tạo Ứng dụng Backend API (`apps/api`)  
**Date**: 2026-09-16  

---

## 1. Observation

Direct observations from codebase inspection, configuration files, authoritative documentation, and environment probes:

1. **Monorepo Structure & Workspaces**:
   - In `package.json` (lines 6–9):
     ```json
     "workspaces": [
       "packages/*",
       "apps/*"
     ]
     ```
   - Directory `apps/` does not yet exist on disk (probed via `find_by_name` and `list_dir` at repository root `c:\Users\HaiChu\Documents\GitHub\BAHAU`).
   - `packages/contracts` exists with defined schemas in `packages/contracts/src/common/index.ts`, `packages/contracts/src/auth/index.ts`, `packages/contracts/src/employee/index.ts`, and `packages/contracts/src/unit/index.ts`.
   - `node_modules` does not exist yet at the root (`Test-Path "c:\Users\HaiChu\Documents\GitHub\BAHAU\node_modules"` returned `False`).
   - Running `npm` directly in PowerShell fails with `SecurityError: PSSecurityException` due to `npm.ps1` execution policy restriction; `npm.cmd` succeeds (`npm.cmd -v` returned `11.17.0`, Node is `v24.19.0`).

2. **API & Contract Standards** (`docs/requirements/api-standards.md`):
   - **Line 7–9**: Single Source of Truth with Zod (`packages/contracts`), types inferred via `z.infer<typeof Schema>`.
   - **Line 10–12**: RESTful resource-oriented, plural nouns, version prefix `/api/v1/...`.
   - **Line 13–15**: Traceability with `X-Request-Id` (UUIDv7 generated if missing); Idempotency with `Idempotency-Key` for state-changing operations.
   - **Line 21–35**: Success response envelope:
     ```json
     {
       "success": true,
       "data": { ... },
       "meta": { "timestamp": "...", "requestId": "..." }
     }
     ```
   - **Line 38–58**: Paginated list response envelope with `pagination: { page, pageSize, totalItems, totalPages, hasNextPage, hasPreviousPage }` and `meta`.
   - **Line 60–76**: Standard error envelope:
     ```json
     {
       "success": false,
       "error": {
         "code": "VALIDATION_FAILED",
         "message": "...",
         "details": [{ "field": "...", "message": "..." }],
         "requestId": "...",
         "timestamp": "..."
       }
     }
     ```
   - **Line 81–94**: Standard business error codes & HTTP statuses:
     * `UNAUTHENTICATED`: 401
     * `FORBIDDEN`: 403
     * `RESOURCE_NOT_FOUND`: 404
     * `VALIDATION_FAILED`: 422
     * `CONFLICT_STATE`: 409
     * `SELF_APPROVAL_NOT_ALLOWED`: 403
     * `INSUFFICIENT_LEAVE_BALANCE`: 400
     * `PERIOD_LOCKED`: 400
     * `INTERNAL_SERVER_ERROR`: 500

3. **System Architecture & Auth** (`docs/architecture/system-overview.md`):
   - **Line 20–29**: C4 Container Diagram: Client -> Next.js WebApp (`apps/web`) -> Express Backend API (`apps/api`) -> PostgreSQL (Prisma ORM) & Local Storage (`storage/uploads`).
   - **Line 36–39**: Express Backend API responsibilities: business logic, authorization matrix, stateful session authentication, ACID transactions, audit logging, transactional outbox.
   - **Line 78–108**: Stateful Session Authentication:
     * Cookie: `Set-Cookie: sid=SESSION_UUID; HttpOnly; Secure; SameSite=Lax; Path=/`.
     * Session ID stored in `Session` table in DB. Revocation is immediate by deleting session record.
     * CSRF protection: `X-Requested-With` header + Double-submit CSRF tokens on mutating requests.

4. **Environment Configuration** (`.env.example`):
   - Database:
     `DATABASE_URL="postgresql://bahau_admin:bahau_secret_password_2026@localhost:5432/bahau_hrms?schema=public"`
   - Server Ports:
     `API_PORT=4000`
     `WEB_PORT=3000`
   - Security & Sessions:
     `SESSION_SECRET="bahau_super_secure_session_secret_key_dau_2026"`
     `COOKIE_DOMAIN="localhost"`
   - File Storage:
     `UPLOAD_STORAGE_DIR="./storage/uploads"`

5. **Root TypeScript Baseline** (`tsconfig.base.json`):
   - Target: `ES2022`
   - Module: `NodeNext`
   - ModuleResolution: `NodeNext`
   - Strict: `true`
   - Declaration: `true`, DeclarationMap: `true`, SourceMap: `true`

6. **Authoritative Acceptance Criteria** (`.agents/ORIGINAL_REQUEST.md` lines 41–42):
   - Backend Express API boots successfully on configured port (default `4000`).
   - HTTP request `GET /api/v1/health` receives HTTP Status `200` with JSON format:
     `{ "success": true, "data": { "status": "ok", ... } }`.

---

## 2. Logic Chain

1. **Requirement Mapping**:
   - From `ORIGINAL_REQUEST.md` §R2, the Express backend must be located in `apps/api`, utilize TypeScript, follow a clean 4-tier layered architecture (routes -> controllers -> services -> middlewares), provide essential security/observability middlewares, and implement `GET /api/v1/health`.
   - From `system-overview.md` §2 & §4, Express acts as the single source of business truth, talks to Postgres via `@bahau/database` (PrismaClient singleton), and authenticates clients using cookie-based sessions (`sid` in `HttpOnly` cookie).

2. **Module System & Workspace Linkage**:
   - `tsconfig.base.json` specifies `"module": "NodeNext"` and `"moduleResolution": "NodeNext"`.
   - For `apps/api` to participate in npm workspaces and cleanly consume `@bahau/contracts` and `@bahau/database`, `apps/api/package.json` must be configured with `"type": "module"`, `"name": "@bahau/api"`, and import `@bahau/contracts` and `@bahau/database` as workspace dependencies (`"*"`).
   - In NodeNext ESM, relative imports within TypeScript files must specify `.js` file extensions (e.g. `import { app } from "./app.js";`), matching the pattern observed in `packages/contracts/src/index.ts` (`export * from "./common/index.js"`).

3. **Middleware Pipeline Ordering**:
   - Request-Id tracing must execute *first* so that every downstream log, error, and response header contains the `requestId`.
   - Helmet must execute early to set defense-in-depth headers.
   - CORS must execute before routing and body parsing to handle OPTIONS preflight without unnecessary body processing. Because session authentication relies on cookies, `credentials: true` is strictly required with an explicit origin (wildcard `*` is prohibited with credentials).
   - Body parsers (`express.json({ limit: '10mb' })`) and `cookie-parser(SESSION_SECRET)` must precede route handlers.
   - 404 Route Not Found and Centralized Error Handling must be placed after all route definitions, with the error handler taking exactly 4 parameters `(err, req, res, next)`.

4. **Health Check Logic**:
   - `GET /api/v1/health` must probe database connectivity by executing a low-overhead round-trip query (`prisma.$queryRaw\`SELECT 1\``) on the imported singleton instance from `@bahau/database`.
   - If the database query succeeds: returns HTTP 200 with `{ success: true, data: { status: "ok", uptime, version, database: "connected" }, meta: { timestamp, requestId } }`.
   - If the database query fails: logs error with requestId, returns HTTP 503 (or 200 with degraded status) with `{ success: false, data: { status: "degraded", uptime, version, database: "disconnected" }, error: { code: "INTERNAL_SERVER_ERROR", message: "..." } }`.

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Architecture | Layered Express App Structure | Separation of concerns across `routes`, `controllers`, `services`, `middlewares`, `config` | HTTP Requests | JSON responses conforming to envelope specs | Unhandled errors caught by centralized error handler | `ORIGINAL_REQUEST.md`, `system-overview.md` |
| 2 | Architecture | App/Server Lifecycle Separation | `app.ts` creates and configures Express; `server.ts` handles env loading, port listen, and graceful shutdown | OS signals (`SIGTERM`, `SIGINT`), Environment variables | Active HTTP Server on port 4000 | Exits gracefully with code 0 on shutdown signals | Best practices, `system-overview.md` |
| 3 | Observability | Request-Id Tracing Middleware | Inspects incoming `X-Request-Id`; if missing or invalid, generates UUIDv7. Injects into `req.id`, `res.setHeader`, and envelopes | Header `X-Request-Id` (optional) | Header `X-Request-Id` (UUIDv7 string), `meta.requestId` | If header is invalid/empty, generates new UUIDv7 | `api-standards.md` §1.3, §2 |
| 4 | Security | Helmet Security Headers | Applies hardened HTTP headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy) | Incoming HTTP request | Hardened HTTP response headers | N/A | `ORIGINAL_REQUEST.md` §R2, `system-overview.md` |
| 5 | Security | CORS Configuration | Restricts cross-origin access to trusted origins with `credentials: true` for cookie handling | Origin header, preflight `OPTIONS` | CORS headers (`Access-Control-Allow-*`) | Disallowed origin rejected or omitted from allow list | `ORIGINAL_REQUEST.md` §R2, `system-overview.md` §4 |
| 6 | Security | Cookie-Parser Middleware | Parses cookie headers into `req.cookies` and validates signed cookies via `SESSION_SECRET` into `req.signedCookies` | Cookie header (`sid=...`) | Populated `req.cookies` and `req.signedCookies` | Corrupted signatures result in `false` in `req.signedCookies` | `ORIGINAL_REQUEST.md` §R2, `system-overview.md` §4 |
| 7 | Error Handling | Centralized Error Handler | Formats all operational and internal errors into standard JSON schema adhering strictly to `api-standards.md` | Caught `Error` / `AppError` / `ZodError` | HTTP status + `{ success: false, error: { code, message, details, requestId, timestamp } }` | Logs internal errors with stack trace; obscures internal details in production | `api-standards.md` §2.3, §3 |
| 8 | Error Handling | 404 Not Found Middleware | Catches requests to unmapped endpoints and generates standard `RESOURCE_NOT_FOUND` error | Any unmatched HTTP method/path | 404 JSON with code `RESOURCE_NOT_FOUND` | Standard error envelope | `api-standards.md` §3 |
| 9 | Validation | Zod Request Validation Middleware | Validates `req.body`, `req.query`, or `req.params` against `@bahau/contracts` schemas | Schema + HTTP request data | Sanitized / parsed typed data on request | Returns 422 `VALIDATION_FAILED` with array of field errors | `api-standards.md` §1.1, §5 |
| 10 | Health Check | System & DB Health (`GET /api/v1/health`) | Probes server uptime, API version, and database connectivity via PrismaClient singleton | `GET /api/v1/health` (no body) | 200 OK with `{ success: true, data: { status: "ok", uptime, version, database: "connected" }, meta: ... }` | 503 / Degraded response if database is unreachable | `ORIGINAL_REQUEST.md` §R2, Acceptance Criteria line 42 |
| 11 | Configuration | Type-Safe Environment Loader | Validates environment variables (`PORT`, `DATABASE_URL`, `SESSION_SECRET`, etc.) via Zod at startup | `process.env` | Typed config object `env` | Throws descriptive validation error and halts server boot if missing required vars | `api-standards.md` §1.1, `.env.example` |
| 12 | Monorepo Integration | Workspace Packaging & Scripts | `apps/api/package.json` linked via root workspaces, scripts `build`, `dev` (via `tsx`), `start`, `typecheck` | Terminal commands | Build artifacts in `dist/` | Build errors reported with file and line references | Monorepo `package.json`, `tsconfig.base.json` |

---

## 4. Edge Cases

| # | Feature | Input | Observed Behavior / Expected Requirement |
|---|---------|-------|------------------------------------------|
| 1 | Request-Id Tracing | Client supplies valid UUID in `X-Request-Id` | Server reuses the supplied UUID as `requestId`, reflects it in response header and JSON meta/error envelopes. |
| 2 | Request-Id Tracing | Client supplies empty string or omits `X-Request-Id` | Server generates a new time-ordered UUIDv7 and attaches it to request and response. |
| 3 | Request-Id Tracing | Client supplies invalid / malicious string (e.g. CRLF injection, script tags) | Server sanitizes or discards invalid string and generates a fresh UUIDv7 to prevent HTTP response splitting. |
| 4 | CORS Configuration | Request from unauthorized origin (e.g. `http://malicious-site.com`) | CORS middleware rejects preflight / does not set `Access-Control-Allow-Origin`, browser blocks cross-origin reading. |
| 5 | CORS Configuration | `credentials: true` with wildcard `origin: '*'` | Browser prohibits credentials with wildcard origin. Server must explicitly echo matching origin or configured origin (`http://localhost:3000`). |
| 6 | Body Parser | Client sends malformed JSON string (syntax error) in request body | `express.json()` raises `SyntaxError`. Centralized error handler catches it and returns HTTP 422 (or 400) with code `VALIDATION_FAILED` instead of default Express HTML 400. |
| 7 | Body Parser | Client sends payload exceeding 10MB | `express.json({ limit: '10mb' })` raises `PayloadTooLargeError`. Centralized error handler formats standard error envelope. |
| 8 | Cookie-Parser | Client sends tampered signed cookie | `cookieParser` flags tampered cookie, omits it from `req.signedCookies`. Auth middleware treats session as unauthenticated (401). |
| 9 | Centralized Error Handling | Zod validation failure on nested objects or arrays | Centralized error handler iterates Zod issues and produces `details: [{ field: "user.email", message: "..." }]` with code `VALIDATION_FAILED` and status 422. |
| 10 | Centralized Error Handling | Prisma Unique Constraint violation (`P2002`) | Centralized error handler intercepts `P2002`, translates to HTTP 409 with code `CONFLICT_STATE` and user-friendly message without leaking raw SQL table names. |
| 11 | Centralized Error Handling | Prisma Record Not Found (`P2025`) | Centralized error handler intercepts `P2025`, translates to HTTP 404 with code `RESOURCE_NOT_FOUND`. |
| 12 | Centralized Error Handling | Unhandled Runtime Exception (e.g. null pointer / external service timeout) | In production (`NODE_ENV === 'production'`), hides stack trace and internal error message; returns generic message with HTTP 500 `INTERNAL_SERVER_ERROR`, logging full details to server stdout with `requestId`. |
| 13 | Health Check | PostgreSQL database is stopped or network unreachable | `prisma.$queryRaw\`SELECT 1\`` rejects with connection error. Health check catches error, reports `database: "disconnected"`, returns HTTP 503 with degraded status. |
| 14 | Health Check | PostgreSQL database starts up or recovers after failure | Singleton PrismaClient automatically reconnects on next request; health check seamlessly transitions back to 200 OK and `database: "connected"`. |
| 15 | Routing / 404 | Client requests nonexistent route `GET /api/v1/foo` or `POST /random` | 404 fallback middleware triggers `NotFoundError`, returning 404 with standard envelope `{ "success": false, "error": { "code": "RESOURCE_NOT_FOUND", ... } }`. |
| 16 | Server Lifecycle | Server receives `SIGTERM` / `SIGINT` while requests are in flight | Graceful shutdown handler stops accepting new connections (`server.close()`), waits for existing requests to finish, disconnects Prisma (`prisma.$disconnect()`), then exits with code 0. |

---

## 5. Detailed Technical Specifications for Requirement R2

### Output 1: Architectural Structure for Express TypeScript (`apps/api`)

The backend API must be structured into strict, decoupled layers within `apps/api/`:

```
apps/api/
├── package.json               # Package definition (@bahau/api, type: module)
├── tsconfig.json              # Extends ../../tsconfig.base.json
├── .env.example               # Symlinked or mirroring root .env.example
└── src/
    ├── app.ts                 # Express application setup & middleware assembly
    ├── server.ts              # Entry point: env check, HTTP listener, graceful shutdown
    ├── config/                # Environment & configuration modules
    │   ├── env.ts             # Zod validation for process.env
    │   └── constants.ts       # Global constants (cookie names, default limits)
    ├── routes/                # Route definitions & versioning
    │   ├── index.ts           # Aggregator mounting /api/v1 subrouters
    │   ├── health.routes.ts   # GET /health
    │   ├── auth.routes.ts     # Auth endpoints (login, logout, me)
    │   ├── employee.routes.ts # Employee management endpoints
    │   └── unit.routes.ts     # Organizational unit endpoints
    ├── controllers/           # Request/response handling layer
    │   ├── health.controller.ts
    │   ├── auth.controller.ts
    │   ├── employee.controller.ts
    │   └── unit.controller.ts
    ├── services/              # Pure business logic layer & DB interactions
    │   ├── health.service.ts
    │   ├── auth.service.ts
    │   ├── employee.service.ts
    │   └── unit.service.ts
    ├── middlewares/           # Cross-cutting Express middlewares
    │   ├── requestId.middleware.ts
    │   ├── errorHandler.middleware.ts
    │   ├── validate.middleware.ts
    │   ├── notFound.middleware.ts
    │   ├── auth.middleware.ts
    │   └── logger.middleware.ts
    ├── errors/                # Standard error class hierarchy
    │   ├── app-error.ts       # Base AppError
    │   ├── validation.error.ts
    │   ├── not-found.error.ts
    │   ├── unauthorized.error.ts
    │   ├── forbidden.error.ts
    │   └── conflict.error.ts
    └── types/                 # Express and module type augmentations
        └── express.d.ts       # Express.Request augmentation (id, requestId, user)
```

#### Layer Responsibilities:
1. **`app.ts`**:
   - Instantiates Express application `const app = express();`.
   - Registers middlewares in exact order: `requestIdMiddleware` -> `helmet()` -> `cors()` -> `express.json()` -> `express.urlencoded()` -> `cookieParser()` -> `loggerMiddleware` -> Routes (`/api/v1`) -> `notFoundMiddleware` -> `errorHandlerMiddleware`.
   - Exports `app` for both `server.ts` and automated integration tests (Supertest).
2. **`server.ts`**:
   - Imports `env` from `config/env.js`.
   - Starts HTTP server `app.listen(PORT, HOST, ...)`.
   - Hooks process signals `SIGTERM` and `SIGINT` to invoke graceful shutdown sequence.
3. **`routes/`**:
   - Uses `express.Router()`.
   - Declares route paths, HTTP verbs, binds validation middlewares (e.g. `validateBody(...)`), and attaches controller methods.
4. **`controllers/`**:
   - Extracts `req.body`, `req.query`, `req.params`.
   - Delegates business operations to corresponding service methods.
   - Wraps results in standard response envelopes (`SuccessResponseSchema`).
5. **`services/`**:
   - Encapsulates database transactions via `@bahau/database` (Prisma singleton).
   - Enforces business rules (e.g. code generation, duplicate checks, permission evaluation).
   - Throws domain errors (`AppError` subclasses) when rules are violated.
6. **`middlewares/`**:
   - Observability, security, authentication, validation, and error translation.

---

### Output 2: Security & Observability Middlewares Required

#### 1. Request-Id Tracing Middleware (`requestId.middleware.ts`):
- **Requirement**: UUIDv7 tracing per `api-standards.md` §1.3.
- **Specification**:
  - Check `req.headers['x-request-id']`. If present as a non-empty string and passes format check, preserve it.
  - Otherwise, generate a time-ordered UUIDv7 using `uuid.v7()` (from `uuid` v10+).
  - Attach to `req.id = requestId` and `req.requestId = requestId`.
  - Set response header: `res.setHeader('X-Request-Id', requestId)`.
  - Type augmentation:
    ```typescript
    declare global {
      namespace Express {
        interface Request {
          id: string;
          requestId: string;
        }
      }
    }
    ```

#### 2. CORS Configuration Middleware:
- **Requirement**: Allow web client on `http://localhost:3000` with credential support.
- **Specification**:
  ```typescript
  import cors from "cors";
  import { env } from "../config/env.js";

  export const corsMiddleware = cors({
    origin: env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-Id",
      "X-Requested-With",
      "Idempotency-Key",
    ],
    exposedHeaders: ["X-Request-Id"],
    maxAge: 86400,
  });
  ```

#### 3. Helmet Security Headers Middleware:
- **Requirement**: Standard web vulnerability protection.
- **Specification**:
  ```typescript
  import helmet from "helmet";

  export const helmetMiddleware = helmet({
    contentSecurityPolicy: false, // Pure REST API returning JSON
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });
  ```

#### 4. Cookie-Parser Middleware:
- **Requirement**: Stateful session parsing for cookie `sid`.
- **Specification**:
  ```typescript
  import cookieParser from "cookie-parser";
  import { env } from "../config/env.js";

  export const cookieMiddleware = cookieParser(env.SESSION_SECRET);
  ```

#### 5. Centralized Error Handling (`errorHandler.middleware.ts`):
- **Requirement**: 100% adherence to `api-standards.md` §2.3, §3 and `packages/contracts/src/common/index.ts`.
- **Standard Error Response Format**:
  ```json
  {
    "success": false,
    "error": {
      "code": "VALIDATION_FAILED",
      "message": "Dữ liệu gửi lên không hợp lệ.",
      "details": [
        {
          "field": "startDate",
          "message": "Ngày bắt đầu nghỉ phép không thể trong quá khứ."
        }
      ],
      "requestId": "0191f630-388b-7123-9876-0123456789ab",
      "timestamp": "2026-09-16T14:30:00.000Z"
    }
  }
  ```
- **Error Class Hierarchy**:
  ```typescript
  export class AppError extends Error {
    constructor(
      public readonly statusCode: number,
      public readonly code: string,
      message: string,
      public readonly details?: Array<{ field?: string; message: string }>
    ) {
      super(message);
      Object.setPrototypeOf(this, new.target.prototype);
      Error.captureStackTrace(this, this.constructor);
    }
  }

  export class UnauthorizedError extends AppError {
    constructor(message = "Phiên làm việc đã hết hạn hoặc chưa đăng nhập") {
      super(401, "UNAUTHENTICATED", message);
    }
  }

  export class ForbiddenError extends AppError {
    constructor(message = "Không có quyền thao tác trên tài nguyên hoặc ngoài phạm vi đơn vị") {
      super(403, "FORBIDDEN", message);
    }
  }

  export class NotFoundError extends AppError {
    constructor(message = "Không tìm thấy bản ghi tương ứng") {
      super(404, "RESOURCE_NOT_FOUND", message);
    }
  }

  export class ValidationError extends AppError {
    constructor(message = "Dữ liệu gửi lên không hợp lệ.", details?: Array<{ field?: string; message: string }>) {
      super(422, "VALIDATION_FAILED", message, details);
    }
  }

  export class ConflictError extends AppError {
    constructor(message = "Bản ghi đã bị thay đổi trạng thái hoặc xung đột dữ liệu") {
      super(409, "CONFLICT_STATE", message);
    }
  }
  ```
- **Middleware Implementation Logic**:
  ```typescript
  import { ErrorRequestHandler } from "express";
  import { ZodError } from "zod";
  import { AppError } from "../errors/app-error.js";

  export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
    const requestId = req.id || req.requestId || "unknown";
    const timestamp = new Date().toISOString();

    // 1. Zod Validation Errors
    if (err instanceof ZodError) {
      const details = err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      }));
      res.status(422).json({
        success: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "Dữ liệu gửi lên không hợp lệ.",
          details,
          requestId,
          timestamp,
        },
      });
      return;
    }

    // 2. Custom AppError instances
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
          requestId,
          timestamp,
        },
      });
      return;
    }

    // 3. SyntaxError from body-parser
    if (err instanceof SyntaxError && "body" in err) {
      res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_FAILED",
          message: "Định dạng JSON gửi lên không hợp lệ.",
          requestId,
          timestamp,
        },
      });
      return;
    }

    // 4. Prisma known errors (P2002, P2025)
    if (err?.code === "P2002") {
      res.status(409).json({
        success: false,
        error: {
          code: "CONFLICT_STATE",
          message: "Dữ liệu đã tồn tại trong hệ thống.",
          requestId,
          timestamp,
        },
      });
      return;
    }

    if (err?.code === "P2025") {
      res.status(404).json({
        success: false,
        error: {
          code: "RESOURCE_NOT_FOUND",
          message: "Bản ghi không tồn tại.",
          requestId,
          timestamp,
        },
      });
      return;
    }

    // 5. Unhandled Internal Errors
    console.error(`[ERROR] [${requestId}] ${err.stack || err.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Lỗi xử lý nội bộ phía máy chủ.",
        requestId,
        timestamp,
      },
    });
  };
  ```

---

### Output 3: Endpoint Specification for `GET /api/v1/health`

#### 1. Contract & Response Format:
- **Route**: `GET /api/v1/health`
- **Success HTTP Status**: `200 OK`
- **Response Body**:
  ```json
  {
    "success": true,
    "data": {
      "status": "ok",
      "uptime": 45.12,
      "version": "1.0.0",
      "database": "connected"
    },
    "meta": {
      "timestamp": "2026-09-16T14:30:00.000Z",
      "requestId": "0191f630-388b-7123-9876-0123456789ab"
    }
  }
  ```
- **Degraded HTTP Status**: `503 Service Unavailable`
- **Degraded Response Body** (when DB down):
  ```json
  {
    "success": false,
    "data": {
      "status": "degraded",
      "uptime": 45.12,
      "version": "1.0.0",
      "database": "disconnected"
    },
    "error": {
      "code": "INTERNAL_SERVER_ERROR",
      "message": "Không thể kết nối tới cơ sở dữ liệu.",
      "requestId": "0191f630-388b-7123-9876-0123456789ab",
      "timestamp": "2026-09-16T14:30:00.000Z"
    }
  }
  ```

#### 2. Database Health Check via PrismaClient Singleton:
- **Singleton Import**:
  ```typescript
  import { prisma } from "@bahau/database";
  ```
- **Probe Execution in `HealthService`**:
  ```typescript
  export class HealthService {
    async checkHealth() {
      let databaseStatus: "connected" | "disconnected" = "disconnected";

      try {
        // Execute quick round-trip probe
        await prisma.$queryRaw`SELECT 1`;
        databaseStatus = "connected";
      } catch (error) {
        databaseStatus = "disconnected";
      }

      const isHealthy = databaseStatus === "connected";

      return {
        isHealthy,
        data: {
          status: isHealthy ? "ok" : "degraded",
          uptime: process.uptime(),
          version: process.env.npm_package_version || "1.0.0",
          database: databaseStatus,
        },
      };
    }
  }
  ```
- **Controller Action**:
  ```typescript
  export class HealthController {
    constructor(private readonly healthService = new HealthService()) {}

    getHealth = async (req: Request, res: Response) => {
      const result = await this.healthService.checkHealth();
      const timestamp = new Date().toISOString();
      const requestId = req.id || req.requestId;

      if (!result.isHealthy) {
        res.status(503).json({
          success: false,
          data: result.data,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Không thể kết nối tới cơ sở dữ liệu.",
            requestId,
            timestamp,
          },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.data,
        meta: {
          timestamp,
          requestId,
        },
      });
    };
  }
  ```

---

### Output 4: Port Configurations, Environment Variables, Package Dependencies, and Scripts

#### 1. Port & Network Binding:
- **Default Port**: `4000`
- **Resolution Strategy**: `Number(process.env.API_PORT || process.env.PORT || 4000)`
- **Host**: `0.0.0.0` (binds to all interfaces for Docker & local interoperability).

#### 2. Environment Variables Schema (`src/config/env.ts`):
```typescript
import { z } from "zod";
import dotenv from "dotenv";

// Load .env from root or local
dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  API_PORT: z.coerce.number().default(4000),
  PORT: z.coerce.number().optional(),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(16, "SESSION_SECRET must be at least 16 chars"),
  COOKIE_DOMAIN: z.string().default("localhost"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  UPLOAD_STORAGE_DIR: z.string().default("./storage/uploads"),
});

export type Env = z.infer<typeof EnvSchema>;
export const env = EnvSchema.parse(process.env);
```

#### 3. Package Dependencies (`apps/api/package.json`):
```json
{
  "name": "@bahau/api",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@bahau/contracts": "*",
    "@bahau/database": "*",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "helmet": "^8.0.0",
    "uuid": "^10.0.0",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.8",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^22.13.5",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.19.3",
    "typescript": "^5.7.3"
  }
}
```

#### 4. TypeScript Configuration (`apps/api/tsconfig.json`):
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

#### 5. Monorepo Scripts Integration (`package.json` at root):
Root `package.json` already contains `"workspaces": ["packages/*", "apps/*"]` and:
```json
"scripts": {
  "build": "npm run build --workspaces --if-present",
  "test": "npm run test --workspaces --if-present",
  "lint": "npm run lint --workspaces --if-present",
  "db:generate": "npm run generate --workspace=@bahau/database",
  "db:migrate": "npm run migrate:dev --workspace=@bahau/database",
  "db:seed": "npm run seed --workspace=@bahau/database"
}
```
Direct helper scripts to be added for convenience:
```json
"api:dev": "npm run dev --workspace=@bahau/api",
"api:build": "npm run build --workspace=@bahau/api",
"api:start": "npm run start --workspace=@bahau/api"
```

---

## 6. Caveats

1. **Prisma Singleton Availability during Phase 1 Bootstrap**:
   - `packages/database` is currently being surveyed by peer agent `spec_miner_survey_1`.
   - Before `npm run build` or `npm run start` can run in `apps/api`, `packages/database` must be generated (`npm run db:generate`) or stubbed with an interface to avoid missing module import errors.
2. **Windows PowerShell Execution Policy**:
   - Running `npm` directly invokes PowerShell's `npm.ps1`, which is blocked by default Windows execution policy (`PSSecurityException`). Tool calls and instructions must recommend `npm.cmd` or `cmd.exe /c npm` or `-ExecutionPolicy Bypass`.
3. **NodeNext ESM Relative Imports**:
   - Under `"module": "NodeNext"`, all relative internal imports in TypeScript files must explicitly include `.js` extensions (e.g. `import { env } from "./config/env.js";`). Failing to include `.js` results in `TS2835: Relative import paths need explicit file extensions in EcmaScript imports`.

---

## 7. Conclusion

Requirement R2: Backend API (`apps/api`) has been completely surveyed and specified:
1. **Architecture**: Clean 4-tier separation (`routes/` -> `controllers/` -> `services/` -> `middlewares/` + `config/` and `errors/`), separating Express app definition (`app.ts`) from server lifecycle listener (`server.ts`).
2. **Security & Observability**: Strict chain featuring UUIDv7 `X-Request-Id` tracing, Helmet security headers, CORS with explicit origin and `credentials: true`, signed `cookie-parser`, and Centralized Error Handling strictly conforming to `api-standards.md` error envelope and business error codes.
3. **Health Endpoint**: `GET /api/v1/health` verifying uptime, API version, and live database round-trip query `SELECT 1` via PrismaClient singleton, returning HTTP 200 with standard response envelope.
4. **Environment & Package**: Port 4000 default, Zod-validated environment, NodeNext ESM packaging `@bahau/api`, and development workflow via `tsx`.

The specification is fully ready for architectural integration and code generation by the implementation agents.

---

## 8. Verification Method

To independently verify all claims and specifications:

1. **Verify Documentation Quotes & Source Rules**:
   - Inspect `docs/requirements/api-standards.md` lines 21–35, 60–76, 81–94.
   - Inspect `docs/architecture/system-overview.md` lines 78–108.
   - Inspect `.env.example` lines 1–18.
   - Inspect `packages/contracts/src/common/index.ts` lines 14–66.

2. **Verify Implementation Readiness**:
   - Once `apps/api` files are created by implementation agents:
     * Run workspace build: `npm.cmd run build --workspace=@bahau/api`
     * Verify zero TypeScript errors.
   - Start the API server:
     * Run `npm.cmd run dev --workspace=@bahau/api` (or `node dist/server.js`)
     * Verify output: Server listening on port 4000.
   - Test Health Check endpoint via curl or powershell:
     ```powershell
     curl.exe -i http://localhost:4000/api/v1/health
     ```
     * Verify HTTP 200 OK.
     * Verify response header `X-Request-Id` is present.
     * Verify JSON envelope contains `"success": true` and `"database": "connected"`.
   - Test 404 handler:
     ```powershell
     curl.exe -i http://localhost:4000/api/v1/unknown-route
     ```
     * Verify HTTP 404 Not Found.
     * Verify JSON envelope contains `"success": false` and `"code": "RESOURCE_NOT_FOUND"`.
