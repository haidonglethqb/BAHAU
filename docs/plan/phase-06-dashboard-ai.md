# KẾ HOẠCH TRIỂN KHAI CHI TIẾT GIAI ĐOẠN 6
## Dashboard Điều hành Lãnh đạo, Outbox Worker & Trợ lý ảo AI (Executive Dashboard, Outbox Worker & DAU Policy AI Assistant)
### Dự án BAHAU — Trường Đại học Kiến trúc Đà Nẵng (DAU)

---

## 🎯 1. MỤC TIÊU & TIÊU CHÍ HOÀN THÀNH (DOD)
- [x] **Đặc tả PRD Phân hệ 7**: Hoàn thành `docs/requirements/module-07-dashboard-ai-prd.md`.
- [x] **Prisma Schema & CSDL (`@bahau/database`)**:
  - [x] Thêm model `Notification`: Lưu thông báo gửi cho người dùng (`userId`, `title`, `content`, `type`, `isRead`, `metadata`, `createdAt`).
  - [x] Thêm model `PolicyKnowledge`: Cơ sở tri thức pháp quy DAU (`documentNo`, `title`, `category`, `chunkText`, `keywords`, `metadata`, `effectiveDate`, `createdAt`).
  - [x] Thiết lập quan hệ với `User` cho `Notification`.
  - [x] Sinh Prisma client `npm run db:generate`.
  - [x] Bổ sung seed data:
    - 7 quyền mới cho Dashboard, Notification, AI Assistant và Worker.
    - Dữ liệu tri thức quy chế chuẩn DAU: Giờ chuẩn giảng viên KTS (270h), Chế độ nghỉ phép thường niên & thâm niên, Chế độ nâng bậc lương định kỳ & trước hạn, Quy chế đánh giá KPI tối đa 20% Loại A, Tiêu chuẩn chứng chỉ hành nghề KTS/Kỹ sư.
- [x] **Zod Contracts SSoT (`@bahau/contracts`)**:
  - [x] Khai báo enums Zod: `NotificationTypeEnum`, `PolicyCategoryEnum`.
  - [x] Khai báo Dashboard DTOs: `DashboardOverviewDtoSchema`, `WorkforceStatsDtoSchema`, `ExecutiveAlertsDtoSchema`.
  - [x] Khai báo Notification DTOs: `NotificationDtoSchema`, `MarkNotificationReadSchema`.
  - [x] Khai báo AI Assistant DTOs: `AiChatRequestSchema`, `AiChatResponseSchema`, `PolicyKnowledgeDtoSchema`.
  - [x] Xuất bản trong `packages/contracts/src/index.ts` và biên dịch `tsc` sạch 0 lỗi.
- [x] **Backend API (`@bahau/api`)**:
  - [x] `DashboardService`:
    - `getOverview`: Tổng quan số liệu CBGV, tỷ lệ hoạt động, tỷ lệ học vị cao, tỷ lệ chứng chỉ hành nghề.
    - `getWorkforceStats`: Cơ cấu vị trí việc làm, học vị, chức danh, loại hợp đồng và luân chuyển biến động gần đây.
    - `getExecutiveAlerts`: Tổng hợp cảnh báo tập trung (hợp đồng 30/60 ngày, chứng chỉ quá hạn/sắp hết hạn, hồ sơ chờ duyệt).
  - [x] `OutboxService`:
    - `processBatch`: Quét sự kiện `PENDING` trong `outbox_events`, chuyển sang `PROCESSING`, dispatch tạo `Notification`, mô phỏng gửi email, cập nhật `PROCESSED` hoặc ghi lỗi `FAILED` (tối đa 3 lần retry).
    - `getMyNotifications`: Lấy danh sách thông báo và số lượng chưa đọc.
    - `markAsRead`: Đánh dấu thông báo đã đọc.
    - `markAllAsRead`: Đánh dấu toàn bộ thông báo đã đọc.
  - [x] `AiAssistantService`:
    - `chat`: Tìm kiếm tri thức quy chế DAU theo từ khóa/ngữ nghĩa, trả về câu trả lời kèm trích dẫn văn bản số/điều khoản cụ thể. Tích hợp tra cứu số dư phép cá nhân và đề xuất đơn nháp có yêu cầu xác nhận.
    - `getPolicies`: Danh sách các điều khoản quy chế DAU tra cứu.
  - [x] Controllers & Routes:
    - `GET /api/v1/dashboard/overview`
    - `GET /api/v1/dashboard/workforce-stats`
    - `GET /api/v1/dashboard/alerts`
    - `POST /api/v1/worker/outbox/process-batch`
    - `GET /api/v1/notifications/my`
    - `PATCH /api/v1/notifications/:id/read`
    - `POST /api/v1/notifications/read-all`
    - `POST /api/v1/ai/chat`
    - `GET /api/v1/ai/policies`
  - [x] Đăng ký routes và biên dịch `tsc` sạch 0 lỗi.
- [x] **Frontend Web UI (`@bahau/web`)**:
  - [x] Trang `/dashboard`: Executive Dashboard dành cho Lãnh đạo Trường & Trưởng đơn vị:
    - 4 thẻ KPI tổng quan (Tổng nhân sự, Tỷ lệ Tiến sĩ/Thạc sĩ, Tỷ lệ CCHN KTS/Kỹ sư, Tỷ lệ CBGV hoạt động).
    - Biểu đồ phân bố Trình độ chuyên môn & Chức danh học thuật.
    - Biểu đồ cơ cấu hợp đồng lao động & danh sách biến động nhân sự gần đây.
    - Trung tâm cảnh báo điều hành tập trung (Centralized Alert Stream) cho hợp đồng & chứng chỉ.
  - [x] Trang `/ai-assistant`: Trợ lý ảo AI Quy chế DAU:
    - Giao diện trò chuyện trực tiếp (Chat Interface).
    - Hộp câu hỏi gợi ý nhanh chuẩn DAU.
    - Thẻ trích dẫn số hiệu văn bản DAU.
    - Hộp xác nhận đơn nháp (Draft Preview Box) an toàn.
  - [x] Notification Bell trên Header: Hiển thị badge số thông báo chưa đọc, dropdown danh sách thông báo và thao tác đánh dấu đã đọc.
  - [x] Cập nhật menu điều hướng `layout.tsx` và trang chủ `page.tsx`.
  - [x] Next.js 15 production build thành công (Code 0).
- [x] **Kiểm thử Tích hợp & Nghiệm thu**:
  - [x] Bộ kiểm thử tự động `tests/dashboard-ai-endpoints.test.mjs` (PASS 100%).
  - [x] Chạy toàn bộ các test suites hiện có không lỗi (`training`, `kpi`, `attendance`, `contracts`, `leave`).
  - [x] `node tests/e2e/runner.mjs --all` đạt 100% PASS (40/40 tests).

---

## 🛠️ 2. KIẾN TRÚC MÃ NGUỒN THEO PHÂN LỚP

```
packages/database/prisma/
  ├── schema.prisma (bổ sung model Notification, PolicyKnowledge)
  └── seed.ts (bổ sung permissions, PolicyKnowledge data DAU)

packages/contracts/src/
  ├── dashboard/ (DashboardOverviewDto, WorkforceStatsDto, ExecutiveAlertsDto)
  ├── notification/ (NotificationDto, MarkNotificationReadSchema)
  ├── ai/ (AiChatRequestSchema, AiChatResponseSchema, PolicyKnowledgeDto)
  └── index.ts (re-export)

apps/api/src/
  ├── services/
  │   ├── dashboard.service.ts
  │   ├── outbox.service.ts
  │   └── ai-assistant.service.ts
  ├── controllers/
  │   ├── dashboard.controller.ts
  │   ├── notification.controller.ts
  │   ├── worker.controller.ts
  │   └── ai.controller.ts
  ├── routes/v1/
  │   ├── dashboard.routes.ts
  │   ├── notification.routes.ts
  │   ├── worker.routes.ts
  │   ├── ai.routes.ts
  │   └── index.ts
  └── worker/
      └── outbox-worker.ts (Background worker daemon / runner)

apps/web/src/
  ├── app/
  │   ├── dashboard/page.tsx (Executive Dashboard)
  │   ├── ai-assistant/page.tsx (DAU Policy AI Assistant)
  │   └── layout.tsx (Header Notification Bell)
  └── components/
      └── NotificationDropdown.tsx

tests/
  └── dashboard-ai-endpoints.test.mjs
```
