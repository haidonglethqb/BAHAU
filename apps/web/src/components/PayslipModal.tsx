'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Download,
  Loader2,
  Printer,
  ShieldCheck,
  X,
} from 'lucide-react'
import { Badge, Button } from './ui'

export interface PayslipDto {
  id?: string
  employeeId: string
  employeeName: string
  employeeCode: string
  departmentName: string
  academicTitle?: string | null
  positionName?: string | null
  month: number
  year: number
  baseSalaryRate: number
  salaryCoefficient: number
  baseSalary: number
  leadershipAllowance: number
  seniorityAllowance: number
  pedagogicalAllowance: number
  standardWorkDays: number
  actualWorkDays: number
  unpaidLeaveDays: number
  workDaysDeduction: number
  kpiRanking: 'A' | 'B' | 'C' | 'D'
  kpiBonusCoefficient: number
  kpiExtraIncome: number
  overtimeTeachingHours: number
  overtimeTeachingPay: number
  royaltyPayment?: number
  postgradHonorarium?: number
  grossIncome: number
  insurableBase: number
  socialInsurance: number
  healthInsurance: number
  unemploymentInsurance: number
  totalInsurance: number
  personalDeduction: number
  dependentCount: number
  dependentDeduction: number
  taxableIncome: number
  personalIncomeTax: number
  netSalary: number
  status: 'DRAFT' | 'APPROVED' | 'PAID'
  createdAt?: string
}

interface PayslipModalProps {
  employeeId?: string
  month?: number
  year?: number
  initialPayslip?: PayslipDto | null
  onClose: () => void
}

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {}
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('bahau_session_id')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export function PayslipModal({
  employeeId,
  month = 9,
  year = 2026,
  initialPayslip = null,
  onClose,
}: PayslipModalProps) {
  const [downloading, setDownloading] = useState(false)
  const [loading, setLoading] = useState(!initialPayslip)
  const [error, setError] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [payslip, setPayslip] = useState<PayslipDto | null>(initialPayslip)

  useEffect(() => {
    if (initialPayslip) {
      setPayslip(initialPayslip)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    const fetchPayslip = async () => {
      setLoading(true)
      setError(null)
      try {
        if (!employeeId || employeeId === 'my') {
          const res = await fetch(
            `/api/v1/payroll/my-payslip?month=${month}&year=${year}`,
            { credentials: 'include', headers: getAuthHeaders() }
          )
          const json = await res.json().catch(() => null)
          if (!res.ok || json?.success === false || !json?.data) {
            throw new Error(
              json?.error?.message ||
                `Không thể tải phiếu lương (HTTP ${res.status}).`
            )
          }
          if (!cancelled) setPayslip(json.data)
        } else {
          const res = await fetch(
            `/api/v1/payroll/table?month=${month}&year=${year}`,
            { credentials: 'include', headers: getAuthHeaders() }
          )
          const json = await res.json().catch(() => null)
          if (!res.ok || json?.success === false) {
            throw new Error(
              json?.error?.message ||
                `Không thể tải dữ liệu phiếu lương (HTTP ${res.status}).`
            )
          }
          const found = (json?.data?.items || []).find(
            (it: PayslipDto) => it.employeeId === employeeId
          )
          if (!found) {
            throw new Error(
              `Không tìm thấy phiếu lương cho mã nhân sự (${employeeId}) trong kỳ ${month}/${year}.`
            )
          }
          if (!cancelled) setPayslip(found)
        }
      } catch (e: any) {
        if (!cancelled) {
          setPayslip(null)
          setError(e?.message || 'Lỗi kết nối khi tải phiếu lương.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPayslip()
    return () => {
      cancelled = true
    }
  }, [employeeId, month, year, initialPayslip])

  const handleDownloadPdf = async () => {
    if (!payslip) return
    setDownloading(true)
    setDownloadError(null)
    try {
      const targetId = payslip.employeeId || employeeId || 'my'
      const res = await fetch(
        `/api/v1/payroll/payslip/${encodeURIComponent(targetId)}/pdf?month=${payslip.month}&year=${payslip.year}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: getAuthHeaders(),
        }
      )
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(
          errJson?.error?.message || `Không thể xuất PDF (HTTP ${res.status}).`
        )
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Phieu-Luong-${payslip.employeeCode || 'CBGV'}-T${payslip.month}-${payslip.year}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (e: any) {
      setDownloadError(e?.message || 'Lỗi khi tải file PDF phiếu lương.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-200">
              <Banknote size={20} />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-ink">
                Phiếu Lương Điện Tử (E-Payslip)
              </h3>
              <p className="text-[12px] text-muted">
                Tháng {payslip?.month ?? month}/{payslip?.year ?? year} · Trường Đại học Kiến trúc Đà Nẵng
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-ink transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-14 text-muted gap-2">
              <Loader2 size={28} className="animate-spin text-brand-600" />
              <span className="text-xs">Đang tải dữ liệu phiếu lương từ máy chủ...</span>
            </div>
          ) : error || !payslip ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-center space-y-2">
              <AlertTriangle size={28} className="mx-auto text-rose-600" />
              <p className="text-sm font-bold text-rose-900">Không thể hiển thị phiếu lương</p>
              <p className="text-xs text-rose-700">{error || 'Không có dữ liệu phiếu lương.'}</p>
            </div>
          ) : (
            <>
              {/* Employee Badge Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-line text-xs">
                <div>
                  <span className="text-muted block">Họ và tên</span>
                  <strong className="text-ink text-[13px]">{payslip.employeeName}</strong>
                </div>
                <div>
                  <span className="text-muted block">Mã CBGV</span>
                  <strong className="font-mono text-slate-700 text-[13px]">{payslip.employeeCode}</strong>
                </div>
                <div>
                  <span className="text-muted block">Đơn vị</span>
                  <strong className="text-ink">{payslip.departmentName}</strong>
                </div>
                <div>
                  <span className="text-muted block">Hệ số lương</span>
                  <strong className="font-mono text-brand-600 text-[13px]">
                    {payslip.salaryCoefficient}
                  </strong>
                </div>
              </div>

              {/* Chấm công & Ngày công thực tế */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[13px] font-bold uppercase tracking-wider text-slate-500">
                    Đối Soát Chấm Công & Ngày Công Tính Lương
                  </h4>
                  <Badge tone="info">Kỳ {payslip.month}/{payslip.year}</Badge>
                </div>
                <div className="rounded-xl border border-line divide-y divide-line text-[13px] bg-slate-50/50">
                  <div className="flex items-center justify-between p-3">
                    <span className="text-slate-600">Số ngày công tiêu chuẩn trong tháng</span>
                    <span className="font-mono font-bold text-ink">{payslip.standardWorkDays} ngày</span>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-slate-600">Số ngày công hưởng lương thực tế</span>
                    <span className="font-mono font-bold text-emerald-700">{payslip.actualWorkDays} ngày</span>
                  </div>
                  {payslip.unpaidLeaveDays > 0 && (
                    <div className="flex items-center justify-between p-3 bg-rose-50/60 text-rose-800">
                      <span>Khấu trừ lương do nghỉ không hưởng lương ({payslip.unpaidLeaveDays} ngày)</span>
                      <span className="font-mono font-bold">- {(payslip.workDaysDeduction || 0).toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Component 1: State salary & allowances */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[13px] font-bold uppercase tracking-wider text-slate-500">
                    1. Lương Ngạch Bậc & Phụ Cấp (Lương cơ sở: {(payslip.baseSalaryRate || 2340000).toLocaleString('vi-VN')}đ)
                  </h4>
                  <Badge tone="info">Cố định</Badge>
                </div>
                <div className="rounded-xl border border-line divide-y divide-line text-[13px]">
                  <Row
                    label={`Lương ngạch bậc cơ sở (${payslip.salaryCoefficient} x ${(payslip.baseSalaryRate || 2340000).toLocaleString('vi-VN')}đ)`}
                    amount={payslip.baseSalary || 0}
                  />
                  <Row label="Phụ cấp ưu đãi nhà giáo" amount={payslip.pedagogicalAllowance || 0} />
                  <Row label="Phụ cấp thâm niên nghề" amount={payslip.seniorityAllowance || 0} />
                  {(payslip.leadershipAllowance || 0) > 0 && (
                    <Row label="Phụ cấp chức vụ lãnh đạo" amount={payslip.leadershipAllowance} />
                  )}
                </div>
              </div>

              {/* Component 2: Autonomy extra income (KPI & Overtime) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[13px] font-bold uppercase tracking-wider text-slate-500">
                    2. Thu Nhập Tăng Thêm Cơ Chế Tự Chủ (KPI & Vượt Giờ)
                  </h4>
                  <Badge tone="ochre">Theo hiệu quả</Badge>
                </div>
                <div className="rounded-xl border border-line divide-y divide-line text-[13px]">
                  <Row
                    label={`Thu nhập tăng thêm theo KPI (Xếp loại ${payslip.kpiRanking} - Hệ số ${payslip.kpiBonusCoefficient})`}
                    amount={payslip.kpiExtraIncome || 0}
                    highlight
                  />
                  <Row
                    label={`Thù lao vượt định mức giờ giảng (+${payslip.overtimeTeachingHours || 0}h)`}
                    amount={payslip.overtimeTeachingPay || 0}
                    highlight
                  />
                </div>
              </div>

              {/* Deductions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[13px] font-bold uppercase tracking-wider text-slate-500">
                    3. Các Khoản Khấu Trừ Pháp Định (BHXH, BHYT, BHTN & Thuế TNCN)
                  </h4>
                  <Badge tone="danger">Khấu trừ</Badge>
                </div>
                <div className="rounded-xl border border-line divide-y divide-line text-[13px]">
                  <Row label="Bảo hiểm xã hội (8.0%)" amount={-(payslip.socialInsurance || 0)} negative />
                  <Row label="Bảo hiểm y tế (1.5%)" amount={-(payslip.healthInsurance || 0)} negative />
                  <Row label="Bảo hiểm thất nghiệp (1.0%)" amount={-(payslip.unemploymentInsurance || 0)} negative />
                  <Row label="Tổng bảo hiểm bắt buộc (10.5%)" amount={-(payslip.totalInsurance || 0)} negative />
                  <Row label="Thuế thu nhập cá nhân (Biểu lũy tiến)" amount={-(payslip.personalIncomeTax || 0)} negative />
                </div>
              </div>

              {/* Net Salary Total */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-800 text-white flex items-center justify-between shadow-md">
                <div>
                  <span className="text-xs uppercase tracking-wide text-brand-200 block">
                    Tổng thực lĩnh chuyển khoản (Net Salary)
                  </span>
                  <span className="text-[26px] font-bold leading-none font-mono">
                    {(payslip.netSalary || 0).toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
                <div className="text-right">
                  <Badge tone={payslip.status === 'DRAFT' ? 'warning' : 'success'}>
                    <CheckCircle2 size={12} />{' '}
                    {payslip.status === 'PAID'
                      ? 'Đã chi trả'
                      : payslip.status === 'APPROVED'
                      ? 'Đã phê duyệt'
                      : 'Dự thảo (DRAFT)'}
                  </Badge>
                </div>
              </div>

              {downloadError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {downloadError}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-line px-6 py-4 bg-slate-50">
          <span className="text-[11px] text-muted flex items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-600" /> Phiếu lương điện tử DAU
          </span>
          <div className="flex items-center gap-2">
            {payslip && (
              <Button
                variant="outline"
                disabled={downloading}
                onClick={handleDownloadPdf}
              >
                {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                Tải PDF
              </Button>
            )}
            <Button variant="outline" onClick={() => window.print()}>
              <Printer size={15} /> In
            </Button>
            <Button onClick={onClose}>Đóng</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({
  label,
  amount,
  highlight,
  negative,
}: {
  label: string
  amount: number
  highlight?: boolean
  negative?: boolean
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className={highlight ? 'font-medium text-brand-900' : 'text-slate-700'}>{label}</span>
      <span
        className={`font-mono font-semibold ${
          negative
            ? 'text-rose-600'
            : highlight
            ? 'text-brand-600'
            : 'text-ink'
        }`}
      >
        {amount > 0 ? `+${amount.toLocaleString('vi-VN')}` : amount.toLocaleString('vi-VN')} đ
      </span>
    </div>
  )
}
