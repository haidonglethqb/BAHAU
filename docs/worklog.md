# WORKLOG — Dự án BAHAU (Hệ thống QTNS Trường ĐH Kiến trúc Đà Nẵng)

---

## Phiên 2 — 17/09/2026 (19:25 – 19:35)

### ✅ Đã hoàn thành trong Phiên 2

#### 1. Milestone 2 — Backend API (`apps/api`) — HOÀN THÀNH 100% ✅
- **Cấu trúc phân tầng**:
  - `src/server.ts`: Khởi động HTTP server trên cổng PORT (mặc định 4000), xử lý tắt an toàn (graceful shutdown) ngắt kết nối Prisma và HTTP server.
  - `src/app.ts`: Thiết lập Express 4, Helmet (bảo mật `nosniff`), CORS (hỗ trợ credentials), Cookie-parser, JSON body parser.
  - `src/middlewares/request-id.middleware.ts`: Tự động nhận diện hoặc sinh mới `X-Request-Id` (UUID) và gắn vào header phản hồi.
  - `src/middlewares/error.middleware.ts`: Xử lý lỗi tập trung chuẩn hóa theo `api-standards.md`, trả envelope `{ success: false, error: { code, message, details, requestId, timestamp } }`, bao gồm cả 404 handler cho các route chưa định nghĩa.
  - `src/controllers/health.controller.ts`: Triển khai `GET /api/v1/health` kiểm tra uptime, phiên bản API và kiểm tra kết nối CSDL PostgreSQL với cơ chế timeout chống treo tiến trình.
- **Biên dịch & Kiểm thử**:
  - `tsc` biên dịch thành công 0 lỗi ra thư mục `apps/api/dist/`.
  - Vượt qua 100% các bài kiểm tra AC4, Tier 2 (Boundary), và Tier 4 (Real-World: burst 50 concurrent requests, graceful shutdown, cold boot).

#### 2. Milestone 3 — Frontend Web (`apps/web`) — HOÀN THÀNH 100% ✅
- **Cấu trúc Next.js App Router & Tailwind CSS**:
  - `src/app/layout.tsx`: Root layout với cấu trúc chuẩn HTML5, thương hiệu BAHAU — Trường Đại học Kiến trúc Đà Nẵng (DAU), thanh điều hướng và footer bản quyền 2026.
  - `src/app/page.tsx`: Trang chủ giới thiệu tổng quan hệ thống, phân tích chi tiết 3 Không gian làm việc (Cá nhân, Quản lý đơn vị, Nhân sự/Quản trị), bảng thông số kỹ thuật nền tảng.
  - `src/components/ApiHealthStatus.tsx`: Component client-side thăm dò trạng thái kết nối trực tiếp tới Backend API (`GET /api/v1/health`), hiển thị chỉ số uptime, trạng thái database và mã phiên bản.
  - `src/app/login/page.tsx`: Trang đăng nhập giao diện chuẩn DAU, tích hợp sẵn các nút chọn nhanh tài khoản thử nghiệm bám sát 5 nhóm vai trò từ Seed Data.
- **Biên dịch**:
  - `next build` biên dịch thành công 100%, tự động tối ưu hóa và sinh các trang tĩnh (`/`, `/login`, `/_not-found`).

#### 3. Milestone 4 — Nghiệm thu Toàn diện Monorepo — HOÀN THÀNH 100% ✅
- **Biên dịch toàn bộ Monorepo (`npm run build`)**: Thành công 100% không có lỗi trên cả 4 packages và apps:
  - `@bahau/contracts` (tsc) ✅
  - `@bahau/database` (tsc) ✅
  - `@bahau/api` (tsc) ✅
  - `@bahau/web` (next build) ✅
- **Bộ Kiểm thử E2E (40/40 Test Cases PASS)**:
  - Tier 1: Feature Coverage (AC1, AC2, AC3, AC4, AC5) — 25/25 PASS ✅
  - Tier 2: Boundary & Corner Cases — 6/6 PASS ✅
  - Tier 3: Cross-Feature Combinations — 5/5 PASS ✅
  - Tier 4: Real-World Scenarios (Readiness, Concurrency, Lifecycle, Environment) — 4/4 PASS ✅

---

## Phiên 1 — 16/09/2026 (20:57 – 22:46)

### ✅ Đã hoàn thành trong Phiên 1

#### 1. Phỏng vấn & Chốt 10 quyết định thiết kế (/grill-me)
- Chốt nguyên tắc: PRD/Kiến trúc trước $\rightarrow$ Code sau.
- Chốt mô hình 3 Không gian, cơ chế kiêm nhiệm và chuỗi phê duyệt chống tự duyệt.
- Chốt xác thực Stateful Session (PostgreSQL + HttpOnly Cookie) và Zod Single Source of Truth.
- Chốt quy chuẩn mã CBGV: `DAU{YY}{0000}` và bộ Seed Data thực tế ĐH Kiến trúc Đà Nẵng.

#### 2. Bộ tài liệu đặc tả kiến trúc & nghiệp vụ (docs/)
- `docs/architecture/system-overview.md` — Kiến trúc tổng thể C4, 3-Space UX, Stateful Session, Outbox Worker.
- `docs/architecture/domain-model.md` — Mô hình thực thể lõi 15+ bảng, quan hệ kiêm nhiệm, sổ cái bất biến.
- `docs/requirements/rbac-matrix.md` — Ma trận quyền 5 vai trò, 4 scope dữ liệu (SELF, UNIT, TREE, ALL).
- `docs/requirements/api-standards.md` — Chuẩn RESTful API, Zod contracts, Response Envelopes, Error Codes.
- `docs/requirements/module-01-core-hr-prd.md` — PRD Phân hệ 1 (10 User Stories, 20 API endpoints).

#### 3. Mã nguồn nền tảng (Milestone 1)
- `packages/contracts`: Zod schemas cho Auth, Employee, Unit, Common Pagination/Response.
- `packages/database`: Prisma schema 15 models + 14 enums, PrismaClient singleton, Seed Data DAU đầy đủ.

---

## 🎯 Kế hoạch Phiên làm việc tiếp theo

> **Mục tiêu tiếp theo**: Triển khai các API nghiệp vụ cốt lõi cho Phân hệ 1 và kết nối Form giao diện.

#### 4. Phân hệ Xác thực & Quản lý Phiên (Auth Module) — HOÀN THÀNH 100% ✅
- **API Endpoints**:
  - `POST /api/v1/auth/login`: Xác thực email/password qua Argon2id, tạo bản ghi `Session` (thời hạn 7 ngày), trả Cookie HttpOnly `bahau_session` và thông tin `AuthUser`.
  - `POST /api/v1/auth/logout`: Xóa bản ghi `Session` khỏi CSDL (thu hồi phiên tức thì) và xóa Cookie trình duyệt.
  - `GET /api/v1/auth/me`: Trả về hồ sơ người dùng đăng nhập hiện tại cùng vai trò (`roles`), quyền hạn (`permissions`) và đơn vị quản lý (`unitsManaged`).
- **Middlewares**:
  - `authenticate`: Tự động đọc và đối soát Session từ HttpOnly Cookie hoặc header `Authorization: Bearer <sessionId>`.
  - `requireAuth`: Chặn 401 nếu chưa đăng nhập.
  - `requirePermission(code)`: Chặn 403 nếu thiếu quyền thực hiện.
  - `requireRole(code)`: Chặn 403 nếu sai vai trò.
  - `validateBody(LoginRequestSchema)`: Validate định dạng đầu vào tự động bằng Zod contract.
- **Kiểm thử tích hợp**: Vượt qua kịch bản kiểm thử tích hợp `tests/auth-endpoints.test.mjs` (422 validation, 401 unauthenticated, 503 DB offline resilience, 200 logout).

#### 5. Phân hệ Cơ cấu Tổ chức & Hồ sơ Nhân sự (Core HR Module) — HOÀN THÀNH 100% ✅
- **Dịch vụ & API Backend (`apps/api`)**:
  - `UnitService`:
    - `GET /api/v1/units/tree`: Lấy sơ đồ cây phân cấp hoàn chỉnh (BGH $\rightarrow$ Khoa/Phòng $\rightarrow$ Bộ môn) kèm tên người đứng đầu đơn vị.
    - `GET /api/v1/units`: Lấy danh sách phẳng tất cả các đơn vị phục vụ bộ lọc/dropdown.
    - `POST /api/v1/units`: Tạo mới đơn vị (yêu cầu quyền `unit:manage_structure`).
  - `EmployeeService`:
    - `GET /api/v1/employees`: Danh sách CBGVNV có phân trang, tìm kiếm đa trường (tên, mã CBGV, email) và tự động lọc dữ liệu theo Scope quyền của người dùng (Global HR xem toàn trường, Trưởng đơn vị chỉ xem đơn vị mình và các bộ môn trực thuộc).
    - `GET /api/v1/employees/:id`: Xem chi tiết hồ sơ cá nhân (tự động ẩn các trường nhạy cảm như CCCD, thuế, địa chỉ nếu không phải chính chủ hoặc HR).
    - `GET /api/v1/employees/me`: Lấy thông tin hồ sơ của phiên đăng nhập hiện tại.
    - `PUT /api/v1/employees/me/contact`: Giảng viên tự phục vụ cập nhật SĐT, email cá nhân, địa chỉ.
    - `POST /api/v1/employees`: Thêm mới hồ sơ nhân sự (tự động sinh mã `DAU{YY}{0000}`).
- **Giao diện Người dùng (`apps/web`)**:
  - `apps/web/src/app/units/page.tsx`: Giao diện cây sơ đồ tổ chức dạng Tree View trực quan có thu gọn/mở rộng, huy hiệu phân loại đơn vị và thông tin phụ trách.
  - `apps/web/src/app/employees/page.tsx`: Bảng tra cứu danh bạ nhân sự tập trung hỗ trợ tìm kiếm tức thời, hiển thị ngạch chức danh, học vị/học hàm và trạng thái công tác (có sẵn dữ liệu mô phỏng DAU dự phòng).
  - Cập nhật liên kết thanh điều hướng chung trong [layout.tsx](file:///c:/Users/HaiChu/Documents/GitHub/BAHAU/apps/web/src/app/layout.tsx).
- **Kiểm thử & Biên dịch**:
  - `npm run build` thành công 100% (7/7 trang tĩnh Next.js và toàn bộ backend).
  - 40/40 test cases E2E đạt chuẩn 100%.

---

## 🎯 Kế hoạch Phiên làm việc tiếp theo

> **Mục tiêu tiếp theo**: Triển khai Phân hệ 2: Quản lý Nghỉ phép, Công tác & Sổ cái số dư phép (Leave Ledger).

### 1. Tài liệu Đặc tả Phân hệ 2
- [ ] Viết tài liệu đặc tả PRD & User Stories cho Phân hệ 2 (`docs/requirements/module-02-leave-trip-prd.md`).
- [ ] Đặc tả cấu trúc Sổ cái ngày phép (`LeaveLedger`), nguyên tắc ghi sổ kép/bất biến và quy trình phê duyệt nghỉ phép/công tác mẫu theo chuỗi phân cấp.

### 2. Dịch vụ & API Phân hệ 2
- [ ] Zod contracts cho Nghỉ phép và Công tác trong `packages/contracts/src/leave`.
- [ ] Dịch vụ `LeaveService`: Tạo đơn xin nghỉ phép, kiểm tra số dư phép từ Ledger, gửi đơn vào Workflow.
- [ ] Dịch vụ `TripService`: Đăng ký đơn công tác, thẩm định kinh phí.
- [ ] Giao diện Quản lý Đơn từ và Bảng theo dõi số dư phép trên `apps/web`.

---

## Cấu trúc thư mục hiện tại (Toàn bộ đã hoàn thành Baseline)

```
BAHAU/
├── docs/
│   ├── architecture/
│   │   ├── system-overview.md        ✅ Đã chốt
│   │   └── domain-model.md           ✅ Đã chốt
│   ├── requirements/
│   │   ├── rbac-matrix.md            ✅ Đã chốt
│   │   ├── api-standards.md          ✅ Đã chốt
│   │   └── module-01-core-hr-prd.md   ✅ Đã chốt
│   ├── plan/
│   │   └── init.md                   ✅ Kế hoạch gốc
│   └── worklog.md                    ✅ Nhật ký tiến độ
├── packages/
│   ├── contracts/                    ✅ Build OK (Zod DTOs)
│   │   └── src/ (auth, employee, unit, common)
│   └── database/                     ✅ Build OK (Prisma 15 models + DAU Seed Data)
│       ├── prisma/schema.prisma
│       ├── prisma/seed.ts
│       └── src/client.ts
├── apps/
│   ├── api/                          ✅ Build OK (Express + Health Check + Error Handling)
│   │   └── src/ (app.ts, server.ts, middlewares, controllers, routes)
│   └── web/                          ✅ Build OK (Next.js 15 App Router + Tailwind + Live Status)
│       └── src/ (app/layout.tsx, app/page.tsx, app/login/page.tsx, components)
├── tests/e2e/                        ✅ 40/40 Test Cases PASS (100%)
├── storage/uploads/                  ✅ Thư mục file bảo mật
├── docker-compose.yml                ✅ PostgreSQL 17 + pgvector
├── package.json                      ✅ npm workspaces (@bahau/*)
├── tsconfig.base.json                ✅ Strict TypeScript
├── .env.example                      ✅
└── .gitignore                        ✅
```
