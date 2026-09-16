# BÁO CÁO KHẢO SÁT & THIẾT KẾ KIẾN TRÚC: MILESTONE 2 - EXPRESS API FOUNDATION (`apps/api`)

**Agent Identity**: `explorer_m2_1`  
**Working Directory**: `c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\explorer_m2_1`  
**Timestamp**: 2026-09-16T15:21:00Z  
**Parent Agent**: `c08cb417-b508-4099-a855-9783109924ae`  
**Status**: HOÀN THÀNH KHẢO SÁT 100% (Hard Handoff)

---

## 1. Observation (Quan sát trực tiếp & Bằng chứng khảo sát)

### 1.1. Hiện trạng Workspace & Cấu hình Gốc
1. **Root `package.json`** (`c:\Users\HaiChu\Documents\GitHub\BAHAU\package.json`):
   - Trường `"workspaces": ["packages/*", "apps/*"]` (dòng 6-9) đã định cấu hình sẵn cho các thư mục con trong `apps/`.
   - Script `build` tại gốc: `"build": "npm run build --workspaces --if-present"`. Khi thêm package `apps/api` có script `build`, lệnh build monorepo sẽ tự động phát hiện và biên dịch.
2. **TypeScript Base Config** (`c:\Users\HaiChu\Documents\GitHub\BAHAU\tsconfig.base.json`):
   - Đã cấu hình `"target": "ES2022"`, `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, `"strict": true`, `"declaration": true`, `"declarationMap": true`, `"sourceMap": true`.
3. **Gói `@bahau/contracts`** (`packages/contracts/package.json`):
   - Đã biên dịch ra `dist/` với các subpath exports: `.`, `./common`, `./auth`, `./unit`, `./employee`.
   - Schema chuẩn tại `packages/contracts/src/common/index.ts`: `StandardErrorSchema`, `SuccessResponseSchema`, `FailureResponseSchema`, `PaginationQuerySchema`.
4. **Gói `@bahau/database`** (`packages/database/package.json`):
   - Đã xuất singleton `prisma` qua `packages/database/src/client.ts` và re-export toàn bộ `@prisma/client` types tại `packages/database/src/index.ts`.
   - Client export cho phép thực thi `await prisma.$queryRaw\`SELECT 1\`` để kiểm tra kết nối DB.
5. **Môi trường & Biến cấu hình** (`.env`):
   - Chứa `API_PORT=4000`, `DATABASE_URL="postgresql://bahau_admin:bahau_secret_password_2026@localhost:5432/bahau_hrms?schema=public"`, `SESSION_SECRET="..."`, `COOKIE_DOMAIN="localhost"`.
6. **Môi trường Node.js & Windows**:
   - Node.js runtime: `v24.19.0`.
   - Built-in `crypto.randomUUIDv7()` đã có sẵn nguyên bản trong Node v24 (`typeof crypto.randomUUIDv7 === 'function'`).
   - Môi trường Windows PowerShell yêu cầu gọi qua `npm.cmd` và `npx.cmd`.

### 1.2. Ràng buộc từ Bộ Kiểm thử E2E (`tests/e2e/`)
Khảo sát trực tiếp mã nguồn test runner và các ca kiểm thử E2E liên quan đến API:
1. **`tests/e2e/tier1-feature-coverage/ac4-api-health.test.mjs`**:
   - `TC-T1-AC4-01`: File `apps/api/package.json` phải tồn tại, có script `dev` hoặc `start`, và phải có `apps/api/src/server.ts` hoặc `app.ts`.
   - Lệnh khởi động server trong test: `pm.spawn("api-server", "npm", ["run", "dev", "--workspace=apps/api"], { env: { PORT: "4000", NODE_ENV: "test" } })`.
   - `TC-T1-AC4-02`: Server phải lắng nghe và mở cổng 4000 trong vòng 12 giây.
   - `TC-T1-AC4-03`: `GET /api/v1/health` phải trả về HTTP Status 200, Content-Type chứa `application/json`.
   - `TC-T1-AC4-04`: Body JSON phải tuân thủ chuẩn:
     - `success: true`
     - `data.status: "ok"`
     - `data.uptime: number` (>= 0)
     - `data.version: string`
     - `data.database: string` (e.g. `"connected"`)
     - `meta.timestamp: ISO date string`
     - `meta.requestId: valid UUID`
   - `TC-T1-AC4-05`: Header `X-Request-Id` hoặc `meta.requestId` phải là valid UUID, và header `X-Content-Type-Options: nosniff` (từ Helmet) phải có mặt.
2. **`tests/e2e/tier2-boundary-corner/boundary-corner.test.mjs`**:
   - `TC-T2-BC-01`: Hỗ trợ override cổng qua biến môi trường `PORT=4008` (phải ưu tiên `process.env.PORT`).
   - `TC-T2-BC-02`: Tuyến đường không tồn tại (vd: `GET /api/v1/undefined-route-endpoint`) phải trả về HTTP 404 với error envelope: `{ success: false, error: { code: "RESOURCE_NOT_FOUND", message: "...", requestId: "...", timestamp: "..." } }`.
   - `TC-T2-BC-03`: Phương thức HTTP không hợp lệ trên health route (vd: `POST /api/v1/health`) không được làm sập process (trả về 404/405/400 và server tiếp tục hoạt động).
   - `TC-T2-BC-04`: Nếu client truyền header `x-request-id: <custom-uuid>`, API phải tiếp nhận và truyền ngược lại trong header `X-Request-Id` / `meta.requestId`.
   - `TC-T2-BC-05`: Khả năng chịu lỗi khi database ngắt kết nối: Nếu PostgreSQL không khả dụng, `GET /api/v1/health` không được ném unhandled exception làm crash server, trả về JSON hợp lệ với `database: "disconnected"` (HTTP 200 hoặc 503).
3. **`tests/e2e/tier3-cross-feature/cross-feature.test.mjs`**:
   - `TC-T3-XF-01`: Build sạch toàn monorepo `npm.cmd run build` và boot API trên port 4002 thành công.
   - `TC-T3-XF-02`: `apps/api` phải khai báo phụ thuộc trực tiếp vào `@bahau/contracts`.
   - `TC-T3-XF-03`: `apps/api` phải khai báo phụ thuộc trực tiếp vào `@bahau/database` và import `prisma`.
4. **`tests/e2e/tier4-real-world/real-world.test.mjs`**:
   - `TC-T4-RW-01`: Cold boot readiness trong vòng 15 giây.
   - `TC-T4-RW-02`: Xử lý đồng thời 50 requests (`Promise.all`) tới `/api/v1/health`, tất cả thành công và 50 `requestId` nhận được phải là duy nhất (`Set.size === 50`).
   - `TC-T4-RW-03`: Tắt tiến trình nhẹ nhàng (Graceful Shutdown) và giải phóng cổng mạng trong vòng 5 giây.

---

## 2. Logic Chain (Chuỗi lập luận & Đề xuất giải pháp kiến trúc)

### 2.1. Cấu hình `apps/api/package.json`
- **Tên gói**: `"@bahau/api"` (khớp không gian tên `@bahau/*` của monorepo, npm workspaces nhận diện được cả `--workspace=@bahau/api` lẫn `--workspace=apps/api`).
- **Module type**: `"type": "module"` bắt buộc để Node.js chạy native ESM cho các tệp `.js` đã biên dịch trong `dist/`.
- **Dependencies**:
  - `@bahau/contracts: "*"` (tiêu thụ DTOs, schemas dùng chung)
  - `@bahau/database: "*"` (tiêu thụ singleton `prisma` client)
  - `express: "^4.21.2"` (web framework)
  - `cors: "^2.8.5"` (CORS middleware)
  - `helmet: "^8.0.0"` (Security headers)
  - `cookie-parser: "^1.4.7"` (Xử lý cookie phiên)
  - `dotenv: "^16.4.7"` (Nạp biến môi trường)
  - `zod: "^3.24.2"` (Validate config & request payload)
  - `uuid: "^11.1.0"` (Sinh UUIDv7 / UUID)
- **DevDependencies**:
  - `@types/node: "^22.13.9"`
  - `@types/express: "^4.17.21"`
  - `@types/cors: "^2.8.17"`
  - `@types/cookie-parser: "^1.4.8"`
  - `@types/uuid: "^10.0.0"`
  - `tsx: "^4.19.3"` (Thực thi TypeScript trực tiếp khi dev / watch)
  - `typescript: "^5.7.3"` (Biên dịch dự án)
- **Scripts**:
  - `"dev": "tsx watch src/server.ts"`
  - `"build": "tsc"`
  - `"start": "node dist/server.js"`
  - `"clean": "node -e \"fs.rmSync('dist', { recursive: true, force: true })\""`
  - `"typecheck": "tsc --noEmit"`

### 2.2. Cấu hình `apps/api/tsconfig.json`
Kế thừa trực tiếp `../../tsconfig.base.json` theo mẫu của `packages/database/tsconfig.json`:
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
Nhờ đó `apps/api` kế thừa các thiết lập chuẩn:
- `"target": "ES2022"`
- `"module": "NodeNext"`
- `"moduleResolution": "NodeNext"`
- `"strict": true`
- `"skipLibCheck": true`
- `"declaration": true`

### 2.3. Cấu trúc 4 Phân tầng (4-Tier Layered Architecture) cho `apps/api/src/`

```
apps/api/src/
├── config/
│   └── env.ts                       # Nạp & parse biến môi trường (PORT, NODE_ENV, CORS_ORIGIN, ...)
├── errors/
│   └── AppError.ts                  # AppError base class & các lớp lỗi nghiệp vụ chuẩn
├── middlewares/
│   ├── requestId.middleware.ts      # Gắn & lan truyền X-Request-Id (UUIDv7)
│   ├── security.middleware.ts       # Helmet, CORS (credentials), cookie-parser, json body
│   ├── requestLogger.middleware.ts  # Structured request logging kèm requestId & duration
│   └── errorHandler.middleware.ts   # Centralized error envelope handler & 404 handler
├── routes/
│   └── health.routes.ts             # Express Router cho health check
├── controllers/
│   └── health.controller.ts         # Xử lý HTTP request/response envelope cho health check
├── services/
│   └── health.service.ts            # Tương tác Prisma ($queryRaw), tính toán uptime, status
├── types/
│   └── express.d.ts                 # Mở rộng Express.Request interface (requestId: string)
├── app.ts                           # Khởi tạo Express app, nạp middlewares và routes theo thứ tự
└── server.ts                        # HTTP Server bootstrap, listen PORT, Graceful Shutdown (SIGINT/SIGTERM)
```

#### Chi tiết thiết kế từng tầng:

1. **`config/env.ts`**:
   - Nạp dotenv từ thư mục gốc hoặc hiện tại:
     `dotenv.config({ path: path.resolve(process.cwd(), "../../.env") }); dotenv.config();`
   - Phân tích `PORT`: Ưu tiên `process.env.PORT` (để test case `TC-T2-BC-01` chạy `PORT=4008` ghi đè thành công), kế tiếp `process.env.API_PORT`, mặc định `4000`.
   - Cung cấp các biến: `NODE_ENV` (mặc định `'development'`), `CORS_ORIGIN` (mặc định `'http://localhost:3000'`), `SESSION_SECRET`, `COOKIE_DOMAIN`, `API_PREFIX` (mặc định `'/api/v1'`).

2. **`errors/AppError.ts`**:
   - Lớp cơ sở `AppError extends Error` có:
     - `statusCode: number`
     - `code: string` (chuẩn hóa theo `api-standards.md`)
     - `details?: Array<{ field?: string; message: string }>`
     - `isOperational: boolean = true`
   - Các lớp lỗi cụ thể:
     - `NotFoundError` (404, `RESOURCE_NOT_FOUND`)
     - `ValidationError` (422, `VALIDATION_FAILED`, nhận `details`)
     - `UnauthorizedError` (401, `UNAUTHENTICATED`)
     - `ForbiddenError` (403, `FORBIDDEN`)
     - `ConflictError` (409, `CONFLICT_STATE`)
     - `BadRequestError` (400, `BAD_REQUEST`)
     - `InternalServerError` (500, `INTERNAL_SERVER_ERROR`, `isOperational = false`)

3. **`middlewares/`**:
   - `requestId.middleware.ts`:
     - Kiểm tra header `req.headers["x-request-id"]`. Nếu là chuỗi UUID hợp lệ, tái sử dụng (đáp ứng `TC-T2-BC-04`).
     - Nếu không có hoặc không hợp lệ, sinh UUIDv7 mới bằng `crypto.randomUUIDv7?.() ?? crypto.randomUUID()` hoặc `uuid.v7()`.
     - Gán `req.requestId = id` và đặt response header `res.setHeader("X-Request-Id", id)`.
   - `security.middleware.ts`:
     - Gom cụm `helmet()`, `cors({ origin: env.CORS_ORIGIN, credentials: true, exposedHeaders: ["X-Request-Id"] })`, `cookieParser(env.SESSION_SECRET)`, `express.json({ limit: "10mb" })`, `express.urlencoded({ extended: true, limit: "10mb" })`.
   - `requestLogger.middleware.ts`:
     - Ghi log theo định dạng: `[BAHAU] [ISO] [requestId] METHOD URL -> STATUS (DURATION ms)`.
   - `errorHandler.middleware.ts`:
     - Xử lý 4 tham số `(err, req, res, next)`.
     - Bắt `AppError`, `ZodError` (chuyển đổi sang 422 `VALIDATION_FAILED`), hoặc lỗi chung (500 `INTERNAL_SERVER_ERROR`).
     - Định dạng trả về chuẩn xác theo `api-standards.md`:
       ```json
       {
         "success": false,
         "error": {
           "code": "...",
           "message": "...",
           "details": [],
           "requestId": "...",
           "timestamp": "..."
         }
       }
       ```
     - Cung cấp `notFoundHandler`: chuyển mọi route không match thành `new NotFoundError(\`Route ${req.method} ${req.originalUrl} not found\`)` trả về 404 (đáp ứng `TC-T2-BC-02`).

4. **`services/health.service.ts`**:
   - Import `prisma` từ `@bahau/database`.
   - Kiểm tra kết nối DB:
     ```typescript
     let database: "connected" | "disconnected" = "disconnected";
     try {
       await prisma.$queryRaw`SELECT 1`;
       database = "connected";
     } catch (err) {
       console.warn("[HealthService] Database unreachable:", err);
       database = "disconnected";
     }
     ```
   - Trả về object:
     ```typescript
     return {
       status: "ok",
       uptime: Number(process.uptime().toFixed(2)),
       version: "1.0.0",
       database,
     };
     ```
   - Bọc trong `try/catch` triệt để, không throw lỗi ra ngoài để đảm bảo tính chịu lỗi (đáp ứng `TC-T2-BC-05`).

5. **`controllers/health.controller.ts`**:
   - Nhận request từ router, gọi `healthService.checkHealth()`.
   - Trả về HTTP Status 200 với envelope:
     ```typescript
     res.status(200).json({
       success: true,
       data: healthData,
       meta: {
         timestamp: new Date().toISOString(),
         requestId: req.requestId,
       },
     });
     ```

6. **`routes/health.routes.ts`**:
   - Định nghĩa `router = Router()`.
   - `router.get("/", healthController.getHealth)`.
   - Không khai báo method khác để Express router mặc định trả 404 cho `POST /api/v1/health` mà không làm sập server (đáp ứng `TC-T2-BC-03`).

7. **`app.ts`**:
   - Lắp ghép chuỗi middleware theo đúng thứ tự:
     1. `requestIdMiddleware`
     2. `requestLoggerMiddleware`
     3. `securityMiddlewares`
     4. Tuyến đường Health Check: Gắn ở **cả 2 đường dẫn**:
        ```typescript
        app.use("/api/v1/health", healthRouter);
        app.use("/health", healthRouter);
        ```
     5. `notFoundHandler`
     6. `errorHandler`
   - Export `app` độc lập để phục vụ kiểm thử đơn vị / integration tests.

8. **`server.ts`**:
   - Khởi tạo HTTP server bằng `http.createServer(app)`.
   - Lắng nghe trên `env.PORT`.
   - Cài đặt Graceful Shutdown cho `SIGINT` và `SIGTERM`:
     - Gọi `server.close(...)` dừng nhận kết nối mới.
     - Ngắt kết nối `await prisma.$disconnect()`.
     - Đặt timeout dự phòng 5 giây (`setTimeout(() => process.exit(1), 5000).unref()`) giải phóng port ngay lập tức (đáp ứng `TC-T4-RW-03`).

### 2.4. Quy chuẩn ESM NodeNext & Môi trường Windows
1. **Đuôi mở rộng `.js` bắt buộc**:
   - Với `"module": "NodeNext"`, TypeScript giữ nguyên đường dẫn import trong code sinh ra. Mọi lệnh import tương đối giữa các file `.ts` nội bộ bắt buộc phải ghi rõ đuôi `.js`:
     - Ví dụ: `import { env } from "./config/env.js";` (KHÔNG ĐƯỢC viết `./config/env`)
     - Ví dụ: `import healthRoutes from "./routes/health.routes.js";`
     - Không được dùng directory import ngầm định (ví dụ `./config` bị cấm, phải là `./config/index.js` hoặc `./config/env.js`).
2. **Import gói nội bộ và thư viện bên thứ ba**:
   - Không dùng đuôi file cho tên package:
     `import { prisma } from "@bahau/database";`
     `import express from "express";`
3. **Môi trường Windows PowerShell**:
   - Mọi câu lệnh cài đặt, sinh mã, build phải dùng `npm.cmd` và `npx.cmd`.

---

## 3. Caveats (Lưu ý kỹ thuật & Vấn đề tiềm ẩn)

1. **Khởi chạy API khi Database Docker chưa bật**:
   - `tests/e2e/tier2-boundary-corner/boundary-corner.test.mjs` kiểm tra trường hợp DB ngắt kết nối (`TC-T2-BC-05`).
   - Tầng `health.service.ts` phải bắt ngoại lệ `PrismaClientInitializationError` / socket error trong `try/catch` và gán `database = "disconnected"` mà vẫn trả về `HTTP 200` với `status: "ok"`. Không được để promise unhandled làm crash process Node.js.
2. **Ưu tiên biến môi trường `PORT`**:
   - Trong file `.env`, biến là `API_PORT=4000`. Nhưng test runner E2E truyền `PORT: "4008"` qua biến môi trường của tiến trình con. Vì vậy trong `env.ts`, bắt buộc phải kiểm tra `process.env.PORT` trước `process.env.API_PORT`.
3. **Cài đặt gói mới vào Monorepo**:
   - Khi `apps/api/package.json` được tạo mới, cần chạy lệnh `npm.cmd install` tại thư mục gốc để npm workspaces tải và liên kết các package `express`, `cors`, `helmet`, `cookie-parser`, `dotenv`, `uuid` cùng các `@types/*` tương ứng vào `node_modules`.

---

## 4. Conclusion (Kết luận & Thiết kế Mã nguồn Chi tiết cho Worker M2)

Toàn bộ thông số kỹ thuật và thiết kế mã nguồn cho `apps/api` đã được khảo sát tường tận và đối chiếu 100% với các ca kiểm thử E2E (AC4, Boundary, Cross-feature, Real-world).

Dưới đây là đặc tả mã nguồn chi tiết từng file để `worker_m2_1` có thể triển khai ngay lập tức:

### File 1: `apps/api/package.json`
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
    "clean": "node -e \"fs.rmSync('dist', { recursive: true, force: true })\"",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@bahau/contracts": "*",
    "@bahau/database": "*",
    "cookie-parser": "^1.4.7",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "helmet": "^8.0.0",
    "uuid": "^11.1.0",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.8",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^22.13.9",
    "@types/uuid": "^10.0.0",
    "tsx": "^4.19.3",
    "typescript": "^5.7.3"
  }
}
```

### File 2: `apps/api/tsconfig.json`
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

### File 3: `apps/api/src/config/env.ts`
```typescript
import dotenv from "dotenv";
import path from "node:path";

// Load root .env first, then local .env if available
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config();

const parsePort = (): number => {
  if (process.env["PORT"]) {
    const p = parseInt(process.env["PORT"], 10);
    if (!isNaN(p)) return p;
  }
  if (process.env["API_PORT"]) {
    const p = parseInt(process.env["API_PORT"], 10);
    if (!isNaN(p)) return p;
  }
  return 4000;
};

export const env = {
  PORT: parsePort(),
  NODE_ENV: process.env["NODE_ENV"] || "development",
  CORS_ORIGIN: process.env["CORS_ORIGIN"] || "http://localhost:3000",
  SESSION_SECRET: process.env["SESSION_SECRET"] || "bahau_super_secure_session_secret_key_dau_2026",
  COOKIE_DOMAIN: process.env["COOKIE_DOMAIN"] || "localhost",
  API_PREFIX: process.env["API_PREFIX"] || "/api/v1",
  isProduction: process.env["NODE_ENV"] === "production",
  isTest: process.env["NODE_ENV"] === "test",
};
```

### File 4: `apps/api/src/types/express.d.ts`
```typescript
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export {};
```

### File 5: `apps/api/src/errors/AppError.ts`
```typescript
export interface ErrorDetail {
  field?: string;
  message: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ErrorDetail[];
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: ErrorDetail[],
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found") {
    super(404, "RESOURCE_NOT_FOUND", message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string = "Validation failed", details?: ErrorDetail[]) {
    super(422, "VALIDATION_FAILED", message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required") {
    super(401, "UNAUTHENTICATED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access forbidden") {
    super(403, "FORBIDDEN", message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = "Conflict with current state") {
    super(409, "CONFLICT_STATE", message);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = "Bad request", details?: ErrorDetail[]) {
    super(400, "BAD_REQUEST", message, details);
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = "Internal server error") {
    super(500, "INTERNAL_SERVER_ERROR", message, undefined, false);
  }
}
```

### File 6: `apps/api/src/middlewares/requestId.middleware.ts`
```typescript
import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { v7 as uuidv7 } from "uuid";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const existingId = req.headers["x-request-id"];
  let reqId: string;

  if (typeof existingId === "string" && UUID_REGEX.test(existingId)) {
    reqId = existingId;
  } else if (Array.isArray(existingId) && existingId[0] && UUID_REGEX.test(existingId[0])) {
    reqId = existingId[0];
  } else {
    // Generate UUIDv7
    if (typeof (crypto as any).randomUUIDv7 === "function") {
      reqId = (crypto as any).randomUUIDv7();
    } else {
      reqId = uuidv7();
    }
  }

  req.requestId = reqId;
  res.setHeader("X-Request-Id", reqId);
  next();
};
```

### File 7: `apps/api/src/middlewares/security.middleware.ts`
```typescript
import express, { type RequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "../config/env.js";

export const securityMiddlewares: RequestHandler[] = [
  helmet({
    contentSecurityPolicy: env.isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }),
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id", "Idempotency-Key"],
    exposedHeaders: ["X-Request-Id"],
  }),
  cookieParser(env.SESSION_SECRET),
  express.json({ limit: "10mb" }),
  express.urlencoded({ extended: true, limit: "10mb" }),
];
```

### File 8: `apps/api/src/middlewares/requestLogger.middleware.ts`
```typescript
import type { Request, Response, NextFunction } from "express";

export const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    const reqId = req.requestId || "-";
    const logLine = `[BAHAU] [${new Date().toISOString()}] [${reqId}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`;
    if (res.statusCode >= 500) {
      console.error(logLine);
    } else if (res.statusCode >= 400) {
      console.warn(logLine);
    } else {
      console.log(logLine);
    }
  });
  next();
};
```

### File 9: `apps/api/src/middlewares/errorHandler.middleware.ts`
```typescript
import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError, NotFoundError } from "../errors/AppError.js";

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
};

export const errorHandler: ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = req.requestId || "00000000-0000-0000-0000-000000000000";
  const timestamp = new Date().toISOString();

  // 1. Known AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
        timestamp,
      },
    });
    return;
  }

  // 2. Zod Validation Error
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
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

  // 3. Fallback Unknown Internal Error
  console.error(`[Unhandled Error] [${requestId}]:`, err);
  const isProduction = process.env["NODE_ENV"] === "production";
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: isProduction ? "Lỗi xử lý nội bộ phía máy chủ." : err?.message || "Internal server error",
      requestId,
      timestamp,
    },
  });
};
```

### File 10: `apps/api/src/services/health.service.ts`
```typescript
import { prisma } from "@bahau/database";

export interface HealthCheckResult {
  status: "ok" | "degraded";
  uptime: number;
  version: string;
  database: "connected" | "disconnected";
}

export class HealthService {
  public async checkHealth(): Promise<HealthCheckResult> {
    let dbStatus: "connected" | "disconnected" = "disconnected";

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = "connected";
    } catch (err) {
      console.warn("[HealthService] Database connection check failed:", err);
      dbStatus = "disconnected";
    }

    return {
      status: "ok",
      uptime: Number(process.uptime().toFixed(2)),
      version: "1.0.0",
      database: dbStatus,
    };
  }
}

export const healthService = new HealthService();
```

### File 11: `apps/api/src/controllers/health.controller.ts`
```typescript
import type { Request, Response, NextFunction } from "express";
import { healthService } from "../services/health.service.js";

export class HealthController {
  public getHealth = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data = await healthService.checkHealth();
      res.status(200).json({
        success: true,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

export const healthController = new HealthController();
```

### File 12: `apps/api/src/routes/health.routes.ts`
```typescript
import { Router } from "express";
import { healthController } from "../controllers/health.controller.js";

const router = Router();

// GET / returns health status
router.get("/", healthController.getHealth);

export default router;
```

### File 13: `apps/api/src/app.ts`
```typescript
import express, { type Express } from "express";
import { requestIdMiddleware } from "./middlewares/requestId.middleware.js";
import { requestLoggerMiddleware } from "./middlewares/requestLogger.middleware.js";
import { securityMiddlewares } from "./middlewares/security.middleware.js";
import healthRoutes from "./routes/health.routes.js";
import { notFoundHandler, errorHandler } from "./middlewares/errorHandler.middleware.js";

export const createApp = (): Express => {
  const app = express();

  // 1. Request tracing
  app.use(requestIdMiddleware);

  // 2. Request logger
  app.use(requestLoggerMiddleware);

  // 3. Security and body parsers
  app.use(securityMiddlewares);

  // 4. Routes mounting (mounted at both /api/v1/health and /health)
  app.use("/api/v1/health", healthRoutes);
  app.use("/health", healthRoutes);

  // 5. 404 Route Not Found
  app.use(notFoundHandler);

  // 6. Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export default createApp();
```

### File 14: `apps/api/src/server.ts`
```typescript
import http from "node:http";
import app from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "@bahau/database";

const server = http.createServer(app);

server.listen(env.PORT, () => {
  console.log(`[BAHAU API] Server listening on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
  console.log(`[BAHAU API] Health endpoint ready at http://localhost:${env.PORT}/api/v1/health`);
});

const handleShutdown = (signal: string) => {
  console.log(`[BAHAU API] Received ${signal}. Starting graceful shutdown...`);

  const forceTimeout = setTimeout(() => {
    console.error("[BAHAU API] Forced shutdown due to timeout.");
    process.exit(1);
  }, 5000);
  forceTimeout.unref();

  server.close(async () => {
    console.log("[BAHAU API] HTTP server closed.");
    try {
      await prisma.$disconnect();
      console.log("[BAHAU API] Database connection closed.");
    } catch (err) {
      console.error("[BAHAU API] Error disconnecting database:", err);
    }
    process.exit(0);
  });
};

process.on("SIGINT", () => handleShutdown("SIGINT"));
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
```

---

## 5. Verification Method (Phương pháp kiểm chứng độc lập cho Worker M2)

Sau khi `worker_m2_1` tạo các tệp theo thiết kế trên, chạy chuỗi kiểm chứng sau:

1. **Cài đặt phụ thuộc & liên kết workspace**:
   ```powershell
   npm.cmd install
   npm.cmd ls --workspaces
   ```
   *Kỳ vọng*: `@bahau/api@1.0.0 -> .\apps\api` xuất hiện trong danh sách workspace.

2. **Kiểm tra biên dịch TypeScript**:
   ```powershell
   npm.cmd run build --workspace=@bahau/api
   npm.cmd run build
   ```
   *Kỳ vọng*: Thoát mã 0, sinh ra thư mục `apps/api/dist/` sạch sẽ không có lỗi kiểu dữ liệu.

3. **Chạy bộ kiểm thử E2E trực tiếp cho Express API (Tier 1 AC4)**:
   ```powershell
   node tests/e2e/runner.mjs --tier=1 --criterion=ac4
   ```
   *Kỳ vọng*: Đạt 5/5 test cases:
   - `TC-T1-AC4-01`: apps/api package manifest and source entrypoints exist (PASS)
   - `TC-T1-AC4-02`: Express API boots successfully and listens on port 4000 (PASS)
   - `TC-T1-AC4-03`: GET /api/v1/health returns HTTP status 200 and application/json (PASS)
   - `TC-T1-AC4-04`: Health JSON body matches standard schema contract (PASS)
   - `TC-T1-AC4-05`: Response includes tracing X-Request-Id and security headers (PASS)

4. **Chạy kiểm thử Boundary & Corner Cases (Tier 2)**:
   ```powershell
   node tests/e2e/runner.mjs --tier=2
   ```
   *Kỳ vọng*: Vượt qua các test case liên quan đến API: `TC-T2-BC-01` (PORT=4008), `TC-T2-BC-02` (404 error envelope), `TC-T2-BC-03` (POST /health rejected gracefully), `TC-T2-BC-04` (X-Request-Id custom propagation), `TC-T2-BC-05` (Database disconnection resilience).

5. **Chạy kiểm thử Cross-Feature (Tier 3)**:
   ```powershell
   node tests/e2e/runner.mjs --tier=3
   ```
   *Kỳ vọng*: `TC-T3-XF-01`, `TC-T3-XF-02` (contracts dep), `TC-T3-XF-03` (database dep) đều PASS.

6. **Chạy kiểm thử Real-World Concurrency & Graceful Shutdown (Tier 4)**:
   ```powershell
   node tests/e2e/runner.mjs --tier=4
   ```
   *Kỳ vọng*: `TC-T4-RW-01` (cold boot <= 15s), `TC-T4-RW-02` (50 burst concurrent requests), `TC-T4-RW-03` (graceful shutdown release port <= 5s) đều PASS.
