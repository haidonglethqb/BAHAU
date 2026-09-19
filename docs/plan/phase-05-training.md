# KẾ HOẠCH TRIỂN KHAI CHI TIẾT GIAI ĐOẠN 5
## Quản lý Đào tạo, Bồi dưỡng & Chứng chỉ (Training & Certification)
### Dự án BAHAU — Trường Đại học Kiến trúc Đà Nẵng (DAU)

---

## 🎯 1. MỤC TIÊU & TIÊU CHÍ HOÀN THÀNH (DOD)
- [x] **Đặc tả PRD Phân hệ 6**: Hoàn thành `docs/requirements/module-06-training-prd.md`.
- [x] **Prisma Schema & CSDL (`@bahau/database`)**:
  - [x] Thêm 5 enums: `CertificateType`, `CertificateStatus`, `TrainingCategory`, `TrainingCourseStatus`, `ParticipantStatus`.
  - [x] Thêm 3 models: `Certificate`, `TrainingCourse`, `TrainingParticipant`.
  - [x] Thiết lập quan hệ với `Employee` (CBGV sở hữu, người thẩm định TCHC, học viên tham gia).
  - [x] Sinh Prisma client `npm run db:generate`.
  - [x] Nạp dữ liệu khởi tạo seed data: 7 quyền Training & Certificate, 3 khóa đào tạo mẫu (BIM Revit, Sư phạm, Giảng viên chính), 4 chứng chỉ mẫu.
- [x] **Zod Contracts SSoT (`@bahau/contracts`)**:
  - [x] Khai báo enums Zod: `CertificateTypeEnum`, `CertificateStatusEnum`, `TrainingCategoryEnum`, `TrainingCourseStatusEnum`, `ParticipantStatusEnum`, `CertificateExpiryAlertStatusEnum`.
  - [x] Khai báo input schemas: `CreateCertificateSchema`, `VerifyCertificateSchema`, `CreateTrainingCourseSchema`, `RegisterTrainingCourseSchema`, `CertificateFilterQuerySchema`.
  - [x] Khai báo DTOs: `CertificateDtoSchema`, `CertificateDetailDtoSchema`, `TrainingCourseDtoSchema`, `TrainingParticipantDtoSchema`.
  - [x] Xuất bản trong `packages/contracts/src/index.ts` và biên dịch `tsc` sạch 0 lỗi.
- [x] **Backend API (`@bahau/api`)**:
  - [x] `TrainingService`:
    - `getMyCertificates`: Danh sách chứng chỉ của cá nhân kèm tính toán cảnh báo hạn dùng.
    - `submitCertificate`: Khai báo chứng chỉ mới (trạng thái `PENDING`).
    - `getAllCertificates`: Tra cứu chứng chỉ toàn trường với Scope đơn vị.
    - `verifyCertificate`: Thẩm định chứng chỉ (`VERIFIED` hoặc `REJECTED`).
    - `getExpiringCertificates`: Thống kê chứng chỉ sắp hết hạn trong 30/60/90 ngày.
    - `getCourses`: Tra cứu khóa đào tạo bồi dưỡng.
    - `createCourse`: Tạo khóa bồi dưỡng mới (Phòng TCHC).
    - `registerCourse`: Đăng ký tham gia khóa học.
  - [x] Controllers & Routes:
    - `GET /api/v1/training/certificates/my`
    - `POST /api/v1/training/certificates`
    - `GET /api/v1/training/certificates`
    - `PUT /api/v1/training/certificates/:id/verify`
    - `GET /api/v1/training/certificates/expiring`
    - `GET /api/v1/training/courses`
    - `POST /api/v1/training/courses`
    - `POST /api/v1/training/courses/:id/register`
  - [x] Đăng ký routes và biên dịch `tsc` sạch 0 lỗi.
- [x] **Frontend Web UI (`@bahau/web`)**:
  - [x] Trang `/training`: Không gian cá nhân (Tab chứng chỉ cá nhân + Modal nộp mới + Tab khóa bồi dưỡng + Nút đăng ký).
  - [x] Trang `/training/manage`: Không gian Quản trị & TCHC (Thống kê, cảnh báo 30/60/90 ngày, Modal thẩm định chứng chỉ, Quản lý khóa đào tạo).
  - [x] Cập nhật menu điều hướng `layout.tsx` và trang chủ `page.tsx`.
  - [x] Next.js 15 production build thành công (Code 0).
- [x] **Kiểm thử Tích hợp & Nghiệm thu**:
  - [x] Bộ kiểm thử tự động `tests/training-endpoints.test.mjs` (PASS 100%).
  - [x] Chạy toàn bộ các test suites hiện có không lỗi (`kpi`, `attendance`, `contracts`, `leave`).
  - [x] `node tests/e2e/runner.mjs --all` đạt 100% PASS (40/40 tests).

---

## 🛠️ 2. PHÂN CÔNG THI CÔNG CHI TIẾT THEO CÁC GÓI

```
packages/database/prisma/schema.prisma
  ├── enum CertificateType, CertificateStatus, TrainingCategory, TrainingCourseStatus, ParticipantStatus
  ├── model Certificate
  ├── model TrainingCourse
  └── model TrainingParticipant

packages/contracts/src/training/index.ts
  ├── CertificateTypeEnum, CertificateStatusEnum, TrainingCategoryEnum, TrainingCourseStatusEnum, ParticipantStatusEnum, CertificateExpiryAlertStatusEnum
  ├── CreateCertificateSchema, VerifyCertificateSchema, CreateTrainingCourseSchema, RegisterTrainingCourseSchema
  └── CertificateDtoSchema, CertificateDetailDtoSchema, TrainingCourseDtoSchema, TrainingParticipantDtoSchema

apps/api/src/
  ├── services/training.service.ts
  ├── controllers/training.controller.ts
  └── routes/v1/training.routes.ts

apps/web/src/
  ├── app/training/page.tsx
  ├── app/training/manage/page.tsx
  └── app/layout.tsx
```
