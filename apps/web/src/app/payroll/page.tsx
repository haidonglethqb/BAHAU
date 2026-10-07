'use client'

import React, { useEffect, useState } from 'react'
import {
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { Badge, Button, Card } from '../../components/ui'
import apiClient from '../../services/api-client'
import { PayslipModal } from '../../components/PayslipModal'

export default function PayrollPage() {
  const [month, setMonth] = useState(9)
  const [year, setYear] = useState(2026)
  const [selectedUnit, setSelectedUnit] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  
  const [period, setPeriod] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fetchPayroll = async (recalculate = false) => {
    setLoading(true)
    setErrorMessage(null)
    try {
      if (recalculate) {
        await apiClient.payroll.calculatePeriod(month, year, true)
      }
      const res = await apiClient.payroll.getPayrollTable({
        month,
        year,
        unitName: selectedUnit !== 'ALL' ? selectedUnit : undefined,
        search: searchQuery || undefined,
      })
      if (res.ok && res.data) {
        setPeriod(res.data.period)
        setItems(res.data.items || [])
      } else {
        setErrorMessage(res.error || 'Không thể tải dữ liệu bảng lương.')
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Lỗi kết nối khi tải bảng lương.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayroll()
  }, [month, year, selectedUnit])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchPayroll()
  }

  const handleSubmitPeriod = async () => {
    setActionLoading(true)
    setSuccessMessage(null)
    setErrorMessage(null)
    try {
      const res = await apiClient.payroll.submitPeriod(month, year)
      if (res.ok && res.data) {
        setPeriod(res.data)
        setSuccessMessage('Đã trình Bảng lương lên Ban Giám hiệu phê duyệt thành công!')
        fetchPayroll()
      } else {
        setErrorMessage(res.error || 'Lỗi khi trình duyệt bảng lương.')
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Lỗi khi trình duyệt.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprovePeriod = async () => {
    setActionLoading(true)
    setSuccessMessage(null)
    setErrorMessage(null)
    try {
      const res = await apiClient.payroll.approvePeriod(month, year)
      if (res.ok && res.data) {
        setPeriod(res.data)
        setSuccessMessage('Hiệu trưởng đã phê duyệt & Ký số điện tử PKI cho kỳ lương thành công!')
        fetchPayroll()
      } else {
        setErrorMessage(res.error || 'Lỗi khi phê duyệt bảng lương.')
      }
    } catch (e: any) {
      setErrorMessage(e?.message || 'Lỗi khi phê duyệt.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownloadPayslip = async (empId: string, empCode: string) => {
    try {
      const blob = await apiClient.payroll.exportPayslipPdf(empId, month, year)
      if (blob) {
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Phieu-Luong-${empCode}-T${month}-${year}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (e) {
      console.error('Download payslip error', e)
    }
  }

  const formatVnd = (val: number) => {
    return (val || 0).toLocaleString('vi-VN') + ' đ'
  }

  const unitsList = [
    'ALL',
    'Khoa Kiến trúc',
    'Khoa Xây dựng',
    'Khoa Quy hoạch',
    'Ban Giám hiệu',
  ]

  return (
    <div className="space-y-6 p-6">
      {/* Page Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted mb-1">
            <span>Quản trị Tài chính</span>
            <ChevronRight size={12} />
            <span>Thu nhập & Lương 2 Thành phần</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2.5">
            <Banknote className="text-brand-600" size={26} />
            Bảng Lương Toàn Trường & Quyết Toán Thu Nhập
          </h1>
          <p className="text-xs text-muted mt-1">
            Cơ chế tự chủ đại học: Lương ngạch bậc cơ sở 2.340.000đ, Giờ vượt Studio Kiến trúc & Đánh giá KPI tháng
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-1.5 shadow-xs text-xs">
            <Calendar size={14} className="text-slate-400" />
            <span className="text-slate-500 font-medium">Kỳ lương:</span>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="bg-transparent font-bold text-ink focus:outline-none"
            >
              <option value={8}>Tháng 8</option>
              <option value={9}>Tháng 9</option>
              <option value={10}>Tháng 10</option>
              <option value={11}>Tháng 11</option>
              <option value={12}>Tháng 12</option>
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPayroll(true)}
            disabled={loading || actionLoading}
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Tính toán lại
          </Button>

          {/* Workflow Transitions */}
          {period?.status === 'DRAFT' && (
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

          {period?.status === 'SUBMITTED' && (
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
              onClick={handleApprovePeriod}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
              Ký số PKI Phê duyệt
            </Button>
          )}

          {period?.status === 'APPROVED' && (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-xs">
              <CheckCircle2 size={14} /> Đã Ký số PKI
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
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
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-brand-600 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Tổng chi trả (Gross)
          </span>
          <div className="text-xl font-black text-ink mt-1">
            {formatVnd(period?.totalGrossPayout || 0)}
          </div>
          <p className="text-[11px] text-muted mt-1 flex items-center gap-1">
            <Users size={12} /> {period?.totalEmployees || 0} cán bộ hưởng lương
          </p>
        </Card>

        <Card className="p-4 border-l-4 border-l-emerald-600 shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            Thực lĩnh chuyển khoản (Net)
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
            Trích nộp bảo hiểm (10.5%)
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
            Thuế TNCN tạm khấu trừ
          </span>
          <div className="text-xl font-black text-slate-800 mt-1">
            {formatVnd(period?.totalTaxWithheld || 0)}
          </div>
          <p className="text-[11px] text-muted mt-1">
            Biểu thuế lũy tiến từng phần 7 bậc
          </p>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-line shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted px-2 font-medium">
            <Filter size={14} /> Đơn vị:
          </div>
          {unitsList.map((unit) => (
            <button
              key={unit}
              onClick={() => setSelectedUnit(unit)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                selectedUnit === unit
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {unit === 'ALL' ? 'Tất cả Khoa/Phòng' : unit}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="relative flex items-center">
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã CBGV..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 rounded-xl border border-line bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-ink focus:border-brand-500 focus:bg-white focus:outline-none"
          />
          <Search size={14} className="absolute left-3 text-slate-400" />
        </form>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-line text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-3.5">Cán bộ giảng viên</th>
                <th className="px-4 py-3.5">Đơn vị</th>
                <th className="px-4 py-3.5">Lương ngạch bậc</th>
                <th className="px-4 py-3.5">Phụ cấp nghề (30%)</th>
                <th className="px-4 py-3.5">Chấm công</th>
                <th className="px-4 py-3.5">Thu nhập tăng thêm (KPI/Studio)</th>
                <th className="px-4 py-3.5">Khấu trừ (BH/Thuế)</th>
                <th className="px-4 py-3.5 text-right">Thực lĩnh (Net)</th>
                <th className="px-4 py-3.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted">
                    <Loader2 size={24} className="animate-spin mx-auto text-brand-600 mb-2" />
                    Đang tính toán và kết xuất bảng lương...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-muted">
                    Không tìm thấy dữ liệu bảng lương phù hợp.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.employeeId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink text-[13px]">
                        {item.employeeName}
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted">
                        <span>{item.employeeCode}</span>
                        {item.positionName && <span>&bull; {item.positionName}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.departmentName}</td>
                    <td className="px-4 py-3 font-mono">
                      <div>{formatVnd(item.baseSalary)}</div>
                      <span className="text-[10px] text-muted">
                        Hệ số {item.salaryCoefficient}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {formatVnd(item.pedagogicalAllowance)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-slate-700">
                        {item.actualWorkDays}/{item.standardWorkDays} ngày
                      </div>
                      {item.unpaidLeaveDays > 0 ? (
                        <span className="text-[10px] text-red-600 font-semibold">
                          Trừ {item.unpaidLeaveDays} ngày (-{formatVnd(item.workDaysDeduction)})
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-600">Đủ công chuẩn</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-brand-700 font-semibold">
                        +{formatVnd(item.kpiExtraIncome + item.overtimeTeachingPay)}
                      </div>
                      <div className="text-[10px] text-muted flex items-center gap-1">
                        <Badge tone={item.kpiRanking === 'A' ? 'success' : 'info'} className="text-[9px] py-0">
                          KPI: {item.kpiRanking} ({item.kpiBonusCoefficient}x)
                        </Badge>
                        {item.overtimeTeachingHours > 0 && (
                          <span>&bull; {item.overtimeTeachingHours}h studio</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      <div>BH: -{formatVnd(item.totalInsurance)}</div>
                      <div className="text-[11px] text-slate-400">
                        Thuế: -{formatVnd(item.personalIncomeTax)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="font-mono font-black text-[13px] text-emerald-700">
                        {formatVnd(item.netSalary)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedEmployeeId(item.employeeId)}
                          title="Xem chi tiết phiếu lương"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-ink transition-colors"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => handleDownloadPayslip(item.employeeId, item.employeeCode)}
                          title="Tải PDF Phiếu lương"
                          className="rounded-lg p-1.5 text-brand-600 hover:bg-brand-50 hover:text-brand-800 transition-colors"
                        >
                          <Download size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal View Detail if Selected */}
      {selectedEmployeeId && (
        <PayslipModal onClose={() => setSelectedEmployeeId(null)} />
      )}
    </div>
  )
}
