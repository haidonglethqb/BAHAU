# KẾ HOẠCH TRIỂN KHAI CHI TIẾT GIAI ĐOẠN 1
## Động cơ Workflow Dùng chung & Quản lý Nghỉ phép, Công tác (Leave & Trip)
### Dự án BAHAU — Trường Đại học Kiến trúc Đà Nẵng (DAU)

---

## 🎯 1. MỤC TIÊU & TIÊU CHÍ HOÀN THÀNH (DOD)
- [x] **Đặc tả PRD Phân hệ 2**: Hoàn thành `docs/requirements/module-02-leave-trip-prd.md`.
- [x] **Zod Contracts (`@bahau/contracts`)**: Mở rộng DTOs cho Leave, Trip, Workflow Steps, Workflow Timeline, Leave Ledger History.
- [x] **CSDL & Seed Data (`@bahau/database`)**: Cấp hạn ngạch ngày phép năm 2026 cho toàn bộ CBGV mẫu; nạp đơn mẫu và các bước workflow.
- [x] **Backend API (`@bahau/api`)**:
  - `LeaveLedgerService`: Sổ cái kép bất biến (`GRANT_ANNUAL`, `HOLD`, `USE`, `RESTORE`), tính `remaining` chính xác.
  - `WorkflowService`: Cơ chế chống tự duyệt Anti-Self-Approval, tìm người duyệt theo chuỗi quản lý phân cấp, phê duyệt đa bước, từ chối kèm lý do, hủy đơn.
  - `LeaveService`: Tạo đơn nghỉ phép, danh sách cá nhân, chi tiết đơn + timeline, hủy đơn, số dư phép, sổ cái cá nhân.
  - `TripService`: Đăng ký công tác, danh sách cá nhân, chi tiết công tác + timeline, hủy đơn.
  - Controller & Routes: `POST /leave/requests`, `GET /leave/requests/my`, `GET /leave/requests/:id`, `POST /leave/requests/:id/cancel`, `GET /leave/balance/my`, `GET /leave/ledger/my`, `POST /trips/requests`, `GET /trips/requests/my`, `GET /trips/requests/:id`, `POST /trips/requests/:id/cancel`, `GET /workflow/pending`, `GET /workflow/instances/:id`, `POST /workflow/steps/:id/approve`, `POST /workflow/steps/:id/reject`.
- [x] **Frontend Web UI (`@bahau/web`)**:
  - Trang `/leave`: Thống kê số dư phép, form nộp đơn có tính ngày tự động, danh sách đơn có timeline dialog, tab sổ cái ngày phép.
  - Trang `/trips`: Form đăng ký đi công tác, danh sách chuyến công tác kèm trạng thái duyệt.
  - Trang `/approvals`: Hộp thư tác vụ phê duyệt tập trung cho Lãnh đạo Khoa, Phòng TCHC, Ban Giám hiệu.
  - Cập nhật Navigation header và trang chủ giới thiệu.
- [x] **Kiểm thử tích hợp & E2E**:
  - Kịch bản kiểm thử tích hợp `tests/leave-workflow-endpoints.test.mjs`.
  - Toàn bộ Monorepo build `npm run build` thành công 100%.

---

## 🛠️ 2. PHÂN CÔNG THI CÔNG CHI TIẾT THEO CÁC PACKAGE

```
packages/contracts/src/leave/index.ts
  ├── LeaveTypeEnum, WorkflowStatusEnum, LeaveLedgerActionEnum
  ├── CreateLeaveRequestSchema, LeaveRequestDtoSchema, LeaveRequestDetailDtoSchema
  ├── LeaveBalanceDtoSchema, LeaveLedgerEntryDtoSchema
  ├── CreateTripRequestSchema, BusinessTripDtoSchema, BusinessTripDetailDtoSchema
  ├── WorkflowApprovalActionSchema, WorkflowRejectionActionSchema
  └── WorkflowStepDetailDtoSchema, WorkflowInstanceDetailDtoSchema, PendingWorkflowTaskDtoSchema

packages/database/prisma/seed.ts
  ├── Seed LeaveLedger (Hạn ngạch phép năm 2026 cho 6 CBGV mẫu)
  └── Seed LeaveRequest & BusinessTripRequest mẫu kèm WorkflowSteps đa trạng thái

apps/api/src/
  ├── services/
  │     ├── leave-ledger.service.ts
  │     ├── workflow.service.ts
  │     └── leave.service.ts
  ├── controllers/
  │     ├── leave.controller.ts
  │     └── workflow.controller.ts
  └── routes/v1/
        ├── leave.routes.ts
        └── workflow.routes.ts

apps/web/src/
  ├── app/
  │     ├── leave/page.tsx
  │     ├── trips/page.tsx
  │     ├── approvals/page.tsx
  │     └── layout.tsx
  └── components/
```
