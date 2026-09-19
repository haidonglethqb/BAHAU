# ĐẶC TẢ YÊU CẦU NGHIỆP VỤ & KỸ THUẬT (PRD)
## PHÂN HỆ 4: QUẢN LÝ CHẤM CÔNG & ĐIỀU CHỈNH CÔNG (ATTENDANCE & TIMESHEETS)
### Hệ thống Quản trị Nhân sự Thông minh BAHAU — Trường Đại học Kiến trúc Đà Nẵng (DAU)

---

## 📌 1. TỔNG QUAN PHÂN HỆ & BỐI CẢNH

Quản lý Chấm công và Điều chỉnh giờ công là nghiệp vụ nền tảng phục vụ quản lý kỷ luật lao động và tính toán chế độ tiền lương, phụ cấp cho toàn thể Cán bộ, Giảng viên, Nhân viên tại Trường Đại học Kiến trúc Đà Nẵng (DAU).

### 1.1. Mục tiêu Cốt lõi
1. **Kiến trúc 3 Lớp Dữ liệu Chấm công (3-Layer Attendance Architecture)**:
   - **Lớp 1 (Raw Attendance)**: Dữ liệu điểm danh quẹt thẻ thô từ hệ thống máy chấm công sinh trắc học (vân tay/khuôn mặt) tại các cổng trường và tòa nhà, hoặc import định kỳ từ file Excel/CSV.
   - **Lớp 2 (Adjustment Requests)**: Đơn giải trình / xin điều chỉnh công của CBGV khi quên quẹt thẻ hoặc có sự cố thiết bị, tích hợp phê duyệt qua WorkflowEngine phân cấp.
   - **Lớp 3 (Locked Timesheet)**: Bảng công tổng hợp chính thức sau khi đối soát tự động với dữ liệu Nghỉ phép (`LeaveRequest`) và Công tác (`BusinessTripRequest`). Khi Phòng TCHC khóa kỳ công, dữ liệu trở thành bất biến để chốt bảng lương.
2. **Đối soát Tự động Liên Phân hệ (Cross-Module Reconciliation)**:
   - Tự động nhận diện nếu ngày làm việc trùng với đơn nghỉ phép đã duyệt (`APPROVED`) $\rightarrow$ ghi nhận ngày nghỉ phép hưởng lương (`ON_LEAVE`).
   - Tự động nhận diện nếu ngày làm việc trùng với chuyến công tác đã duyệt (`APPROVED`) $\rightarrow$ ghi nhận ngày công tác hưởng nguyên lương (`BUSINESS_TRIP`).
3. **Quy tắc Khóa Kỳ Công Bất biến (Immutable Period Locking Rule)**:
   - Sau khi Phòng TCHC / Kế toán thực hiện khóa kỳ công của tháng (`POST /attendance/periods/:id/lock`), mọi bản ghi chấm công và đơn giải trình trong tháng đó sẽ bị đóng băng. Không ai được phép chỉnh sửa dữ liệu, bảo đảm tính pháp lý cho công tác kiểm toán và thanh tra.

---

## 👥 2. MA TRẬN PHÂN QUYỀN TRUY CẬP (RBAC & SCOPE)

| Hành động nghiệp vụ | Endpoint API | CBGVNV (`ROLE_EMPLOYEE`) | Trưởng đơn vị (`ROLE_UNIT_HEAD`) | Phòng TCHC (`ROLE_HR_OFFICER`) | Ban Giám hiệu (`ROLE_RECTOR`) | Quản trị (`ROLE_SYSADMIN`) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| Xem bảng công cá nhân | `GET /attendance/my` | `SCOPE_SELF` | `SCOPE_SELF` | `SCOPE_SELF` | `SCOPE_SELF` | `SCOPE_SELF` |
| Xem bảng công đơn vị | `GET /attendance/unit` | ❌ | `SCOPE_UNIT_TREE` | `SCOPE_ALL` | `SCOPE_ALL` | `SCOPE_ALL` |
| Nộp đơn giải trình giờ công | `POST /attendance/adjustments` | `SCOPE_SELF` | `SCOPE_SELF` | `SCOPE_SELF` | `SCOPE_SELF` | ❌ |
| Import dữ liệu quẹt thẻ thô | `POST /attendance/import` | ❌ | ❌ | ✅ Toàn quyền | ❌ | ✅ |
| Khóa / Mở khóa kỳ công | `POST /attendance/periods/:id/lock` | ❌ | ❌ | ✅ Chốt khóa | Xem | ✅ |

---

## 🎯 3. DANH SÁCH USER STORIES (US)

### US-AT01: Xem Bảng Chấm Công Cá Nhân Theo Lịch Lưới Tháng
- **Người dùng**: Toàn thể CBGVNV (`ROLE_EMPLOYEE`).
- **Mục tiêu**: Xem lịch công tháng của chính mình dạng lưới trực quan (Calendar Grid): Giờ vào, Giờ ra, Số giờ công, và Badge trạng thái từng ngày.
- **Tiêu chí chấp nhận (AC)**:
  1. Cho phép chọn Tháng và Năm cần tra cứu.
  2. Hiển thị 4 thẻ chỉ số tổng kết: Tổng ngày công thực tế, Ngày nghỉ phép hưởng lương, Ngày đi công tác, Số lần đi muộn/về sớm.
  3. Màu sắc trực quan: Xanh lá (Đúng giờ `PRESENT`), Cam (Đi muộn `LATE` / Về sớm `EARLY_LEAVE`), Xanh ngọc (Nghỉ phép `ON_LEAVE`), Xanh dương (Công tác `BUSINESS_TRIP`), Xám (Cuối tuần `WEEKEND` / Nghỉ lễ `HOLIDAY`).

### US-AT02: Nộp Đơn Giải Trình / Điều Chỉnh Giờ Công (Lớp 2)
- **Người dùng**: Toàn thể CBGVNV.
- **Mục tiêu**: Gửi đơn giải trình khi quên quẹt thẻ hoặc có sự cố, đề xuất cập nhật giờ vào/ra chính xác.
- **Tiêu chí chấp nhận (AC)**:
  1. Chỉ được nộp đơn cho các kỳ công **chưa bị khóa** (`isLocked = false`).
  2. Bắt buộc nhập `workDate`, lý do giải trình (`reason`, tối thiểu 5 ký tự).
  3. Tích hợp tự động vào `WorkflowEngine` với `module = ATTENDANCE_ADJUSTMENT`.
  4. Cấp duyệt 1: Trưởng đơn vị trực tiếp (`ROLE_UNIT_HEAD`). Cấp duyệt 2: Phòng TCHC (`ROLE_HR_OFFICER`).
  5. Áp dụng quy tắc Anti-Self-Approval: Nếu Trưởng đơn vị nộp đơn, bước 1 leo thang lên Ban Giám hiệu.
  6. Khi đơn được duyệt xong cấp cuối: Tự động cập nhật giờ vào/ra và đổi trạng thái của bản ghi điểm danh Lớp 1 sang `PRESENT`.

### US-AT03: Quản Trị Bảng Công Đơn Vị (Dành Cho Lãnh Đạo Khoa / Phòng)
- **Người dùng**: Trưởng/Phó Khoa, Trưởng Phòng ban (`ROLE_UNIT_HEAD`).
- **Mục tiêu**: Theo dõi tình hình đi làm, chấp hành giờ giấc của nhân sự thuộc đơn vị mình phụ trách.
- **Tiêu chí chấp nhận (AC)**:
  1. Lọc theo đơn vị trực thuộc và các đơn vị con (`SCOPE_UNIT_TREE`).
  2. Thống kê tổng hợp tỷ lệ đi làm đầy đủ, số lượt đi muộn của toàn đơn vị.

### US-AT04: Import Dữ Liệu Quẹt Thẻ Hàng Loạt (Lớp 1)
- **Người dùng**: Chuyên viên Phòng TCHC (`ROLE_HR_OFFICER`).
- **Mục tiêu**: Nhập dữ liệu chấm công từ file máy quét sinh trắc học hoặc phần mềm cổng trường.
- **Tiêu chí chấp nhận (AC)**:
  1. Hỗ trợ import danh sách bản ghi: `employeeCode`, `workDate`, `checkInTime`, `checkOutTime`, `deviceSource`.
  2. Tự động tính toán số giờ làm việc (`rawWorkingHours = checkOut - checkIn`).
  3. Tự động gắn nhãn: `PRESENT` nếu vào $\le$ 08:00, `LATE` nếu vào $> 08:00$, `EARLY_LEAVE` nếu ra $< 17:00$.
  4. Nếu ngày đó nhân sự đã có đơn nghỉ phép hoặc công tác `APPROVED`, hệ thống tự động ưu tiên gán nhãn `ON_LEAVE` hoặc `BUSINESS_TRIP`.

### US-AT05: Chốt & Khóa Kỳ Công Tháng (Lớp 3)
- **Người dùng**: Lãnh đạo Phòng TCHC / Kế toán (`ROLE_HR_OFFICER`, `ROLE_SYSADMIN`).
- **Mục tiêu**: Chốt bảng công cuối tháng để chuyển sang phòng Kế hoạch - Tài chính tính lương.
- **Tiêu chí chấp nhận (AC)**:
  1. Cập nhật `isLocked = true`, ghi nhận `lockedAt` và `lockedById`.
  2. Tính toán và lưu bảng tổng hợp `MonthlyTimesheetSummary` cho từng nhân sự trong trường:
     $$\text{totalPayableDays} = \text{actualWorkingDays} + \text{paidLeaveDays} + \text{businessTripDays}$$
  3. Sau khi khóa, chặn toàn bộ thao tác nộp đơn giải trình hoặc chỉnh sửa dữ liệu của kỳ công này.

---

## 🔄 4. BIỂU ĐỒ TRẠNG THÁI & QUY TRÌNH KIẾN TRÚC 3 LỚP

```mermaid
flowchart TD
    subgraph Layer1["LỚP 1: RAW ATTENDANCE"]
        Dev[Máy quẹt thẻ sinh trắc / File CSV] -->|Import hàng ngày| Raw[AttendanceRecord]
        Raw --> RuleCheck{Phân loại tự động}
        RuleCheck -->|Vào <= 08:00, Ra >= 17:00| StPres[PRESENT]
        RuleCheck -->|Vào > 08:00| StLate[LATE]
        RuleCheck -->|Ra < 17:00| StEarly[EARLY_LEAVE]
        RuleCheck -->|Không quẹt thẻ| StAbs[ABSENT]
    end

    subgraph Layer2["LỚP 2: ĐƠN GIẢI TRÌNH (WORKFLOW)"]
        CBGV[Cán bộ quên quẹt thẻ] -->|Nộp đơn giải trình| Req[AttendanceAdjustmentRequest]
        Req --> WF[Workflow Engine]
        WF -->|Trưởng đơn vị & TCHC duyệt| Appr[APPROVED]
        Appr -->|Tự động cập nhật| Raw
    end

    subgraph CrossMod["ĐỐI SOÁT LIÊN PHÂN HỆ"]
        Leave[Đơn Nghỉ phép APPROVED] -.->|Ghi nhận| Raw
        Trip[Đơn Công tác APPROVED] -.->|Ghi nhận| Raw
    end

    subgraph Layer3["LỚP 3: KHÓA KỲ CÔNG (LOCKED TIMESHEET)"]
        Raw --> Sum[Tổng hợp công tháng]
        Sum --> Period[POST /periods/:id/lock]
        Period --> LockState[isLocked = TRUE (BẤT BIẾN)]
        LockState --> Payroll[Chuyển Kế toán tính lương]
    end
```

---

## 📡 5. MA TRẬN API ENDPOINTS

1. `GET /api/v1/attendance/my`: Lấy lịch công chi tiết và tổng hợp công tháng của cá nhân (`month`, `year`).
2. `GET /api/v1/attendance/unit`: Quản lý xem bảng công của nhân sự theo đơn vị phụ trách (`unitId`, `month`, `year`).
3. `POST /api/v1/attendance/adjustments`: Gửi yêu cầu giải trình điều chỉnh giờ công.
4. `POST /api/v1/attendance/import`: Upload và đối soát danh sách dữ liệu chấm công.
5. `POST /api/v1/attendance/periods/:id/lock`: Khóa kỳ công của tháng (yêu cầu quyền HR Admin).
