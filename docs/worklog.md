# WORKLOG — Dự án BAHAU (Hệ thống QTNS Trường ĐH Kiến trúc Đà Nẵng)

---

## Phiên 5 — 18/09/2026 (12:00 – 12:30)

### ✅ Đã hoàn thành trong Phiên 5 (Giai đoạn 3: Quản lý Chấm công & Điều chỉnh công - Attendance & Timesheets)

#### 1. Tài liệu Đặc tả Nghiệp vụ & Kế hoạch Chi tiết (`docs/`) — HOÀN THÀNH 100% ✅
- `docs/requirements/module-04-attendance-prd.md`: PRD hoàn chỉnh Phân hệ 4 (5 User Stories, sơ đồ kiến trúc 3 lớp Mermaid, công thức tính ngày công hưởng lương, ma trận API, ma trận phân quyền RBAC).
- `docs/plan/phase-03-attendance.md`: Kế hoạch thi công chi tiết từng bước cho Giai đoạn 3 (100% tiêu chí đã nghiệm thu).
- `docs/plan/master-roadmap-handoff.md`: Cập nhật trạng thái Giai đoạn 3 thành "ĐÃ HOÀN THÀNH 100% ✅", bàn giao định hướng Giai đoạn 4 (Đánh giá KPI & Xếp loại).

#### 2. CSDL & Dữ liệu Khởi tạo (`@bahau/database`) — HOÀN THÀNH 100% ✅
- Cập nhật `packages/database/prisma/schema.prisma`:
  - `enum AttendanceStatus` (`PRESENT`, `LATE`, `EARLY_LEAVE`, `ABSENT`, `ON_LEAVE`, `BUSINESS_TRIP`, `HOLIDAY`, `WEEKEND`).
  - `model AttendancePeriod`: Quản lý kỳ công tháng & cơ chế khóa sổ bất biến (`isLocked`, `lockedAt`, `lockedById`).
  - `model AttendanceRecord`: Lớp 1 - Điểm danh quẹt thẻ hàng ngày từ thiết bị vân tay/khuôn mặt.
  - `model AttendanceAdjustmentRequest`: Lớp 2 - Đơn giải trình / điều chỉnh giờ công tích hợp workflow 2 cấp.
  - `model MonthlyTimesheetSummary`: Lớp 3 - Bảng công tổng hợp chốt tháng đối soát tự động nghỉ phép và công tác.
- Cập nhật `packages/database/prisma/seed.ts` (Step 12):
  - Khởi tạo kỳ công Tháng 8/2026 (`isLocked: true`) kèm `MonthlyTimesheetSummary` đã chốt công.
  - Khởi tạo kỳ công Tháng 9/2026 (`isLocked: false`) kèm dữ liệu quẹt thẻ thực tế (`PRESENT`, `LATE`, `ON_LEAVE`, `HOLIDAY`) và 1 đơn giải trình mẫu đang chờ duyệt.
- `npm run db:generate` và `tsc` biên dịch thành công 0 lỗi.

#### 3. Zod Contracts Single Source of Truth (`@bahau/contracts`) — HOÀN THÀNH 100% ✅
- Tạo mới module `packages/contracts/src/attendance/index.ts`:
  - Enums: `AttendanceStatusEnum`.
  - Input Schemas: `CreateAttendanceAdjustmentSchema`, `ImportAttendanceBatchSchema`, `LockPeriodSchema`, `AttendanceQuerySchema`.
  - DTO Schemas: `AttendancePeriodDtoSchema`, `AttendanceRecordDtoSchema`, `MonthlyTimesheetSummaryDtoSchema`, `AttendanceAdjustmentDtoSchema`, `AttendanceMonthDtoSchema`.
- Re-export trong `packages/contracts/src/index.ts` và biên dịch `tsc` thành công 0 lỗi.

#### 4. Backend API Services, Controllers & Routes (`apps/api`) — HOÀN THÀNH 100% ✅
- `AttendanceService` (`src/services/attendance.service.ts`):
  - Thuật toán phân loại giờ làm DAU `classifyAttendanceStatus`: Giờ vào 08:00 (vào sau 08:00 $\rightarrow$ `LATE`), giờ ra 17:00 (ra trước 17:00 $\rightarrow$ `EARLY_LEAVE`), chuẩn 8.0 giờ/ngày. Tự động nhận diện `ON_LEAVE` và `BUSINESS_TRIP` từ đơn đã duyệt.
  - Lấy bảng công cá nhân theo tháng `getMyMonthlyAttendance` kèm đối soát Lớp 1, 2, 3 và resilience fallback.
  - Lấy bảng công tổng hợp toàn đơn vị `getUnitAttendance` kiểm soát phạm vi Scope chặt chẽ.
  - Nộp đơn giải trình giờ công `createAdjustmentRequest`: Kiểm tra khóa kỳ công (`PERIOD_LOCKED`), chống nộp trùng lặp, khởi tạo `WorkflowEngine` 2 cấp.
  - Import dữ liệu quẹt thẻ hàng loạt `importAttendanceData`: Kiểm tra khóa kỳ, cập nhật bản ghi và tính lại tổng kết Lớp 3.
  - Khóa/mở khóa kỳ công `lockPeriod`: Đóng băng dữ liệu sang trạng thái bất biến (`isFinalized = true`).
  - Tính toán bảng công tổng kết `recalculateMonthlySummary`: Tổng ngày công tính lương = Thực làm + Nghỉ phép hưởng lương + Đi công tác.
- Tích hợp `WorkflowService`:
  - Thêm `startAdjustmentWorkflow` (Trưởng đơn vị $\rightarrow$ Phòng TCHC).
  - Thêm hook hoàn tất tự động cập nhật hoặc tạo mới bản ghi `AttendanceRecord` khi đơn giải trình được phê duyệt chính thức.
  - Thêm hook từ chối đơn giải trình trong `rejectStep`.
- Controllers & Routes:
  - `GET /api/v1/attendance/me`: Bảng công cá nhân.
  - `GET /api/v1/attendance/unit`: Bảng công tổng hợp đơn vị.
  - `POST /api/v1/attendance/adjustments`: Gửi đơn giải trình công.
  - `POST /api/v1/attendance/import`: Nạp dữ liệu biometric hàng loạt.
  - `POST /api/v1/attendance/lock-period`: Chốt & Khóa kỳ công tháng.
- `tsc` biên dịch thành công 0 lỗi.

#### 5. Giao diện Người dùng Next.js 15 App Router (`apps/web`) — HOÀN THÀNH 100% ✅
- `apps/web/src/app/attendance/page.tsx` (Không gian Cá nhân):
  - Bộ chọn Tháng/Năm linh hoạt với trạng thái kỳ công động (Active Period / Locked Period).
  - 6 Thẻ KPI tổng quan công tháng: Công chuẩn (22 ngày), Đi làm thực tế, Nghỉ phép hưởng lương, Đi công tác, Lượt vào muộn/ra sớm, Tổng công tính lương.
  - Bảng nhật ký quẹt thẻ theo ngày (Lớp 1) với các badge trạng thái trực quan và nút "Giải trình công".
  - Danh sách đơn giải trình công (Lớp 2) với trạng thái phê duyệt 2 cấp.
  - Modal nộp đơn giải trình công với validation tức thì và thông báo thân thiện.
- `apps/web/src/app/attendance/manage/page.tsx` (Không gian Quản lý & Phòng TCHC):
  - Bảng công tổng hợp toàn trường / đơn vị (Lớp 3) hiển thị chi tiết từng CBGV.
  - Bộ lọc tìm kiếm CBGV theo tên/mã và bộ lọc theo Khoa/Phòng.
  - Nút "Chốt & Khóa Kỳ Công" kèm modal xác nhận cảnh báo tính bất biến (immutable).
  - Modal "Import Quẹt Thẻ Hàng Loạt" hỗ trợ JSON payload và nút nạp dữ liệu mẫu 1-click.
- Cập nhật điều hướng `layout.tsx` (Thêm tab "Chấm công") và trang chủ `page.tsx` (Thêm liên kết Không gian 1 & Không gian 3).
- Next.js 15 App Router build sạch 100% (Code 0).

#### 6. Kiểm thử Tự động & Nghiệm thu — HOÀN THÀNH 100% ✅
- Tạo mới `tests/attendance-endpoints.test.mjs`:
  - TC-ATT-01: Kiểm tra bảo mật 401 trên 5/5 endpoints chấm công (PASS).
  - TC-ATT-02: Kiểm tra Zod schema validation trên đơn giải trình (PASS).
  - TC-ATT-03: Kiểm tra Zod schema validation trên import dữ liệu quẹt thẻ (PASS).
  - TC-ATT-04: Kiểm tra Zod schema validation trên khóa kỳ công (PASS).
  - TC-ATT-05: Kiểm tra thuật toán phân loại quẹt thẻ chuẩn DAU 6 kịch bản (PASS).
  - TC-ATT-06: Kiểm tra công thức tính tổng ngày công tính lương (PASS).
  - TC-ATT-07: Kiểm tra cơ chế khóa sổ bất biến (PASS).
- Kiểm tra hồi quy không lỗi:
  - `node tests/contract-events-endpoints.test.mjs`: 6/6 tests PASS.
  - `node tests/leave-workflow-endpoints.test.mjs`: 6/6 tests PASS.
  - `node tests/e2e/runner.mjs --all`: 40/40 tests PASS (100.0%) trên cả 4 Tiers.

---

## Phiên 4 — 18/09/2026 (11:45 – 12:00)

### ✅ Đã hoàn thành trong Phiên 4 (Giai đoạn 2: Quản lý Hợp đồng Lao động & Diễn biến Công tác)

#### 1. Tài liệu Đặc tả Nghiệp vụ & Kế hoạch Chi tiết (`docs/`) — HOÀN THÀNH 100% ✅
- `docs/requirements/module-03-contracts-events-prd.md`: PRD hoàn chỉnh Phân hệ 3 (8 User Stories, Sơ đồ State Machine cho vòng đời hợp đồng, Sơ đồ chuỗi phả hệ hợp đồng cha-con, Công thức tính ngưỡng cảnh báo 30/60/90 ngày, Quy tắc tự động đồng bộ phân công công tác `EmploymentAssignment`, Ma trận phân quyền RBAC).
- `docs/plan/phase-02-contracts-events.md`: Kế hoạch thi công chi tiết từng bước cho Giai đoạn 2 (100% tiêu chí đã nghiệm thu).
- `docs/plan/master-roadmap-handoff.md`: Cập nhật trạng thái Giai đoạn 2 thành "ĐÃ HOÀN THÀNH 100% ✅" và chuyển trọng tâm tiếp theo sang Giai đoạn 3 (Chấm công).

#### 2. Hợp đồng DTO Zod Single Source of Truth (`@bahau/contracts`) — HOÀN THÀNH 100% ✅
- Tạo mới module `packages/contracts/src/contract/index.ts`:
  - Enums: `ContractTypeEnum`, `ContractStatusEnum`, `EmploymentEventTypeEnum`, `ContractAlertLevelEnum`.
  - Input Schemas: `CreateContractSchema` (refine kiểm tra ngày kết thúc sau ngày hiệu lực), `RenewContractSchema` (tái ký chuỗi), `ContractFilterQuerySchema` (hỗ trợ lọc cảnh báo 30/60/90 ngày), `CreateEmploymentEventSchema` (hỗ trợ cờ `syncAssignment`).
  - DTO Schemas: `ContractDtoSchema`, `ContractDetailDtoSchema` (bao gồm `parentContract` và `renewedContracts`), `ContractAlertSummaryDtoSchema`, `EmploymentEventDtoSchema`.
- Re-export trong `packages/contracts/src/index.ts` và biên dịch `tsc` thành công 0 lỗi.

#### 3. CSDL & Dữ liệu Khởi tạo (`@bahau/database`) — HOÀN THÀNH 100% ✅
- Cập nhật `packages/database/prisma/seed.ts` (Step 9 & 10):
  - Chuỗi hợp đồng gia hạn mẫu bất biến: Hợp đồng 12 tháng năm 2023 (`RENEWED`) $\rightarrow$ Hợp đồng 36 tháng năm 2024 (`ACTIVE`) có `parentContractId` liên kết của Giảng viên BM KTCT.
  - Hợp đồng cảnh báo động: Sắp hết hạn trong ~20 ngày (`CRITICAL_30`), trong ~45 ngày (`WARNING_60`), trong ~75 ngày (`WARNING_90`).
  - Dòng thời gian sự kiện công tác phong phú: `HIRED` $\rightarrow$ `APPOINTED` Trưởng phòng/Trưởng khoa $\rightarrow$ `TRANSFERRED` $\rightarrow$ `PROMOTED` kèm số quyết định DAU thực tế.
- `prisma generate` và biên dịch `tsc` thành công.

#### 4. Backend API Services, Controllers & Routes (`apps/api`) — HOÀN THÀNH 100% ✅
- `ContractService` (`src/services/contract.service.ts`):
  - Tính toán ngưỡng cảnh báo hết hạn: `calculateExpiryAlert` (Đỏ $\le 30$ ngày, Cam $\le 60$ ngày, Vàng $\le 90$ ngày, Không thời hạn, Hết hạn).
  - Phân trang, tìm kiếm đa trường và kiểm soát dữ liệu theo Scope (`SCOPE_SELF`, `SCOPE_UNIT_TREE`, `SCOPE_ALL`).
  - Thống kê tổng hợp số lượng hợp đồng sắp hết hạn (`getContractAlertSummary`).
  - Lấy chi tiết hợp đồng và toàn bộ cây phả hệ chuỗi liên kết cha-con (`getContractById`).
  - Lập hợp đồng mới (`createContract`) kiểm tra ràng buộc duy nhất số HĐ.
  - Gia hạn hợp đồng chuỗi bất biến (`renewContract`) thực thi trong `prisma.$transaction`.
- `EmploymentEventService` (`src/services/employment-event.service.ts`):
  - Lấy dòng thời gian sự kiện công tác sắp xếp giảm dần theo ngày hiệu lực (`getEmployeeEvents`).
  - Ghi nhận sự kiện biến động công tác mới (`createEmploymentEvent`) kèm cơ chế tự động đồng bộ phân công công tác `EmploymentAssignment` (chuyển phân công cũ sang `EXPIRED`, kích hoạt phân công mới `ACTIVE` khi có quyết định `APPOINTED` hoặc `TRANSFERRED`).
- Controllers & Routes:
  - `GET /api/v1/contracts`: Danh sách hợp đồng (lọc theo đơn vị, trạng thái, sắp hết hạn 30/60/90 ngày).
  - `GET /api/v1/contracts/summary/alerts`: Thống kê các mốc cảnh báo hết hạn.
  - `GET /api/v1/contracts/:id`: Chi tiết hợp đồng và cây chuỗi gia hạn.
  - `POST /api/v1/contracts`: Tạo mới hợp đồng.
  - `POST /api/v1/contracts/:id/renew`: Gia hạn hợp đồng chuỗi bất biến.
  - `GET /api/v1/employees/:id/events`: Dòng thời gian sự kiện công tác.
  - `POST /api/v1/employees/:id/events`: Ghi nhận quyết định công tác.
- Tinh chỉnh `validate.middleware.ts` hỗ trợ `ZodTypeAny` chấp nhận ZodEffects/Refinements.
- `tsc` biên dịch thành công 0 lỗi.

#### 5. Giao diện Người dùng Next.js 15 App Router (`apps/web`) — HOÀN THÀNH 100% ✅
- `apps/web/src/app/contracts/page.tsx`:
  - 6 Thẻ chỉ số tổng quan KPI (Đang hiệu lực, Không thời hạn, Có thời hạn, Cảnh báo Đỏ $\le 30$ ngày, Cảnh báo Cam $\le 60$ ngày, Cảnh báo Vàng $\le 90$ ngày).
  - Bộ lọc tabs nhanh theo mốc thời hạn cảnh báo kết hợp tìm kiếm thời gian thực.
  - Bảng quản trị hợp đồng hiển thị mã CBGV, tên, đơn vị, chức danh, hệ số lương, thời hạn và badge ngày còn lại trực quan.
  - Modal xem chi tiết và Cây phả hệ chuỗi hợp đồng (Parent-Child Contract Lineage Tree).
  - Modal tạo mới hợp đồng & Modal gia hạn hợp đồng có validation tức thì.
- `apps/web/src/app/employees/[id]/page.tsx`:
  - Trang hồ sơ chi tiết viên chức / người lao động.
  - Tab "Dòng thời gian Diễn biến công tác (Career Timeline)" dạng Vertical Timeline với icon và màu sắc biểu trưng theo từng loại sự kiện (`HIRED`, `APPOINTED`, `TRANSFERRED`, `PROMOTED`, `RESIGNED`, `RETIRED`).
  - Modal "Thêm biến động công tác" hỗ trợ cờ tự động đồng bộ sang phân công công tác.
  - Tab "Hợp đồng lao động" và Tab "Thông tin cá nhân & liên hệ".
- Cập nhật trang `employees/page.tsx` thêm cột Thao tác liên kết trực tiếp sang `/employees/[id]`.
- Cập nhật điều hướng chính trong `layout.tsx` (thêm link `Hợp đồng`) và liên kết tính năng trong `page.tsx`.
- `next build` biên dịch thành công 11/11 trang tĩnh & động.

#### 6. Kiểm thử Tích hợp & Nghiệm thu E2E — HOÀN THÀNH 100% ✅
- **Bộ Kiểm thử Chuyên biệt Contracts & Events (`tests/contract-events-endpoints.test.mjs`)**: 6/6 kịch bản PASS 100%.
- **Bộ Kiểm thử Chuyên biệt Leave & Workflow (`tests/leave-workflow-endpoints.test.mjs`)**: 6/6 kịch bản PASS 100%.
- **Bộ Kiểm thử E2E Toàn diện (`tests/e2e/runner.mjs --all`)**: 40/40 test cases PASS 100% trên cả 4 Tiers.
- **Biên dịch Monorepo (`npm run build`)**: 100% thành công trên toàn bộ 4 packages/apps.

---

## Phiên 3 — 18/09/2026 (11:00 – 11:45)

### ✅ Đã hoàn thành trong Phiên 3 (Giai đoạn 1: Động cơ Workflow dùng chung + Quản lý Nghỉ phép & Công tác)

#### 1. Tài liệu Đặc tả Nghiệp vụ & Kế hoạch Chi tiết (`docs/`) — HOÀN THÀNH 100% ✅
- `docs/requirements/module-02-leave-trip-prd.md`: PRD hoàn chỉnh phân hệ 2 (10 User Stories, Ma trận trạng thái Workflow, Quy tắc Anti-Self-Approval, Double-entry Leave Ledger, Sơ đồ Sequence/State machine Mermaid, Bảng tra cứu API endpoints và Zod contracts).
- `docs/plan/phase-01-workflow-leave-trip.md`: Kế hoạch thi công chi tiết từng bước cho Giai đoạn 1.
- `docs/plan/master-roadmap-handoff.md`: Cập nhật trạng thái Giai đoạn 1 thành "ĐÃ HOÀN THÀNH 100% ✅" và chuyển trọng tâm tiếp theo sang Giai đoạn 2.

#### 2. Hợp đồng DTO Zod Single Source of Truth (`@bahau/contracts`) — HOÀN THÀNH 100% ✅
- Mở rộng `packages/contracts/src/leave/index.ts`:
  - `LeaveTypeEnum`, `WorkflowStatusEnum`, `WorkflowStepStatusEnum`, `LeaveLedgerActionEnum`.
  - `CreateLeaveRequestSchema`, `LeaveRequestDtoSchema`, `LeaveRequestDetailDtoSchema`.
  - `LeaveBalanceDtoSchema`, `LeaveLedgerEntryDtoSchema`.
  - `CreateTripRequestSchema`, `BusinessTripDtoSchema`, `BusinessTripDetailDtoSchema`.
  - `WorkflowApprovalActionSchema`, `WorkflowRejectionActionSchema`.
  - `WorkflowStepDetailDtoSchema`, `WorkflowInstanceDetailDtoSchema`, `PendingWorkflowTaskDtoSchema`.
- `tsc` biên dịch thành công 0 lỗi.

#### 3. CSDL & Dữ liệu Khởi tạo (`@bahau/database`) — HOÀN THÀNH 100% ✅
- Cập nhật `packages/database/prisma/seed.ts`:
  - Bổ sung Step 11: Cấp hạn ngạch ngày phép năm 2026 (`GRANT_ANNUAL` 12 ngày) cho toàn bộ CBGV mẫu trường ĐH Kiến trúc Đà Nẵng.
  - Khởi tạo đơn nghỉ phép mẫu, tạm giữ ngày phép (`HOLD`) và phiên phê duyệt `WorkflowInstance` đa bước phục vụ demo trực quan.
- `prisma generate` và `tsc` biên dịch thành công 0 lỗi.

#### 4. Dịch vụ & API Backend (`@bahau/api`) — HOÀN THÀNH 100% ✅
- `LeaveLedgerService`:
  - Tính toán số dư khả dụng: $\text{Remaining} = \max(0, \text{TotalGranted} + \text{CarriedForward} - \text{Used} - \text{PendingHold})$.
  - Ghi nhận tạm giữ `recordHold(HOLD)`, trừ phép chính thức `recordUse(USE + RESTORE)`, và hoàn trả `releaseHold(RESTORE)`.
  - Phương thức `getLedgerHistory` truy xuất lịch sử sổ cái ngày phép bất biến.
- `WorkflowService`:
  - Động cơ phê duyệt dùng chung cho đa phân hệ (`LEAVE`, `BUSINESS_TRIP`...).
  - Cơ chế **Anti-Self-Approval**: Trưởng đơn vị tự nộp đơn được tự động leo thang lên Ban Giám hiệu (`ROLE_RECTOR`), sau đó Phòng TCHC (`ROLE_HR_OFFICER`).
  - Phê duyệt từng bước (`approveStep`), từ chối kèm lý do (`rejectStep`), hủy quy trình (`cancelWorkflow`) và lấy timeline chi tiết (`getInstanceDetails`).
  - Hộp thư tác vụ chờ duyệt (`getPendingTasks`).
- `LeaveService`:
  - Nộp đơn xin nghỉ phép (`createLeaveRequest`), kiểm tra số dư và kích hoạt workflow.
  - Xem chi tiết đơn kèm timeline (`getLeaveRequestById`), hủy đơn (`cancelLeaveRequest`), xem số dư (`getMyLeaveBalance`), tra cứu sổ cái (`getMyLeaveLedger`).
  - Đăng ký công tác (`createTripRequest`), xem chi tiết công tác (`getTripRequestById`), hủy đơn công tác (`cancelTripRequest`).
- Tuyến Route & Controller (`apps/api/src/routes/v1/leave.routes.ts`, `workflow.routes.ts`):
  - `POST /api/v1/leave/requests`, `GET /api/v1/leave/requests/my`, `GET /api/v1/leave/requests/:id`, `POST /api/v1/leave/requests/:id/cancel`
  - `GET /api/v1/leave/balance/my`, `GET /api/v1/leave/ledger/my`
  - `POST /api/v1/trips/requests`, `GET /api/v1/trips/requests/my`, `GET /api/v1/trips/requests/:id`, `POST /api/v1/trips/requests/:id/cancel`
  - `GET /api/v1/workflow/pending`, `GET /api/v1/workflow/instances/:id`, `POST /api/v1/workflow/steps/:id/approve`, `POST /api/v1/workflow/steps/:id/reject`
- `tsc` biên dịch thành công 0 lỗi.

#### 5. Giao diện Người dùng Next.js 15 App Router (`@bahau/web`) — HOÀN THÀNH 100% ✅
- `apps/web/src/app/leave/page.tsx`:
  - Thống kê 5 chỉ số ngày phép (Cấp 2026, Chuyển tiếp, Đang giữ chỗ HOLD, Đã sử dụng USE, Còn lại khả dụng).
  - Thanh tiến trình sử dụng phép.
  - Form nộp đơn xin nghỉ phép kèm bộ chọn loại phép, kiểm tra số dư tự động và chọn người dạy thay.
  - Bảng đơn cá nhân và Tab tra cứu Sổ cái ngày phép bất biến.
  - Modal Timeline hiển thị tiến trình duyệt từng cấp (ai duyệt, ý kiến, thời gian).
- `apps/web/src/app/trips/page.tsx`:
  - Form đăng ký đi công tác có dự toán ngân sách VNĐ và chọn nguồn kinh phí.
  - Bảng danh sách chuyến công tác kèm tiến trình phê duyệt quyết định của BGH.
- `apps/web/src/app/approvals/page.tsx`:
  - Hộp thư phê duyệt tác vụ tập trung (Approval Inbox) dành cho Trưởng đơn vị, Phòng TCHC và Ban Giám hiệu.
  - Bộ lọc tác vụ theo module, xem tóm lược hồ sơ, phê duyệt hoặc từ chối nhanh một chạm.
- Cập nhật Navigation header trong `layout.tsx` và liên kết trực tiếp trong 3 Không gian làm việc tại `page.tsx`.
- `next build` biên dịch thành công 10/10 trang tĩnh.

#### 6. Kiểm thử Tích hợp & Nghiệm thu E2E — HOÀN THÀNH 100% ✅
- **Bộ Kiểm thử Chuyên biệt Leave & Workflow (`tests/leave-workflow-endpoints.test.mjs`)**: 6/6 kịch bản PASS 100%.
- **Bộ Kiểm thử E2E Toàn diện (`tests/e2e/runner.mjs --all`)**: 40/40 test cases PASS 100% trên toàn bộ 4 Tiers.
- **Biên dịch Monorepo (`npm run build`)**: 100% thành công trên cả 4 packages/apps.

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

## Phiên 6 — 18/09/2026

### ✅ Giai đoạn 4: Đánh giá KPI & Xếp loại Cán bộ (Performance & KPI Evaluation) — HOÀN THÀNH 100%

#### 1. Tài liệu Đặc tả & Thiết kế
- `docs/requirements/module-05-kpi-prd.md`: PRD hoàn chỉnh với 5 User Stories, ER Diagram Mermaid, Ma trận RBAC, bộ tiêu chuẩn phân hóa chuẩn ĐH Kiến trúc Đà Nẵng (DAU).
- `docs/plan/phase-04-kpi.md`: Kế hoạch thi công chi tiết DoD và phân công gói công việc.

#### 2. Cơ sở Dữ liệu & Seed Data (`@bahau/database`)
- Thêm 4 enums: `KpiPeriodStatus`, `KpiTargetType`, `KpiEvaluationStatus`, `KpiRanking`.
- Thêm 5 models: `KpiPeriod`, `KpiTemplate`, `KpiCriterion`, `KpiEvaluation`, `KpiEvaluationItem`.
- Cập nhật Step 13 trong `seed.ts`:
  - Kỳ đánh giá Năm học 2025-2026.
  - Mẫu tiêu chuẩn Giảng viên (100đ: Giảng dạy 40đ, NCKH 30đ, Phục vụ 15đ, Kỷ luật 15đ).
  - Mẫu tiêu chuẩn Chuyên viên (100đ: Khối lượng 35đ, Chất lượng & Sáng kiến 30đ, Phục vụ 20đ, Kỷ luật 15đ).
  - Khởi tạo phiếu đánh giá mẫu cho ThS. Đỗ Tuấn Kiệt (Khoa Kiến trúc).
  - Bổ sung 6 quyền KPI vào RBAC.
- `prisma generate` và `tsc` biên dịch thành công 0 lỗi.

#### 3. Zod Contracts SSoT (`@bahau/contracts`)
- Định nghĩa các Zod Enums & Schemas trong `packages/contracts/src/kpi/index.ts`:
  - Input: `CreateKpiPeriodSchema`, `SubmitSelfEvaluationSchema`, `ScoreManagerEvaluationSchema`, `FinalizeCouncilEvaluationSchema`, `KpiFilterQuerySchema`.
  - DTOs: `KpiPeriodDtoSchema`, `KpiTemplateDtoSchema`, `KpiCriterionDtoSchema`, `KpiEvaluationDtoSchema`, `KpiEvaluationDetailDtoSchema`.
- `tsc` biên dịch thành công 0 lỗi.

#### 4. Dịch vụ & API Backend (`@bahau/api`)
- `KpiService`:
  - Tra cứu/mở kỳ đánh giá (`getPeriods`, `createPeriod`).
  - Danh mục mẫu tiêu chí phân loại đối tượng (`getTemplates`).
  - Tự động khởi tạo phiếu đánh giá theo vị trí công tác (`getMyEvaluation`).
  - Lưu nháp hoặc nộp phiếu tự chấm kèm link minh chứng (`submitSelfEvaluation`).
  - Trưởng đơn vị xem danh sách phiếu và chấm điểm quản lý (`getUnitEvaluations`, `scoreManagerEvaluation`).
  - Cơ chế **Anti-Self-Approval**: Ngăn chặn Trưởng đơn vị tự chấm điểm quản lý cho chính mình.
  - Hội đồng Thi đua & BGH chốt điểm và xếp loại thi đua A/B/C/D (`finalizeEvaluation`).
- Tuyến Routes & Controllers (`src/routes/v1/kpi.routes.ts`, `src/controllers/kpi.controller.ts`):
  - `GET /api/v1/kpi/periods`, `POST /api/v1/kpi/periods`
  - `GET /api/v1/kpi/templates`
  - `GET /api/v1/kpi/evaluations/my`, `POST /api/v1/kpi/evaluations/my`
  - `GET /api/v1/kpi/evaluations/unit`
  - `PUT /api/v1/kpi/evaluations/:id/manager-score`
  - `PUT /api/v1/kpi/evaluations/:id/finalize`
- `tsc` biên dịch thành công 0 lỗi.

#### 5. Giao diện Người dùng Next.js 15 App Router (`@bahau/web`)
- `apps/web/src/app/kpi/page.tsx`:
  - Giao diện Phiếu tự đánh giá cá nhân (Không gian 1: Cá nhân).
  - Thanh tiến độ quy trình 4 bước, live score counter / 100đ.
  - Form tiêu chí phân loại theo chuyên mục, ô nhập điểm tự chấm, ô nhập link minh chứng, nút lưu nháp & nộp duyệt.
- `apps/web/src/app/kpi/manage/page.tsx`:
  - Giao diện Quản lý Đơn vị & Hội đồng Thi đua (Không gian 2 & 3).
  - Thống kê tỷ lệ phân bổ A/B/C/D và kiểm soát hạn ngạch Loại A max 20%.
  - Bảng danh sách phiếu đánh giá CBGV toàn trường/đơn vị.
  - Modal Trưởng đơn vị chấm điểm quản lý (đối chiếu minh chứng, kiểm tra điểm tối đa).
  - Modal Hội đồng Thi đua chốt điểm và xếp loại thi đua A/B/C/D.
- Cập nhật menu điều hướng `layout.tsx` và liên kết 3 Không gian làm việc tại `page.tsx`.
- `next build` biên dịch thành công 15/15 trang tĩnh.

#### 6. Kiểm thử Tích hợp & Nghiệm thu
- `tests/kpi-endpoints.test.mjs`: PASS 6/6 test cases.
- Bộ kiểm thử hồi quy:
  - `tests/attendance-endpoints.test.mjs`: PASS 7/7.
  - `tests/contract-events-endpoints.test.mjs`: PASS 6/6.
  - `tests/leave-workflow-endpoints.test.mjs`: PASS 6/6.
  - `tests/e2e/runner.mjs --all`: Đạt 40/40 test cases PASS 100% trên toàn bộ 4 Tiers.

---

## Phiên 7 — 18/09/2026

### ✅ Giai đoạn 5: Quản lý Đào tạo, Bồi dưỡng & Chứng chỉ (Training & Certification) — HOÀN THÀNH 100%

#### 1. Tài liệu Đặc tả & Thiết kế
- `docs/requirements/module-06-training-prd.md`: PRD hoàn chỉnh với 5 User Stories, ER Diagram Mermaid, Ma trận RBAC, danh mục phân loại 6 nhóm chứng chỉ chuẩn DAU.
- `docs/plan/phase-05-training.md`: Kế hoạch thi công chi tiết DoD và phân công gói công việc.

#### 2. Cơ sở Dữ liệu & Seed Data (`@bahau/database`)
- Thêm 5 enums: `CertificateType`, `CertificateStatus`, `TrainingCategory`, `TrainingCourseStatus`, `ParticipantStatus`.
- Thêm 3 models: `Certificate`, `TrainingCourse`, `TrainingParticipant`.
- Bổ sung Step 14 trong `seed.ts`:
  - 3 Khóa đào tạo mẫu (BIM Revit 2026, Nghiệp vụ Sư phạm, Tiêu chuẩn chức danh Giảng viên chính Hạng II).
  - 4 Chứng chỉ mẫu của ThS. Đỗ Tuấn Kiệt (Khoa Kiến trúc): KTS Hạng I (`VERIFIED`), IELTS 7.5 (`VERIFIED`), Sư phạm Đại học (`VERIFIED`), Autodesk Revit Pro (`PENDING`).
  - Bổ sung 7 quyền Training & Certification vào bảng permissions và map vào 5 vai trò hệ thống.
- `prisma generate` và `tsc` biên dịch thành công 0 lỗi.

#### 3. Zod Contracts SSoT (`@bahau/contracts`)
- Định nghĩa các Zod Enums & Schemas trong `packages/contracts/src/training/index.ts`:
  - Input: `CreateCertificateSchema`, `VerifyCertificateSchema`, `CreateTrainingCourseSchema`, `RegisterTrainingCourseSchema`, `UpdateParticipantStatusSchema`, `CertificateFilterQuerySchema`.
  - DTOs: `CertificateDtoSchema`, `TrainingCourseDtoSchema`, `TrainingParticipantDtoSchema`.
- `tsc` biên dịch thành công 0 lỗi.

#### 4. Dịch vụ & API Backend (`@bahau/api`)
- `TrainingService`:
  - `getMyCertificates`: Danh sách chứng chỉ của cá nhân kèm tính toán tình trạng hạn sử dụng.
  - `submitCertificate`: CBGV nộp hồ sơ chứng chỉ mới (mặc định `PENDING`).
  - `getAllCertificates`: Phòng TCHC & Quản lý tra cứu danh sách chứng chỉ theo bộ lọc và Scope.
  - `verifyCertificate`: Phòng TCHC thẩm định chứng chỉ (`VERIFIED` hoặc `REJECTED` kèm lý do).
  - `getExpiringCertificates`: Cảnh báo chứng chỉ sắp hết hạn trong 30/60/90 ngày.
  - `getCourses`: Danh sách khóa đào tạo bồi dưỡng kèm trạng thái đã đăng ký của cá nhân.
  - `createCourse`: Phòng TCHC mở khóa đào tạo mới.
  - `registerCourse`: CBGV đăng ký tham gia khóa đào tạo (chống đăng ký trùng).
- Tuyến Routes & Controllers (`src/routes/v1/training.routes.ts`, `src/controllers/training.controller.ts`):
  - `GET /api/v1/training/certificates/my`, `POST /api/v1/training/certificates`
  - `GET /api/v1/training/certificates`, `PUT /api/v1/training/certificates/:id/verify`
  - `GET /api/v1/training/certificates/expiring`
  - `GET /api/v1/training/courses`, `POST /api/v1/training/courses`
  - `POST /api/v1/training/courses/:id/register`
- `tsc` biên dịch thành công 0 lỗi.

#### 5. Giao diện Người dùng Next.js 15 App Router (`@bahau/web`)
- `apps/web/src/app/training/page.tsx`:
  - Không gian 1: Cá nhân (Tab Chứng chỉ của tôi + Modal nộp chứng chỉ mới + Tab Khóa bồi dưỡng mở đăng ký).
  - Thẻ thống kê cá nhân, badge thẩm định, badge cảnh báo hạn sử dụng 5 mức.
- `apps/web/src/app/training/manage/page.tsx`:
  - Không gian 3: Quản trị & Phòng TCHC (Thống kê toàn trường, cảnh báo hết hạn trong 60/90 ngày, Bảng danh sách chứng chỉ, Modal đối chiếu bản scan và thẩm định).
- Cập nhật menu điều hướng `layout.tsx` và liên kết 3 Không gian làm việc tại `page.tsx`.
- `next build` biên dịch thành công 17/17 trang tĩnh.

#### 6. Kiểm thử Tích hợp & Nghiệm thu
- `tests/training-endpoints.test.mjs`: PASS 6/6 test cases.
- Bộ kiểm thử hồi quy:
  - `tests/kpi-endpoints.test.mjs`: PASS 6/6.
  - `tests/attendance-endpoints.test.mjs`: PASS 7/7.
  - `tests/contract-events-endpoints.test.mjs`: PASS 6/6.
  - `tests/leave-workflow-endpoints.test.mjs`: PASS 6/6.
  - `tests/e2e/runner.mjs --all`: Đạt 40/40 test cases PASS 100% trên toàn bộ 4 Tiers.

---

## 📅 Phiên làm việc: Triển khai Giai đoạn 6 — Executive Dashboard, Transactional Outbox Worker & Trợ lý ảo AI Quy chế DAU

### 🎯 Mục tiêu phiên
- Triển khai hoàn chỉnh **Giai đoạn 6: Dashboard Điều hành Lãnh đạo, Outbox Background Worker & Trợ lý ảo AI Assistant (DAU Policy RAG)**.
- Xây dựng từ tầng Cơ sở dữ liệu, Hợp đồng DTO Zod SSoT, Backend API Controllers & Services, Giao diện Next.js 15 đến Bộ kiểm thử tự động.

### 📝 Kết quả đạt được
#### 1. PRD & Tài liệu Kế hoạch
- `docs/requirements/module-07-dashboard-ai-prd.md`: PRD Phân hệ 7 chi tiết với 7 mã quyền RBAC, mô hình ERD `Notification` & `PolicyKnowledge`, cơ chế Transactional Outbox, bộ máy RAG tri thức DAU.
- `docs/plan/phase-06-dashboard-ai.md`: Kế hoạch thi công chi tiết với 100% tiêu chí DoD hoàn thành `[x]`.
- `docs/plan/master-roadmap-handoff.md`: Cập nhật Giai đoạn 6 thành "ĐÃ HOÀN THÀNH 100% ✅".

#### 2. Cơ sở Dữ liệu & Prisma (`@bahau/database`)
- Thêm enum `NotificationType` (SYSTEM, WORKFLOW, ALERT, CONTRACT, CERTIFICATE, KPI, TRAINING).
- Thêm model `Notification` (lưu trữ thông báo in-app gửi tới user từ các sự kiện Outbox).
- Thêm model `PolicyKnowledge` (lưu trữ điều khoản, số hiệu quyết định, từ khóa và nội dung quy chế nội bộ DAU).
- Cập nhật `seed.ts` với Step 15:
  - 5 Quyết định/Quy chế DAU nền tảng: QĐ 128 (Giờ chuẩn giảng viên 270h), QĐ 45 (Nghỉ phép 12 ngày + thâm niên), QyĐ 89 (Nâng bậc lương định kỳ & trước hạn), QĐ 210 (KPI khống chế 20% Loại A, Anti-Self-Approval), QyĐ 15 (CCHN Kiến trúc sư & tiêu chuẩn giảng viên chính).
  - 7 permissions mới phân quyền vào 5 vai trò hệ thống.
  - Thông báo mẫu và sự kiện Outbox mẫu cho tài khoản giảng viên `employee@dau.edu.vn`.
- `prisma generate` và `tsc` build thành công 100%.

#### 3. Zod Contracts SSoT (`@bahau/contracts`)
- Định nghĩa các Zod Enums & Schemas:
  - `packages/contracts/src/dashboard/index.ts`: `DashboardOverviewDtoSchema`, `WorkforceStatsDtoSchema`, `ExecutiveAlertsDtoSchema`.
  - `packages/contracts/src/notification/index.ts`: `NotificationDtoSchema`, `NotificationListResponseSchema`, `ProcessOutboxBatchResponseSchema`.
  - `packages/contracts/src/ai/index.ts`: `AiChatRequestSchema`, `AiChatResponseSchema`, `PolicyKnowledgeDtoSchema`.
- `tsc` build sạch 0 lỗi.

#### 4. Dịch vụ & API Backend (`@bahau/api`)
- `DashboardService`:
  - `getOverview`: Tổng quan số liệu toàn trường, tỷ lệ học vị cao, tỷ lệ chứng chỉ hành nghề, số hợp đồng và việc chờ duyệt.
  - `getWorkforceStats`: Phân bố trình độ học vị, chức danh học thuật, vị trí việc làm, loại hợp đồng và nhật ký biến động công tác gần đây.
  - `getExecutiveAlerts`: Trung tâm cảnh báo điều hành (Hợp đồng 60 ngày, Chứng chỉ quá hạn/sắp hết hạn, Hồ sơ chờ duyệt).
- `OutboxService`:
  - `processBatch`: Quét sự kiện `PENDING` trong `outbox_events`, chuyển sang `PROCESSING`, dispatch sinh `Notification` in-app, mô phỏng gửi email, cập nhật `PROCESSED` hoặc ghi lỗi `FAILED` (tối đa 3 lần retry).
  - `getMyNotifications`, `markAsRead`, `markAllAsRead`: Quản lý thông báo người dùng.
- `AiAssistantService`:
  - `chat`: Tìm kiếm tri thức quy chế DAU theo từ khóa/ngữ nghĩa, trả về câu trả lời kèm trích dẫn văn bản số/điều khoản cụ thể. Tích hợp tra cứu số dư phép cá nhân trực tiếp và đề xuất đơn nháp an toàn (`CONFIRMATION_REQUIRED` $\rightarrow$ `SUBMITTED`).
  - `getPolicies`: Danh mục các điều khoản quy chế DAU tra cứu.
- Endpoints:
  - `GET /api/v1/dashboard/overview`, `GET /api/v1/dashboard/workforce-stats`, `GET /api/v1/dashboard/alerts`
  - `GET /api/v1/notifications/my`, `PATCH /api/v1/notifications/:id/read`, `POST /api/v1/notifications/read-all`
  - `POST /api/v1/worker/outbox/process-batch`
  - `POST /api/v1/ai/chat`, `GET /api/v1/ai/policies`
- `tsc` build sạch 0 lỗi.

#### 5. Giao diện Người dùng Next.js 15 App Router (`@bahau/web`)
- `apps/web/src/app/dashboard/page.tsx`:
  - Executive Dashboard: 4 thẻ KPI chỉ số cốt lõi, Tab Cơ cấu học thuật & Vị trí việc làm, Tab Hợp đồng & Biến động nhân sự, Tab Trung tâm Cảnh báo điều hành tập trung.
- `apps/web/src/app/ai-assistant/page.tsx`:
  - Khung chat hai chiều trực quan, câu hỏi gợi ý nhanh chuẩn DAU, thẻ trích dẫn số hiệu văn bản quy chế DAU, hộp duyệt đơn nháp (Draft Preview Card) với nút xác nhận an toàn.
- `apps/web/src/components/NotificationDropdown.tsx`:
  - Icon Chuông thông báo trên Header, hiển thị badge số lượng chưa đọc và popover xem nhanh thông báo.
- Cập nhật liên kết trong `apps/web/src/app/layout.tsx` và `apps/web/src/app/page.tsx`.
- `next build` prerender thành công 19/19 trang tĩnh sạch 0 lỗi.

#### 6. Kiểm thử Tích hợp & Nghiệm thu
- `tests/dashboard-ai-endpoints.test.mjs`: PASS 6/6 test cases (100%).
- Chạy hồi quy toàn bộ các test suites:
  - `tests/training-endpoints.test.mjs`: PASS 6/6.
  - `tests/kpi-endpoints.test.mjs`: PASS 6/6.
  - `tests/attendance-endpoints.test.mjs`: PASS 7/7.
  - `tests/contract-events-endpoints.test.mjs`: PASS 6/6.
  - `tests/leave-workflow-endpoints.test.mjs`: PASS 6/6.

---

## Phiên 8 — 19/09/2026 (16:15 – 16:30)

### ✅ Đã hoàn thành trong Phiên 8: Đồng bộ Toàn diện Giao diện Người dùng UI/UX Chuẩn Swiss & Thư mục `Complete my task/`

#### 1. Hệ thống Design Tokens & Kiểu dáng Swiss Chuẩn Kiến trúc (`apps/web`)
- Cập nhật `apps/web/tailwind.config.js`:
  - Font Sans: Google Fonts `'Be Vietnam Pro'`, `'Inter'`, `system-ui`, `sans-serif`.
  - Font Monospace: `'JetBrains Mono'`, `ui-monospace`, `monospace`.
  - Bảng màu DAU Heritage: `brand-50` đến `brand-700` (`#004b87`), `ochre-50` đến `ochre-700` (`#d97706`), `canvas` (`#f8fafc`), `surface` (`#ffffff`), `line` (`#e2e8f0`), `ink` (`#0f172a`), `muted` (`#475569`).
- Cập nhật `apps/web/src/app/globals.css`:
  - Import Google Fonts `Be Vietnam Pro` (400, 500, 600, 700) và `JetBrains Mono` (400, 500, 600).
  - Tinh chỉnh thanh cuộn siêu mỏng thanh lịch (custom scrollbar).
  - Vùng chọn văn bản chuẩn màu nhận diện trường (`#bae6fd` nền, `#002747` chữ).

#### 2. Thư viện Thành phần Cơ bản & Cấu trúc Dữ liệu Chuẩn
- Cài đặt `lucide-react` trong `@bahau/web` phục vụ 100% vector SVG icons, loại bỏ hoàn toàn emoji biểu tượng.
- Tạo `apps/web/src/components/ui.tsx`:
  - `cx(...)`: Tiện ích gộp classNames.
  - `Avatar`: Trích xuất ký tự viết tắt thông minh bỏ qua học hàm/học vị (`PGS.TS.`, `TS.`, `ThS.`, `KS.`).
  - `StatusPill`: Huy hiệu trạng thái nhân sự (`active`, `leave`, `terminated`).
  - `Badge`: Tông màu `info`, `success`, `warning`, `danger`, `ochre`, `neutral`.
  - `Button`: Biến thể `primary`, `success`, `ghost`, `outline`, `danger-outline`, `warning-outline`.
  - `Card`: Bo góc `rounded-xl`, viền `line`, đổ bóng nhẹ.
- Đồng bộ `apps/web/src/data.ts`: Dữ liệu nhân sự mẫu, cơ cấu tổ chức, vai trò và đơn từ.
- Cập nhật `apps/web/src/context/AuthContext.tsx`: Bổ sung `ROLE_USER_MAP` và hàm `loginAsRole` hỗ trợ chuyển nhanh 5 vai trò.

#### 3. App Shell 2 Cột & Cấu trúc 3 Không gian Làm việc
- `apps/web/src/components/Shell.tsx`:
  - Sidebar cố định 260px phân cấp 3 nhóm:
    1. `CÁ NHÂN`: Hồ sơ & CV (`/profile`), Sổ phép 2026 (`/leave`), Đăng ký công tác (`/trips`), Chấm công (`/attendance`), KPI cá nhân (`/kpi`), Chứng chỉ & Đào tạo (`/training`).
    2. `QUẢN LÝ ĐƠN VỊ`: Hộp thư duyệt (`/approvals`), Quản lý điểm danh (`/attendance/manage`), Chấm điểm KPI (`/kpi/manage`), Thẩm định chứng chỉ (`/training/manage`).
    3. `QUẢN TRỊ NHÀ TRƯỜNG`: Cây tổ chức (`/units`), Danh bạ CBGV (`/employees`), Hợp đồng lao động (`/contracts`), Executive Dashboard (`/dashboard`), Trợ lý AI Quy chế (`/ai-assistant`).
  - Chân trang hiển thị trạng thái vận hành học thuật: `Hệ thống: Trực tuyến · CSDL: Đồng bộ`.
  - Sticky Header với Bộ chọn ngữ cảnh đơn vị (`[🏛️ Khoa Kiến trúc (Trưởng khoa) ▾]`), Command Palette (`⌘K`), Chuông thông báo realtime, Avatar người dùng và Menu tài khoản / Đăng xuất.
- `apps/web/src/components/AppLayoutWrapper.tsx`:
  - Tự động nhận diện route: hiển thị layout độc lập cho trang chủ `/` và `/login`; tự động bọc trong `Shell` cho toàn bộ các route nội bộ.

#### 4. Hoàn thiện Toàn diện Các Màn hình
- `apps/web/src/app/page.tsx`: Landing Page phong cách Swiss, Hero Blueprint isometric SVG, thống kê trường, 3 Không gian làm việc, lưới tính năng và luồng phê duyệt DON2026-0148.
- `apps/web/src/app/login/page.tsx`: Cổng đăng nhập phân đôi 45/55, hình vẽ trường isometric SVG, khẩu hiệu *"Sáng tạo — Trách nhiệm — Nhân văn"*, thanh Demo Fast-Role Switcher 5 vai trò.
- `apps/web/src/app/profile/page.tsx`: Hồ sơ cá nhân với ảnh bìa DAU, Avatar lớn, lý lịch liên hệ và timeline lịch sử bổ nhiệm.
- `apps/web/src/app/units/page.tsx`: Cây tổ chức toàn trường dạng lồng nhau, badge màu phân cấp đơn vị, avatar phụ trách và số lượng CBGV.
- `apps/web/src/app/employees/page.tsx`: Danh bạ nhân sự mật độ cao, bộ lọc đơn vị/học vị, Slide-Over Profile Drawer 4 tab.
- `apps/web/src/app/leave/page.tsx`: Sổ phép với 4 thẻ KPI, thanh quy trình Stepper, Modal tạo đơn xin nghỉ phép nửa ngày và chỉ định người dạy thay.
- `apps/web/src/app/approvals/page.tsx`: Hộp thư duyệt với banner Anti-Self-Approval, kiểm tra trùng lịch, nút Phê duyệt / Từ chối / Yêu cầu bổ sung kèm RejectDialog bắt buộc nêu lý do.
- `apps/web/src/app/contracts/page.tsx`: Quản trị vòng đời hợp đồng lao động chuẩn Swiss.

---

## 🎯 Kế hoạch Phiên làm việc tiếp theo

> **Mục tiêu tiếp theo**: Kiểm thử toàn diện môi trường, xác nhận 0 lỗi biên dịch Next.js và toàn bộ test suites backend PASS 100%. Sẵn sàng phục vụ người dùng trải nghiệm thực tế.

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
