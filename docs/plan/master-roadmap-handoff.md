# KẾ HOẠCH BÀN GIAO THI CÔNG HỆ THỐNG BAHAU (MASTER ROADMAP & AGENT HANDOFF)
**Hệ thống Quản trị Nhân sự Thông minh — Trường Đại học Kiến trúc Đà Nẵng (DAU)**  
*Tài liệu hướng dẫn chi tiết dành cho các Agent / Lập trình viên tiếp quản triển khai các phân hệ tiếp theo.*

---

## 📌 1. TỔNG QUAN HIỆN TRẠNG & BỐI CẢNH DỰ ÁN

### 1.1. Công nghệ cốt lõi
- **Kiến trúc**: Monorepo quản lý bằng **npm workspaces** (`packages/*`, `apps/*`).
- **Ngôn ngữ**: TypeScript 5.7+ cấu hình nghiêm ngặt (`strict: true`, ES2022, NodeNext).
- **Backend API** (`apps/api`): Express 4, Helmet, CORS, cookie-parser, Zod, Request-Id UUIDv7, Centralized Error Handling chuẩn envelope.
- **Frontend Web** (`apps/web`): Next.js 15 App Router, React 19, Tailwind CSS, kiến trúc 3 Không gian làm việc.
- **CSDL & ORM** (`packages/database`): PostgreSQL 17 + pgvector, Prisma ORM 6, mật khẩu Argon2id.
- **Hợp đồng DTO** (`packages/contracts`): Zod làm Single Source of Truth (SSoT) dùng chung giữa FE và BE.
- **Xác thực (Auth)**: Stateful Session — HttpOnly Cookie `bahau_session` lưu `Session` trong PostgreSQL, thời hạn 7 ngày.

### 1.2. Những phần ĐÃ HOÀN THÀNH (100% Sẵn sàng)
1. **Milestone 1**: Gói `@bahau/contracts` và `@bahau/database` (Prisma 15 models + DAU Seed Data bám sát thực tế cơ cấu ĐH Kiến trúc Đà Nẵng).
2. **Milestone 2**: Backend Express API (`apps/api`) kèm endpoint `GET /api/v1/health`.
3. **Milestone 3**: Frontend Web (`apps/web`) với trang chủ tổng quan, trang đăng nhập `/login` và component kiểm tra kết nối live.
4. **Phân hệ Auth**: `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, middleware `authenticate`, `requireAuth`, `requirePermission`, `requireRole`.
5. **Phân hệ Core HR cơ bản**:
   - `GET /units/tree`, `GET /units`, `POST /units`.
   - `GET /employees`, `GET /employees/:id`, `GET /employees/me`, `PUT /employees/me/contact`, `POST /employees`.
   - Giao diện tra cứu `/units` (Cây tổ chức) và `/employees` (Danh bạ CBGV).
6. **Kiểm thử & Git**: 40/40 test cases E2E đạt chuẩn 100%, file `.gitignore` đã được tinh chỉnh sạch sẽ.

---

## 🗺️ 2. LỘ TRÌNH 6 GIAI ĐOẠN THI CÔNG TIẾP THEO (PHASE ROADMAP)

```
[Hoàn thành: Core HR + Auth]
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 1: Workflow Engine + Nghỉ phép & Công tác (XONG ✅)│
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 2: Quản lý Hợp đồng & Diễn biến Công tác (Ưu tiên)│
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 3: Quản lý Chấm công & Điều chỉnh Công (XONG ✅) │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 4: Đánh giá KPI & Xếp loại Cán bộ (XONG ✅)       │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 5: Quản lý Đào tạo, Bồi dưỡng & Chứng chỉ (XONG ✅)│
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 6: Dashboard, Worker Thông báo & AI Assistant (Ưu tiên tiếp theo)│
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 CHI TIẾT CÁC GIAI ĐOẠN (SPECIFICATION CHO AGENT)

### 🟢 GIAI ĐOẠN 1: ĐỘNG CƠ WORKFLOW DÙNG CHUNG + NGHỈ PHÉP & CÔNG TÁC (ĐÃ HOÀN THÀNH 100% ✅)
> **Mục tiêu**: Xây dựng bộ máy phê duyệt đa cấp dùng chung và phân hệ Nghỉ phép/Công tác gắn với Sổ cái ngày phép bất biến (`LeaveLedger`). [Chi tiết PRD: `docs/requirements/module-02-leave-trip-prd.md`, Kế hoạch: `docs/plan/phase-01-workflow-leave-trip.md`].

#### 1. Đặc tả Kỹ thuật CSDL (Prisma Schema bổ sung)
- **Model `WorkflowInstance`**:
  - `id`: UUID, `module`: enum (`LEAVE`, `BUSINESS_TRIP`, `PROFILE_UPDATE`, `ATTENDANCE_ADJUSTMENT`, `CERTIFICATE_VERIFY`).
  - `recordId`: UUID (ID của bản ghi nghiệp vụ).
  - `requesterId`: UUID (Người gửi).
  - `currentStepIndex`: Int.
  - `status`: Enum (`PENDING`, `APPROVED`, `REJECTED`, `RETURNED`, `CANCELLED`).
  - `steps`: `WorkflowStep[]`.
- **Model `WorkflowStep`**:
  - `instanceId`: UUID, `stepIndex`: Int, `approverRoleId`: UUID?, `approverEmployeeId`: UUID?, `status`: Enum (`WAITING`, `APPROVED`, `REJECTED`, `SKIPPED`), `comment`: Text?, `actionAt`: DateTime?.
- **Model `LeaveRequest`**:
  - `employeeId`: UUID, `leaveType`: Enum (`ANNUAL`, `SICK`, `MATERNITY`, `UNPAID`, `BEREAVEMENT`, `WEDDING`, `ACADEMIC`).
  - `startDate`: Date, `endDate`: Date, `totalDays`: Decimal (hỗ trợ nửa ngày: 0.5), `reason`: Text, `substituteEmployeeId`: UUID? (người dạy/làm thay), `status`: Enum.
- **Model `LeaveLedger` (Sổ cái ngày phép bất biến)**:
  - `employeeId`: UUID, `year`: Int, `transactionType`: Enum (`GRANT_ANNUAL`, `CARRY_FORWARD`, `HOLD`, `USE`, `RESTORE`, `EXPIRE`).
  - `amount`: Decimal (số dương hoặc số âm), `balanceAfter`: Decimal, `referenceId`: UUID? (LeaveRequest.id), `note`: String, `createdAt`: DateTime.
- **Model `BusinessTripRequest`**:
  - `employeeId`: UUID, `purpose`: Text, `destination`: String, `startDate`: Date, `endDate`: Date, `budgetEstimate`: Decimal, `fundingSource`: String.

#### 2. Contracts (`packages/contracts/src/leave`)
- `CreateLeaveRequestSchema`: `leaveType`, `startDate`, `endDate`, `totalDays`, `reason`, `substituteEmployeeId`.
- `ApproveStepSchema`: `comment`: string optional.
- `RejectStepSchema`: `reason`: string (bắt buộc tối thiểu 5 ký tự).
- `CreateTripRequestSchema`: `purpose`, `destination`, `startDate`, `endDate`, `budgetEstimate`, `fundingSource`.

#### 3. Quy tắc Nghiệp vụ Bắt buộc (Crucial Business Rules)
1. **Anti-Self-Approval**: Nếu người nộp đơn chính là Trưởng đơn vị, bước duyệt đơn vị tự động chuyển thẳng lên Hiệu trưởng/Ban Giám hiệu hoặc cấp phó được ủy quyền.
2. **Double-entry Leave Ledger**:
   - Khi nộp đơn: Ghi giao dịch `HOLD` (tạm giữ số ngày phép tương ứng). Số dư khả dụng = Số dư thực - Tổng số phép đang HOLD. Nếu không đủ phép $\rightarrow$ Chặn không cho nộp đơn `ANNUAL`.
   - Khi đơn được duyệt xong cấp cuối: Ghi giao dịch `USE` (trừ phép chính thức), giải phóng `HOLD`.
   - Khi đơn bị từ chối hoặc hủy: Giải phóng `HOLD` mà không làm thay đổi số dư thực.

#### 4. API Endpoints cần viết (`apps/api`)
- `POST /api/v1/leave/requests`: Nộp đơn xin nghỉ phép.
- `GET /api/v1/leave/requests/my`: Danh sách đơn nghỉ phép của bản thân.
- `GET /api/v1/leave/balance/my`: Xem số dư phép năm, số ngày đã dùng, số ngày đang giữ chỗ.
- `POST /api/v1/trips/requests`: Đăng ký công tác.
- `GET /api/v1/workflow/pending`: Danh sách các đơn đang chờ người dùng hiện tại duyệt.
- `POST /api/v1/workflow/steps/:id/approve`: Phê duyệt bước hiện tại.
- `POST /api/v1/workflow/steps/:id/reject`: Từ chối đơn.

#### 5. Màn hình Frontend (`apps/web`)
- `/leave`: Bảng theo dõi số dư phép + Form nộp đơn xin nghỉ phép + Lịch sử đơn.
- `/trips`: Form đăng ký đi công tác.
- `/approvals`: Hộp thư tác vụ chờ phê duyệt (Inbox của Lãnh đạo khoa, Ban Giám hiệu, Phòng TCHC).

---

### 🟢 GIAI ĐOẠN 2: HỢP ĐỒNG LAO ĐỘNG & DIỄN BIẾN CÔNG TÁC (ĐÃ HOÀN THÀNH 100% ✅)
> **Mục tiêu**: Quản lý chuỗi hợp đồng lao động, cảnh báo hết hạn và lịch sử công tác (timeline). [Chi tiết PRD: `docs/requirements/module-03-contracts-events-prd.md`, Kế hoạch: `docs/plan/phase-02-contracts-events.md`].

#### 1. Dữ liệu & Nghiệp vụ
- Quản lý hợp đồng: Số hợp đồng, loại hợp đồng (`PROBATION`, `DEFINITE_TERM_12M`, `DEFINITE_TERM_36M`, `INDEFINITE_TERM`, `VISITING_LECTURER`), ngày ký, ngày hiệu lực, ngày kết thúc, tệp đính kèm.
- Không ghi đè hợp đồng cũ khi ký phụ lục hoặc gia hạn $\rightarrow$ tạo bản ghi mới liên kết chuỗi.
- Lọc hợp đồng sắp hết hạn (trong vòng 30, 60, 90 ngày tới) cho Phòng TCHC.
- Diễn biến công tác (`EmploymentEvent`): Bổ nhiệm, điều chuyển, kiêm nhiệm, khen thưởng, kỷ luật kèm số quyết định và ngày hiệu lực.

#### 2. API Endpoints
- `GET /api/v1/contracts`: Danh sách hợp đồng (lọc theo đơn vị, trạng thái, sắp hết hạn).
- `POST /api/v1/contracts`: Tạo mới hợp đồng nhân sự.
- `POST /api/v1/contracts/:id/renew`: Gia hạn hợp đồng / ký phụ lục.
- `GET /api/v1/employees/:id/events`: Lấy dòng thời gian diễn biến công tác của nhân sự.
- `POST /api/v1/employees/:id/events`: Ghi nhận quyết định điều chuyển / bổ nhiệm / kiêm nhiệm.

#### 3. Màn hình Frontend
- `/contracts`: Bảng quản trị hợp đồng, badge cảnh báo sắp hết hạn, modal gia hạn hợp đồng.
- Timeline hiển thị trực quan trong trang chi tiết nhân sự `/employees/[id]`.

---

### 🟢 GIAI ĐOẠN 3: QUẢN LÝ CHẤM CÔNG & ĐIỀU CHỈNH CÔNG (ĐÃ HOÀN THÀNH 100% ✅)
> **Mục tiêu**: Xử lý dữ liệu bảng công 3 lớp, đối chiếu phép/công tác và khóa kỳ công bất biến. [Chi tiết PRD: `docs/requirements/module-04-attendance-prd.md`, Kế hoạch: `docs/plan/phase-03-attendance.md`].

#### 1. Kiến trúc 3 Lớp Dữ liệu Chấm công
- **Lớp 1 (Raw Attendance)**: Dữ liệu điểm danh quẹt thẻ thô từ thiết bị biometric/file (`AttendanceRecord`). Tự động phân loại `PRESENT`, `LATE`, `EARLY_LEAVE`, `ABSENT`, `ON_LEAVE`, `BUSINESS_TRIP`, `HOLIDAY`, `WEEKEND`.
- **Lớp 2 (Adjustment Requests)**: Đơn giải trình / xin điều chỉnh công của CBGV (`AttendanceAdjustmentRequest`) tích hợp `WorkflowEngine` phê duyệt 2 cấp (Trưởng đơn vị $\rightarrow$ Phòng TCHC). Khi duyệt xong tự động cập nhật bản ghi Lớp 1.
- **Lớp 3 (Locked Timesheet)**: Bảng công tổng hợp chính thức (`MonthlyTimesheetSummary`) tính toán tổng ngày công hưởng lương = Đi làm thực tế + Nghỉ phép hưởng lương + Đi công tác. Khi Phòng TCHC khóa kỳ công (`isLocked = true`), toàn bộ dữ liệu trở thành BẤT BIẾN (immutable). Mọi đơn từ hoặc import mới trong kỳ đều bị chặn.

#### 2. API Endpoints
- `GET /api/v1/attendance/me`: Bảng công cá nhân, danh sách bản ghi quẹt thẻ và đơn giải trình trong tháng.
- `GET /api/v1/attendance/unit`: Bảng công tổng hợp toàn đơn vị cho Quản lý & Phòng TCHC (có kiểm tra Scope).
- `POST /api/v1/attendance/adjustments`: Gửi yêu cầu giải trình / điều chỉnh giờ công (kích hoạt workflow).
- `POST /api/v1/attendance/import`: Nhập dữ liệu quẹt thẻ thô hàng loạt từ thiết bị biometric.
- `POST /api/v1/attendance/lock-period`: Chốt & Khóa kỳ công của tháng (yêu cầu quyền HR Admin).

#### 3. Màn hình Frontend
- `/attendance`: Bảng chấm công cá nhân với 6 thẻ KPI, nhật ký quẹt thẻ theo ngày, nút giải trình từng ngày, lịch sử đơn giải trình và modal nộp đơn.
- `/attendance/manage`: Quản trị bảng công theo đơn vị/khoa/phòng, modal import dữ liệu quẹt thẻ biometric và nút khóa/mở khóa kỳ công bất biến.

---

### 🟢 GIAI ĐOẠN 4: ĐÁNH GIÁ KPI & XẾP LOẠI CÁN BỘ (ĐÃ HOÀN THÀNH 100% ✅)
> **Mục tiêu**: Đánh giá định kỳ theo mẫu tiêu chuẩn của Trường ĐH Kiến trúc Đà Nẵng (DAU). [Chi tiết PRD: `docs/requirements/module-05-kpi-prd.md`, Kế hoạch: `docs/plan/phase-04-kpi.md`].

#### 1. Quy trình Nghiệp vụ 4 Bước
1. Mở kỳ đánh giá (`KpiPeriod`: Học kỳ 1, Học kỳ 2 hoặc Năm học).
2. Gán mẫu đánh giá tự động theo vị trí công tác:
   - Mẫu Giảng viên (`LECTURER` - 100đ): Giảng dạy (40đ), Nghiên cứu khoa học (30đ), Phục vụ cộng đồng (15đ), Kỷ luật & Đạo đức (15đ).
   - Mẫu Nhân viên/Chuyên viên (`STAFF` - 100đ): Khối lượng công việc (35đ), Chất lượng & Sáng kiến (30đ), Tinh thần phục vụ (20đ), Kỷ luật công sở (15đ).
3. CBGV tự chấm điểm (`selfScore`) và đính kèm link/file minh chứng (`evidenceUrl`).
4. Trưởng khoa/phòng chấm điểm quản lý (`managerScore`) và nhận xét (chống tự chấm Anti-Self-Approval).
5. Hội đồng Thi đua / Ban Giám hiệu phê duyệt chốt điểm (`finalScore`) và xếp loại thi đua A/B/C/D (`FINALIZED`).
   - Loại A (`EXCELLENT` $\ge 90$đ, khống chế tối đa 20%).
   - Loại B (`GOOD` 70–89đ).
   - Loại C (`SATISFACTORY` 50–69đ).
   - Loại D (`UNSATISFACTORY` $< 50$đ).

#### 2. API Endpoints
- `GET /api/v1/kpi/periods`: Danh sách các kỳ đánh giá.
- `POST /api/v1/kpi/periods`: Tạo mới/mở kỳ đánh giá (yêu cầu HR/Admin).
- `GET /api/v1/kpi/templates`: Danh mục mẫu tiêu chí đánh giá theo đối tượng (`LECTURER` / `STAFF`).
- `GET /api/v1/kpi/evaluations/my`: Xem phiếu đánh giá cá nhân (tự động khởi tạo theo vị trí CBGV).
- `POST /api/v1/kpi/evaluations/my`: Lưu nháp hoặc nộp phiếu tự chấm điểm kèm link minh chứng.
- `GET /api/v1/kpi/evaluations/unit`: Danh sách đánh giá toàn đơn vị cho Trưởng đơn vị và Hội đồng.
- `PUT /api/v1/kpi/evaluations/:id/manager-score`: Trưởng đơn vị chấm điểm và nhận xét (chặn tự chấm).
- `PUT /api/v1/kpi/evaluations/:id/finalize`: Hội đồng chốt điểm và xếp loại thi đua A/B/C/D.

#### 3. Màn hình Frontend
- `/kpi`: Phiếu tự đánh giá cá nhân với thanh tiến độ 4 bước, live score counter / 100, form tiêu chí chi tiết theo chuyên mục, link minh chứng và nút lưu nháp / nộp duyệt.
- `/kpi/manage`: Không gian Quản lý Đơn vị & Hội đồng Thi đua với thống kê phân bổ A/B/C/D, danh sách CBGV toàn trường, modal Trưởng đơn vị chấm điểm quản lý, modal Hội đồng chốt kết quả ban hành.

#### 4. Kiểm thử Tích hợp
- `tests/kpi-endpoints.test.mjs`: PASS 6/6 test cases (Bảo mật 401, Zod schema validation, chuẩn điểm 100đ phân hóa Giảng viên/Chuyên viên, thuật toán phân hạng A/B/C/D, cơ chế Anti-Self-Approval, hạn ngạch 20% Loại A).

---

### 🟢 GIAI ĐOẠN 5: ĐÀO TẠO, BỒI DƯỠNG & CHỨNG CHỈ (ĐÃ HOÀN THÀNH 100% ✅)
> **Mục tiêu**: Quản lý các khóa học bồi dưỡng chuyên môn và chứng chỉ hành nghề, chức danh nghề nghiệp. [Chi tiết PRD: `docs/requirements/module-06-training-prd.md`, Kế hoạch: `docs/plan/phase-05-training.md`].

#### 1. Nghiệp vụ cốt lõi
- Phân loại 6 nhóm chứng chỉ chuẩn DAU (`PROFESSIONAL_PRACTICE`, `ACADEMIC_TITLE_DEGREE`, `LANGUAGE`, `INFORMATICS`, `POLITICAL_THEORY`, `OTHER`).
- Quy trình thẩm định 2 bước: CBGV nộp scan (`PENDING`) $\rightarrow$ Phòng TCHC kiểm tra văn bằng gốc và phê duyệt (`VERIFIED`) hoặc từ chối (`REJECTED`) kèm lý do.
- Công cụ Cảnh báo Hạn Chứng chỉ Chủ động (Certificate Expiry Alert Engine): Phân loại 5 mốc (`EXPIRED`, `CRITICAL_30`, `WARNING_60`, `WARNING_90`, `VALID`).
- Quản lý khóa đào tạo bồi dưỡng chuyên môn, nghiệp vụ sư phạm và Đề án 89.

#### 2. API Endpoints
- `GET /api/v1/training/certificates/my`: Danh sách chứng chỉ cá nhân của CBGV kèm cảnh báo hạn sử dụng.
- `POST /api/v1/training/certificates`: Khai báo / nộp chứng chỉ mới (mặc định `PENDING`).
- `GET /api/v1/training/certificates`: Danh sách chứng chỉ toàn trường với Scope đơn vị.
- `PUT /api/v1/training/certificates/:id/verify`: Phòng TCHC thẩm định chứng chỉ (`VERIFIED` / `REJECTED`).
- `GET /api/v1/training/certificates/expiring`: Danh sách chứng chỉ sắp hết hạn trong 30/60/90 ngày.
- `GET /api/v1/training/courses`: Danh sách khóa đào tạo bồi dưỡng.
- `POST /api/v1/training/courses`: Mở khóa đào tạo mới (Phòng TCHC).
- `POST /api/v1/training/courses/:id/register`: CBGV đăng ký tham gia khóa đào tạo.

#### 3. Màn hình Frontend
- `/training`: Không gian Cá nhân (Tab Chứng chỉ của tôi + Modal nộp chứng chỉ mới + Tab Khóa đào tạo mở đăng ký).
- `/training/manage`: Không gian Quản trị & Phòng TCHC (Thống kê, cảnh báo quá hạn/sắp hết hạn, Modal đối chiếu bản scan & thẩm định).

#### 4. Kiểm thử Tích hợp
- `tests/training-endpoints.test.mjs`: PASS 6/6 test cases (Bảo mật 401 trên 8 endpoints, Zod input validation, công cụ tính toán 5 mốc hạn dùng, vòng đời thẩm định chứng chỉ của HR Officer, chuẩn phân loại 6 nhóm chứng chỉ DAU, ràng buộc đăng ký khóa học).

---

### 🟢 GIAI ĐOẠN 6: DASHBOARD, WORKER THÔNG BÁO & AI ASSISTANT (ĐÃ HOÀN THÀNH 100% ✅)
> **Mục tiêu**: Dashboard điều hành cho Lãnh đạo, gửi email tự động và Trợ lý ảo RAG thông minh. [Chi tiết PRD: `docs/requirements/module-07-dashboard-ai-prd.md`, Kế hoạch: `docs/plan/phase-06-dashboard-ai.md`].

#### 1. Dashboard Điều hành (`apps/web/src/app/dashboard`)
- Biểu đồ và thẻ phân bố trình độ (Tiến sĩ 20.1%, Thạc sĩ 62.6%, Cử nhân/KTS/Kỹ sư 17.3%, tỷ lệ trình độ cao 82.7% vượt chuẩn kiểm định ĐH).
- Thống kê tỷ lệ chức danh (Giáo sư, Phó Giáo sư, Giảng viên chính) & Vị trí việc làm (Giảng viên 72.9%, Chuyên viên 20.6%, Quản lý 6.5%).
- Cơ cấu Hợp đồng lao động và Nhật ký biến động nhân sự mới nhất từ `EmploymentEvent`.
- Trung tâm cảnh báo điều hành tập trung: Hợp đồng sắp hết hạn (60 ngày), Chứng chỉ cần gia hạn (30/60/90 ngày) và Hồ sơ hành chính chờ duyệt.

#### 2. Background Worker & Transactional Outbox
- Quản lý bảng `outbox_events` và `notifications` trong PostgreSQL.
- Tiến trình Worker chạy định kỳ: Đọc sự kiện chưa gửi $\rightarrow$ dispatch sinh `Notification` in-app $\rightarrow$ mô phỏng gửi email $\rightarrow$ cập nhật trạng thái `PROCESSED` hoặc `FAILED` có cơ chế retry tối đa 3 lần.
- Endpoint `POST /api/v1/worker/outbox/process-batch` và chuông thông báo realtime trên Header Next.js.

#### 3. AI Assistant (DAU Policy RAG Agent)
- Lưu trữ cơ sở tri thức 5 văn bản pháp quy nền tảng DAU: QĐ 128 (giờ chuẩn giảng viên 270h), QĐ 45 (nghỉ phép thường niên 12 ngày & thâm niên), QyĐ 89 (nâng bậc lương định kỳ & trước hạn), QĐ 210 (KPI khống chế 20% Loại A), QyĐ 15 (tiêu chuẩn CCHN KTS/Kỹ sư).
- Chatbot hỗ trợ RAG: Tra cứu số dư phép cá nhân trực tiếp từ Sổ cái, giải đáp quy định nội bộ kèm trích dẫn văn bản số hiệu DAU cụ thể.
- Hỗ trợ tạo đơn nháp an toàn có bước người dùng xác nhận (`CONFIRMATION_REQUIRED` $\rightarrow$ `SUBMITTED`) trước khi ghi vào hệ thống.

#### 4. Kiểm thử Tích hợp
- `tests/dashboard-ai-endpoints.test.mjs`: PASS 6/6 test cases (Bảo mật 401 trên 7 endpoints, Zod schema validation, công thức tính tỷ lệ học vị ĐH, cơ chế retry tối đa 3 lần của Outbox, RAG trích dẫn 5 văn bản DAU, Human-in-the-loop draft proposal safety).

---

### 🟢 GIAI ĐOẠN 7: HỆ THỐNG GIAO DIỆN KIẾN TRÚC SWISS & ĐỒNG BỘ THƯ MỤC `Complete my task/` (ĐÃ HOÀN THÀNH 100% ✅)
> **Mục tiêu**: Chuẩn hóa toàn bộ giao diện Next.js (`apps/web`) khớp chuẩn thẩm mỹ, cấu trúc 3 Không gian làm việc và thành phần từ thư mục thiết kế `Complete my task/`, loại bỏ triệt để các thuật ngữ phát triển (technical/debug terms), khớp với toàn bộ các tính năng nghiệp vụ đã triển khai.

#### 1. Hệ thống Design Tokens Chuẩn (Swiss & Academic Prestige)
- **Kiểu chữ (Typography)**:
  - Font Sans: Google Fonts `'Be Vietnam Pro'`, `'Inter'`, `system-ui`, `sans-serif`.
  - Font Monospace: `'JetBrains Mono'`, `ui-monospace`, `monospace` (dành cho Mã CBGV, Số hiệu quyết định, Mã đơn từ).
- **Bảng màu Thương hiệu ĐH Kiến trúc Đà Nẵng (DAU Heritage Palette)**:
  - Deep Heritage Blue: `--color-brand-500: #004b87`, `--color-brand-600: #003865`, `--color-brand-700: #002747`, tint `--color-brand-50: #f0f6fb`.
  - Architectural Terracotta / Ochre: `--color-ochre-500: #d97706`, `--color-ochre-700: #92400e`, tint `--color-ochre-50: #fef3c7`.
  - Neutral Surfaces: Canvas `#f8fafc`, Surface `#ffffff`, Line `#e2e8f0`, Ink `#0f172a`, Muted `#475569`.
- **Loại bỏ Hoàn toàn Technical/Debug Terms**:
  - Không còn nhắc đến Next.js, Express, Prisma, Zod, port 4000, PostgreSQL 17 trên giao diện người dùng.
  - Chuyển đổi trạng thái vận hành thành ngôn ngữ học thuật chuyên nghiệp: *"Hệ thống: Trực tuyến · Cơ sở dữ liệu: Đồng bộ"*.

#### 2. Cấu trúc 3 Không gian Làm việc (3-Space Workspace Architecture)
- **Landing Page Công khai (`/`)**: Hero Blueprint kiến trúc isometric SVG, thống kê quy mô trường (486 CBGV, 7 khoa/phòng, 12 bộ môn, 99.9% uptime), thẻ giới thiệu 3 Không gian làm việc, lưới 6 tính năng cốt lõi, minh họa luồng phê duyệt DON2026-0148 với kiểm tra trùng lịch và người dạy thay.
- **Cổng Đăng nhập Phân đôi (`/login`)**: Split-screen 45% (DAU Heritage Blue với isometric campus wireframe, khẩu hiệu *"Sáng tạo — Trách nhiệm — Nhân văn"*) + 55% form đăng nhập kèm thanh Demo Fast-Role Switcher tức thời cho 5 vai trò (`Giảng viên`, `Trưởng khoa`, `Phòng TCHC`, `Hiệu trưởng`, `Admin`).
- **App Shell Điều hành Nội bộ (`Shell.tsx`)**:
  - Sidebar cố định 260px phân cấp 3 nhóm:
    1. **CÁ NHÂN**: Hồ sơ & CV (`/profile`), Sổ phép 2026 (`/leave`), Đăng ký công tác (`/trips`), Chấm công (`/attendance`), KPI cá nhân (`/kpi`), Chứng chỉ & Đào tạo (`/training`).
    2. **QUẢN LÝ ĐƠN VỊ**: Hộp thư duyệt (`/approvals`), Quản lý điểm danh (`/attendance/manage`), Chấm điểm KPI (`/kpi/manage`), Thẩm định chứng chỉ (`/training/manage`).
    3. **QUẢN TRỊ NHÀ TRƯỜNG**: Cây tổ chức (`/units`), Danh bạ CBGV (`/employees`), Hợp đồng lao động (`/contracts`), Executive Dashboard (`/dashboard`), Trợ lý AI Quy chế (`/ai-assistant`).
  - Sticky Header với Bộ chuyển đổi ngữ cảnh kiêm nhiệm (`[🏛️ Khoa Kiến trúc (Trưởng khoa) ▾]`), Thanh tìm kiếm Command Palette (`⌘K`), Chuông thông báo realtime, Avatar người dùng và Menu tài khoản / Đăng xuất.

#### 3. Bộ Thành phần Nguyên tử (`apps/web/src/components/ui.tsx`)
- `Avatar`: Trích xuất ký tự viết tắt thông minh bỏ qua học hàm/học vị (`PGS.TS.`, `TS.`, `ThS.`, `KS.`).
- `StatusPill`: Huy hiệu trạng thái nhân sự kèm chấm màu chuẩn WCAG AA/AAA.
- `Badge`: Đa tông màu (`info`, `success`, `warning`, `danger`, `ochre`, `neutral`).
- `Button`: Đa biến thể (`primary`, `success`, `ghost`, `outline`, `danger-outline`, `warning-outline`).
- `Card`: Bo góc `rounded-xl`, đổ bóng tinh tế.

---

## 🛠️ 3. HƯỚNG DẪN THỰC THI CHO AGENT TIẾP THEO

Khi bạn bàn giao cho Agent khác, hãy yêu cầu Agent đó tuân thủ các nguyên tắc sau:
1. **Chạy kiểm tra môi trường trước khi làm**:
   ```powershell
   npm.cmd run build
   node tests/e2e/runner.mjs --all
   ```
2. **Luôn đi theo thứ tự**:
   - Khai báo Schema trong `packages/database/prisma/schema.prisma` $\rightarrow$ Chạy `npm.cmd run db:generate`.
   - Khai báo DTO Zod trong `packages/contracts/src/<module>/index.ts` $\rightarrow$ Chạy build `contracts`.
   - Viết Service, Controller, Route trong `apps/api/src/...` $\rightarrow$ Chạy build `api`.
   - Xây dựng giao diện trang mới trong `apps/web/src/app/<module>/page.tsx` $\rightarrow$ Chạy build `web`.
   - Viết test kiểm thử tích hợp endpoint.
3. **Cập nhật worklog sau mỗi phiên**:
   - Ghi lại các tính năng đã hoàn thành vào file `docs/worklog.md`.
