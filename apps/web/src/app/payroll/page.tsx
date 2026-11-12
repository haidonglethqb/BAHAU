'use client'

import React, { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  Filter,
  GraduationCap,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { Badge, Button, Card } from '../../components/ui'
import { PayslipModal, type PayslipDto } from '../../components/PayslipModal'
import { useAuth } from '../../context/AuthContext'
import { AuthGuard } from '../../components/AuthGuard'

interface PayrollPeriodSummary {
  id: string
  month: number
  year: number
  totalEmployees: number
  totalGrossPayout: number
  totalNetPayout: number
  totalInsurancePayout: number
  totalTaxWithheld: number
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'LOCKED'
  submittedBy?: string | null
  submittedAt?: string | null
  approvedBy?: string | null
  approvedAt?: string | null
  pkiSignature?: string | null
}

function getAuthHeaders(withJson = false): HeadersInit {
  const headers: Record<string, string> = {}
  if (withJson) headers['Content-Type'] = 'application/json'
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('bahau_session_id')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function authFetchJson(url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      ...getAuthHeaders(Boolean(init.body)),
      ...((init.headers as Record<string, string>) || {}),
    },
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || json?.success === false) {
    const code = json?.error?.code ? `[${json.error.code}] ` : ''
    const msg = json?.error?.message || `Yêu cầu thất bại (HTTP ${res.status})`
    throw new Error(`${code}${msg}`)
  }
  return json
}

export default function PayrollPage() {
  const { user } = useAuth()
  const role = user?.role || 'LECTURER'
  const canManagePayroll = role === 'HR_SPECIALIST' || role === 'RECTOR'

  const [month, setMonth] = useState(9)
  const [year, setYear] = useState(2026)
  const [selectedUnit, setSelectedUnit] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const [period, setPeriod] = useState<PayrollPeriodSummary | null>(null)
  const [items, setItems] = useState<PayslipDto[]>([])
  const [myPayslip, setMyPayslip] = useState<PayslipDto | null>(null)

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipDto | null>(null)
  const [showMyModal, setShowMyModal] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchPersonalPayslip = async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const json = await authFetchJson(
        `/api/v1/payroll/my-payslip?month=${month}&year=${year}`
      )
      if (!json?.data) {
        throw new Error('Không có dữ liệu phiếu lương cho kỳ đã chọn.')
      }
      setMyPayslip(json.data)
    } catch (e: any) {
      setMyPayslip(null)
      setErrorMessage(e?.message || 'Không thể tải phiếu lương cá nhân.')
    } finally {
      setLoading(false)
    }
  }

  const fetchPayrollTable = async (recalculate = false) => {
    setLoading(true)
    setErrorMessage(null)
    try {
      if (recalculate && canManagePayroll) {
        await authFetchJson('/api/v1/payroll/calculate', {
          method: 'POST',
          body: JSON.stringify({ month, year, recalculate: true }),
        })
      }

      const params = new URLSearchParams({
        month: String(month),
        year: String(year),
      })
      if (selectedUnit !== 'ALL') params.set('unitName', selectedUnit)
      if (searchQuery.trim()) params.set('search', searchQuery.trim())

      const json = await authFetchJson(`/api/v1/payroll/table?${params.toString()}`)
      setPeriod(json?.data?.period ?? null)
      setItems(Array.isArray(json?.data?.items) ? json.data.items : [])
    } catch (e: any) {
      setPeriod(null)
      setItems([])
      setErrorMessage(e?.message || 'Không thể tải bảng lương từ máy chủ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canManagePayroll) {
      fetchPayrollTable(false)
    } else {
      fetchPersonalPayslip()
    }
  }, [month, year, selectedUnit, role])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (canManagePayroll) {
      fetchPayrollTable(false)
    }
  }

  const handleSubmitPeriod = async () => {
    if (role !== 'HR_SPECIALIST') return
    setActionLoading(true)
    setSuccessMessage(null)
    setErrorMessage(null)
    try {
      const json = await authFetchJson('/api/v1/payroll/submit', {
        method: 'POST',
        body: JSON.stringify({ month, year }),
      })
      if (json?.data) setPeriod(json.data)
      setSuccessMessage('Đã trình Bảng lương lên Ban Giám hiệu phê duyệt thành công!')
      await fetchPayrollTable(false)
    } catch (e: any) {
      setErrorMessage(e?.message || 'Lỗi khi trình duyệt bảng lương.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprovePeriod = async () => {
    if (role !== 'RECTOR') return
    setActionLoading(true)
    setSuccessMessage(null)
    setErrorMessage(null)
    try {
      const json = await authFetchJson('/api/v1/payroll/approve', {
        method: 'POST',
        body: JSON.stringify({ month, year }),
      })
      if (json?.data) setPeriod(json.data)
      setSuccessMessage('Hiệu trưởng đã phê duyệt & Ký số điện tử PKI cho kỳ lương thành công!')
      await fetchPayrollTable(false)
    } catch (e: any) {
      setErrorMessage(e?.message || 'Lỗi khi phê duyệt kỳ lương.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLockPeriod = async () => {
    if (!canManagePayroll) return
    setActionLoading(true)
    setSuccessMessage(null)
    setErrorMessage(null)
    try {
      const json = await authFetchJson('/api/v1/payroll/lock', {
        method: 'POST',
        body: JSON.stringify({ month, year }),
      })
      if (json?.data) setPeriod(json.data)
      setSuccessMessage(`Đã khóa sổ kỳ lương Tháng ${month}/${year} bất biến.`)
      await fetchPayrollTable(false)
    } catch (e: any) {
      setErrorMessage(e?.message || 'Lỗi khi khóa kỳ lương.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownloadPayslip = async (empId: string, empCode: string) => {
    setErrorMessage(null)
    try {
      const res = await fetch(
        `/api/v1/payroll/payslip/${encodeURIComponent(empId || 'my')}/pdf?month=${month}&year=${year}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: getAuthHeaders(false),
        }
      )
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(
          errJson?.error?.message || `Không thể xuất phiếu lương PDF (HTTP ${res.status}).`
        )
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Phieu-Luong-${empCode || 'CBGV'}-T${month}-${year}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      setErrorMessage(e?.message || 'Không thể tải phiếu lương PDF.')
    }
  }

  const formatVnd = (val?: number | null) => `${(val || 0).toLocaleString('vi-VN')} đ`

  const unitsList = [
    'ALL',
    'Khoa Kiến trúc',
    'Khoa Xây dựng',
    'Khoa Quy hoạch',
    'Khoa Công nghệ thông tin',
    'Ban Giám hiệu',
  ]

  // ==========================================
  // VIEW 1: PERSONAL PAYSLIP WORKSPACE (LECTURER / DEAN / SYSTEM_ADMIN)
  // ==========================================
  if (!canManagePayroll) {
    const stateIncomeTotal = myPayslip
      ? (myPayslip.baseSalary || 0) +
        (myPayslip.pedagogicalAllowance || 0) +
        (myPayslip.seniorityAllowance || 0) +
        (myPayslip.leadershipAllowance || 0)
      : 0
    const autonomyIncomeTotal = myPayslip
      ? (myPayslip.overtimeTeachingPay || 0) +
        (myPayslip.kpiExtraIncome || 0) +
        (myPayslip.royaltyPayment || 0) +
        (myPayslip.postgradHonorarium || 0)
      : 0
    const totalDeductions = myPayslip
      ? (myPayslip.totalInsurance || 0) + (myPayslip.personalIncomeTax || 0)
      : 0

    return (
      <AuthGuard moduleName="Phiếu Lương Cá Nhân">
        <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-700 border border-brand-200">
                  Phiếu Lương Cá Nhân
                </span>
                {myPayslip && (
                  <span className="text-xs text-muted">
                    Mã CBGV: {myPayslip.employeeCode} · {myPayslip.departmentName}
                  </span>
                )}
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
                <Banknote className="text-brand-600" size={24} />
                Phiếu Lương & Thu Nhập — {myPayslip?.employeeName || user?.fullName || 'Cá nhân'}
              </h1>
              <p className="text-xs sm:text-sm text-muted">
                Cơ cấu thu nhập 2 thành phần: Lương ngạch bậc viên chức, thù lao vượt giờ và thu nhập tăng thêm KPI tháng
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 shadow-xs text-xs">
                <Calendar size={14} className="text-slate-400" />
                <span className="text-slate-500 font-medium">Kỳ:</span>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="bg-transparent font-bold text-ink focus:outline-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <option key={m} value={m}>
                      Tháng {m}
                    </option>
                  ))}
                </select>
                <span>/</span>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="bg-transparent font-bold text-ink focus:outline-none"
                >
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                </select>
              </div>

              {myPayslip && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMyModal(true)}
                  >
                    <Eye size={13} /> Chi tiết
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleDownloadPayslip(myPayslip.employeeId || 'my', myPayslip.employeeCode)
                    }
                  >
                    <Download size={13} /> Tải PDF
                  </Button>
                </>
              )}
            </div>
          </div>

          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span>{successMessage}</span>
              </div>
              <button onClick={() => setSuccessMessage(null)}>
                <X size={14} />
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-xs text-rose-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                <div>
                  <p className="font-bold">Không thể tải phiếu lương kỳ {month}/{year}</p>
                  <p className="mt-0.5 text-rose-700">{errorMessage}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={fetchPersonalPayslip}>
                <RefreshCw size={13} /> Thử lại
              </Button>
            </div>
          )}

          {loading ? (
            <Card className="p-12 text-center text-muted flex flex-col items-center gap-2">
              <Loader2 size={26} className="animate-spin text-brand-600" />
              <span className="text-xs">Đang tính toán và đồng bộ phiếu lương kỳ {month}/{year}...</span>
            </Card>
          ) : myPayslip ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 border-l-4 border-l-emerald-600 shadow-xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Thực Lĩnh (Net Salary)
                  </span>
                  <div className="text-2xl font-black text-emerald-700 mt-1">
                    {formatVnd(myPayslip.netSalary)}
                  </div>
                  <p className="text-[11px] text-emerald-600 mt-1">
                    Trạng thái: {myPayslip.status}
                  </p>
                </Card>

                <Card className="p-4 border-l-4 border-l-brand-600 shadow-xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Lương Ngạch Bậc
                  </span>
                  <div className="text-xl font-bold text-ink mt-1">
                    {formatVnd(myPayslip.baseSalary)}
                  </div>
                  <p className="text-[11px] text-muted mt-1">
                    Hệ số {myPayslip.salaryCoefficient} · Cơ sở {(myPayslip.baseSalaryRate || 2340000).toLocaleString('vi-VN')}đ
                  </p>
                </Card>

                <Card className="p-4 border-l-4 border-l-blue-600 shadow-xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    KPI & Vượt Giờ
                  </span>
                  <div className="text-xl font-bold text-blue-700 mt-1">
                    {formatVnd(autonomyIncomeTotal)}
                  </div>
                  <p className="text-[11px] text-muted mt-1">
                    KPI Loại {myPayslip.kpiRanking} · +{myPayslip.overtimeTeachingHours}h vượt giờ
                  </p>
                </Card>

                <Card className="p-4 border-l-4 border-l-amber-500 shadow-xs">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Tổng Khấu Trừ
                  </span>
                  <div className="text-xl font-bold text-rose-700 mt-1">
                    - {formatVnd(totalDeductions)}
                  </div>
                  <p className="text-[11px] text-muted mt-1">
                    BH 10.5% + Thuế TNCN
                  </p>
                </Card>
              </div>

              <Card className="p-6 space-y-6">
                <div className="border-b border-line pb-4 flex items-center justify-between">
                  <h3 className="text-base font-bold text-ink flex items-center gap-2">
                    <FileSpreadsheet size={18} className="text-brand-600" />
                    Bảng Phân Rã Chi Tiết Thu Nhập Tháng {myPayslip.month}/{myPayslip.year}
                  </h3>
                  <span className="text-xs text-muted">
                    Ngày công: {myPayslip.actualWorkDays}/{myPayslip.standardWorkDays} ngày
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700 mb-2 flex items-center gap-1.5">
                        <GraduationCap size={14} /> Thành phần 1: Lương Ngạch Bậc & Phụ Cấp
                      </h4>
                      <div className="space-y-2 rounded-xl bg-slate-50 p-3.5 border border-line text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-600">
                            Lương cơ bản (Hệ số {myPayslip.salaryCoefficient} x {(myPayslip.baseSalaryRate || 2340000).toLocaleString('vi-VN')}đ)
                          </span>
                          <strong className="text-ink">{formatVnd(myPayslip.baseSalary)}</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-600">Phụ cấp ưu đãi nhà giáo</span>
                          <strong className="text-ink">{formatVnd(myPayslip.pedagogicalAllowance)}</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-600">Phụ cấp thâm niên nghề</span>
                          <strong className="text-ink">{formatVnd(myPayslip.seniorityAllowance)}</strong>
                        </div>
                        {(myPayslip.leadershipAllowance || 0) > 0 && (
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="text-slate-600">Phụ cấp chức vụ lãnh đạo</span>
                            <strong className="text-ink">{formatVnd(myPayslip.leadershipAllowance)}</strong>
                          </div>
                        )}
                        <div className="flex justify-between py-1 pt-2 border-t border-slate-300 font-bold text-brand-700">
                          <span>Tổng thành phần 1</span>
                          <span>{formatVnd(stateIncomeTotal)}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2 flex items-center gap-1.5">
                        <Building2 size={14} /> Thành phần 2: Thu Nhập Tăng Thêm Tự Chủ
                      </h4>
                      <div className="space-y-2 rounded-xl bg-slate-50 p-3.5 border border-line text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-600">
                            Thù lao vượt giờ giảng (+{myPayslip.overtimeTeachingHours}h)
                          </span>
                          <strong className="text-ink">{formatVnd(myPayslip.overtimeTeachingPay)}</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-600">
                            Thu nhập tăng thêm KPI (Loại {myPayslip.kpiRanking}, HS {myPayslip.kpiBonusCoefficient})
                          </span>
                          <strong className="text-ink">{formatVnd(myPayslip.kpiExtraIncome)}</strong>
                        </div>
                        {myPayslip.unpaidLeaveDays > 0 && (
                          <div className="flex justify-between py-1 border-b border-slate-200 text-rose-700">
                            <span>Khấu trừ nghỉ không lương ({myPayslip.unpaidLeaveDays} ngày)</span>
                            <strong>- {formatVnd(myPayslip.workDaysDeduction)}</strong>
                          </div>
                        )}
                        <div className="flex justify-between py-1 pt-2 border-t border-slate-300 font-bold text-blue-700">
                          <span>Tổng thành phần 2</span>
                          <span>{formatVnd(autonomyIncomeTotal)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-2 flex items-center gap-1.5">
                        <AlertTriangle size={14} /> Các Khoản Trích Nộp & Khấu Trừ Nghĩa Vụ
                      </h4>
                      <div className="space-y-2 rounded-xl bg-slate-50 p-3.5 border border-line text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-600">Bảo hiểm xã hội BHXH (8%)</span>
                          <strong className="text-rose-700">- {formatVnd(myPayslip.socialInsurance)}</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-600">Bảo hiểm y tế BHYT (1.5%)</span>
                          <strong className="text-rose-700">- {formatVnd(myPayslip.healthInsurance)}</strong>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200">
                          <span className="text-slate-600">Bảo hiểm thất nghiệp BHTN (1%)</span>
                          <strong className="text-rose-700">- {formatVnd(myPayslip.unemploymentInsurance)}</strong>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-600">Thuế thu nhập cá nhân (TNCN)</span>
                          <strong className="text-rose-700">- {formatVnd(myPayslip.personalIncomeTax)}</strong>
                        </div>
                        <div className="flex justify-between py-1 pt-2 border-t border-slate-300 font-bold text-rose-700">
                          <span>Tổng khấu trừ nghĩa vụ</span>
                          <span>- {formatVnd(totalDeductions)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 space-y-2">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                        Tổng Thực Nhận Chuyển Khoản (Net)
                      </span>
                      <div className="text-3xl font-black text-emerald-700">
                        {formatVnd(myPayslip.netSalary)}
                      </div>
                      <p className="text-xs text-emerald-700">
                        Tổng thu nhập trước khấu trừ (Gross): <strong>{formatVnd(myPayslip.grossIncome)}</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </>
          ) : null}

          {showMyModal && myPayslip && (
            <PayslipModal
              employeeId={myPayslip.employeeId}
              month={myPayslip.month}
              year={myPayslip.year}
              initialPayslip={myPayslip}
              onClose={() => setShowMyModal(false)}
            />
          )}
        </div>
      </AuthGuard>
    )
  }

  // ==========================================
  // VIEW 2: HR_SPECIALIST & RECTOR PAYROLL MANAGEMENT
  // ==========================================
  return (
    <AuthGuard allowedRoles={['HR_SPECIALIST', 'RECTOR']} moduleName="Quản Lý Bảng Lương Toàn Trường">
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              <span>{role === 'HR_SPECIALIST' ? 'Phòng TCHC' : 'Ban Giám Hiệu'}</span>
              <ChevronRight size={12} />
              <span>Thu nhập & Lương 2 Thành phần</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
              <Banknote className="text-brand-600" size={26} />
              {role === 'HR_SPECIALIST'
                ? 'Bảng Lương Toàn Trường & Quyết Toán Thu Nhập'
                : 'Phê Duyệt Quỹ Lương & Ngân Sách Thu Nhập Toàn Trường'}
            </h1>
            <p className="text-xs text-muted mt-1">
              {role === 'HR_SPECIALIST'
                ? 'Tính toán bảng lương từ kỳ công đã chốt, thù lao vượt giờ và xếp loại KPI tháng'
                : 'Kiểm soát tổng quỹ ngân sách chi trả, thẩm tra phân bổ thù lao và ký số PKI phê duyệt'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 shadow-xs text-xs">
              <Calendar size={14} className="text-slate-400" />
              <span className="text-slate-500 font-medium">Kỳ lương:</span>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="bg-transparent font-bold text-ink focus:outline-none"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
              <span>/</span>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-transparent font-bold text-ink focus:outline-none"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
              </select>
            </div>

            {canManagePayroll && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPayrollTable(true)}
                disabled={loading || actionLoading}
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                Đồng bộ từ Chấm công
              </Button>
            )}

            {role === 'HR_SPECIALIST' && period?.status === 'DRAFT' && (
              <Button
                size="sm"
                variant="primary"
                onClick={handleSubmitPeriod}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                Trình Hiệu trưởng
              </Button>
            )}

            {role === 'RECTOR' && period?.status === 'SUBMITTED' && (
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white shadow-sm font-bold"
                onClick={handleApprovePeriod}
                disabled={actionLoading}
              >
                {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={14} />}
                Ký Số PKI Phê Duyệt Quỹ Lương
              </Button>
            )}

            {canManagePayroll && period?.status === 'APPROVED' && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleLockPeriod}
                disabled={actionLoading}
              >
                <Lock size={13} /> Khóa Sổ Lương
              </Button>
            )}

            {(period?.status === 'APPROVED' || period?.status === 'LOCKED') && (
              <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-xs">
                <CheckCircle2 size={14} />{' '}
                {period.status === 'LOCKED' ? 'Đã Khóa Sổ' : 'Đã Ký số PKI'}
              </div>
            )}
          </div>
        </div>

        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)}>
              <X size={14} />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-l-4 border-l-brand-600 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Tổng Chi Trả (Gross)
            </span>
            <div className="text-xl font-black text-ink mt-1">
              {formatVnd(period?.totalGrossPayout || 0)}
            </div>
            <p className="text-[11px] text-muted mt-1 flex items-center gap-1">
              <Users size={12} /> {period?.totalEmployees || items.length} cán bộ hưởng lương
            </p>
          </Card>

          <Card className="p-4 border-l-4 border-l-emerald-600 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Thực Lĩnh Chuyển Khoản (Net)
            </span>
            <div className="text-xl font-black text-emerald-700 mt-1">
              {formatVnd(period?.totalNetPayout || 0)}
            </div>
            <p className="text-[11px] text-emerald-600 mt-1">
              Thực nhận vào tài khoản ATM cán bộ
            </p>
          </Card>

          <Card className="p-4 border-l-4 border-l-amber-500 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Trích Nộp Bảo Hiểm (10.5%)
            </span>
            <div className="text-xl font-black text-slate-800 mt-1">
              {formatVnd(period?.totalInsurancePayout || 0)}
            </div>
            <p className="text-[11px] text-muted mt-1">
              BHXH (8%) &bull; BHYT (1.5%) &bull; BHTN (1%)
            </p>
          </Card>

          <Card className="p-4 border-l-4 border-l-purple-600 shadow-xs">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Thuế TNCN Tạm Khấu Trừ
            </span>
            <div className="text-xl font-black text-slate-800 mt-1">
              {formatVnd(period?.totalTaxWithheld || 0)}
            </div>
            <p className="text-[11px] text-muted mt-1">
              Biểu thuế lũy tiến từng phần 7 bậc
            </p>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-line shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted px-2 font-medium">
              <Filter size={14} /> Đơn vị:
            </div>
            {unitsList.map((u) => (
              <button
                key={u}
                onClick={() => setSelectedUnit(u)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedUnit === u
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {u === 'ALL' ? 'Tất cả đơn vị' : u}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm tên, mã CBGV..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-line pl-9 pr-3 py-1.5 text-xs outline-none focus:border-brand-500"
            />
          </form>
        </div>

        <div className="rounded-2xl border border-line bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-line text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3.5">Cán bộ / Giảng viên</th>
                  <th className="px-4 py-3.5">Đơn vị</th>
                  <th className="px-4 py-3.5">Lương cơ bản (Ngạch)</th>
                  <th className="px-4 py-3.5">Phụ cấp (Ngành/CV/TN)</th>
                  <th className="px-4 py-3.5">Chấm công thực tế</th>
                  <th className="px-4 py-3.5">Vượt giờ & KPI</th>
                  <th className="px-4 py-3.5">Khấu trừ (BH/Thuế)</th>
                  <th className="px-4 py-3.5 text-right">Thực lĩnh (Net)</th>
                  <th className="px-4 py-3.5 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted">
                      <Loader2 size={24} className="mx-auto animate-spin text-brand-600 mb-2" />
                      Đang đồng bộ dữ liệu bảng lương...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted">
                      Không tìm thấy bản ghi lương nào phù hợp điều kiện lọc.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const totalAllowances =
                      (item.pedagogicalAllowance || 0) +
                      (item.seniorityAllowance || 0) +
                      (item.leadershipAllowance || 0)
                    const totalDeductions =
                      (item.totalInsurance || 0) + (item.personalIncomeTax || 0)

                    return (
                      <tr key={item.id || item.employeeId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-ink">{item.employeeName}</div>
                          <div className="font-mono text-[10px] text-muted">{item.employeeCode}</div>
                        </td>
                        <td className="px-4 py-3.5 font-medium">{item.departmentName}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-ink">{formatVnd(item.baseSalary)}</div>
                          <div className="font-mono text-[10px] text-muted">
                            Hệ số: {item.salaryCoefficient}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-800">
                          {formatVnd(totalAllowances)}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-ink">
                            {item.actualWorkDays} / {item.standardWorkDays} ngày
                          </div>
                          <div className="text-[10px] font-medium">
                            {item.unpaidLeaveDays > 0 ? (
                              <span className="text-rose-600 font-semibold">
                                Nghỉ KL: {item.unpaidLeaveDays} ngày (Trừ {formatVnd(item.workDaysDeduction)})
                              </span>
                            ) : (
                              <span className="text-emerald-600">Đủ ngày công</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-bold text-brand-700">
                            {formatVnd((item.overtimeTeachingPay || 0) + (item.kpiExtraIncome || 0))}
                          </div>
                          <div className="text-[10px] text-muted">
                            Vượt giờ: {formatVnd(item.overtimeTeachingPay || 0)} &bull; KPI: {item.kpiRanking}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-rose-600">
                          - {formatVnd(totalDeductions)}
                        </td>
                        <td className="px-4 py-3.5 text-right font-black text-emerald-700 text-sm">
                          {formatVnd(item.netSalary)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedPayslip(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                              title="Xem chi tiết phiếu lương"
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() =>
                                handleDownloadPayslip(item.employeeId, item.employeeCode)
                              }
                              className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                              title="Xuất phiếu lương PDF"
                            >
                              <Download size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selectedPayslip && (
          <PayslipModal
            employeeId={selectedPayslip.employeeId}
            month={month}
            year={year}
            initialPayslip={selectedPayslip}
            onClose={() => setSelectedPayslip(null)}
          />
        )}
      </div>
    </AuthGuard>
  )
}
