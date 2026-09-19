export type Role = 'cbgv' | 'truongkhoa' | 'tchc' | 'hieutruong' | 'admin'

export const ROLES: { id: Role; label: string; scope: string; name: string; title: string }[] = [
  { id: 'cbgv', label: 'Giảng viên (CBGV)', scope: 'Khoa Kiến trúc', name: 'ThS. Nguyễn Văn An', title: 'Giảng viên' },
  { id: 'truongkhoa', label: 'Trưởng khoa (Khoa KT)', scope: 'Khoa Kiến trúc', name: 'PGS.TS. Trần Thị Bình', title: 'Trưởng khoa' },
  { id: 'tchc', label: 'Phòng TCHC', scope: 'Phòng Tổ chức Hành chính', name: 'ThS. Lê Minh Cường', title: 'Chuyên viên TCHC' },
  { id: 'hieutruong', label: 'Hiệu trưởng', scope: 'Ban Giám hiệu', name: 'GS.TS. Hoàng Đức Dũng', title: 'Hiệu trưởng' },
  { id: 'admin', label: 'Admin', scope: 'Toàn hệ thống', name: 'KS. Phạm Quản Trị', title: 'Quản trị viên' },
]

export type Employee = {
  code: string
  name: string
  degree: string
  unit: string
  position: string
  concurrent?: string
  email: string
  phone: string
  status: 'active' | 'leave' | 'terminated'
}

export const EMPLOYEES: Employee[] = [
  { code: 'DAU260001', name: 'PGS.TS. Trần Thị Bình', degree: 'PGS.TS', unit: 'Khoa Kiến trúc', position: 'Trưởng khoa', concurrent: 'Kiêm Trưởng BM Kiến trúc công trình', email: 'binh.tt@dau.edu.vn', phone: '0905 112 233', status: 'active' },
  { code: 'DAU260002', name: 'TS. Phạm Văn Dũng', degree: 'TS', unit: 'Khoa Xây dựng', position: 'Trưởng khoa', email: 'dung.pv@dau.edu.vn', phone: '0905 224 466', status: 'active' },
  { code: 'DAU260003', name: 'ThS. Nguyễn Văn An', degree: 'ThS', unit: 'Khoa Kiến trúc', position: 'Giảng viên', email: 'an.nv@dau.edu.vn', phone: '0905 336 699', status: 'active' },
  { code: 'DAU260004', name: 'TS. Lê Thị Hà', degree: 'TS', unit: 'Khoa CNTT', position: 'Phó Trưởng khoa', concurrent: 'Kiêm Giám đốc TT Dữ liệu', email: 'ha.lt@dau.edu.vn', phone: '0905 447 788', status: 'active' },
  { code: 'DAU260005', name: 'ThS. Võ Hoàng Long', degree: 'ThS', unit: 'Khoa Kiến trúc', position: 'Giảng viên', email: 'long.vh@dau.edu.vn', phone: '0905 558 899', status: 'leave' },
  { code: 'DAU260006', name: 'KS. Đặng Thu Hương', degree: 'KS', unit: 'Khoa Xây dựng', position: 'Trợ giảng', email: 'huong.dt@dau.edu.vn', phone: '0905 669 900', status: 'active' },
  { code: 'DAU260007', name: 'TS. Bùi Quốc Việt', degree: 'TS', unit: 'Khoa Mỹ thuật ứng dụng', position: 'Trưởng bộ môn', email: 'viet.bq@dau.edu.vn', phone: '0905 770 011', status: 'active' },
  { code: 'DAU260008', name: 'ThS. Ngô Thị Mai', degree: 'ThS', unit: 'Phòng Đào tạo', position: 'Chuyên viên', email: 'mai.nt@dau.edu.vn', phone: '0905 881 122', status: 'terminated' },
]

export type OrgNode = {
  code: string
  name: string
  level: 'bgh' | 'khoa' | 'phong' | 'bomon' | 'vien'
  manager: string
  staff: number
  children?: OrgNode[]
}

export const ORG: OrgNode = {
  code: 'DAU', name: 'Trường Đại học Kiến trúc Đà Nẵng', level: 'bgh', manager: 'GS.TS. Hoàng Đức Dũng', staff: 486,
  children: [
    {
      code: 'KT', name: 'Khoa Kiến trúc', level: 'khoa', manager: 'PGS.TS. Trần Thị Bình', staff: 32,
      children: [
        { code: 'KTCT', name: 'BM Kiến trúc công trình', level: 'bomon', manager: 'TS. Nguyễn Hải', staff: 12 },
        { code: 'QH', name: 'BM Quy hoạch', level: 'bomon', manager: 'ThS. Trịnh Lan', staff: 9 },
        { code: 'NT', name: 'BM Kiến trúc nội thất', level: 'bomon', manager: 'ThS. Vũ Đăng', staff: 11 },
      ],
    },
    {
      code: 'XD', name: 'Khoa Xây dựng', level: 'khoa', manager: 'TS. Phạm Văn Dũng', staff: 41,
      children: [
        { code: 'KCCT', name: 'BM Kết cấu công trình', level: 'bomon', manager: 'TS. Đỗ Nam', staff: 14 },
        { code: 'CTGT', name: 'BM Cầu đường', level: 'bomon', manager: 'ThS. Hồ Thanh', staff: 13 },
      ],
    },
    { code: 'CNTT', name: 'Khoa Công nghệ thông tin', level: 'khoa', manager: 'TS. Lê Thị Hà', staff: 28 },
    { code: 'TCHC', name: 'Phòng Tổ chức Hành chính', level: 'phong', manager: 'ThS. Lê Minh Cường', staff: 18 },
    { code: 'DT', name: 'Phòng Đào tạo', level: 'phong', manager: 'ThS. Ngô Thị Mai', staff: 15 },
    { code: 'VNC', name: 'Viện Nghiên cứu Kiến trúc & Đô thị', level: 'vien', manager: 'PGS.TS. Cao Sơn', staff: 22 },
  ],
}

export type LeaveRequest = {
  id: string
  requester: string
  position: string
  unit: string
  type: string
  from: string
  to: string
  days: number
  reason: string
  substitute: string
  substituteOk: boolean
  status: 'submitted' | 'approving' | 'confirming' | 'done' | 'rejected'
}

export const PENDING: LeaveRequest[] = [
  { id: 'DON2026-0148', requester: 'ThS. Nguyễn Văn An', position: 'Giảng viên', unit: 'BM Kiến trúc công trình', type: 'Nghỉ phép năm', from: '22/09/2026', to: '23/09/2026', days: 2, reason: 'Giải quyết việc gia đình', substitute: 'ThS. Võ Hoàng Long', substituteOk: true, status: 'submitted' },
  { id: 'DON2026-0151', requester: 'ThS. Võ Hoàng Long', position: 'Giảng viên', unit: 'BM Quy hoạch', type: 'Nghỉ ốm', from: '25/09/2026', to: '25/09/2026', days: 0.5, reason: 'Khám sức khỏe định kỳ', substitute: 'ThS. Nguyễn Văn An', substituteOk: false, status: 'submitted' },
  { id: 'DON2026-0153', requester: 'KS. Đặng Thu Hương', position: 'Trợ giảng', unit: 'BM Cầu đường', type: 'Đi công tác', from: '01/10/2026', to: '03/10/2026', days: 3, reason: 'Hội thảo khoa học tại Hà Nội', substitute: 'TS. Đỗ Nam', substituteOk: true, status: 'submitted' },
]

export const MY_REQUESTS: LeaveRequest[] = [
  { id: 'DON2026-0142', requester: 'ThS. Nguyễn Văn An', position: 'Giảng viên', unit: 'Khoa Kiến trúc', type: 'Nghỉ phép năm', from: '02/09/2026', to: '02/09/2026', days: 1, reason: 'Việc riêng', substitute: 'ThS. Võ Hoàng Long', substituteOk: true, status: 'done' },
  { id: 'DON2026-0148', requester: 'ThS. Nguyễn Văn An', position: 'Giảng viên', unit: 'Khoa Kiến trúc', type: 'Nghỉ phép năm', from: '22/09/2026', to: '23/09/2026', days: 2, reason: 'Giải quyết việc gia đình', substitute: 'ThS. Võ Hoàng Long', substituteOk: true, status: 'approving' },
]
