'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileSignature,
  FileText,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { Badge, Button, Card, StatCard, StatusPill, Tabs } from './ui'
import { useAuth } from '../context/AuthContext'

type ContractType =
  | 'PROBATION'
  | 'DEFINITE_TERM_12M'
  | 'DEFINITE_TERM_36M'
  | 'INDEFINITE_TERM'
  | 'VISITING_LECTURER'

type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'RENEWED'

type ContractAlertLevel = 'NORMAL' | 'WARNING_90' | 'WARNING_60' | 'CRITICAL_30' | 'EXPIRED' | 'INDEFINITE'

interface ContractDto {
  id: string
  employeeId: string
  employeeCode: string
  employeeName: string
  unitName?: string | null
  positionName?: string | null
  contractNumber: string
  contractType: ContractType
  signedDate: string
  effectiveDate: string
  expiryDate: string | null
  salaryCoefficient: number
  status: ContractStatus
  daysRemaining?: number | null
  alertLevel?: ContractAlertLevel
  parentContractId?: string | null
  createdAt: string
}

interface ContractAlertSummary {
  totalActive: number
  totalDefinite: number
  totalIndefinite: number
  totalExpiring30: number
  totalExpiring60: number
  totalExpiring90: number
}

interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNextPage?: boolean
  hasPreviousPage?: boolean
}

interface EmployeeOption {
  id: string
  employeeCode: string
  fullName: string
}

const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  INDEFINITE_TERM: 'Không xác định thời hạn',
  DEFINITE_TERM_36M: 'Xác định thời hạn 36 tháng',
  DEFINITE_TERM_12M: 'Xác định thời hạn 12 tháng',
  PROBATION: 'Thử việc / Tập sự',
  VISITING_LECTURER: 'Giảng viên thỉnh giảng',
}

const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  DRAFT: 'Dự thảo',
  ACTIVE: 'Đang hiệu lực',
  EXPIRED: 'Đã hết hạn',
  TERMINATED: 'Chấm dứt',
  RENEWED: 'Đã tái ký',
}

function getVnTodayStr(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function getAuthHeaders(includeJson = false): Record<string, string> {
  const headers: Record<string, string> = {}
  if (includeJson) headers['Content-Type'] = 'application/json'
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('bahau_session_id')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function authFetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data?: T; pagination?: PaginationMeta; error?: string }> {
  try {
    const res = await fetch(url, {
      ...init,
      credentials: 'include',
      headers: {
        ...getAuthHeaders(Boolean(init?.body)),
        ...(init?.headers as Record<string, string> | undefined),
      },
    })
    const json = await res.json().catch(() => null)
    const pagination: PaginationMeta | undefined = json?.pagination ?? json?.meta?.pagination
    if (!res.ok || json?.success === false) {
      return {
        ok: false,
        status: res.status,
        error: json?.error?.message || json?.message || `Yêu cầu thất bại (HTTP ${res.status})`,
      }
    }
    return {
      ok: true,
      status: res.status,
      data: (json?.data ?? json) as T,
      pagination,
    }
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : 'Không thể kết nối máy chủ.',
    }
  }
}

export function Contracts() {
  const { user } = useAuth()
  const role = user?.role || 'LECTURER'
  const canManageContracts = role === 'HR_SPECIALIST' || role === 'RECTOR'
  const canReadAlerts = role === 'DEAN' || role === 'HR_SPECIALIST' || role === 'RECTOR'

  const [contracts, setContracts] = useState<ContractDto[]>([])
  const [pagination, setPagination] = useState<PaginationMeta | null>(null)
  const [alerts, setAlerts] = useState<ContractAlertSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<'all' | 'expiring' | 'indefinite' | 'term36' | 'probation'>('all')
  const [expiringBucket, setExpiringBucket] = useState<'ALL' | '30' | '60' | '90'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('Tất cả đơn vị')
  const [selectedContract, setSelectedContract] = useState<ContractDto | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Renew modal state
  const [renewTarget, setRenewTarget] = useState<ContractDto | null>(null)
  const [renewForm, setRenewForm] = useState({
    contractNumber: '',
    contractType: 'DEFINITE_TERM_36M' as ContractType,
    signedDate: getVnTodayStr(),
    effectiveDate: getVnTodayStr(),
    expiryDate: '',
    salaryCoefficient: '4.98',
    note: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  // Create contract modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [createForm, setCreateForm] = useState({
    employeeId: '',
    contractNumber: '',
    contractType: 'DEFINITE_TERM_36M' as ContractType,
    signedDate: getVnTodayStr(),
    effectiveDate: getVnTodayStr(),
    expiryDate: '',
    salaryCoefficient: '3.00',
  })

  const fetchData = useCallback(async () => {
    if (role === 'SYSTEM_ADMIN') {
      setLoading(false)
      setContracts([])
      setAlerts(null)
      setErrorMsg('Vai trò Quản trị Hệ thống (SYSTEM_ADMIN) không có quyền truy cập dữ liệu hợp đồng lao động.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    const listPromise = authFetchJson<ContractDto[]>('/api/v1/contracts?page=1&pageSize=100')
    const alertPromise = canReadAlerts
      ? authFetchJson<ContractAlertSummary>('/api/v1/contracts/summary/alerts')
      : Promise.resolve(null)

    const [listRes, alertRes] = await Promise.all([listPromise, alertPromise])

    if (listRes.ok && Array.isArray(listRes.data)) {
      setContracts(listRes.data)
      setPagination(listRes.pagination ?? null)
    } else {
      setContracts([])
      setPagination(null)
      setErrorMsg(listRes.error || 'Không thể tải danh sách hợp đồng lao động.')
    }

    if (alertRes) {
      if (alertRes.ok && alertRes.data) {
        setAlerts(alertRes.data)
      } else if (!alertRes.ok && alertRes.status !== 403) {
        setErrorMsg((prev) => prev || alertRes.error || 'Không thể tải cảnh báo hết hạn hợp đồng.')
      }
    } else {
      setAlerts(null)
    }

    setLoading(false)
  }, [role, canReadAlerts])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const unitOptions = useMemo(() => {
    const names = Array.from(new Set(contracts.map((c) => c.unitName).filter((u): u is string => Boolean(u))))
    return ['Tất cả đơn vị', ...names]
  }, [contracts])

  const computedStats = useMemo(() => {
    const total = alerts?.totalActive ?? pagination?.totalItems ?? contracts.length
    const indefinite =
      alerts?.totalIndefinite ?? contracts.filter((c) => c.contractType === 'INDEFINITE_TERM' && c.status === 'ACTIVE').length
    const definite =
      alerts?.totalDefinite ?? contracts.filter((c) => c.contractType !== 'INDEFINITE_TERM' && c.status === 'ACTIVE').length
    const exp30 =
      alerts?.totalExpiring30 ??
      contracts.filter((c) => c.daysRemaining != null && c.daysRemaining >= 0 && c.daysRemaining <= 30).length
    const exp60 =
      alerts?.totalExpiring60 ??
      contracts.filter((c) => c.daysRemaining != null && c.daysRemaining >= 31 && c.daysRemaining <= 60).length
    const exp90 =
      alerts?.totalExpiring90 ??
      contracts.filter((c) => c.daysRemaining != null && c.daysRemaining >= 61 && c.daysRemaining <= 90).length
    return {
      total,
      indefinite,
      definite,
      exp30,
      exp60,
      exp90,
      expiringTotal: exp30 + exp60 + exp90,
    }
  }, [alerts, pagination, contracts])

  const filteredContracts = useMemo(() => {
    return contracts.filter((item) => {
      if (activeTab === 'expiring') {
        if (item.daysRemaining == null || item.daysRemaining < 0 || item.daysRemaining > 90) return false
        if (expiringBucket === '30' && item.daysRemaining > 30) return false
        if (expiringBucket === '60' && (item.daysRemaining < 31 || item.daysRemaining > 60)) return false
        if (expiringBucket === '90' && (item.daysRemaining < 61 || item.daysRemaining > 90)) return false
      }
      if (activeTab === 'indefinite' && item.contractType !== 'INDEFINITE_TERM') return false
      if (activeTab === 'term36' && item.contractType !== 'DEFINITE_TERM_36M') return false
      if (activeTab === 'probation' && item.contractType !== 'PROBATION') return false

      if (role !== 'DEAN' && selectedUnit !== 'Tất cả đơn vị' && item.unitName !== selectedUnit) {
        return false
      }

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase()
        return (
          item.employeeName.toLowerCase().includes(q) ||
          item.employeeCode.toLowerCase().includes(q) ||
          item.contractNumber.toLowerCase().includes(q)
        )
      }

      return true
    })
  }, [contracts, activeTab, expiringBucket, selectedUnit, searchQuery, role])

  const openRenewModal = (item: ContractDto) => {
    const today = getVnTodayStr()
    setSelectedContract(null)
    setModalError(null)
    setRenewTarget(item)
    setRenewForm({
      contractNumber: `${item.contractNumber}-GH`,
      contractType: item.contractType === 'PROBATION' ? 'DEFINITE_TERM_12M' : 'INDEFINITE_TERM',
      signedDate: today,
      effectiveDate: today,
      expiryDate: '',
      salaryCoefficient: String(item.salaryCoefficient || 4.98),
      note: '',
    })
  }

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!renewTarget) return
    setSubmitting(true)
    setModalError(null)

    const payload = {
      contractNumber: renewForm.contractNumber.trim(),
      contractType: renewForm.contractType,
      signedDate: renewForm.signedDate,
      effectiveDate: renewForm.effectiveDate,
      expiryDate: renewForm.contractType === 'INDEFINITE_TERM' ? null : renewForm.expiryDate || null,
      salaryCoefficient: Number(renewForm.salaryCoefficient),
      note: renewForm.note.trim() || null,
    }

    const res = await authFetchJson<ContractDto>(`/api/v1/contracts/${renewTarget.id}/renew`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    setSubmitting(false)
    if (!res.ok) {
      setModalError(res.error || 'Không thể tái ký / gia hạn hợp đồng.')
      return
    }

    setRenewTarget(null)
    setToastMessage(`Đã tái ký hợp đồng ${payload.contractNumber} cho ${renewTarget.employeeName}.`)
    fetchData()
  }

  const openCreateModal = async () => {
    setModalError(null)
    setShowCreateModal(true)
    if (employees.length === 0) {
      const empRes = await authFetchJson<EmployeeOption[]>('/api/v1/employees?page=1&pageSize=100')
      if (empRes.ok && Array.isArray(empRes.data)) {
        setEmployees(empRes.data)
        if (empRes.data[0]) {
          setCreateForm((prev) => ({ ...prev, employeeId: prev.employeeId || empRes.data![0].id }))
        }
      }
    }
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setModalError(null)

    const payload = {
      employeeId: createForm.employeeId,
      contractNumber: createForm.contractNumber.trim(),
      contractType: createForm.contractType,
      signedDate: createForm.signedDate,
      effectiveDate: createForm.effectiveDate,
      expiryDate: createForm.contractType === 'INDEFINITE_TERM' ? null : createForm.expiryDate || null,
      salaryCoefficient: Number(createForm.salaryCoefficient),
    }

    const res = await authFetchJson<ContractDto>('/api/v1/contracts', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    setSubmitting(false)
    if (!res.ok) {
      setModalError(res.error || 'Không thể tạo hợp đồng lao động mới.')
      return
    }

    setShowCreateModal(false)
    setToastMessage(`Đã tạo mới hợp đồng ${payload.contractNumber}.`)
    fetchData()
  }

  const handleExportCsv = () => {
    if (filteredContracts.length === 0) return
    const headers = ['Ma CBGV', 'Ho va ten', 'Don vi', 'Chuc vu', 'So hop dong', 'Loai hop dong', 'He so luong', 'Ngay hieu luc', 'Ngay het han', 'Trang thai']
    const rows = filteredContracts.map((c) => [
      c.employeeCode,
      c.employeeName,
      c.unitName || '',
      c.positionName || '',
      c.contractNumber,
      CONTRACT_TYPE_LABEL[c.contractType] || c.contractType,
      String(c.salaryCoefficient),
      c.effectiveDate,
      c.expiryDate || 'Khong thoi han',
      CONTRACT_STATUS_LABEL[c.status] || c.status,
    ])
    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `danh-sach-hop-dong-${getVnTodayStr()}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // VIEW FOR LECTURER: PERSONAL CONTRACT WORKSPACE
  if (role === 'LECTURER') {
    const activeContract = contracts.find((c) => c.status === 'ACTIVE') || contracts[0] || null
    const expiringSoon =
      activeContract && activeContract.daysRemaining != null && activeContract.daysRemaining >= 0 && activeContract.daysRemaining <= 90

    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-700 border border-brand-200">
                Hồ Sơ Hợp Đồng Cá Nhân
              </span>
              {activeContract && (
                <span className="text-xs text-muted">
                  Mã CBGV: {activeContract.employeeCode}
                  {activeContract.unitName ? ` · ${activeContract.unitName}` : ''}
                </span>
              )}
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
              Hợp Đồng Lao Động & Quá Trình Công Tác — {user?.fullName || activeContract?.employeeName || 'Cán bộ giảng viên'}
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              Tra cứu hợp đồng lao động, hệ số lương và thời hạn tái ký hợp đồng từ CSDL nhân sự
            </p>
          </div>

          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Làm mới
          </Button>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-800">
            <AlertCircle size={17} className="shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <Card className="flex items-center justify-center gap-2 p-10 text-sm text-muted">
            <Loader2 size={18} className="animate-spin text-brand-600" /> Đang tải dữ liệu hợp đồng cá nhân...
          </Card>
        ) : !activeContract ? (
          <Card className="p-8 text-center text-sm text-muted">
            Chưa ghi nhận hợp đồng lao động nào trong hồ sơ của bạn.
          </Card>
        ) : (
          <>
            {expiringSoon && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 sm:p-5 text-rose-900">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold">
                      Thông Báo Thời Hạn Hợp Đồng: Còn {activeContract.daysRemaining} ngày (Hết hạn {activeContract.expiryDate})
                    </h4>
                    <p className="text-xs leading-relaxed text-rose-800">
                      Hợp đồng <span className="font-mono font-semibold">{activeContract.contractNumber}</span> (
                      {CONTRACT_TYPE_LABEL[activeContract.contractType]}) sắp đến hạn. Vui lòng liên hệ Trưởng đơn vị và Phòng Tổ chức - Hành chính để thực hiện thủ tục tái ký theo quy định.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-4">
                <span className="text-xs text-muted block">Số hợp đồng hiện hành</span>
                <span className="text-sm font-mono font-bold text-ink mt-1 block">{activeContract.contractNumber}</span>
                <span className="text-[11px] text-emerald-600 mt-2 block font-medium">
                  Ký ngày {activeContract.signedDate}
                </span>
              </Card>
              <Card className="p-4">
                <span className="text-xs text-muted block">Loại hợp đồng</span>
                <span className="text-sm font-bold text-ink mt-1 block">
                  {CONTRACT_TYPE_LABEL[activeContract.contractType] || activeContract.contractType}
                </span>
                <span className="text-[11px] text-brand-600 mt-2 block font-medium">
                  {CONTRACT_STATUS_LABEL[activeContract.status] || activeContract.status}
                </span>
              </Card>
              <Card className="p-4">
                <span className="text-xs text-muted block">Hệ số lương hiện hưởng</span>
                <span className="text-sm font-bold text-ink mt-1 block">{activeContract.salaryCoefficient.toFixed(2)}</span>
                <span className="text-[11px] text-slate-500 mt-2 block">Hiệu lực từ {activeContract.effectiveDate}</span>
              </Card>
              <Card className="p-4">
                <span className="text-xs text-muted block">Ngày hết hạn</span>
                <span className="text-sm font-mono font-bold text-ink mt-1 block">
                  {activeContract.expiryDate || 'Không xác định thời hạn'}
                </span>
                <span className="text-[11px] text-slate-500 mt-2 block">
                  {activeContract.daysRemaining != null ? `Còn ${activeContract.daysRemaining} ngày` : 'Biên chế ổn định'}
                </span>
              </Card>
            </div>

            <Card className="p-6 space-y-4">
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <Clock size={18} className="text-brand-600" />
                Lịch Sử Hợp Đồng Lao Động ({contracts.length})
              </h3>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-line">
                {contracts.map((c) => (
                  <div key={c.id} className="relative">
                    <div
                      className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full ${
                        c.status === 'ACTIVE' ? 'bg-brand-600 ring-4 ring-brand-100' : 'bg-slate-300'
                      }`}
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-ink">
                          {CONTRACT_TYPE_LABEL[c.contractType] || c.contractType}
                        </span>
                        <Badge tone={c.status === 'ACTIVE' ? 'success' : 'neutral'}>
                          {CONTRACT_STATUS_LABEL[c.status] || c.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted">
                        Số: <span className="font-mono font-semibold">{c.contractNumber}</span> · Hiệu lực:{' '}
                        {c.effectiveDate} → {c.expiryDate || 'Không thời hạn'} · Hệ số lương:{' '}
                        <strong>{c.salaryCoefficient.toFixed(2)}</strong>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Title & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-700 border border-brand-200">
              {role === 'DEAN' && 'Quản Lý Hợp Đồng Đơn Vị'}
              {role === 'HR_SPECIALIST' && 'Quản Trị HĐLĐ Toàn Trường'}
              {role === 'RECTOR' && 'Phê Duyệt HĐLĐ Ban Giám Hiệu'}
              {role === 'SYSTEM_ADMIN' && 'Phân Quyền Hợp Đồng'}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            {role === 'DEAN' && 'Quản Lý Hợp Đồng Giảng Viên Đơn Vị'}
            {role === 'HR_SPECIALIST' && 'Quản Lý Hợp Đồng Lao Động & Viên Chức Toàn Trường'}
            {role === 'RECTOR' && 'Theo Dõi & Tái Ký Hợp Đồng Lao Động — Ban Giám Hiệu'}
            {role === 'SYSTEM_ADMIN' && 'Quản Lý Hợp Đồng Lao Động'}
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            Theo dõi hợp đồng lao động, cảnh báo đáo hạn 30 / 31–60 / 61–90 ngày và xử lý tái ký đồng bộ với CSDL.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Làm mới
          </Button>
          {filteredContracts.length > 0 && (
            <Button variant="outline" onClick={handleExportCsv}>
              <Download size={15} /> Xuất CSV ({filteredContracts.length})
            </Button>
          )}
          {canManageContracts && (
            <Button onClick={openCreateModal}>
              <Plus size={15} /> Ký Mới HĐLĐ
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

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-800">
          <AlertCircle size={17} className="shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="HĐ Đang Hiệu Lực"
          value={computedStats.total}
          icon={<FileCheck size={18} />}
          subvalue={
            <span className="text-emerald-600 font-semibold">
              Tổng số bản ghi: {pagination?.totalItems ?? contracts.length}
            </span>
          }
        />
        <StatCard
          title="Không Xác Định Thời Hạn"
          value={computedStats.indefinite}
          icon={<Building2 size={18} />}
          subvalue={<span>Hợp đồng dài hạn</span>}
        />
        <StatCard
          title="Có Thời Hạn / Thử Việc"
          value={computedStats.definite}
          icon={<Clock size={18} />}
          subvalue={<span>Cần theo dõi mốc gia hạn</span>}
        />
        <StatCard
          title="Cảnh Báo Đáo Hạn (≤90N)"
          value={computedStats.expiringTotal}
          icon={<AlertTriangle size={18} className="text-amber-600" />}
          trend={{ label: '30 / 60 / 90N', tone: computedStats.exp30 > 0 ? 'warning' : 'success' }}
          subvalue={
            <span className="font-semibold text-rose-700">
              ≤30N: {computedStats.exp30} · 31–60N: {computedStats.exp60} · 61–90N: {computedStats.exp90}
            </span>
          }
        />
      </div>

      {/* Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'all', label: 'Tất cả hợp đồng', count: contracts.length },
          {
            id: 'expiring',
            label: 'Sắp hết hạn (≤90 ngày)',
            count: contracts.filter((c) => c.daysRemaining != null && c.daysRemaining >= 0 && c.daysRemaining <= 90).length,
          },
          {
            id: 'indefinite',
            label: 'Không xác định thời hạn',
            count: contracts.filter((c) => c.contractType === 'INDEFINITE_TERM').length,
          },
          {
            id: 'term36',
            label: 'Xác định thời hạn 36T',
            count: contracts.filter((c) => c.contractType === 'DEFINITE_TERM_36M').length,
          },
          {
            id: 'probation',
            label: 'Thử việc & Tập sự',
            count: contracts.filter((c) => c.contractType === 'PROBATION').length,
          },
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

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'expiring' && (
              <select
                value={expiringBucket}
                onChange={(e) => setExpiringBucket(e.target.value as 'ALL' | '30' | '60' | '90')}
                className="rounded-lg border border-line bg-white px-3 py-2 text-xs sm:text-sm text-ink outline-none focus:border-brand-500"
              >
                <option value="ALL">Tất cả mốc ≤90 ngày</option>
                <option value="30">Khẩn cấp (≤30 ngày): {computedStats.exp30}</option>
                <option value="60">Cảnh báo (31–60 ngày): {computedStats.exp60}</option>
                <option value="90">Theo dõi (61–90 ngày): {computedStats.exp90}</option>
              </select>
            )}

            {role !== 'DEAN' && unitOptions.length > 1 && (
              <div className="flex items-center gap-2">
                <Filter size={15} className="text-slate-400 shrink-0 hidden sm:block" />
                <select
                  value={selectedUnit}
                  onChange={(e) => setSelectedUnit(e.target.value)}
                  className="rounded-lg border border-line bg-white px-3 py-2 text-xs sm:text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                >
                  {unitOptions.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin text-brand-600" /> Đang tải dữ liệu hợp đồng...
                    </span>
                  </td>
                </tr>
              ) : filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted">
                    Không có hợp đồng lao động nào phù hợp bộ lọc.
                  </td>
                </tr>
              ) : (
                filteredContracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-mono font-semibold text-slate-700">{c.employeeCode}</td>
                    <td className="p-3.5 font-bold text-ink">{c.employeeName}</td>
                    <td className="p-3.5 text-slate-600">
                      <div>{c.unitName || '—'}</div>
                      <div className="text-[11px] text-muted">{c.positionName || '—'}</div>
                    </td>
                    <td className="p-3.5 font-mono text-slate-500 text-[11px]">{c.contractNumber}</td>
                    <td className="p-3.5 text-slate-700 font-medium">
                      {CONTRACT_TYPE_LABEL[c.contractType] || c.contractType}
                    </td>
                    <td className="p-3.5 font-mono">
                      <span className="font-bold text-ink">{Number(c.salaryCoefficient).toFixed(2)}</span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">
                      {c.expiryDate ? c.expiryDate : <span className="text-slate-400">Vô thời hạn</span>}
                    </td>
                    <td className="p-3.5">
                      {c.alertLevel === 'CRITICAL_30' || (c.daysRemaining != null && c.daysRemaining >= 0 && c.daysRemaining <= 30) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                          <AlertTriangle size={11} /> Còn {c.daysRemaining} ngày
                        </span>
                      ) : c.alertLevel === 'WARNING_60' || c.alertLevel === 'WARNING_90' || (c.daysRemaining != null && c.daysRemaining <= 90 && c.daysRemaining > 30) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-300">
                          <Clock size={11} /> Còn {c.daysRemaining} ngày
                        </span>
                      ) : c.status === 'ACTIVE' ? (
                        <StatusPill status="active" />
                      ) : (
                        <Badge tone="neutral">{CONTRACT_STATUS_LABEL[c.status] || c.status}</Badge>
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

                        {canManageContracts && c.status === 'ACTIVE' && c.contractType !== 'INDEFINITE_TERM' && (
                          <button
                            onClick={() => openRenewModal(c)}
                            className="rounded bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                          >
                            Tái ký / Gia hạn
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
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
                  <p className="text-[11px] font-mono text-muted">{selectedContract.contractNumber}</p>
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
                  <strong className="text-ink text-[13px]">{selectedContract.employeeName}</strong>
                </div>
                <div>
                  <span className="text-muted block">Mã CBGV</span>
                  <strong className="font-mono text-slate-700 text-[13px]">{selectedContract.employeeCode}</strong>
                </div>
                <div>
                  <span className="text-muted block">Đơn vị</span>
                  <strong className="text-ink">{selectedContract.unitName || '—'}</strong>
                </div>
                <div>
                  <span className="text-muted block">Chức vụ</span>
                  <strong className="text-ink">{selectedContract.positionName || '—'}</strong>
                </div>
              </div>

              <div className="space-y-2 border-t border-line pt-3">
                <div className="flex justify-between py-1 border-b border-line">
                  <span className="text-muted">Hình thức hợp đồng</span>
                  <span className="font-semibold text-ink">
                    {CONTRACT_TYPE_LABEL[selectedContract.contractType] || selectedContract.contractType}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-line">
                  <span className="text-muted">Hệ số lương hiện hưởng</span>
                  <span className="font-mono font-bold text-brand-700">
                    {Number(selectedContract.salaryCoefficient).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-line">
                  <span className="text-muted">Ngày ký</span>
                  <span className="font-mono text-ink">{selectedContract.signedDate}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-line">
                  <span className="text-muted">Ngày bắt đầu hiệu lực</span>
                  <span className="font-mono text-ink">{selectedContract.effectiveDate}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-line">
                  <span className="text-muted">Ngày kết thúc thời hạn</span>
                  <span className="font-mono text-ink">
                    {selectedContract.expiryDate || 'Vô thời hạn'}
                  </span>
                </div>
                {selectedContract.daysRemaining != null && (
                  <div className="flex justify-between py-1 border-b border-line">
                    <span className="text-muted">Thời gian còn lại</span>
                    <span className="font-bold text-rose-700 font-mono">
                      {selectedContract.daysRemaining} ngày
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <Button variant="outline" size="sm" onClick={() => setSelectedContract(null)}>
                  Đóng
                </Button>
                {canManageContracts && selectedContract.status === 'ACTIVE' && selectedContract.contractType !== 'INDEFINITE_TERM' && (
                  <Button size="sm" onClick={() => openRenewModal(selectedContract)}>
                    <FileSignature size={14} /> Tái ký / Gia hạn HĐ
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Renew Contract Modal (HR_SPECIALIST / RECTOR) */}
      {renewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setRenewTarget(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-base font-bold text-ink">Tái Ký / Gia Hạn Hợp Đồng Lao Động</h3>
                <p className="text-xs text-muted">
                  {renewTarget.employeeName} ({renewTarget.employeeCode}) · HĐ cũ: {renewTarget.contractNumber}
                </p>
              </div>
              <button onClick={() => setRenewTarget(null)} className="p-1 text-slate-400 hover:text-ink">
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {modalError}
              </div>
            )}

            <form onSubmit={handleRenewSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">Số hợp đồng mới *</label>
                <input
                  required
                  minLength={3}
                  value={renewForm.contractNumber}
                  onChange={(e) => setRenewForm({ ...renewForm, contractNumber: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Loại hợp đồng *</label>
                  <select
                    value={renewForm.contractType}
                    onChange={(e) => setRenewForm({ ...renewForm, contractType: e.target.value as ContractType })}
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2 bg-white"
                  >
                    <option value="DEFINITE_TERM_12M">Xác định thời hạn 12 tháng</option>
                    <option value="DEFINITE_TERM_36M">Xác định thời hạn 36 tháng</option>
                    <option value="INDEFINITE_TERM">Không xác định thời hạn</option>
                    <option value="VISITING_LECTURER">Giảng viên thỉnh giảng</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Hệ số lương mới *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    value={renewForm.salaryCoefficient}
                    onChange={(e) => setRenewForm({ ...renewForm, salaryCoefficient: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Ngày ký *</label>
                  <input
                    type="date"
                    required
                    value={renewForm.signedDate}
                    onChange={(e) => setRenewForm({ ...renewForm, signedDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Ngày hiệu lực *</label>
                  <input
                    type="date"
                    required
                    value={renewForm.effectiveDate}
                    onChange={(e) => setRenewForm({ ...renewForm, effectiveDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2"
                  />
                </div>
                {renewForm.contractType !== 'INDEFINITE_TERM' && (
                  <div>
                    <label className="block font-semibold text-slate-700">Ngày hết hạn *</label>
                    <input
                      type="date"
                      required
                      value={renewForm.expiryDate}
                      onChange={(e) => setRenewForm({ ...renewForm, expiryDate: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-line px-3 py-2"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <Button type="button" variant="outline" size="sm" onClick={() => setRenewTarget(null)}>
                  Hủy
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? 'Đang xử lý...' : 'Xác nhận Tái ký'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Contract Modal (HR_SPECIALIST / RECTOR) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-base font-bold text-ink">Ký Mới Hợp Đồng Lao Động</h3>
              <button onClick={() => setShowCreateModal(false)} className="p-1 text-slate-400 hover:text-ink">
                <X size={18} />
              </button>
            </div>

            {modalError && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">Cán bộ giảng viên *</label>
                <select
                  required
                  value={createForm.employeeId}
                  onChange={(e) => setCreateForm({ ...createForm, employeeId: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2 bg-white"
                >
                  <option value="">-- Chọn nhân sự --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employeeCode} — {emp.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Số hợp đồng *</label>
                <input
                  required
                  minLength={3}
                  placeholder="VD: HĐLĐ-DAU/2026-101"
                  value={createForm.contractNumber}
                  onChange={(e) => setCreateForm({ ...createForm, contractNumber: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-line px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Loại hợp đồng *</label>
                  <select
                    value={createForm.contractType}
                    onChange={(e) => setCreateForm({ ...createForm, contractType: e.target.value as ContractType })}
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2 bg-white"
                  >
                    <option value="PROBATION">Thử việc</option>
                    <option value="DEFINITE_TERM_12M">Xác định thời hạn 12 tháng</option>
                    <option value="DEFINITE_TERM_36M">Xác định thời hạn 36 tháng</option>
                    <option value="INDEFINITE_TERM">Không xác định thời hạn</option>
                    <option value="VISITING_LECTURER">Giảng viên thỉnh giảng</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Hệ số lương *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    required
                    value={createForm.salaryCoefficient}
                    onChange={(e) => setCreateForm({ ...createForm, salaryCoefficient: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Ngày ký *</label>
                  <input
                    type="date"
                    required
                    value={createForm.signedDate}
                    onChange={(e) => setCreateForm({ ...createForm, signedDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Ngày hiệu lực *</label>
                  <input
                    type="date"
                    required
                    value={createForm.effectiveDate}
                    onChange={(e) => setCreateForm({ ...createForm, effectiveDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-line px-3 py-2"
                  />
                </div>
                {createForm.contractType !== 'INDEFINITE_TERM' && (
                  <div>
                    <label className="block font-semibold text-slate-700">Ngày hết hạn *</label>
                    <input
                      type="date"
                      required
                      value={createForm.expiryDate}
                      onChange={(e) => setCreateForm({ ...createForm, expiryDate: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-line px-3 py-2"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-line">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowCreateModal(false)}>
                  Hủy
                </Button>
                <Button type="submit" size="sm" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : 'Tạo Hợp Đồng'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
