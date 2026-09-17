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
│ GIAI ĐOẠN 1: Workflow Engine + Nghỉ phép & Công tác (Ưu tiên)│
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 2: Quản lý Hợp đồng & Diễn biến Công tác         │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 3: Quản lý Chấm công & Điều chỉnh Công           │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 4: Đánh giá KPI & Xếp loại Cán bộ                │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 5: Quản lý Đào tạo, Bồi dưỡng & Chứng chỉ        │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ GIAI ĐOẠN 6: Dashboard Điều hành, Outbox Worker & AI Assist │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 CHI TIẾT CÁC GIAI ĐOẠN (SPECIFICATION CHO AGENT)

### 🟢 GIAI ĐOẠN 1: ĐỘNG CƠ WORKFLOW DÙNG CHUNG + NGHỈ PHÉP & CÔNG TÁC
> **Mục tiêu**: Xây dựng bộ máy phê duyệt đa cấp dùng chung và phân hệ Nghỉ phép/Công tác gắn với Sổ cái ngày phép bất biến (`LeaveLedger`).

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

### 🟢 GIAI ĐOẠN 2: HỢP ĐỒNG LAO ĐỘNG & DIỄN BIẾN CÔNG TÁC
> **Mục tiêu**: Quản lý chuỗi hợp đồng lao động, cảnh báo hết hạn và lịch sử công tác (timeline).

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

### 🟢 GIAI ĐOẠN 3: QUẢN LÝ CHẤM CÔNG & ĐIỀU CHỈNH CÔNG
> **Mục tiêu**: Xử lý dữ liệu bảng công 3 lớp, đối chiếu phép/công tác và khóa kỳ công.

#### 1. Kiến trúc 3 Lớp Dữ liệu Chấm công
- **Lớp 1 (Raw Attendance)**: Dữ liệu import từ file máy chấm công / điểm danh hàng ngày.
- **Lớp 2 (Adjustment Requests)**: Đơn giải trình / xin điều chỉnh công của CBGV có xác nhận của Trưởng đơn vị.
- **Lớp 3 (Locked Timesheet)**: Bảng công tổng hợp chính thức sau khi đối chiếu với Nghỉ phép/Công tác và khóa kỳ công. Không ai được sửa sau khi khóa (chỉ có quyền mở khóa đặc biệt kèm audit log).

#### 2. API Endpoints
- `POST /api/v1/attendance/import`: Upload và đối soát dữ liệu chấm công từ file Excel/CSV.
- `GET /api/v1/attendance/my`: Xem bảng công tháng của cá nhân.
- `POST /api/v1/attendance/adjustments`: Gửi yêu cầu giải trình / điều chỉnh giờ công.
- `POST /api/v1/attendance/periods/:id/lock`: Khóa kỳ công của tháng (yêu cầu quyền HR Admin).

#### 3. Màn hình Frontend
- `/attendance`: Bảng chấm công cá nhân theo lịch lưới tháng, nút gửi giải trình từng ngày.
- `/attendance/manage`: Quản trị bảng công theo khoa/phòng, import dữ liệu và nút chốt kỳ công.

---

### 🟢 GIAI ĐOẠN 4: ĐÁNH GIÁ KPI & XẾP LOẠI CÁN BỘ
> **Mục tiêu**: Đánh giá định kỳ theo mẫu tiêu chuẩn của Trường ĐH Kiến trúc Đà Nẵng.

#### 1. Quy trình Nghiệp vụ
1. Mở kỳ đánh giá (Học kỳ 1, Học kỳ 2 hoặc Năm học).
2. Gán mẫu đánh giá:
   - Mẫu Giảng viên: Tiêu chuẩn giảng dạy, nghiên cứu khoa học, hoạt động hướng dẫn đồ án.
   - Mẫu Nhân viên/Chuyên viên: Khối lượng công việc hành chính, chất lượng, kỷ luật.
3. CBGV tự chấm điểm và đính kèm link/file minh chứng.
4. Trưởng khoa/phòng chấm điểm và nhận xét.
5. Hội đồng Trường / BGH phê duyệt và công bố kết quả.

#### 2. API Endpoints & Màn hình
- `GET /api/v1/kpi/periods`: Danh sách các kỳ đánh giá.
- `POST /api/v1/kpi/evaluations/my`: Nộp phiếu tự đánh giá cá nhân.
- `PUT /api/v1/kpi/evaluations/:id/manager-score`: Trưởng đơn vị chấm điểm.
- Giao diện `/kpi`: Bảng tiêu chí tự chấm kèm thanh tiến độ hoàn thành.

---

### 🟢 GIAI ĐOẠN 5: ĐÀO TẠO, BỒI DƯỠNG & CHỨNG CHỈ
> **Mục tiêu**: Quản lý các khóa học bồi dưỡng chuyên môn và chứng chỉ hành nghề, chức danh nghề nghiệp.

#### 1. Nghiệp vụ cốt lõi
- Hồ sơ chứng chỉ gửi lên ở trạng thái `UNVERIFIED`.
- Phòng TCHC kiểm tra văn bằng gốc và phê duyệt chuyển thành `VERIFIED`.
- Cảnh báo chứng chỉ có thời hạn (ngoại ngữ, chứng chỉ hành nghề kiến trúc/xây dựng) sắp hết hạn.

#### 2. API Endpoints & Màn hình
- `GET /api/v1/training/courses`: Danh sách khóa bồi dưỡng.
- `POST /api/v1/certificates`: Upload chứng chỉ mới.
- `PUT /api/v1/certificates/:id/verify`: Phòng TCHC xác nhận chứng chỉ.
- Giao diện `/training`: Quản lý chứng chỉ và khóa bồi dưỡng.

---

### 🟢 GIAI ĐOẠN 6: DASHBOARD, WORKER THÔNG BÁO & AI ASSISTANT
> **Mục tiêu**: Dashboard điều hành cho Lãnh đạo, gửi email tự động và Trợ lý ảo RAG thông minh.

#### 1. Dashboard Điều hành (`apps/web/src/app/dashboard`)
- Biểu đồ phân bố trình độ (Tiến sĩ, Thạc sĩ, Kiến trúc sư, Kỹ sư).
- Thống kê tỷ lệ chức danh (Giáo sư, Phó Giáo sư, Giảng viên chính).
- Thống kê biến động nhân sự (tuyển mới, nghỉ hưu, chuyển công tác).
- Danh sách cảnh báo: Hợp đồng sắp hết hạn, chứng chỉ sắp hết hạn, việc trễ hạn.

#### 2. Background Worker & Transactional Outbox
- Quản lý bảng `outbox_events` trong PostgreSQL.
- Tiến trình Worker chạy định kỳ: Đọc sự kiện chưa gửi $\rightarrow$ gửi email/thông báo $\rightarrow$ cập nhật trạng thái `PROCESSED` hoặc `FAILED` có cơ chế retry tối đa 3 lần.

#### 3. AI Assistant (RAG Agent)
- Lưu trữ vector embedding văn bản quy chế DAU trong PostgreSQL sử dụng tiện ích mở rộng `pgvector`.
- Chatbot hỗ trợ: Tra cứu số dư phép, hỏi quy định nâng lương, hỗ trợ tạo đơn nháp có bước người dùng xác nhận trước khi gửi.

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
