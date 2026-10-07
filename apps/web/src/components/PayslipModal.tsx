'use client'

import { useEffect, useState } from 'react'
import {
  Banknote,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Printer,
  ShieldCheck,
  X,
} from 'lucide-react'
import { Badge, Button } from './ui'
import apiClient from '../services/api-client'

interface PayslipModalProps {
  onClose: () => void
}

export function PayslipModal({ onClose }: { onClose: () => void }) {
  const [downloading, setDownloading] = useState(false)
  const [payslip, setPayslip] = useState<any>({
    month: 9,
    year: 2026,
    employeeName: 'ThS. Nguyễn Văn An',
    employeeCode: 'DAU260003',
    departmentName: 'Khoa Kiến trúc',
    salaryCoefficient: 4.98,
    baseSalaryRate: 2340000,
    baseSalary: 11653200,
    leadershipAllowance: 0,
    seniorityAllowance: 699192,
    pedagogicalAllowance: 3495960,
    standardWorkDays: 22,
    actualWorkDays: 21,
    unpaidLeaveDays: 1,
    workDaysDeduction: 529691,
    kpiRanking: 'A',
    kpiBonusCoefficient: 1.3,
    kpiExtraIncome: 5200000,
    overtimeTeachingHours: 7.5,
    overtimeTeachingPay: 1200000,
    grossIncome: 22248352,
    socialInsurance: 988191,
    healthInsurance: 185286,
    unemploymentInsurance: 116532,
    personalIncomeTax: 494584,
    netSalary: 20463759,
  })

  useEffect(() => {
    const fetchPayslip = async () => {
      try {
        const res = await apiClient.payroll.getMyPayslip(9, 2026)
        if (res.ok && res.data) {
          setPayslip(res.data)
        }
      } catch (e) {
        console.warn('[PayslipModal] Fallback to mock', e)
      }
    }
    fetchPayslip()
  }, [])

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
                Tháng {payslip.month}/{payslip.year} · Trường Đại học Kiến trúc Đà Nẵng
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
              <strong className="font-mono text-brand-600 text-[13px]">{payslip.salaryCoefficient} (Bậc 5/8)</strong>
            </div>
          </div>

          {/* Component 1: State salary & allowances */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[13px] font-bold uppercase tracking-wider text-slate-500">
                1. Lương Ngạch Bậc & Phụ Cấp Nhà Nước (Lương cơ sở: 2.340.000đ)
              </h4>
              <Badge tone="info">Cố định</Badge>
            </div>
            <div className="rounded-xl border border-line divide-y divide-line text-[13px]">
              <Row label="Lương ngạch bậc cơ sở (4.98 x 2.340.000đ)" amount={payslip.baseSalary} />
              <Row label="Phụ cấp ưu đãi nhà giáo (30%)" amount={payslip.pedagogicalAllowance} />
              <Row label="Phụ cấp thâm niên nghề giáo (6%)" amount={payslip.seniorityAllowance} />
              {payslip.leadershipAllowance > 0 && (
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
                label={`Thu nhập tăng thêm theo KPI Tháng (Xếp loại ${payslip.kpiRanking} - Hệ số ${payslip.kpiBonusCoefficient})`}
                amount={payslip.kpiExtraIncome}
                highlight
              />
              <Row
                label={`Thù lao vượt định mức giờ giảng / Đồ án Studio (+${payslip.overtimeTeachingHours}h)`}
                amount={payslip.overtimeTeachingPay}
                highlight
              />
            </div>
          </div>

          {/* Deductions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[13px] font-bold uppercase tracking-wider text-slate-500">
                3. Các Khoản Khấu Trừ Pháp Định (10.5% Bảo hiểm & Thuế TNCN)
              </h4>
              <Badge tone="danger">Khấu trừ</Badge>
            </div>
            <div className="rounded-xl border border-line divide-y divide-line text-[13px]">
              <Row label="Bảo hiểm xã hội (8.0%)" amount={-payslip.socialInsurance} negative />
              <Row label="Bảo hiểm y tế (1.5%)" amount={-payslip.healthInsurance} negative />
              <Row label="Bảo hiểm thất nghiệp (1.0%)" amount={-payslip.unemploymentInsurance} negative />
              <Row label="Thuế thu nhập cá nhân (Biểu lũy tiến)" amount={-payslip.personalIncomeTax} negative />
            </div>
          </div>

          {/* Net Salary Total */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-brand-600 to-brand-800 text-white flex items-center justify-between shadow-md">
            <div>
              <span className="text-xs uppercase tracking-wide text-brand-200 block">
                Tổng thực lĩnh chuyển khoản (Net Salary)
              </span>
              <span className="text-[26px] font-bold leading-none font-mono">
                {payslip.netSalary.toLocaleString('vi-VN')} VNĐ
              </span>
            </div>
            <div className="text-right">
              <Badge tone="success">
                <CheckCircle2 size={12} /> Đã phê duyệt chi trả
              </Badge>
              <span className="text-[11px] text-brand-200 block mt-1">Kho bạc / VietinBank DAU</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-line px-6 py-4 bg-slate-50">
          <span className="text-[11px] text-muted flex items-center gap-1">
            <ShieldCheck size={14} className="text-emerald-600" /> Ký số bởi Kế toán trưởng DAU
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={downloading}
              onClick={async () => {
                setDownloading(true)
                try {
                  const blob = await apiClient.payroll.exportPayslipPdf(
                    payslip.employeeId || 'my',
                    payslip.month,
                    payslip.year
                  )
                  if (blob) {
                    const url = window.URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `Phieu-Luong-${payslip.employeeCode || 'CBGV'}-T${payslip.month}-${payslip.year}.pdf`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    window.URL.revokeObjectURL(url)
                  }
                } finally {
                  setDownloading(false)
                }
              }}
            >
              {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              Tải PDF
            </Button>
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
