# KẾ HOẠCH TRIỂN KHAI CHI TIẾT GIAI ĐOẠN 2
## Quản lý Hợp đồng Lao động & Diễn biến Công tác (Employment Contracts & Career Events)
### Dự án BAHAU — Trường Đại học Kiến trúc Đà Nẵng (DAU)

---

## 🎯 1. MỤC TIÊU & TIÊU CHÍ HOÀN THÀNH (DOD)
- [x] **Đặc tả PRD Phân hệ 3**: Hoàn thành `docs/requirements/module-03-contracts-events-prd.md`.
- [x] **Zod Contracts (`@bahau/contracts`)**: Khai báo và xuất bản schemas cho Contract, Renew Contract, Contract Filters, Contract DTOs, Employment Event Schemas & DTOs.
- [x] **CSDL & Seed Data (`@bahau/database`)**: Bổ sung hợp đồng mẫu đa dạng (không thời hạn, có thời hạn, chuỗi gia hạn RENEWED -> ACTIVE, hợp đồng sắp hết hạn trong 30/60 ngày) và sự kiện công tác mẫu cho CBGV DAU.
- [x] **Backend API (`@bahau/api`)**:
  - `ContractService`: Danh sách hợp đồng có phân trang & lọc theo thời hạn cảnh báo 30/60/90 ngày, chi tiết hợp đồng + cây phả hệ gia hạn, tạo hợp đồng mới, gia hạn hợp đồng liên kết chuỗi bất biến trong `prisma.$transaction`.
  - `EmploymentEventService`: Lấy dòng thời gian sự kiện công tác, ghi nhận sự kiện mới kèm tự động đồng bộ phân công công tác (`EmploymentAssignment`).
  - Controllers & Routes: `GET /api/v1/contracts`, `GET /api/v1/contracts/summary/alerts`, `GET /api/v1/contracts/:id`, `POST /api/v1/contracts`, `POST /api/v1/contracts/:id/renew`, `GET /api/v1/employees/:id/events`, `POST /api/v1/employees/:id/events`.
- [x] **Frontend Web UI (`@bahau/web`)**:
  - Trang `/contracts`: Thống kê KPI, bộ lọc tab cảnh báo hết hạn 30/60/90 ngày, bảng quản trị hợp đồng, Modal tạo mới hợp đồng, Modal gia hạn hợp đồng, Modal xem cây chuỗi hợp đồng liên kết.
  - Trang `/employees/[id]`: Hồ sơ chi tiết nhân sự, tab Hợp đồng, tab Vertical Career Timeline diễn biến công tác sinh động.
  - Cập nhật Navigation header và trang chủ giới thiệu.
- [x] **Kiểm thử Tích hợp & E2E**:
  - Kịch bản kiểm thử tích hợp `tests/contract-events-endpoints.test.mjs` (PASS 100%).
  - Kịch bản kiểm thử tích hợp `tests/leave-workflow-endpoints.test.mjs` (PASS 100%).
  - Bộ kiểm thử E2E Monorepo `tests/e2e/runner.mjs --all` đạt 40/40 test cases PASS (100%).
  - Toàn bộ Monorepo build `npm run build` thành công 100% 0 lỗi.

---

## 🛠️ 2. PHÂN CÔNG THI CÔNG CHI TIẾT THEO CÁC GÓI

```
packages/contracts/src/contract/index.ts
  ├── ContractTypeEnum, ContractStatusEnum, EmploymentEventTypeEnum
  ├── CreateContractSchema, RenewContractSchema, ContractFilterQuerySchema
  ├── ContractDtoSchema, ContractDetailDtoSchema, ContractAlertSummaryDtoSchema
  └── CreateEmploymentEventSchema, EmploymentEventDtoSchema

packages/database/prisma/seed.ts
  ├── Seed EmploymentContracts (Không thời hạn, 12M, 36M, Chuỗi gia hạn, Cảnh báo 30/60 ngày)
  └── Seed EmploymentEvents (HIRED, APPOINTED, TRANSFERRED, PROMOTED)

apps/api/src/
  ├── services/
  │     ├── contract.service.ts
  │     └── employment-event.service.ts
  ├── controllers/
  │     ├── contract.controller.ts
  │     └── employment-event.controller.ts
  └── routes/v1/
        ├── contract.routes.ts
        ├── employee.routes.ts (mở rộng /events)
        └── index.ts

apps/web/src/
  ├── app/
  │     ├── contracts/page.tsx
  │     ├── employees/[id]/page.tsx
  │     ├── employees/page.tsx (thêm liên kết xem timeline)
  │     └── layout.tsx
  └── components/
```
