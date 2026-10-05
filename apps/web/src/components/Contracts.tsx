'use client'

import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileSignature,
  FileText,
  Filter,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { Badge, Button, Card, StatCard, StatusPill, Tabs } from './ui'

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
  const [contracts, setContracts] = useState<ContractItem[]>(SAMPLE_CONTRACTS)
  const [activeTab, setActiveTab] = useState<'all' | 'expiring' | 'indefinite' | 'term36' | 'probation'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUnit, setSelectedUnit] = useState(UNITS[0])
  const [selectedContract, setSelectedContract] = useState<ContractItem | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Calculations for overview stats
  const stats = useMemo(() => {
    const total = 428
    const indefinite = 236
    const term36 = 124
    const expiring = contracts.filter((c) => c.daysLeft !== null && c.daysLeft <= 90).length + 10
    return { total, indefinite, term36, expiring }
  }, [contracts])

  // Filtered rows
  const filteredContracts = useMemo(() => {
    return contracts.filter((item) => {
      // Tab filter
      if (activeTab === 'expiring' && (item.daysLeft === null || item.daysLeft > 90)) return false
      if (activeTab === 'indefinite' && item.type !== 'INDEFINITE') return false
      if (activeTab === 'term36' && item.type !== 'DEFINITE_36M') return false
      if (activeTab === 'probation' && item.type !== 'PROBATION') return false

      // Unit filter
      if (selectedUnit !== UNITS[0] && !item.unit.includes(selectedUnit) && !selectedUnit.includes(item.unit)) {
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
  }, [contracts, activeTab, selectedUnit, searchQuery])

  const handleRenewProposal = (item: ContractItem) => {
    setSelectedContract(null)
    setToastMessage(`Đã lập hồ sơ đề xuất tái ký hợp đồng cho ${item.name} (${item.code}). Đã gửi thông báo tới Phòng TCHC.`)
    setTimeout(() => setToastMessage(null), 5000)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-700 border border-brand-200">
              Phân Hệ Nhân Sự
            </span>
            <span className="text-xs text-muted">Bộ luật Lao động 2019 & Luật Viên chức</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">Quản Lý Hợp Đồng Lao Động</h1>
          <p className="text-xs sm:text-sm text-muted">
            Vòng đời hợp đồng, quản trị thang bảng lương và hệ thống cảnh báo tái ký/gia hạn tập trung
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setToastMessage('Đã kết xuất danh sách hợp đồng toàn trường dạng Excel.')
              setTimeout(() => setToastMessage(null), 4000)
            }}
          >
            <Download size={15} /> Xuất Báo Cáo
          </Button>
          <Button
            onClick={() => {
              setToastMessage('Biểu mẫu lập phụ lục / ký mới HĐLĐ theo Nghị định 115/2020/NĐ-CP.')
              setTimeout(() => setToastMessage(null), 4000)
            }}
          >
            <Plus size={15} /> Ký Mới HĐLĐ
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

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng HĐ Toàn Trường"
          value={stats.total}
          icon={<FileCheck size={18} />}
          subvalue={<span className="text-emerald-600 font-semibold">412 HĐ đang hoạt động</span>}
        />
        <StatCard
          title="Không Xác Định Thời Hạn"
          value={stats.indefinite}
          icon={<Building2 size={18} />}
          subvalue={<span>55.1% tổng biên chế viên chức</span>}
        />
        <StatCard
          title="Xác Định Thời Hạn 36T"
          value={stats.term36}
          icon={<Clock size={18} />}
          subvalue={<span>29.0% giảng viên cơ hữu</span>}
        />
        <StatCard
          title="Cảnh Báo Đáo Hạn (<90N)"
          value={stats.expiring}
          icon={<AlertTriangle size={18} className="text-amber-600" />}
          trend={{ label: 'Cần tái ký', tone: 'warning' }}
          subvalue={<span className="text-rose-600 font-semibold">14 HĐ cần gia hạn gấp</span>}
        />
      </div>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'all', label: 'Tất cả hợp đồng', count: contracts.length },
          { id: 'expiring', label: 'Sắp hết hạn (30–90 ngày)', count: contracts.filter((c) => c.daysLeft !== null && c.daysLeft <= 90).length },
          { id: 'indefinite', label: 'Không xác định thời hạn', count: contracts.filter((c) => c.type === 'INDEFINITE').length },
          { id: 'term36', label: 'Xác định thời hạn 36T', count: contracts.filter((c) => c.type === 'DEFINITE_36M').length },
          { id: 'probation', label: 'Thử việc & Tập sự', count: contracts.filter((c) => c.type === 'PROBATION').length },
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
                      {c.daysLeft !== null && c.daysLeft <= 90 && (
                        <button
                          onClick={() => handleRenewProposal(c)}
                          className="rounded bg-brand-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-600 transition-colors shadow-2xs"
                        >
                          Tái ký
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
                <span className="font-bold">Quy định pháp lý:</span> Theo Điều 20 Bộ luật Lao động 2019, hợp đồng xác định thời hạn khi hết hạn mà người lao động tiếp tục làm việc thì trong thời hạn 30 ngày phải tiến hành ký kết hợp đồng mới.
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
