# ĐẶC TẢ YÊU CẦU NGHIỆP VỤ (PRD) & USER STORIES
## Phân hệ 1: Quản lý Cơ cấu Tổ chức, Hồ sơ Nhân sự, Kiêm nhiệm & Hợp đồng lao động
### Hệ thống Quản trị Nhân sự Thông minh - Trường Đại học Kiến trúc Đà Nẵng (DAU)

---

### 1. Mục tiêu và Phạm vi Phân hệ
Phân hệ **Nhân sự nền tảng (Core HR)** là xương sống dữ liệu của toàn bộ hệ thống BAHAU. Toàn bộ các phân hệ tiếp theo (Nghỉ phép, Chấm công, KPI, Workflow, AI Tra cứu) đều phụ thuộc trực tiếp vào tính chính xác của dữ liệu trong phân hệ này.

#### Phạm vi chức năng:
1. **Cơ cấu tổ chức đa cấp**: Quản lý cây đơn vị của trường (Ban Giám hiệu $\rightarrow$ Khoa/Phòng/Trung tâm $\rightarrow$ Bộ môn/Tổ công tác).
2. **Danh mục chức vụ & chức danh**: Phân biệt chức vụ quản lý (`MANAGEMENT`), chức danh giảng dạy (`ACADEMIC`), chức danh hành chính (`ADMINISTRATIVE`).
3. **Hồ sơ CBGVNV toàn diện**: Quản lý thông tin định danh, nhân thân, học vị (Cử nhân, Thạc sĩ, Tiến sĩ), học hàm (Phó Giáo sư, Giáo sư), thông tin liên hệ, trạng thái công tác.
4. **Phân công công tác & Kiêm nhiệm (Assignments)**: Quản lý 1 vị trí chính (`PRIMARY`) và các vị trí kiêm nhiệm (`CONCURRENT`) có thời hạn của giảng viên và cán bộ quản lý.
5. **Hợp đồng lao động & Phụ lục**: Quản lý chuỗi hợp đồng, loại hợp đồng, hệ số lương, thời hạn, đính kèm file scan hợp đồng và tự động cảnh báo hết hạn.
6. **Lịch sử biến động công tác (Employment Events)**: Ghi nhận mọi mốc bổ nhiệm, điều chuyển, tiếp nhận, thôi việc gắn với số quyết định của Hiệu trưởng.
7. **Tự phục vụ (Self-Service)**: Giảng viên tự cập nhật thông tin liên hệ; gửi yêu cầu bổ sung văn bằng/học hàm kèm file minh chứng qua quy trình xét duyệt 2 cấp.
8. **Import Excel an toàn**: Hỗ trợ nạp dữ liệu nhân sự hàng loạt có kiểm tra lỗi theo từng dòng, xem trước trước khi nạp chính thức.

---

### 2. Quy chuẩn Dữ liệu Đặc thù tại DAU

1. **Quy tắc sinh Mã nhân sự (Employee Code)**:
   - Cấu trúc: `DAU` + [2 chữ số năm tuyển dụng] + [4 chữ số thứ tự tự tăng].
   - Ví dụ: Tuyển dụng năm 2026 $\rightarrow$ `DAU260001`, `DAU260002`...
   - Tính chất: Mã này là duy nhất và cố định vĩnh viễn suốt đời công tác của nhân sự, không thay đổi khi chuyển ngạch từ Giảng viên sang Chuyên viên hoặc ngược lại.
   - Hỗ trợ lưu trữ mã nhân sự cũ nếu import dữ liệu lịch sử từ các hệ thống trước đây của trường.
2. **Cây Cơ cấu Tổ chức Mẫu tại DAU**:
   - **Cấp 0**: Ban Giám hiệu (`BGH`)
   - **Cấp 1 - Khối Đào tạo**: Khoa Kiến trúc (`K_KT`), Khoa Xây dựng (`K_XD`), Khoa Đô thị (`K_DT`)...
   - **Cấp 2 - Khối Đào tạo**: Các Bộ môn trực thuộc Khoa (ví dụ: Bộ môn Kiến trúc công trình `BM_KTCT`, Bộ môn Lý luận & Lịch sử `BM_LLLS`...).
   - **Cấp 1 - Khối Hành chính**: Phòng Tổ chức - Hành chính (`P_TCHC`), Phòng Đào tạo (`P_DT`), Phòng Khảo thí & ĐBCL (`P_KTDBCL`), Phòng Kế hoạch - Tài chính (`P_KHTC`)...
   - **Cấp 1 - Khối Hỗ trợ/NCS**: Thư viện, Trung tâm Tin học, Viện Nghiên cứu Đô thị...

---

### 3. Danh sách User Stories & Tiêu chí Nghiệm thu (Acceptance Criteria)

#### US-01: Quản lý Cây Cơ cấu Tổ chức Đơn vị
- **Actor**: Chuyên viên Nhân sự (`HR_OFFICER`), Quản trị hệ thống (`SYSADMIN`).
- **Mô tả**: Là chuyên viên nhân sự, tôi muốn xem, tạo mới, chỉnh sửa thông tin các đơn vị và chỉ định Trưởng đơn vị, để hệ thống xác định đúng sơ đồ tổ chức và tuyến phê duyệt.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - **AC-01.1**: Hệ thống hiển thị trực quan cây tổ chức theo dạng phân cấp cha - con (Tree View).
  - **AC-01.2**: Khi tạo một đơn vị con (ví dụ Bộ môn), bắt buộc phải chọn đơn vị cha hợp lệ (ví dụ Khoa Kiến trúc). Không cho phép một đơn vị tự làm cha của chính mình hoặc tạo vòng lặp cây.
  - **AC-01.3**: Cho phép gán một nhân sự làm Người đứng đầu đơn vị (`managerEmployeeId`). Nhân sự này bắt buộc phải có phân công công tác tại đơn vị đó hoặc đơn vị cấp trên.
  - **AC-01.4**: Không cho phép xóa đơn vị nếu đang có nhân sự trực thuộc đang công tác hoặc có đơn vị con đang hoạt động (yêu cầu điều chuyển nhân sự trước).

---

#### US-02: Tạo mới và Quản lý Hồ sơ CBGVNV
- **Actor**: Chuyên viên Nhân sự (`HR_OFFICER`).
- **Mô tả**: Là chuyên viên nhân sự, tôi muốn tạo mới hồ sơ nhân sự với đầy đủ thông tin nhân thân, bằng cấp và tự động tạo tài khoản đăng nhập cho họ.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - **AC-02.1**: Tự động gợi ý Mã nhân sự theo quy tắc `DAU{YY}{0000}` nhưng cho phép nhập mã tùy chỉnh có kiểm tra tính duy nhất.
  - **AC-02.2**: Bắt buộc nhập: Họ và tên, Ngày sinh, Giới tính, Số CCCD, Ngày cấp, Nơi cấp, Email làm việc, Ngày tiếp nhận.
  - **AC-02.3**: Khi tạo hồ sơ thành công, hệ thống tự động sinh bản ghi `User` tương ứng (trừ khi đánh dấu không cấp tài khoản), gán vai trò mặc định `ROLE_EMPLOYEE` và gửi email kích hoạt tài khoản có mật khẩu ngẫu nhiên/link đặt mật khẩu an toàn.
  - **AC-02.4**: Mọi thao tác chỉnh sửa các trường nhạy cảm (Số CCCD, Mã số thuế, Ngày sinh, Học hàm, Học vị) đều được ghi nhận vào `AuditEvent` kèm `userId` người thực hiện và dữ liệu trước/sau thay đổi.

---

#### US-03: Thiết lập Phân công Công tác & Kiêm nhiệm (Assignments)
- **Actor**: Chuyên viên Nhân sự (`HR_OFFICER`).
- **Mô tả**: Là chuyên viên nhân sự, tôi muốn phân công vị trí chính thức và các vị trí kiêm nhiệm cho giảng viên, để phản ánh đúng thực tế công tác tại trường.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - **AC-03.1**: Mỗi nhân sự tại một thời điểm chỉ có duy nhất **1** phân công chính thức (`assignmentType = 'PRIMARY'`). Khi thêm phân công chính thức mới, phân công cũ sẽ được tự động đóng (`endDate = ngày hiệu lực mới - 1`).
  - **AC-03.2**: Cho phép một nhân sự có nhiều phân công kiêm nhiệm (`assignmentType = 'CONCURRENT'`) tại các đơn vị khác nhau (ví dụ: Giảng viên Bộ môn Kiến trúc kiêm nhiệm Phó Trưởng phòng Đào tạo).
  - **AC-03.3**: Nếu đánh dấu `isHeadOfUnit = true`, hệ thống tự động cập nhật `managerEmployeeId` của Đơn vị tương ứng.
  - **AC-03.4**: Báo cáo tổng số lượng nhân sự của trường (Headcount) chỉ đếm theo từng cá nhân (`Employee`), tuyệt đối không đếm trùng số lượng theo các chức vụ kiêm nhiệm.

---

#### US-04: Cán bộ/Giảng viên Tự Cập nhật Thông tin Liên hệ (Self-Service)
- **Actor**: Toàn bộ CBGVNV (`EMPLOYEE`).
- **Mô tả**: Là một giảng viên, tôi muốn cập nhật số điện thoại cá nhân và địa chỉ thường trú trên Không gian Cá nhân của mình một cách nhanh chóng mà không cần làm thủ tục giấy tờ.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - **AC-04.1**: Tại Không gian Cá nhân, người dùng chỉ được phép chỉnh sửa trực tiếp các trường: Số điện thoại cá nhân, Email cá nhân, Địa chỉ thường trú, Địa chỉ liên hệ hiện tại, Thông tin người liên hệ khẩn cấp.
  - **AC-04.2**: Các trường như Họ tên, Ngày sinh, Số CCCD, Học hàm, Học vị, Hệ số lương, Đơn vị công tác ở chế độ Read-only (chỉ đọc) và có nút hướng dẫn "Gửi yêu cầu điều chỉnh".
  - **AC-04.3**: Dữ liệu liên hệ sau khi bấm "Lưu" được cập nhật ngay vào cơ sở dữ liệu và ghi nhận log thay đổi.

---

#### US-05: Gửi Yêu cầu Bổ sung Văn bằng / Học hàm (Degree & Title Change Request)
- **Actor**: Toàn bộ CBGVNV (`EMPLOYEE`).
- **Mô tả**: Là một giảng viên vừa bảo vệ thành công luận án Tiến sĩ hoặc được công nhận chức danh PGS, tôi muốn nộp bản scan bằng cấp trên hệ thống để được cập nhật vào hồ sơ chính thức.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - **AC-05.1**: Giảng viên tạo yêu cầu tại Không gian Cá nhân: Chọn loại thay đổi (Bổ sung Bằng Thạc sĩ/Tiến sĩ, Bổ sung Học hàm PGS/GS), nhập Chuyên ngành, Nơi cấp bằng, Ngày ký quyết định/cấp bằng.
  - **AC-05.2**: Bắt buộc đính kèm ít nhất 1 file scan/ảnh chụp văn bằng gốc (hỗ trợ PDF, JPG, PNG tối đa 10MB). File được lưu vào hệ thống bảo mật qua `FileAsset`.
  - **AC-05.3**: Yêu cầu sau khi gửi chuyển sang trạng thái `PENDING_APPROVAL` và sinh nhiệm vụ phê duyệt (`Task`) gửi đến Trưởng khoa/đơn vị và Phòng TCHC.

---

#### US-06: Thẩm định & Phê duyệt Yêu cầu Bổ sung Văn bằng
- **Actor**: Trưởng đơn vị (`UNIT_HEAD`), Chuyên viên Nhân sự (`HR_OFFICER`).
- **Mô tả**: Là Trưởng khoa hoặc Chuyên viên TCHC, tôi muốn xem xét văn bằng scan của giảng viên để xác nhận và cập nhật vào hồ sơ chính thức của trường.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - **AC-06.1**: Bước 1 - Trưởng đơn vị: Nhận thông báo trong Không gian Quản lý Đơn vị, xem chi tiết và file scan bằng cấp, bấm "Xác nhận đúng chuyên môn" hoặc "Trả lại yêu cầu bổ sung thông tin".
  - **AC-06.2**: Bước 2 - Phòng TCHC: Nhận đơn đã có ý kiến của Trưởng khoa, đối chiếu văn bản gốc hoặc số hiệu bằng, bấm "Phê duyệt chính thức".
  - **AC-06.3**: Ngay khi Phòng TCHC bấm Phê duyệt:
    - Hồ sơ `Employee` tự động cập nhật trường `academicDegree` hoặc `academicTitle`.
    - Sinh một bản ghi `EmploymentEvent` ghi nhận mốc đạt học vị mới.
    - Trạng thái yêu cầu chuyển thành `APPROVED`, gửi thông báo chúc mừng tới giảng viên qua email và ứng dụng.

---

#### US-07: Quản lý Hợp đồng Lao động & Gia hạn Hợp đồng
- **Actor**: Chuyên viên Nhân sự (`HR_OFFICER`).
- **Mô tả**: Là chuyên viên nhân sự, tôi muốn lập hợp đồng lao động mới, quản lý phụ lục và gia hạn hợp đồng cho nhân sự khi đến hạn.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - **AC-07.1**: Hỗ trợ các loại hợp đồng: Thử việc, Có thời hạn 12 tháng, Có thời hạn 36 tháng, Không xác định thời hạn, Hợp đồng thỉnh giảng.
  - **AC-07.2**: Hợp đồng không xác định thời hạn không bắt buộc nhập `expiryDate`. Hợp đồng có thời hạn bắt buộc phải có `effectiveDate` và `expiryDate` với `expiryDate > effectiveDate`.
  - **AC-07.3**: Khi gia hạn hợp đồng: Hệ thống **không** sửa đè hợp đồng cũ. Hệ thống tạo một bản ghi `EmploymentContract` mới có `parentContractId` trỏ về hợp đồng cũ, đồng thời cập nhật trạng thái hợp đồng cũ thành `RENEWED`.
  - **AC-07.4**: Giảng viên đăng nhập vào Không gian Cá nhân có thể xem lịch sử các hợp đồng của mình và tải bản scan hợp đồng PDF về máy.

---

#### US-08: Tự động Cảnh báo Hợp đồng Sắp hết hạn (Expiring Contract Alerts)
- **Actor**: Hệ thống (`Background Worker`), Chuyên viên Nhân sự (`HR_OFFICER`), Trưởng đơn vị (`UNIT_HEAD`).
- **Mô tả**: Hệ thống tự động quét và gửi cảnh báo trước 60 ngày và 30 ngày đối với các hợp đồng sắp hết hạn để phòng nhân sự kịp thời làm thủ tục gia hạn hoặc đánh giá tái ký.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - **AC-08.1**: Background Worker chạy định kỳ mỗi ngày lúc 06:00 sáng, quét tất cả hợp đồng có trạng thái `ACTIVE` và có `expiryDate` nằm trong khoảng [hôm nay + 60 ngày] hoặc [hôm nay + 30 ngày].
  - **AC-08.2**: Tạo thông báo trong ứng dụng và gửi email cảnh báo danh sách hợp đồng sắp hết hạn đến Chuyên viên Nhân sự phụ trách và Trưởng đơn vị quản lý nhân sự đó.
  - **AC-08.3**: Hợp đồng đã được gia hạn (đã có hợp đồng mới ở trạng thái `ACTIVE` hoặc `RENEWED`) tuyệt đối không tiếp tục gửi cảnh báo theo mốc cũ.
  - **AC-08.4**: Hợp đồng không xác định thời hạn bị loại trừ hoàn toàn khỏi bộ lọc quét này.

---

#### US-09: Xem Dòng thời gian Quá trình Công tác (Employment Timeline)
- **Actor**: Toàn bộ người dùng theo quyền hạn xem hồ sơ.
- **Mô tả**: Người xem có thể thấy toàn bộ quá trình lịch sử công tác của nhân sự dưới dạng Timeline trực quan.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - **AC-09.1**: Hiển thị theo thứ tự thời gian giảm dần (sự kiện mới nhất ở trên cùng).
  - **AC-09.2**: Mỗi sự kiện hiển thị rõ: Ngày hiệu lực, Loại sự kiện (Tuyển dụng, Bổ nhiệm chức vụ, Điều chuyển đơn vị, Nâng lương, Khen thưởng), Số quyết định, Đơn vị/Chức vụ cũ $\rightarrow$ Đơn vị/Chức vụ mới, Người ký quyết định.
  - **AC-09.3**: Trả lời chính xác câu hỏi tại một mốc thời gian trong quá khứ người này đang công tác ở đơn vị nào mà không bị ảnh hưởng bởi đơn vị hiện tại.

---

#### US-10: Import Danh sách Nhân sự Hàng loạt từ Excel
- **Actor**: Chuyên viên Nhân sự (`HR_OFFICER`).
- **Mô tả**: Là chuyên viên nhân sự, tôi muốn tải file Excel danh sách cán bộ giảng viên để nhập hàng loạt vào hệ thống nhanh chóng và an toàn.
- **Tiêu chí nghiệm thu (Acceptance Criteria)**:
  - **AC-10.1**: Hệ thống cung cấp nút tải file mẫu Excel (`DAU_Employee_Import_Template.xlsx`) có sẵn các cột quy chuẩn và sheet hướng dẫn mã đơn vị/mã chức danh.
  - **AC-10.2 - Validate Dry-run**: Sau khi tải file lên, hệ thống thực hiện kiểm tra sơ bộ mà chưa ghi vào DB:
    - Báo lỗi dòng thiếu trường bắt buộc.
    - Báo lỗi nếu mã đơn vị hoặc mã chức vụ không tồn tại trong hệ thống.
    - Báo trùng nếu số CCCD hoặc Mã nhân viên đã có trên hệ thống.
  - **AC-10.3 - Màn hình Preview**: Hiển thị bảng kết quả: Số dòng hợp lệ, số dòng lỗi, chi tiết lỗi tại từng dòng/cột.
  - **AC-10.4 - Nạp dữ liệu chính thức**: Người dùng bấm "Xác nhận nạp". Toàn bộ các dòng hợp lệ được nạp trong một Transaction. Xuất file kết quả chứa các dòng lỗi (nếu có) để người dùng chỉnh sửa nạp lại.

---

### 4. Danh sách API Endpoints Phân hệ 1 (Contract Specs)

| Phương thức | Endpoint | Phân quyền yêu cầu | Mô tả chức năng |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/units` | `unit:read_tree` | Lấy toàn bộ cây cơ cấu tổ chức |
| `POST` | `/api/v1/units` | `unit:manage_structure` | Tạo mới một đơn vị |
| `PUT` | `/api/v1/units/:id` | `unit:manage_structure` | Chỉnh sửa đơn vị / đổi người đứng đầu |
| `GET` | `/api/v1/positions` | Đăng nhập | Lấy danh mục chức vụ & chức danh |
| `GET` | `/api/v1/employees` | `employee:read_basic` | Danh sách nhân sự (Lọc theo Scope đơn vị, phân trang, tìm kiếm) |
| `POST` | `/api/v1/employees` | `employee:create` | Tạo mới hồ sơ nhân sự & tài khoản |
| `GET` | `/api/v1/employees/:id` | `employee:read_basic` | Xem chi tiết hồ sơ nhân sự (kèm lọc dữ liệu nhạy cảm theo Scope) |
| `PUT` | `/api/v1/employees/:id` | `employee:update_sensitive` | Cập nhật hồ sơ nhân sự chính thức |
| `GET` | `/api/v1/employees/me` | `SCOPE_SELF` | Lấy thông tin hồ sơ của người đăng nhập hiện tại |
| `PUT` | `/api/v1/employees/me/contact` | `SCOPE_SELF` | Giảng viên tự cập nhật thông tin liên hệ |
| `GET` | `/api/v1/employees/:id/assignments` | `employee:read_basic` | Lấy danh sách phân công công tác & kiêm nhiệm |
| `POST` | `/api/v1/employees/:id/assignments` | `employee:update_sensitive` | Thêm mới phân công công tác / kiêm nhiệm |
| `GET` | `/api/v1/employees/:id/contracts` | `contract:read_own` / `contract:read_unit` | Lấy danh sách hợp đồng lao động |
| `POST` | `/api/v1/employees/:id/contracts` | `contract:create_amend` | Tạo mới hoặc gia hạn hợp đồng |
| `GET` | `/api/v1/employees/:id/events` | `employee:read_basic` | Lấy lịch sử biến động công tác (Timeline) |
| `POST` | `/api/v1/employees/import/validate` | `employee:create` | Tải file Excel lên để validate sơ bộ (Dry-run) |
| `POST` | `/api/v1/employees/import/confirm` | `employee:create` | Xác nhận nạp danh sách nhân sự từ batch đã validate |
| `POST` | `/api/v1/profile-requests` | `employee:create_request` | Giảng viên nộp yêu cầu bổ sung bằng cấp/học hàm |
| `GET` | `/api/v1/profile-requests` | `SCOPE_SELF` / `SCOPE_UNIT` / `HR` | Xem danh sách yêu cầu điều chỉnh hồ sơ |
| `PUT` | `/api/v1/profile-requests/:id/action` | `workflow:action` | Duyệt / Trả lại / Từ chối yêu cầu thay đổi văn bằng |

---

### 5. Tiêu chuẩn Kiểm thử & Nghiệm thu Phân hệ 1

1. **Kiểm thử Kiểm soát Quyền truy cập (Security & Scope Tests)**:
   - Giảng viên Khoa Kiến trúc không thể xem số CCCD, thuế, hợp đồng của Giảng viên khác cùng khoa.
   - Trưởng khoa Kiến trúc có thể xem danh sách nhân sự trong khoa và các bộ môn con, nhưng không thể xem nhân sự thuộc Khoa Xây dựng.
   - Chuyên viên Phòng TCHC xem được toàn trường nhưng mọi thao tác sửa đều có Audit Log.
2. **Kiểm thử Ràng buộc Toàn vẹn (Integrity Tests)**:
   - Tạo 2 hợp đồng chính thức (`PRIMARY`) có khoảng thời gian hiệu lực đè lên nhau $\rightarrow$ Hệ thống bắt buộc phải báo lỗi hoặc tự động đóng hợp đồng cũ.
   - Import file Excel có mã CBGV hoặc số CCCD bị trùng $\rightarrow$ Báo lỗi dòng chính xác, không nạp đè dữ liệu.
   - Xóa một đơn vị đang có giảng viên công tác $\rightarrow$ Bị chặn hoàn toàn với mã lỗi `CONFLICT_STATE`.
