'use client'

import { useMemo, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileSignature,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { Badge, Button, Card, StatCard, StatusPill, Tabs } from './ui'
import { useAuth } from '../context/AuthContext'

interface ContractItem {
  id: string
  code: string
  name: string
  unit: string
  position: string
  contractNo: string
  type: 'INDEFINITE' | 'DEFINITE_36M' | 'DEFINITE_12M' | 'PROBATION' | 'VISITING'
  typeLabel: string
  salaryCoefficient: number
  salaryRank: string
  effectiveDate: string
  expiryDate: string | null
  daysLeft: number | null
  status: 'ACTIVE' | 'EXPIRING_CRITICAL' | 'EXPIRING_WARNING' | 'RENEWED'
}

const SAMPLE_CONTRACTS: ContractItem[] = [
  {
    id: 'ct-01',
    code: 'DAU260001',
    name: 'PGS.TS. Trần Thị Bình',
    unit: 'Khoa Kiến trúc',
    position: 'Trưởng khoa',
    contractNo: 'HĐLĐ-DAU/2021-001',
    type: 'INDEFINITE',
    typeLabel: 'Không xác định thời hạn',
    salaryCoefficient: 6.78,
    salaryRank: 'Bậc 6/8',
    effectiveDate: '2021-01-01',
    expiryDate: null,
    daysLeft: null,
    status: 'ACTIVE',
  },
  {
    id: 'ct-02',
    code: 'DAU260002',
    name: 'TS. Phạm Văn Dũng',
    unit: 'Khoa Xây dựng',
    position: 'Trưởng khoa',
    contractNo: 'HĐLĐ-DAU/2021-004',
    type: 'INDEFINITE',
    typeLabel: 'Không xác định thời hạn',
    salaryCoefficient: 6.44,
    salaryRank: 'Bậc 5/8',
    effectiveDate: '2021-03-01',
    expiryDate: null,
    daysLeft: null,
    status: 'ACTIVE',
  },
  {
    id: 'ct-03',
    code: 'DAU260003',
    name: 'ThS. Nguyễn Văn An',
    unit: 'Khoa Kiến trúc',
    position: 'Giảng viên',
    contractNo: 'HĐLĐ-DAU/2023-018',
    type: 'DEFINITE_36M',
    typeLabel: 'Xác định thời hạn 36 tháng',
    salaryCoefficient: 4.98,
    salaryRank: 'Bậc 5/8',
    effectiveDate: '2023-11-01',
    expiryDate: '2026-10-31',
    daysLeft: 26,
    status: 'EXPIRING_CRITICAL',
  },
  {
    id: 'ct-04',
    code: 'DAU260004',
    name: 'TS. Lê Thị Hà',
    unit: 'Khoa CNTT',
    position: 'Phó Trưởng khoa',
    contractNo: 'HĐLĐ-DAU/2022-022',
    type: 'INDEFINITE',
    typeLabel: 'Không xác định thời hạn',
    salaryCoefficient: 5.42,
    salaryRank: 'Bậc 4/8',
    effectiveDate: '2022-09-01',
    expiryDate: null,
    daysLeft: null,
    status: 'ACTIVE',
  },
  {
    id: 'ct-05',
    code: 'DAU260005',
    name: 'ThS. Võ Hoàng Long',
    unit: 'Khoa Kiến trúc',
    position: 'Giảng viên',
    contractNo: 'HĐLĐ-DAU/2023-089',
    type: 'DEFINITE_36M',
    typeLabel: 'Xác định thời hạn 36 tháng',
    salaryCoefficient: 4.65,
    salaryRank: 'Bậc 4/8',
    effectiveDate: '2023-12-15',
    expiryDate: '2026-12-14',
    daysLeft: 70,
    status: 'EXPIRING_WARNING',
  },
  {
    id: 'ct-06',
    code: 'DAU260006',
    name: 'KS. Đặng Thu Hương',
    unit: 'Khoa Xây dựng',
    position: 'Trợ giảng',
    contractNo: 'HĐLĐ-DAU/2025-112',
    type: 'DEFINITE_12M',
    typeLabel: 'Xác định thời hạn 12 tháng',
    salaryCoefficient: 3.0,
    salaryRank: 'Bậc 1/8',
    effectiveDate: '2025-10-15',
    expiryDate: '2026-10-14',
    daysLeft: 9,
    status: 'EXPIRING_CRITICAL',
  },
  {
    id: 'ct-07',
    code: 'DAU260007',
    name: 'TS. Bùi Quốc Việt',
    unit: 'Khoa Mỹ thuật ứng dụng',
    position: 'Trưởng bộ môn',
    contractNo: 'HĐLĐ-DAU/2020-008',
    type: 'INDEFINITE',
    typeLabel: 'Không xác định thời hạn',
    salaryCoefficient: 6.1,
    salaryRank: 'Bậc 5/8',
    effectiveDate: '2020-08-01',
    expiryDate: null,
    daysLeft: null,
    status: 'ACTIVE',
  },
  {
    id: 'ct-08',
    code: 'DAU260012',
    name: 'KTS. Nguyễn Hoàng Nam',
    unit: 'Khoa Kiến trúc',
    position: 'Giảng viên tập sự',
    contractNo: 'HĐTV-DAU/2026-003',
    type: 'PROBATION',
    typeLabel: 'Hợp đồng Thử việc (12 tháng)',
    salaryCoefficient: 2.67,
    salaryRank: 'Tập sự (85%)',
    effectiveDate: '2026-09-01',
    expiryDate: '2027-08-31',
    daysLeft: 330,
    status: 'ACTIVE',
  },
]

const UNITS = [
  'Tất cả đơn vị',
  'Khoa Kiến trúc',
  'Khoa Xây dựng',
  'Khoa CNTT',
  'Khoa Mỹ thuật ứng dụng',
  'Phòng Đào tạo',
  'Ban Giám hiệu',
]

export function Contracts() {
  const { user } = useAuth()
  const role = user?.role || 'LECTURER'

  const [contracts, setContracts] = useState<ContractItem[]>(SAMPLE_CONTRACTS)
  const [activeTab, setActiveTab] = useState<'all' | 'expiring' | 'indefinite' | 'term36' | 'probation'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUnit, setSelectedUnit] = useState(() => {
    if (role === 'DEAN') return 'Khoa Kiến trúc'
    return UNITS[0]
  })
  const [selectedContract, setSelectedContract] = useState<ContractItem | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Calculations for overview stats
  const stats = useMemo(() => {
    if (role === 'DEAN') {
      const facultyContracts = contracts.filter((c) => c.unit.includes('Khoa Kiến trúc'))
      return {
        total: 48,
        indefinite: 28,
        term36: 16,
        expiring: facultyContracts.filter((c) => c.daysLeft !== null && c.daysLeft <= 90).length + 2,
      }
    }
    const total = 428
    const indefinite = 236
    const term36 = 124
    const expiring = contracts.filter((c) => c.daysLeft !== null && c.daysLeft <= 90).length + 10
    return { total, indefinite, term36, expiring }
  }, [contracts, role])

  // Filtered rows
  const filteredContracts = useMemo(() => {
    return contracts.filter((item) => {
      // Force dean to their department
      if (role === 'DEAN' && !item.unit.includes('Khoa Kiến trúc')) {
        return false
      }

      // Tab filter
      if (activeTab === 'expiring' && (item.daysLeft === null || item.daysLeft > 90)) return false
      if (activeTab === 'indefinite' && item.type !== 'INDEFINITE') return false
      if (activeTab === 'term36' && item.type !== 'DEFINITE_36M') return false
      if (activeTab === 'probation' && item.type !== 'PROBATION') return false

      // Unit filter (for HR & Rector)
      if (role !== 'DEAN' && selectedUnit !== UNITS[0] && !item.unit.includes(selectedUnit) && !selectedUnit.includes(item.unit)) {
        return false
      }

      // Query filter
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase()
        return (
          item.name.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.contractNo.toLowerCase().includes(q)
        )
      }

      return true
    })
  }, [contracts, activeTab, selectedUnit, searchQuery, role])

  const handleRenewProposal = (item: ContractItem) => {
    setSelectedContract(null)
    setToastMessage(`Đã lập hồ sơ đề xuất tái ký hợp đồng cho ${item.name} (${item.code}). Đã chuyển Phòng TCHC thẩm định.`)
    setTimeout(() => setToastMessage(null), 5000)
  }

  // VIEW FOR LECTURER: PERSONAL CONTRACT WORKSPACE
  if (role === 'LECTURER') {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-700 border border-brand-200">
                Hồ Sơ Hợp Đồng Cá Nhân
              </span>
              <span className="text-xs text-muted">Mã CBGV: DAU260003 · Khoa Kiến trúc</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
              Hợp Đồng Lao Động & Quá Trình Công Tác — ThS. Nguyễn Văn An
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              Tra cứu văn bản hợp đồng điện tử, quá trình đóng bảo hiểm xã hội và thời hạn tái ký hợp đồng
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setToastMessage('Đang tải bản sao HĐLĐ điện tử có chữ ký số trường dạng PDF...')
                setTimeout(() => setToastMessage(null), 4000)
              }}
            >
              <Download size={15} /> Tải Bản Sao HĐLĐ (PDF)
            </Button>
            <Button
              onClick={() => {
                setToastMessage('Đã gửi yêu cầu cấp Giấy xác nhận công tác & thu nhập tới Phòng TCHC.')
                setTimeout(() => setToastMessage(null), 5000)
              }}
            >
              <FileText size={15} /> Xin Xác Nhận Công Tác
            </Button>
          </div>
        </div>

        {toastMessage && (
          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm font-medium text-emerald-800 shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={17} className="text-emerald-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="p-1 text-emerald-600 hover:text-emerald-900">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Expiry Warning Notice */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 sm:p-5 text-rose-900">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold">Thông Báo Thời Hạn Hợp Đồng: Còn 26 ngày (Hết hạn 31/10/2026)</h4>
              <p className="text-xs leading-relaxed text-rose-800">
                Thầy/cô đang giữ Hợp đồng xác định thời hạn 36 tháng (`HĐLĐ-DAU/2023-018`). Theo quy định của Luật Viên chức
                và Bộ luật Lao động, Thầy/cô đủ điều kiện chuyển đổi sang <strong>Hợp đồng không xác định thời hạn</strong>.
                Khoa Kiến trúc đã lập tờ trình chuyển Phòng TCHC tiếp nhận hồ sơ.
              </p>
              <div className="pt-2">
                <Button
                  size="sm"
                  className="bg-rose-600 hover:bg-rose-700 text-white"
                  onClick={() => {
                    setToastMessage('Đã gửi văn bản xác nhận nguyện vọng tái ký HĐLĐ không xác định thời hạn tới Khoa & TCHC.')
                    setTimeout(() => setToastMessage(null), 5000)
                  }}
                >
                  <FileSignature size={14} /> Gửi Đơn Đề Đạt Nguyện Vọng Tái Ký
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <span className="text-xs text-muted block">Số hợp đồng hiện hành</span>
            <span className="text-sm font-mono font-bold text-ink mt-1 block">HĐLĐ-DAU/2023-018</span>
            <span className="text-[11px] text-emerald-600 mt-2 block font-medium">Ký ngày 01/11/2023</span>
          </Card>
          <Card className="p-4">
            <span className="text-xs text-muted block">Loại hợp đồng</span>
            <span className="text-sm font-bold text-ink mt-1 block">Xác định thời hạn 36T</span>
            <span className="text-[11px] text-brand-600 mt-2 block font-medium">Viên chức giảng dạy</span>
          </Card>
          <Card className="p-4">
            <span className="text-xs text-muted block">Ngạch bậc & Hệ số</span>
            <span className="text-sm font-bold text-ink mt-1 block">4.98 (Bậc 5/8)</span>
            <span className="text-[11px] text-slate-500 mt-2 block">Mã ngạch: V.07.01.03</span>
          </Card>
          <Card className="p-4">
            <span className="text-xs text-muted block">Bảo hiểm xã hội</span>
            <span className="text-sm font-mono font-bold text-ink mt-1 block">Sổ: 7912345678</span>
            <span className="text-[11px] text-emerald-600 mt-2 block font-medium">8 năm 6 tháng liên tục</span>
          </Card>
        </div>

        {/* Contract History Timeline */}
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold text-ink flex items-center gap-2">
            <Clock size={18} className="text-brand-600" />
            Lịch Sử Ký Kết Hợp Đồng & Quá Trình Công Tác Tại DAU
          </h3>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
            <div className="relative">
              <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full bg-brand-600 ring-4 ring-brand-100" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-ink">Hợp đồng Xác định thời hạn 36 tháng</span>
                  <Badge tone="warning">Đang có hiệu lực</Badge>
                </div>
                <p className="text-xs text-muted">Số: HĐLĐ-DAU/2023-018 · Thời hạn: 01/11/2023 → 31/10/2026</p>
                <p className="text-xs text-slate-600">
                  Vị trí: Giảng viên Bộ môn Kiến trúc công trình. Hệ số khởi điểm: 4.65, nâng lương định kỳ lên 4.98 ngày 01/11/2025.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full bg-slate-300" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-ink">Hợp đồng Xác định thời hạn 12 tháng</span>
                  <Badge tone="success">Đã hoàn thành</Badge>
                </div>
                <p className="text-xs text-muted">Số: HĐLĐ-DAU/2021-042 · Thời hạn: 01/11/2021 → 31/10/2022</p>
                <p className="text-xs text-slate-600">Được đánh giá Hoàn thành xuất sắc nhiệm vụ giảng dạy và nghiên cứu khoa học.</p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-6 top-1 h-3.5 w-3.5 rounded-full bg-slate-300" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-ink">Hợp đồng Thử việc & Tập sự</span>
                  <Badge tone="success">Đã hoàn thành</Badge>
                </div>
                <p className="text-xs text-muted">Số: HĐTV-DAU/2020-019 · Thời hạn: 01/11/2020 → 31/10/2021</p>
                <p className="text-xs text-slate-600">Bảo vệ kết quả tập sự đạt loại Giỏi trước Hội đồng đánh giá Khoa Kiến trúc.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  // VIEW FOR DEAN, HR_SPECIALIST, RECTOR, SYSTEM_ADMIN
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-700 border border-brand-200">
              {role === 'DEAN' && 'Quản Lý Hợp Đồng Khoa'}
              {role === 'HR_SPECIALIST' && 'Quản Trị HĐLĐ Toàn Trường'}
              {role === 'RECTOR' && 'Phê Duyệt HĐLĐ Ban Giám Hiệu'}
              {role === 'SYSTEM_ADMIN' && 'Audit Trail Hợp Đồng'}
            </span>
            <span className="text-xs text-muted">
              {role === 'DEAN' && 'Khoa Kiến trúc · PGS.TS. Trần Thị Bình (Trưởng khoa)'}
              {role === 'HR_SPECIALIST' && 'Phòng TCHC · ThS. Lê Minh Cường · Luật Viên chức & NĐ 115/2020'}
              {role === 'RECTOR' && 'Ban Giám hiệu · GS.TS. Hoàng Đức Dũng (Hiệu trưởng)'}
              {role === 'SYSTEM_ADMIN' && 'Quản trị hệ thống · KS. Phạm Quản Trị'}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            {role === 'DEAN' && 'Quản Lý Hợp Đồng Giảng Viên — Khoa Kiến Trúc'}
            {role === 'HR_SPECIALIST' && 'Quản Lý Hợp Đồng Lao Động & Viên Chức Toàn Trường'}
            {role === 'RECTOR' && 'Phê Duyệt & Ký Hợp Đồng Lao Động — Ban Giám Hiệu'}
            {role === 'SYSTEM_ADMIN' && 'Cơ Sở Dữ Liệu Hợp Đồng & Thang Bảng Lương'}
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            {role === 'DEAN' && 'Giám sát 48 giảng viên thuộc Khoa Kiến trúc, theo dõi thời hạn đáo hạn và lập tờ trình đề xuất tái ký'}
            {role === 'HR_SPECIALIST' && 'Vòng đời hợp đồng, quản trị ngạch bậc lương và hệ thống cảnh báo tái ký/gia hạn tập trung'}
            {role === 'RECTOR' && 'Thẩm tra các tờ trình ký mới, tái ký không xác định thời hạn và phê duyệt quyết định tuyển dụng'}
            {role === 'SYSTEM_ADMIN' && 'Lưu vết lịch sử hợp đồng và kiểm toán thay đổi ngạch bậc'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Dean top actions */}
          {role === 'DEAN' && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setToastMessage('Đã kết xuất danh sách hợp đồng Khoa Kiến trúc dạng Excel.')
                  setTimeout(() => setToastMessage(null), 4000)
                }}
              >
                <Download size={15} /> Xuất DS Khoa Kiến Trúc
              </Button>
              <Button
                onClick={() => {
                  setToastMessage('Đã lập Tờ trình tập thể đề xuất tái ký HĐLĐ cho 4 giảng viên sắp đáo hạn gửi Phòng TCHC.')
                  setTimeout(() => setToastMessage(null), 5000)
                }}
              >
                <FileSignature size={15} /> Đề Xuất Tái Ký Tập Thể Khoa
              </Button>
            </>
          )}

          {/* HR Specialist top actions */}
          {role === 'HR_SPECIALIST' && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setToastMessage('Đã kết xuất danh sách hợp đồng toàn trường dạng Excel.')
                  setTimeout(() => setToastMessage(null), 4000)
                }}
              >
                <Download size={15} /> Xuất Báo Cáo Excel
              </Button>
              <Button
                onClick={() => {
                  setToastMessage('Biểu mẫu lập phụ lục / ký mới HĐLĐ theo Nghị định 115/2020/NĐ-CP.')
                  setTimeout(() => setToastMessage(null), 4000)
                }}
              >
                <Plus size={15} /> Ký Mới HĐLĐ
              </Button>
            </>
          )}

          {/* Rector top actions */}
          {role === 'RECTOR' && (
            <Button
              className="bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => {
                setToastMessage('Hiệu trưởng đã Ký số PKI phê duyệt 4 quyết định bổ nhiệm & tái ký HĐLĐ đợt tháng 10/2026.')
                setTimeout(() => setToastMessage(null), 5000)
              }}
            >
              <ShieldCheck size={15} /> Ký Số Quyết Định Tái Ký HĐLĐ
            </Button>
          )}
        </div>
      </div>

      {toastMessage && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm font-medium text-emerald-800 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={17} className="text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 text-emerald-600 hover:text-emerald-900">
            <X size={15} />
          </button>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={role === 'DEAN' ? 'Tổng HĐ Khoa Kiến Trúc' : 'Tổng HĐ Toàn Trường'}
          value={stats.total}
          icon={<FileCheck size={18} />}
          subvalue={<span className="text-emerald-600 font-semibold">{role === 'DEAN' ? '48 CBGV cơ hữu' : '412 HĐ đang hoạt động'}</span>}
        />
        <StatCard
          title="Không Xác Định Thời Hạn"
          value={stats.indefinite}
          icon={<Building2 size={18} />}
          subvalue={<span>{role === 'DEAN' ? '58.3% giảng viên cơ hữu' : '55.1% tổng biên chế viên chức'}</span>}
        />
        <StatCard
          title="Xác Định Thời Hạn 36T"
          value={stats.term36}
          icon={<Clock size={18} />}
          subvalue={<span>{role === 'DEAN' ? '16 giảng viên' : '29.0% giảng viên cơ hữu'}</span>}
        />
        <StatCard
          title="Cảnh Báo Đáo Hạn (<90N)"
          value={stats.expiring}
          icon={<AlertTriangle size={18} className="text-amber-600" />}
          trend={{ label: 'Cần tái ký', tone: 'warning' }}
          subvalue={<span className="text-rose-600 font-semibold">{stats.expiring} HĐ cần thẩm định</span>}
        />
      </div>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'all', label: role === 'DEAN' ? 'Tất cả HĐ Khoa' : 'Tất cả hợp đồng', count: filteredContracts.length },
          { id: 'expiring', label: 'Sắp hết hạn (30–90 ngày)', count: filteredContracts.filter((c) => c.daysLeft !== null && c.daysLeft <= 90).length },
          { id: 'indefinite', label: 'Không xác định thời hạn', count: filteredContracts.filter((c) => c.type === 'INDEFINITE').length },
          { id: 'term36', label: 'Xác định thời hạn 36T', count: filteredContracts.filter((c) => c.type === 'DEFINITE_36M').length },
          { id: 'probation', label: 'Thử việc & Tập sự', count: filteredContracts.filter((c) => c.type === 'PROBATION').length },
        ]}
      />

      {/* Filter and Search Bar */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-between">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo họ tên, mã CBGV hoặc số hợp đồng…"
              className="w-full rounded-lg border border-line bg-canvas py-2 pl-9 pr-3 text-xs sm:text-sm text-ink outline-none transition-colors focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-200"
            />
          </div>

          {/* Unit filter only visible for HR & Rector; Dean is locked */}
          {role !== 'DEAN' ? (
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-slate-400 shrink-0 hidden sm:block" />
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="rounded-lg border border-line bg-white px-3 py-2 text-xs sm:text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 border border-brand-200 text-xs font-semibold text-brand-800">
              <Building2 size={14} /> Đơn vị: Khoa Kiến trúc (Cố định theo thẩm quyền)
            </div>
          )}
        </div>
      </Card>

      {/* Contracts Data Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-xs">
            <thead>
              <tr className="border-b border-line bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="p-3.5">Mã CBGV</th>
                <th className="p-3.5">Cán bộ</th>
                <th className="p-3.5">Đơn vị & Chức vụ</th>
                <th className="p-3.5">Số hợp đồng</th>
                <th className="p-3.5">Loại hợp đồng</th>
                <th className="p-3.5">Hệ số lương</th>
                <th className="p-3.5">Ngày hết hạn</th>
                <th className="p-3.5">Tình trạng</th>
                <th className="p-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredContracts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5 font-mono font-semibold text-slate-700">{c.code}</td>
                  <td className="p-3.5 font-bold text-ink">{c.name}</td>
                  <td className="p-3.5 text-slate-600">
                    <div>{c.unit}</div>
                    <div className="text-[11px] text-muted">{c.position}</div>
                  </td>
                  <td className="p-3.5 font-mono text-slate-500 text-[11px]">{c.contractNo}</td>
                  <td className="p-3.5 text-slate-700 font-medium">{c.typeLabel}</td>
                  <td className="p-3.5 font-mono">
                    <span className="font-bold text-ink">{c.salaryCoefficient.toFixed(2)}</span>
                    <span className="ml-1 text-[10px] text-muted">({c.salaryRank})</span>
                  </td>
                  <td className="p-3.5 font-mono text-slate-600">
                    {c.expiryDate ? c.expiryDate : <span className="text-slate-400">Vô thời hạn</span>}
                  </td>
                  <td className="p-3.5">
                    {c.status === 'EXPIRING_CRITICAL' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                        <AlertTriangle size={11} /> Còn {c.daysLeft} ngày
                      </span>
                    ) : c.status === 'EXPIRING_WARNING' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                        <Clock size={11} /> Còn {c.daysLeft} ngày
                      </span>
                    ) : (
                      <StatusPill status="active" />
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedContract(c)}
                        className="rounded px-2 py-1 text-[11px] font-semibold text-brand-600 hover:bg-brand-50 transition-colors"
                      >
                        Chi tiết
                      </button>

                      {/* Dean action: Lập tờ trình tái ký cho giảng viên khoa */}
                      {role === 'DEAN' && c.daysLeft !== null && c.daysLeft <= 90 && (
                        <button
                          onClick={() => handleRenewProposal(c)}
                          className="rounded bg-brand-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-600 transition-colors shadow-2xs"
                        >
                          Đề xuất tái ký
                        </button>
                      )}

                      {/* HR Specialist action */}
                      {role === 'HR_SPECIALIST' && c.daysLeft !== null && c.daysLeft <= 90 && (
                        <button
                          onClick={() => handleRenewProposal(c)}
                          className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                        >
                          Gia hạn HĐ
                        </button>
                      )}

                      {/* Rector action */}
                      {role === 'RECTOR' && c.daysLeft !== null && c.daysLeft <= 90 && (
                        <button
                          onClick={() => handleRenewProposal(c)}
                          className="rounded bg-brand-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-700 transition-colors shadow-2xs"
                        >
                          Duyệt ký
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Contract Detail Modal */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setSelectedContract(null)}>
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 border border-brand-200">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink">Hồ Sơ Hợp Đồng Lao Động</h3>
                  <p className="text-[11px] font-mono text-muted">{selectedContract.contractNo}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedContract(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-ink"
              >
                <X size={17} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-line">
                <div>
                  <span className="text-muted block">Họ và tên</span>
                  <strong className="text-ink text-[13px]">{selectedContract.name}</strong>
                </div>
                <div>
                  <span className="text-muted block">Mã CBGV</span>
                  <strong className="font-mono text-slate-700 text-[13px]">{selectedContract.code}</strong>
                </div>
                <div>
                  <span className="text-muted block">Đơn vị</span>
                  <strong className="text-ink">{selectedContract.unit}</strong>
                </div>
                <div>
                  <span className="text-muted block">Chức vụ</span>
                  <strong className="text-ink">{selectedContract.position}</strong>
                </div>
              </div>

              <div className="space-y-2 border-t border-line pt-3">
                <div className="flex justify-between py-1 border-b border-line">
                  <span className="text-muted">Hình thức hợp đồng</span>
                  <span className="font-semibold text-ink">{selectedContract.typeLabel}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-line">
                  <span className="text-muted">Hệ số lương hiện hưởng</span>
                  <span className="font-mono font-bold text-brand-700">
                    {selectedContract.salaryCoefficient} ({selectedContract.salaryRank})
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-line">
                  <span className="text-muted">Ngày bắt đầu hiệu lực</span>
                  <span className="font-mono text-ink">{selectedContract.effectiveDate}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-line">
                  <span className="text-muted">Ngày kết thúc thời hạn</span>
                  <span className="font-mono text-ink">
                    {selectedContract.expiryDate || 'Vô thời hạn (Biên chế trường)'}
                  </span>
                </div>
                {selectedContract.daysLeft !== null && (
                  <div className="flex justify-between py-1 border-b border-line">
                    <span className="text-muted">Thời gian còn lại</span>
                    <span className="font-bold text-rose-700 font-mono">
                      {selectedContract.daysLeft} ngày (Cần tái ký)
                    </span>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-blue-50/60 p-3 border border-blue-200 text-blue-900 text-[11px] leading-relaxed">
                <span className="font-bold">Quy định pháp lý:</span> Theo Điều 20 Bộ luật Lao động 2019 và Nghị định 115/2020/NĐ-CP,
                hợp đồng xác định thời hạn khi hết hạn mà người lao động tiếp tục làm việc thì trong thời hạn 30 ngày phải tiến hành ký kết hợp đồng mới.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <Button variant="outline" size="sm" onClick={() => setSelectedContract(null)}>
                  Đóng
                </Button>
                <Button size="sm" onClick={() => handleRenewProposal(selectedContract)}>
                  <FileSignature size={14} /> Lập Tờ Trình Tái Ký
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
