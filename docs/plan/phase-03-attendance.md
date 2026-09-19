# KẾ HOẠCH TRIỂN KHAI CHI TIẾT GIAI ĐOẠN 3
## Quản lý Chấm công & Điều chỉnh công (Attendance & Timesheets)
### Dự án BAHAU — Trường Đại học Kiến trúc Đà Nẵng (DAU)

---

## 🎯 1. MỤC TIÊU & TIÊU CHÍ HOÀN THÀNH (DOD) — [HOÀN THÀNH 100% 🎉]
- [x] **Đặc tả PRD Phân hệ 4**: Hoàn thành `docs/requirements/module-04-attendance-prd.md`.
- [x] **Prisma Schema & CSDL (`@bahau/database`)**:
  - [x] Thêm `enum AttendanceStatus` (`PRESENT`, `LATE`, `EARLY_LEAVE`, `ABSENT`, `ON_LEAVE`, `BUSINESS_TRIP`, `HOLIDAY`, `WEEKEND`).
  - [x] Thêm `model AttendancePeriod`, `model AttendanceRecord`, `model AttendanceAdjustmentRequest`, `model MonthlyTimesheetSummary`.
  - [x] Thiết lập quan hệ với `Employee`.
  - [x] Sinh Prisma client `npm run db:generate`.
  - [x] Nạp dữ liệu khởi tạo seed data cho kỳ công mẫu Tháng 9/2026 và Tháng 8/2026 đã khóa.
- [x] **Zod Contracts SSoT (`@bahau/contracts`)**:
  - [x] Khai báo các schemas: `CreateAttendanceAdjustmentSchema`, `ImportAttendanceBatchSchema`, `LockPeriodSchema`, `AttendanceRecordDtoSchema`, `AttendanceMonthDtoSchema`, `MonthlyTimesheetSummaryDtoSchema`.
  - [x] Xuất bản trong `packages/contracts/src/index.ts` và biên dịch `tsc` (Code 0).
- [x] **Backend API (`@bahau/api`)**:
  - [x] `AttendanceService`:
    - `getMyMonthlyAttendance`: Tính toán và trả về bảng công chi tiết theo ngày kèm đối soát tự động đơn nghỉ phép và công tác.
    - `getUnitAttendance`: Quản trị viên/Lãnh đạo đơn vị xem bảng công của nhân sự trực thuộc theo Scope.
    - `createAdjustmentRequest`: Nộp đơn giải trình và kích hoạt workflow phê duyệt đa cấp.
    - `importAttendanceData`: Nhập dữ liệu quẹt thẻ thô từ thiết bị biometric/file.
    - `lockPeriod`: Khóa kỳ công chốt bảng tính lương bất biến (immutable).
  - [x] Tích hợp `WorkflowService.startAdjustmentWorkflow`, hook duyệt tự động cập nhật công `ATTENDANCE_ADJUSTMENT`.
  - [x] Controllers & Routes:
    - `GET /api/v1/attendance/me`
    - `GET /api/v1/attendance/unit`
    - `POST /api/v1/attendance/adjustments`
    - `POST /api/v1/attendance/import`
    - `POST /api/v1/attendance/lock-period`
  - [x] Đăng ký routes và biên dịch `tsc` (Code 0).
- [x] **Frontend Web UI (`@bahau/web`)**:
  - [x] Trang `/attendance`: Bảng chấm công cá nhân dạng danh sách và lịch công, 6 thẻ KPI công tháng, modal nộp đơn giải trình, danh sách đơn giải trình.
  - [x] Trang `/attendance/manage`: Quản trị bảng công đơn vị, modal import dữ liệu quẹt thẻ biometric, nút chốt & khóa kỳ công bất biến.
  - [x] Cập nhật menu điều hướng `layout.tsx` và trang chủ `page.tsx` (Space 1 & Space 3).
  - [x] Next.js 15 App Router production build sạch 100% (Code 0).
- [x] **Kiểm thử Tích hợp & Nghiệm thu**:
  - [x] Bộ kiểm thử tự động `tests/attendance-endpoints.test.mjs` (PASS 7/7 tests).
  - [x] Kiểm tra hồi quy `tests/contract-events-endpoints.test.mjs` (PASS 6/6 tests).
  - [x] Kiểm tra hồi quy `tests/leave-workflow-endpoints.test.mjs` (PASS 6/6 tests).
  - [x] Chạy toàn bộ 4 Tiers test suites `node tests/e2e/runner.mjs --all` đạt 100% PASS (40/40 tests).

---

## 🛠️ 2. PHÂN CÔNG THI CÔNG CHI TIẾT THEO CÁC GÓI

```
packages/database/prisma/schema.prisma
  ├── enum AttendanceStatus
  ├── model AttendancePeriod
  ├── model AttendanceRecord
  ├── model AttendanceAdjustmentRequest
  └── model MonthlyTimesheetSummary

packages/contracts/src/attendance/index.ts
  ├── AttendanceStatusEnum
  ├── CreateAttendanceAdjustmentSchema
  ├── ImportAttendanceBatchSchema, LockPeriodSchema
  └── AttendanceRecordDtoSchema, AttendanceMonthDtoSchema, MonthlyTimesheetSummaryDtoSchema

apps/api/src/
  ├── services/attendance.service.ts
  ├── controllers/attendance.controller.ts
  └── routes/v1/attendance.routes.ts

apps/web/src/
  ├── app/attendance/page.tsx
  ├── app/attendance/manage/page.tsx
  └── app/layout.tsx
```
