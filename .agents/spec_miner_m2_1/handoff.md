# Handoff Report: Technical Specification for Backend Express API (`apps/api`)

- **Author**: `spec_miner_m2_2` (replacing `spec_miner_m2_1`)
- **Working Directory**: `c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\spec_miner_m2_1`
- **Target Milestone**: Milestone 2 — Backend Express API (`apps/api`)
- **Date**: 2026-09-16T15:15:00Z

---

## 1. Observation

Direct observations from authoritative specifications and codebase:
1. **`c:\Users\HaiChu\Documents\GitHub\BAHAU\docs\requirements\api-standards.md`**:
   - Lines 6–15: Design principles mandate single source of truth with Zod (`packages/contracts`), RESTful resource-oriented naming (`/api/v1/...`), request tracing via `X-Request-Id` (UUIDv7 generation if absent), and idempotency with `Idempotency-Key`.
   - Lines 21–36: Standard Success Response format:
     ```json
     {
       "success": true,
       "data": { ... },
       "meta": {
         "timestamp": "2026-09-16T14:30:00.000Z",
         "requestId": "018e3e4f-2b1a-7b3e-9081-9b8e8f810999"
       }
     }
     ```
   - Lines 38–58: Standard Paginated List Response format:
     ```json
     {
       "success": true,
       "data": [ ... ],
       "pagination": {
         "page": 1,
         "pageSize": 20,
         "totalItems": 156,
         "totalPages": 8,
         "hasNextPage": true,
         "hasPreviousPage": false
       },
       "meta": {
         "timestamp": "2026-09-16T14:30:00.000Z",
         "requestId": "018e3e4f-2b1a-7b3e-9081-9b8e8f810999"
       }
     }
     ```
   - Lines 60–77: Standard Error Response format:
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
         "requestId": "018e3e4f-2b1a-7b3e-9081-9b8e8f810999",
         "timestamp": "2026-09-16T14:30:00.000Z"
       }
     }
     ```
   - Lines 81–94: Business Error Code Table:
     - `UNAUTHENTICATED`: HTTP 401 (Session expired or not authenticated)
     - `FORBIDDEN`: HTTP 403 (Unauthorized action or outside data scope)
     - `RESOURCE_NOT_FOUND`: HTTP 404 (Entity not found)
     - `VALIDATION_FAILED`: HTTP 422 (Input violates Zod schema; also handles 400 bad request)
     - `CONFLICT_STATE`: HTTP 409 (Concurrent modification state conflict)
     - `SELF_APPROVAL_NOT_ALLOWED`: HTTP 403 (Applicant cannot approve own request)
     - `INSUFFICIENT_LEAVE_BALANCE`: HTTP 400 (Insufficient leave balance)
     - `PERIOD_LOCKED`: HTTP 400 (Locked payroll/attendance period)
     - `INTERNAL_SERVER_ERROR`: HTTP 500 (Unhandled server failure)
   - Lines 97–106: Pagination Query Conventions:
     - `page`: default 1, min 1
     - `pageSize`: default 20, min 1, max 100
     - `sortBy`: default "createdAt"
     - `sortOrder`: "asc" | "desc", default "desc"
     - `search`: optional string
     - `unitId`: optional UUID string

2. **`c:\Users\HaiChu\Documents\GitHub\BAHAU\packages\contracts\src\common\index.ts`**:
   - Defines `PaginationQuerySchema`, `ErrorDetailSchema`, `StandardErrorSchema`, `SuccessResponseSchema`, `PaginatedResponseSchema`, and `FailureResponseSchema`.
   - Directly compatible with `@bahau/contracts` export.

3. **`c:\Users\HaiChu\Documents\GitHub\BAHAU\docs\architecture\system-overview.md`**:
   - Lines 78–108: Stateful session authentication via HTTP-only cookie:
     `Set-Cookie: sid=SESSION_UUID; HttpOnly; Secure; SameSite=Lax; Path=/`
   - Express API communicates with PostgreSQL database via Prisma client singleton from `packages/database`.
   - CSRF protection relies on `X-Requested-With` header check and double-submit tokens.

4. **`c:\Users\HaiChu\Documents\GitHub\BAHAU\packages\database\src\client.ts` & `src/index.ts`**:
   - Exports singleton `prisma` instance (`PrismaClient`).
   - Health check query: `prisma.$queryRaw\`SELECT 1\``.

5. **`c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\orchestrator_1_gen2\PROJECT.md` & `ORIGINAL_REQUEST.md`**:
   - `GET /api/v1/health` must return:
     ```json
     {
       "success": true,
       "data": {
         "status": "ok",
         "uptime": 12.34,
         "version": "1.0.0",
         "database": "connected"
       },
       "meta": {
         "timestamp": "2026-09-16T14:20:00.000Z",
         "requestId": "0191fa30-..."
       }
     }
     ```
   - Server runs by default on port 4000.
   - Middlewares required: CORS (`credentials: true`), Helmet, cookie-parser, Request-Id tracing (UUIDv7), Centralized Error Handler.

---

## 2. Logic Chain

1. **Envelope Consistency**:
   - Every response from Express API must follow either `SuccessResponseSchema`, `PaginatedResponseSchema`, or `FailureResponseSchema`.
   - Both success and error envelopes share common metadata: `meta.timestamp` (ISO-8601 string) and `meta.requestId` (or `error.requestId` in failure envelope).
   - Therefore, a helper utility (e.g. `sendSuccess`, `sendPaginated`, `sendError`) or standardized controller response builders are required to guarantee uniform shape across all routes.

2. **Request Tracing Pipeline**:
   - When a request enters Express, the `requestIdMiddleware` must execute before any logging, controller logic, or error handling.
   - It checks incoming header `X-Request-Id` (`req.get('x-request-id')`). If present, non-empty, and valid, it retains it; otherwise, it generates a fresh UUIDv7.
   - It sets `res.setHeader('X-Request-Id', requestId)` so client responses can correlate trace IDs.
   - It attaches `req.id = requestId` (and `req.requestId = requestId`) to Express `Request` object for downstream consumption.

3. **Security Middleware Ordering**:
   - Pipeline order must be:
     1. `requestIdMiddleware` (assigns trace ID first so all subsequent middleware and logs have access to it).
     2. `helmet()` (sets standard security headers: CSP, HSTS, X-Content-Type-Options, etc.).
     3. `cors({...})` (configures allowed origin, allowed methods, allowed headers including `X-Request-Id` and `Idempotency-Key`, exposed headers `['X-Request-Id']`, and `credentials: true` for cookie exchange).
     4. `express.json({ limit: '10mb' })` and `express.urlencoded({ extended: true, limit: '10mb' })` (parses request payloads).
     5. `cookieParser()` (parses incoming cookie headers to populate `req.cookies.sid`).
     6. Business routes (`/api/v1/...`).
     7. Catch-all 404 handler (dispatches `RESOURCE_NOT_FOUND` AppError for undefined endpoints).
     8. Centralized error handling middleware `(err, req, res, next)`: serializes errors into the standard error envelope with HTTP status mapping.

4. **Error Handling Architecture**:
   - An `AppError` class extending `Error` should encapsulate `statusCode`, `code`, `details`, and `isOperational`.
   - Zod validation errors caught in route validation middlewares should be mapped to `VALIDATION_FAILED` (HTTP 422 or 400) with formatted `details` (`[{ field, message }]`).
   - Unhandled runtime errors should be logged with `requestId` and mapped to `INTERNAL_SERVER_ERROR` (HTTP 500) with message "Lỗi xử lý nội bộ phía máy chủ" (omitting sensitive internal stack traces in production).

5. **Health Check Endpoint**:
   - `GET /api/v1/health` calls `healthService.check()`.
   - `healthService` checks DB liveness using `await prisma.$queryRaw\`SELECT 1\``.
   - Computes process uptime (`process.uptime()`), returns `{ status: "ok", uptime, version, database: "connected" }`.
   - If database query fails or times out, it throws an error or returns status code 503 (`SERVICE_UNAVAILABLE`) with `{ status: "error", database: "disconnected" }`.

---

## 3. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Response Standards | Standard Success Response Envelope | Wraps single-resource or action success responses in uniform format | `data: T`, `req.id` | HTTP 200/201, `{ success: true, data: T, meta: { timestamp, requestId } }` | N/A (success only) | `api-standards.md` §2.1 |
| 2 | Response Standards | Standard Paginated Response Envelope | Wraps multi-resource list queries with pagination metadata | `data: T[]`, `pagination: { page, pageSize, totalItems, totalPages, hasNextPage, hasPreviousPage }`, `req.id` | HTTP 200, `{ success: true, data: T[], pagination, meta: { timestamp, requestId } }` | Validation error if pagination query parameters are invalid | `api-standards.md` §2.2, `contracts/src/common` |
| 3 | Query Standards | Standard Pagination & Filtering Query | Query parameters for list endpoints | `?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc&search=keyword&unitId=uuid` | Parsed & coerced query object | HTTP 422 `VALIDATION_FAILED` if `page < 1` or `pageSize > 100` | `api-standards.md` §4 |
| 4 | Error Standards | Standard Error Response Envelope | Centralized JSON format for all operational and unexpected API errors | `Error` or `AppError`, `req.id` | HTTP status code (4xx/5xx), `{ success: false, error: { code, message, details?, requestId, timestamp } }` | Falls back to 500 `INTERNAL_SERVER_ERROR` if unknown exception | `api-standards.md` §2.3, §3 |
| 5 | Error Standards | Business Error Code Mapping | Predefined standard error codes mapped to HTTP status codes | Domain exception with error code string | Specific HTTP status (400, 401, 403, 404, 409, 422, 500) | Handled by centralized error handler | `api-standards.md` §3 |
| 6 | Observability | Request Tracing (`X-Request-Id`) | Tracing middleware propagating or generating UUIDv7 | `X-Request-Id` request header (optional) | Sets `req.id`, `res.setHeader('X-Request-Id', ...)`, attaches to response envelope | If client header is missing or empty, generates new UUIDv7 | `api-standards.md` §1.3, `PROJECT.md` |
| 7 | Security | CORS Middleware | Configures Cross-Origin Resource Sharing for Next.js frontend | Origin URL, request headers, HTTP methods | Response headers `Access-Control-Allow-*` | Disallowed origin rejected if strict origin policy configured | `PROJECT.md`, `system-overview.md` |
| 8 | Security | Helmet Security Headers | Sets defensive HTTP response headers against web vulnerabilities | Incoming HTTP request | Sets headers: CSP, HSTS, X-Content-Type-Options, etc. | None | `PROJECT.md`, `ORIGINAL_REQUEST.md` |
| 9 | Security | Cookie Parser Middleware | Parses HTTP cookies for stateful session authentication | `Cookie: sid=...` request header | Populates `req.cookies` | Malformed cookies ignored or emptied | `system-overview.md` §4, `ORIGINAL_REQUEST.md` |
| 10 | Security | Idempotency Header Support | Client header for duplicate request prevention on mutating actions | `Idempotency-Key: <uuid>` | Enables deduplication in transactional workflows | Returns cached response or 409 if concurrent duplicate | `api-standards.md` §1.3 |
| 11 | Health Check | System Health Endpoint (`GET /api/v1/health`) | Verifies uptime, version, and database connectivity via `SELECT 1` | `GET /api/v1/health` | HTTP 200: `{ success: true, data: { status: "ok", uptime, version, database: "connected" }, meta: { timestamp, requestId } }` | HTTP 503 `SERVICE_UNAVAILABLE` if Prisma query fails | `ORIGINAL_REQUEST.md` R2, `PROJECT.md` §2 |
| 12 | Architecture | Express 4-Tier Layered Architecture | Layered organization: Routes -> Controllers -> Services -> Middlewares | HTTP requests | Decoupled execution flow | Caught by centralized error middleware | `PROJECT.md` Code Layout, `ORIGINAL_REQUEST.md` |
| 13 | Resilience | 404 Catch-All Middleware | Intercepts requests to nonexistent routes | Unmatched HTTP URL/method | HTTP 404: `{ success: false, error: { code: "RESOURCE_NOT_FOUND", message: "Route not found", ... } }` | Handled uniformly through AppError | `api-standards.md` §3 |

---

## 4. Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | `X-Request-Id` | Missing `X-Request-Id` in request headers | Middleware generates new UUIDv7, assigns to `req.id`, returns in `res.setHeader`, and embeds into `meta.requestId` / `error.requestId`. |
| 2 | `X-Request-Id` | Valid client-provided `X-Request-Id` (e.g. `0191fa30-6d4b-7000-8000-000000000001`) | Middleware propagates client's `X-Request-Id` without generating a new one, returns same ID in response header and meta. |
| 3 | `X-Request-Id` | Empty or whitespace `X-Request-Id: ""` | Middleware detects invalid/empty string and generates a fresh UUIDv7 to ensure traceability. |
| 4 | Centralized Error Handler | Uncaught runtime Exception (e.g. `TypeError: Cannot read properties of undefined`) | Sanitizes error message for client: returns HTTP 500, `code: "INTERNAL_SERVER_ERROR"`, `message: "Lỗi xử lý nội bộ phía máy chủ"`, logs internal stack trace server-side with `requestId`. |
| 5 | Centralized Error Handler | Zod Validation Error (`ZodError`) | Maps to HTTP 422 (or 400), `code: "VALIDATION_FAILED"`, `message: "Dữ liệu gửi lên không hợp lệ."`, `details: issues.map(i => ({ field: i.path.join('.'), message: i.message }))`. |
| 6 | Centralized Error Handler | Prisma Database Unique Constraint Violation (`P2002`) | Maps to HTTP 409, `code: "CONFLICT_STATE"`, `message: "Bản ghi đã tồn tại hoặc xảy ra xung đột dữ liệu."`. |
| 7 | Centralized Error Handler | Prisma Record Not Found (`P2025`) | Maps to HTTP 404, `code: "RESOURCE_NOT_FOUND"`, `message: "Không tìm thấy bản ghi tương ứng."`. |
| 8 | Health Check | PostgreSQL database is down or unreachable | `prisma.$queryRaw` throws connection error. Service catches exception, returns HTTP 503 `SERVICE_UNAVAILABLE` with `{ status: "error", database: "disconnected" }`. |
| 9 | Health Check | High frequency polling of `GET /api/v1/health` | Lightweight `SELECT 1` ensures minimal overhead on connection pool; response uses cached or instant uptime. |
| 10 | CORS Middleware | Preflight `OPTIONS` request from Next.js (`http://localhost:3000`) | Returns HTTP 204/200 with headers `Access-Control-Allow-Origin: http://localhost:3000`, `Access-Control-Allow-Credentials: true`, `Access-Control-Allow-Methods: GET,POST,PUT,PATCH,DELETE,OPTIONS`. |
| 11 | CORS Middleware | Request from unauthorized third-party origin in production | Origin header does not match allowed origin list; CORS headers omitted or request blocked. |
| 12 | Cookie Parser | Multiple cookies in request including `sid=SESSION_UUID` | Correctly parses `req.cookies.sid` without corruption; preserves other cookies. |
| 13 | Pagination Query | Query with `pageSize=500` (exceeds max 100) | Validation middleware rejects with HTTP 422 `VALIDATION_FAILED` or clamps to 100. |
| 14 | Pagination Query | Negative page number `?page=-1` | Validation middleware rejects with HTTP 422 `VALIDATION_FAILED` ("page must be >= 1"). |

---

## 5. Technical Specifications for Implementation (`apps/api`)

### 5.1. Success Response Envelope Specification
- **Interface**:
  ```typescript
  export interface ApiResponseMeta {
    timestamp: string; // ISO-8601 UTC string: new Date().toISOString()
    requestId: string; // UUIDv7 string matching X-Request-Id
  }

  export interface ApiResponse<T> {
    success: true;
    data: T;
    meta: ApiResponseMeta;
  }

  export interface PaginationMeta {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }

  export interface PaginatedApiResponse<T> {
    success: true;
    data: T[];
    pagination: PaginationMeta;
    meta: ApiResponseMeta;
  }
  ```
- **Helper Functions**:
  ```typescript
  export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.req.id || (res.req as any).requestId || "",
      },
    };
    res.status(statusCode).json(response);
  }

  export function sendPaginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    statusCode = 200
  ): void {
    const response: PaginatedApiResponse<T> = {
      success: true,
      data,
      pagination,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: res.req.id || (res.req as any).requestId || "",
      },
    };
    res.status(statusCode).json(response);
  }
  ```

### 5.2. Error Response Envelope & Standard Error Codes
- **Interface**:
  ```typescript
  export interface ApiErrorDetail {
    field?: string;
    message: string;
  }

  export interface ApiErrorPayload {
    code: string;
    message: string;
    details?: ApiErrorDetail[];
    requestId: string;
    timestamp: string;
  }

  export interface ApiErrorResponse {
    success: false;
    error: ApiErrorPayload;
  }
  ```
- **Standard Error Code Enum & HTTP Status Map**:
  ```typescript
  export const ErrorCodes = {
    UNAUTHENTICATED: "UNAUTHENTICATED", // 401
    UNAUTHORIZED: "UNAUTHENTICATED", // 401 alias
    FORBIDDEN: "FORBIDDEN", // 403
    SELF_APPROVAL_NOT_ALLOWED: "SELF_APPROVAL_NOT_ALLOWED", // 403
    RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND", // 404
    NOT_FOUND: "RESOURCE_NOT_FOUND", // 404 alias
    CONFLICT_STATE: "CONFLICT_STATE", // 409
    VALIDATION_FAILED: "VALIDATION_FAILED", // 422 (or 400)
    INSUFFICIENT_LEAVE_BALANCE: "INSUFFICIENT_LEAVE_BALANCE", // 400
    PERIOD_LOCKED: "PERIOD_LOCKED", // 400
    BAD_REQUEST: "BAD_REQUEST", // 400
    SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE", // 503
    INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR", // 500
  } as const;

  export const ErrorStatusCodeMap: Record<string, number> = {
    UNAUTHENTICATED: 401,
    FORBIDDEN: 403,
    SELF_APPROVAL_NOT_ALLOWED: 403,
    RESOURCE_NOT_FOUND: 404,
    CONFLICT_STATE: 409,
    VALIDATION_FAILED: 422,
    INSUFFICIENT_LEAVE_BALANCE: 400,
    PERIOD_LOCKED: 400,
    BAD_REQUEST: 400,
    SERVICE_UNAVAILABLE: 503,
    INTERNAL_SERVER_ERROR: 500,
  };
  ```
- **Custom `AppError` Class**:
  ```typescript
  export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly details?: ApiErrorDetail[];
    public readonly isOperational: boolean;

    constructor(
      message: string,
      code: string = ErrorCodes.INTERNAL_SERVER_ERROR,
      statusCode?: number,
      details?: ApiErrorDetail[],
      isOperational = true
    ) {
      super(message);
      this.name = "AppError";
      this.code = code;
      this.statusCode = statusCode ?? ErrorStatusCodeMap[code] ?? 500;
      this.details = details;
      this.isOperational = isOperational;
      Error.captureStackTrace(this, this.constructor);
    }
  }
  ```

### 5.3. Request Tracing (`X-Request-Id`) Specification
- **Library**: `uuid` (using `v7` via `import { v7 as uuidv7 } from "uuid"`) or native UUIDv7 helper.
- **Middleware Logic**:
  ```typescript
  import { Request, Response, NextFunction } from "express";
  import { v7 as uuidv7 } from "uuid";

  declare global {
    namespace Express {
      interface Request {
        id: string;
        requestId: string;
      }
    }
  }

  export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    const existingId = req.get("x-request-id")?.trim();
    const requestId = existingId && existingId.length > 0 ? existingId : uuidv7();
    
    req.id = requestId;
    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);
    next();
  }
  ```

### 5.4. Security & Middleware Configuration Specification
- **Middleware Order**:
  1. `requestIdMiddleware`
  2. `helmet()`
  3. `cors({ origin, credentials: true, methods, allowedHeaders, exposedHeaders })`
  4. `express.json({ limit: "10mb" })`
  5. `express.urlencoded({ extended: true, limit: "10mb" })`
  6. `cookieParser()`
  7. API Routes (`/api/v1/...`)
  8. 404 Route Not Found Handler
  9. Centralized Error Handler `(err, req, res, next)`
- **Configuration Details**:
  - `cors`:
    ```typescript
    import cors from "cors";

    export const corsMiddleware = cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:3000",
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
    });
    ```
  - `helmet`:
    ```typescript
    import helmet from "helmet";

    export const helmetMiddleware = helmet({
      contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    });
    ```
  - `cookie-parser`:
    ```typescript
    import cookieParser from "cookie-parser";

    export const cookieMiddleware = cookieParser(process.env.COOKIE_SECRET);
    ```

### 5.5. Health Endpoint Specification (`GET /api/v1/health`)
- **Route**: `GET /api/v1/health`
- **Controller**: `HealthController.check(req, res, next)`
- **Service**: `HealthService.check()`
- **Logic**:
  ```typescript
  import { prisma } from "@bahau/database";

  export interface HealthData {
    status: "ok" | "error";
    uptime: number;
    version: string;
    database: "connected" | "disconnected";
  }

  export class HealthService {
    async check(): Promise<HealthData> {
      let databaseStatus: "connected" | "disconnected" = "connected";
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (error) {
        databaseStatus = "disconnected";
        throw new AppError(
          "Cơ sở dữ liệu không phản hồi hoặc mất kết nối.",
          ErrorCodes.SERVICE_UNAVAILABLE,
          503,
          [{ message: (error as Error).message }]
        );
      }

      return {
        status: "ok",
        uptime: Math.round(process.uptime() * 100) / 100,
        version: process.env.npm_package_version || "1.0.0",
        database: databaseStatus,
      };
    }
  }
  ```
- **Response Format (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "status": "ok",
      "uptime": 12.34,
      "version": "1.0.0",
      "database": "connected"
    },
    "meta": {
      "timestamp": "2026-09-16T14:20:00.000Z",
      "requestId": "0191fa30-6d4b-7000-8000-000000000001"
    }
  }
  ```
- **Degraded Response (503 Service Unavailable)**:
  ```json
  {
    "success": false,
    "error": {
      "code": "SERVICE_UNAVAILABLE",
      "message": "Cơ sở dữ liệu không phản hồi hoặc mất kết nối.",
      "details": [
        {
          "message": "PrismaClientInitializationError: Can't reach database server"
        }
      ],
      "requestId": "0191fa30-6d4b-7000-8000-000000000001",
      "timestamp": "2026-09-16T14:20:00.000Z"
    }
  }
  ```

---

## 6. Caveats

- **Prisma in Test/Mock Environments**: If PostgreSQL is not active during local development before `docker compose up -d`, `prisma.$queryRaw\`SELECT 1\`` will fail. For unit tests of `apps/api`, `prisma.$queryRaw` should be mockable or handled gracefully.
- **Node.js UUIDv7 Support**: Node v24 `crypto.randomUUID()` generates standard UUIDv4. To generate UUIDv7 per `api-standards.md`, the `uuid` package (v10+ or v11+) is required (`import { v7 as uuidv7 } from "uuid"`).
- **Zod Error Status Code**: While `api-standards.md` table lists `VALIDATION_FAILED` with HTTP 422, some HTTP clients or test cases may accept 400 Bad Request. Both 422 and 400 are valid REST conventions; 422 is the authoritative DAU specification.

---

## 7. Conclusion

All technical requirements for Milestone 2 (`apps/api`) have been mined from authoritative documentation (`docs/requirements/api-standards.md`, `docs/architecture/system-overview.md`, `docs/requirements/rbac-matrix.md`, `packages/contracts`, and `PROJECT.md`). The specification provides exact interfaces, response structures, middleware chains, error handling behavior, and health check mechanics necessary for immediate implementation.

---

## 8. Verification Method

1. **Schema Consistency Check**:
   - Compare response schema with `packages/contracts/src/common/index.ts`:
     - `SuccessResponseSchema` matches `{ success: true, data, meta }`.
     - `FailureResponseSchema` matches `{ success: false, error: { code, message, details, requestId, timestamp } }`.
     - `PaginatedResponseSchema` matches `{ success: true, data, pagination, meta }`.
2. **Type Safety & Build Verification**:
   - Check TypeScript definitions in `packages/contracts/dist/common/index.d.ts`.
3. **Behavioral Acceptance Criteria**:
   - Send `GET /api/v1/health` with `X-Request-Id: test-trace-123`:
     - Expect response header `X-Request-Id: test-trace-123`.
     - Expect response status `200`.
     - Expect body containing `"success": true`, `"status": "ok"`, `"database": "connected"`, `"meta": { "requestId": "test-trace-123" }`.
   - Send `GET /api/v1/health` without `X-Request-Id`:
     - Expect response header `X-Request-Id` with valid UUIDv7 format.
     - Expect response body `meta.requestId` to match response header.
   - Send `GET /api/v1/non-existent-path`:
     - Expect HTTP 404 with standard error envelope, `code: "RESOURCE_NOT_FOUND"`.
