# WORKLOG — Dự án BAHAU (Hệ thống QTNS Trường ĐH Kiến trúc Đà Nẵng)

---

## Phiên 1 — 16/09/2026 (20:57 – 22:46)

### ✅ Đã hoàn thành

#### 1. Phỏng vấn & Chốt 10 quyết định thiết kế (/grill-me)

| # | Quyết định | Kết quả |
|---|-----------|---------|
| 1 | Bắt đầu từ đâu | Tài liệu đặc tả nghiệp vụ trước, rồi mới code |
| 2 | Phạm vi tài liệu | Kiến trúc tổng thể + Ma trận phân quyền trước, rồi đi sâu từng phân hệ |
| 3 | Cơ chế kiêm nhiệm | 3 Không gian (Cá nhân / Quản lý đơn vị / HR-Admin) + bộ chọn đơn vị |
| 4 | Workflow phê duyệt | Phân cấp tự động (Hierarchical Escalation), chống tự phê duyệt |
| 5 | Xác thực (Auth) | Stateful Session — Cookie HttpOnly lưu SessionId trong PostgreSQL |
| 6 | Contract/DTO | Zod làm Single Source of Truth trong `packages/contracts` |
| 7 | AI Provider | Adapter linh hoạt — chưa triển khai đợt này |
| 8 | Lưu trữ file | Local Disk + Storage Interface, truy cập qua Express có kiểm tra quyền |
| 9 | Mã nhân sự | `DAU{YY}{0000}` (ví dụ DAU260001), cố định suốt đời công tác |
| 10 | Self-service hồ sơ | SĐT/địa chỉ sửa trực tiếp; bằng cấp/học hàm qua workflow 2 cấp |

#### 2. Tài liệu đặc tả đã tạo (docs/)

- `docs/architecture/system-overview.md` — Kiến trúc tổng thể, 3-Space UX, Auth, Outbox, File Storage
- `docs/architecture/domain-model.md` — Mô hình thực thể lõi, 15+ entities, sổ cái bất biến, 3 tầng chấm công
- `docs/requirements/rbac-matrix.md` — Ma trận phân quyền 5 vai trò, 4 scope, chuỗi phê duyệt phân cấp
- `docs/requirements/api-standards.md` — RESTful, Zod contracts, Response Envelope, Error Codes, Pagination
- `docs/requirements/module-01-core-hr-prd.md` — PRD Phân hệ 1: 10 User Stories, 20 API endpoints, tiêu chí nghiệm thu

#### 3. Mã nguồn — Milestone 1 (HOÀN THÀNH ✅)

- **`packages/contracts`** (Build ✅): Zod schemas cho Auth, Employee, Unit, Common (Pagination/Response/Error)
- **`packages/database`** (Build ✅):
  - `prisma/schema.prisma` — 15 models, 14 enums (User, Session, Role, Permission, Employee, OrgUnit, Position, Assignment, Contract, Event, Outbox, Audit...)
  - `prisma/seed.ts` — Seed Data bám sát cơ cấu ĐH Kiến trúc Đà Nẵng (BGH, Khoa KT, Khoa XD, Bộ môn, Phòng TCHC, Phòng ĐT, 5 tài khoản 5 vai trò)
  - `src/client.ts` — PrismaClient singleton export
  - Prisma Client sinh thành công qua `npm run db:generate`
- **Root Monorepo**: package.json (npm workspaces), tsconfig.base.json, docker-compose.yml (PostgreSQL + pgvector), .env.example, .gitignore

#### 4. Hạ tầng kiểm thử (Đã tạo khung)

- `tests/e2e/runner.mjs` — Runner E2E 40 test cases
- `tests/e2e/` — 4 tầng: tier1-feature, tier2-boundary, tier3-cross, tier4-real-world
- `TEST_INFRA.md`, `TEST_READY.md` — Tài liệu kiểm thử

---

## ❌ Chưa hoàn thành — TIẾP TỤC TỪ ĐÂY

> **Teamwork Agent bị dừng do hết quota API lúc 22:21.**
> Toàn bộ kết quả Milestone 1 đã được lưu đầy đủ trong repo.

### Milestone 2 — Backend API (`apps/api`) ← BẮT ĐẦU TỪ ĐÂY

- [ ] Khởi tạo thư mục `apps/api` với Express 5 + TypeScript
- [ ] Cấu trúc phân tầng: routes/, controllers/, services/, middlewares/
- [ ] Middleware: CORS, Helmet, cookie-parser, Request-Id (UUIDv7)
- [ ] Centralized Error Handler theo api-standards.md
- [ ] Endpoint `GET /api/v1/health` (kết nối DB, trả JSON chuẩn)
- [ ] Build TypeScript thành công

### Milestone 3 — Frontend Web (`apps/web`)

- [ ] Khởi tạo Next.js 16 App Router + Tailwind CSS + TypeScript
- [ ] Trang chủ hiển thị tổng quan BAHAU + trạng thái kết nối API
- [ ] Giao diện cổng đăng nhập cơ bản (form email/password)
- [ ] Build thành công

### Milestone 4 — Tích hợp & Nghiệm thu

- [ ] Chạy toàn bộ bộ kiểm thử E2E (40 test cases, 4 tầng)
- [ ] Xác nhận `npm run build` toàn workspace thành công
- [ ] Health endpoint trả HTTP 200 với JSON chuẩn
- [ ] Next.js render trang không lỗi runtime

### Sau đó (nếu còn thời gian)

- [ ] Viết PRD cho Phân hệ 2: Nghỉ phép, Công tác, Sổ cái số dư phép (Leave Ledger)
- [ ] Triển khai Auth endpoints: POST /api/v1/auth/login, POST /api/v1/auth/logout
- [ ] Triển khai CRUD endpoints cho Employee và OrgUnit

---

## Cấu trúc thư mục hiện tại

```
BAHAU/
├── docs/
│   ├── architecture/
│   │   ├── system-overview.md      ✅
│   │   └── domain-model.md         ✅
│   ├── requirements/
│   │   ├── rbac-matrix.md          ✅
│   │   ├── api-standards.md        ✅
│   │   └── module-01-core-hr-prd.md ✅
│   └── plan/
│       └── init.md                 ✅ (Kế hoạch gốc)
├── packages/
│   ├── contracts/                  ✅ Build OK
│   │   └── src/ (auth, employee, unit, common)
│   └── database/                   ✅ Build OK
│       ├── prisma/schema.prisma    (15 models, 14 enums)
│       ├── prisma/seed.ts          (Seed Data DAU)
│       └── src/client.ts           (PrismaClient singleton)
├── apps/
│   ├── api/                        ❌ CHƯA TẠO ← Làm tiếp từ đây
│   └── web/                        ❌ CHƯA TẠO
├── tests/e2e/                      ✅ Khung sẵn sàng
├── storage/uploads/                ✅
├── docker-compose.yml              ✅ PostgreSQL + pgvector
├── package.json                    ✅ npm workspaces
├── tsconfig.base.json              ✅
├── .env.example                    ✅
└── .gitignore                      ✅
```
