# KẾ HOẠCH TRIỂN KHAI CHI TIẾT GIAI ĐOẠN 4
## Đánh giá KPI & Xếp loại Cán bộ (Performance & KPI Evaluation)
### Dự án BAHAU — Trường Đại học Kiến trúc Đà Nẵng (DAU)

---

## 🎯 1. MỤC TIÊU & TIÊU CHÍ HOÀN THÀNH (DOD)
- [x] **Đặc tả PRD Phân hệ 5**: Hoàn thành `docs/requirements/module-05-kpi-prd.md`.
- [x] **Prisma Schema & CSDL (`@bahau/database`)**:
  - [x] Thêm 4 enums: `KpiPeriodStatus`, `KpiTargetType`, `KpiEvaluationStatus`, `KpiRanking`.
  - [x] Thêm 5 models: `KpiPeriod`, `KpiTemplate`, `KpiCriterion`, `KpiEvaluation`, `KpiEvaluationItem`.
  - [x] Thiết lập quan hệ với `Employee` (CBGV được đánh giá và Quản lý đánh giá).
  - [x] Sinh Prisma client `npm run db:generate`.
  - [x] Nạp dữ liệu khởi tạo seed data: Mẫu tiêu chí Giảng viên (100đ), Mẫu tiêu chí Chuyên viên (100đ), Kỳ đánh giá Năm học 2025-2026, Phiếu tự đánh giá mẫu.
- [x] **Zod Contracts SSoT (`@bahau/contracts`)**:
  - [x] Khai báo các schemas: `CreateKpiPeriodSchema`, `SubmitSelfEvaluationSchema`, `ScoreManagerEvaluationSchema`, `FinalizeCouncilEvaluationSchema`, `KpiFilterQuerySchema`.
  - [x] Khai báo DTOs: `KpiPeriodDtoSchema`, `KpiTemplateDtoSchema`, `KpiCriterionDtoSchema`, `KpiEvaluationDtoSchema`, `KpiEvaluationDetailDtoSchema`.
  - [x] Xuất bản trong `packages/contracts/src/index.ts` và biên dịch `tsc` sạch 0 lỗi.
- [x] **Backend API (`@bahau/api`)**:
  - [x] `KpiService`:
    - `getPeriods`: Tra cứu danh sách kỳ đánh giá.
    - `createPeriod`: Mở kỳ đánh giá (yêu cầu quyền HR/Admin).
    - `getTemplates`: Lấy danh mục tiêu chí theo đối tượng `LECTURER` hoặc `STAFF`.
    - `getMyEvaluation`: Xem hoặc tự động khởi tạo phiếu đánh giá cá nhân theo đúng đối tượng CBGV.
    - `submitSelfEvaluation`: Lưu nháp hoặc nộp phiếu tự chấm điểm kèm link minh chứng.
    - `getUnitEvaluations`: Trưởng đơn vị xem danh sách phiếu của nhân sự trực thuộc theo Scope.
    - `scoreManagerEvaluation`: Trưởng đơn vị chấm điểm quản lý và nhận xét (chống tự chấm cho bản thân).
    - `finalizeEvaluation`: Hội đồng Thi đua / BGH chốt điểm và xếp loại thi đua A/B/C/D.
  - [x] Controllers & Routes:
    - `GET /api/v1/kpi/periods`
    - `POST /api/v1/kpi/periods`
    - `GET /api/v1/kpi/templates`
    - `GET /api/v1/kpi/evaluations/my`
    - `POST /api/v1/kpi/evaluations/my`
    - `GET /api/v1/kpi/evaluations/unit`
    - `PUT /api/v1/kpi/evaluations/:id/manager-score`
    - `PUT /api/v1/kpi/evaluations/:id/finalize`
  - [x] Đăng ký routes và biên dịch `tsc` sạch 0 lỗi.
- [x] **Frontend Web UI (`@bahau/web`)**:
  - [x] Trang `/kpi`: Phiếu tự đánh giá cá nhân, nhóm tiêu chí trực quan, ô nhập điểm tự chấm, ô link minh chứng, tính điểm tự động, nút lưu nháp & nộp duyệt.
  - [x] Trang `/kpi/manage`: Quản trị kỳ đánh giá, dashboard tỷ lệ nộp, modal Trưởng đơn vị chấm điểm quản lý, modal Hội đồng chốt điểm và xếp loại thi đua A/B/C/D.
  - [x] Cập nhật menu điều hướng `layout.tsx` và trang chủ `page.tsx`.
  - [x] Next.js 15 production build thành công (Code 0).
- [x] **Kiểm thử Tích hợp & Nghiệm thu**:
  - [x] Bộ kiểm thử tự động `tests/kpi-endpoints.test.mjs` (PASS 100%).
  - [x] Chạy toàn bộ các test suites hiện có không lỗi.
  - [x] `node tests/e2e/runner.mjs --all` đạt 100% PASS (40/40 tests).

---

## 🛠️ 2. PHÂN CÔNG THI CÔNG CHI TIẾT THEO CÁC GÓI

```
packages/database/prisma/schema.prisma
  ├── enum KpiPeriodStatus, KpiTargetType, KpiEvaluationStatus, KpiRanking
  ├── model KpiPeriod
  ├── model KpiTemplate
  ├── model KpiCriterion
  ├── model KpiEvaluation
  └── model KpiEvaluationItem

packages/contracts/src/kpi/index.ts
  ├── KpiPeriodStatusEnum, KpiTargetTypeEnum, KpiEvaluationStatusEnum, KpiRankingEnum
  ├── CreateKpiPeriodSchema, SubmitSelfEvaluationSchema
  ├── ScoreManagerEvaluationSchema, FinalizeCouncilEvaluationSchema
  └── KpiPeriodDtoSchema, KpiTemplateDtoSchema, KpiEvaluationDtoSchema, KpiEvaluationDetailDtoSchema

apps/api/src/
  ├── services/kpi.service.ts
  ├── controllers/kpi.controller.ts
  └── routes/v1/kpi.routes.ts

apps/web/src/
  ├── app/kpi/page.tsx
  ├── app/kpi/manage/page.tsx
  └── app/layout.tsx
```
