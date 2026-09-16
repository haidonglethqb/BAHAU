# QUY CHUẨN THIẾT KẾ API & CONTRACT DÙNG CHUNG (API & CONTRACT STANDARDS)
## Hệ thống Quản trị Nhân sự Thông minh - Trường Đại học Kiến trúc Đà Nẵng (DAU)

---

### 1. Nguyên tắc Thiết kế
1. **Single Source of Truth với Zod**:
   - Toàn bộ định dạng Request Body, Query Parameters và Response DTO được định nghĩa duy nhất tại package `packages/contracts`.
   - TypeScript types được suy diễn trực tiếp thông qua `z.infer<typeof Schema>`, cam kết 100% Type-Safe giữa Next.js và Express.
2. **RESTful Resource-Oriented**:
   - API tuân thủ chuẩn RESTful, sử dụng danh từ số nhiều cho tài nguyên (`/api/v1/employees`, `/api/v1/leave-requests`).
   - Phiên bản hóa API bằng prefix đường dẫn: `/api/v1/...`.
3. **Traceability & Idempotency**:
   - Mọi request gửi lên đều được gắn mã vết `X-Request-Id` (hoặc Express tự sinh UUIDv7 nếu thiếu) để tra cứu log.
   - Các API tạo mới hoặc chuyển trạng thái quan trọng (gửi đơn, phê duyệt) hỗ trợ header `Idempotency-Key` chống gửi lặp do mạng chập chờn.

---

### 2. Định dạng Chuẩn Phản hồi (Response Envelopes)

#### 2.1. Phản hồi Thành công (Success Response)
```json
{
  "success": true,
  "data": {
    "id": "018e3e4f-2b1a-7b3e-9081-9b8e8f810001",
    "employeeCode": "GV0123",
    "fullName": "Nguyễn Văn An",
    "status": "ACTIVE"
  },
  "meta": {
    "timestamp": "2026-09-16T14:30:00.000Z",
    "requestId": "018e3e4f-2b1a-7b3e-9081-9b8e8f810999"
  }
}
```

#### 2.2. Phản hồi Phân trang Danh sách (Paginated List Response)
```json
{
  "success": true,
  "data": [
    { "id": "...", "fullName": "..." }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 156,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "meta": {
    "timestamp": "2026-09-16T14:30:00.000Z",
    "requestId": "018e3e4f-2b1a-7b3e-9081-9b8e8f810999"
  }
}
```

#### 2.3. Phản hồi Lỗi Chuẩn (Error Response)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Dữ liệu gửi lên không hợp lệ.",
    "details": [
      {
        "field": "startDate",
        "message": "Ngày bắt đầu nghỉ phép không thể trong quá khứ."
      }
    ],
    "requestId": "018e3e4f-2b1a-7b3e-9081-9b8e8f810999",
    "timestamp": "2026-09-16T14:30:00.000Z"
  }
}
```

---

### 3. Bảng Mã Lỗi Nghiệp vụ Chuẩn (Standard Error Codes)

| Mã lỗi (`error.code`) | HTTP Status | Diễn giải |
| :--- | :---: | :--- |
| `UNAUTHENTICATED` | 401 | Phiên làm việc đã hết hạn hoặc chưa đăng nhập |
| `FORBIDDEN` | 403 | Không có quyền thao tác trên tài nguyên hoặc ngoài phạm vi đơn vị (Scope) |
| `RESOURCE_NOT_FOUND` | 404 | Không tìm thấy bản ghi tương ứng |
| `VALIDATION_FAILED` | 422 | Dữ liệu đầu vào không thỏa mãn Zod Schema |
| `CONFLICT_STATE` | 409 | Bản ghi đã bị thay đổi trạng thái bởi người khác (xung đột đồng thời) |
| `SELF_APPROVAL_NOT_ALLOWED` | 403 | Người gửi không được phép tự phê duyệt đơn của mình |
| `INSUFFICIENT_LEAVE_BALANCE` | 400 | Số dư ngày phép không đủ để thực hiện yêu cầu |
| `PERIOD_LOCKED` | 400 | Kỳ chấm công đã bị khóa, không thể điều chỉnh |
| `INTERNAL_SERVER_ERROR` | 500 | Lỗi xử lý nội bộ phía máy chủ |

---

### 4. Quy chuẩn Phân trang, Tìm kiếm và Sắp xếp (Query Conventions)

Tất cả các API dạng danh sách hỗ trợ các query parameter chuẩn:
- `page`: Số trang hiện tại (Mặc định: `1`, tối thiểu 1).
- `pageSize`: Số bản ghi mỗi trang (Mặc định: `20`, tối đa `100`).
- `sortBy`: Tên trường cần sắp xếp (ví dụ: `createdAt`, `fullName`).
- `sortOrder`: Thứ tự sắp xếp (`asc` hoặc `desc`, mặc định: `desc`).
- `search`: Từ khóa tìm kiếm tự do (họ tên, mã cán bộ, email).
- `unitId`: Bộ lọc theo đơn vị (Áp dụng cho Quản lý đơn vị và Nhân sự).

---

### 5. Cấu trúc Package Contracts (`packages/contracts`)

```
packages/contracts/
├── package.json
├── tsconfig.json
└── src/
    ├── common/
    │   ├── pagination.schema.ts
    │   ├── response.schema.ts
    │   └── error.schema.ts
    ├── auth/
    │   ├── login.schema.ts
    │   └── session.schema.ts
    ├── employee/
    │   ├── employee.dto.ts
    │   └── create-employee.schema.ts
    ├── unit/
    │   └── unit.dto.ts
    ├── leave/
    │   ├── leave-request.dto.ts
    │   └── create-leave-request.schema.ts
    ├── workflow/
    │   ├── approval-action.schema.ts
    │   └── task.dto.ts
    └── index.ts
```

- Mọi endpoint của Express API sẽ validate request qua Middleware:
  `validateBody(CreateLeaveRequestSchema)` hoặc `validateQuery(PaginationQuerySchema)`.
