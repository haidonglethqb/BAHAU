'use client'

import { useEffect, useState } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react'
import { type LeaveRequest } from '../data'
import { Badge, Button, Card, cx, Tabs } from './ui'
import { useAuth } from '../context/AuthContext'

const STEPS = ['Đã nộp đơn', 'Trưởng khoa duyệt', 'Phòng TCHC xác nhận', 'Hoàn thành']
const STEP_INDEX: Record<LeaveRequest['status'], number> = {
  submitted: 0,
  approving: 1,
  confirming: 2,
  done: 3,
  rejected: 1,
}

const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: 'Nghỉ phép năm',
  SICK: 'Nghỉ ốm / điều trị',
  MATERNITY: 'Nghỉ thai sản',
  UNPAID: 'Nghỉ việc riêng không hưởng lương',
  BEREAVEMENT: 'Nghỉ hiếu',
  WEDDING: 'Nghỉ hỷ',
  ACADEMIC: 'Đi công tác / Học thuật',
}

function getVnDateStr(offsetDays = 0): string {
  const target = new Date(Date.now() + offsetDays * 86_400_000)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(target)
}

function formatVnDateTime(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

async function authFetchJson(url: string, init: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) || {}),
  }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('bahau_session_id')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  const res = await fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  })
  const json = await res.json().catch(() => null)
  if (!res.ok || json?.success === false) {
    const code = json?.error?.code ? `[${json.error.code}] ` : ''
    const msg = json?.error?.message || `Yêu cầu thất bại (HTTP ${res.status})`
    throw new Error(`${code}${msg}`)
  }
  return json
}

function mapBackendLeaveStatus(status: string): LeaveRequest['status'] {
  switch (status) {
    case 'APPROVED':
      return 'done'
    case 'REJECTED':
    case 'RETURNED':
    case 'CANCELLED':
      return 'rejected'
    case 'PENDING':
    default:
      return 'approving'
  }
}

interface LeaveItem extends LeaveRequest {
  rawStatus?: string
}

interface PendingApprovalItem {
  id: string
  stepId: string
  module: string
  requesterCode: string
  requesterName: string
  position: string
  unit: string
  type: string
  from: string
  to: string
  days: number
  reason: string
  substitute: string
  submittedAt: string
  status: 'DEAN_PENDING' | 'HR_PENDING' | 'RECTOR_PENDING'
}

export function Leave() {
  const { user } = useAuth()
  const role = user?.role || 'LECTURER'

  const [modal, setModal] = useState(false)
  const [modalType, setModalType] = useState<'leave' | 'trip'>('leave')
  const [requests, setRequests] = useState<LeaveItem[]>([])
  const [deanPending, setDeanPending] = useState<PendingApprovalItem[]>([])
  const [hrPending, setHrPending] = useState<PendingApprovalItem[]>([])
  const [rectorPending, setRectorPending] = useState<PendingApprovalItem[]>([])

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (role === 'DEAN') return 'dept_approvals'
    if (role === 'HR_SPECIALIST') return 'hr_confirm'
    if (role === 'RECTOR') return 'rector_approvals'
    return 'my_requests'
  })

  const [balance, setBalance] = useState({
    remaining: 0,
    carriedForward: 0,
    used: 0,
    pendingHold: 0,
  })
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionStepId, setActionStepId] = useState<string | null>(null)
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [errorToast, setErrorToast] = useState<string | null>(null)

  // Keep active tab in sync if user changes role via switcher
  useEffect(() => {
    if (role === 'DEAN' && activeTab === 'my_requests') {
      setActiveTab('dept_approvals')
    } else if (role === 'HR_SPECIALIST' && activeTab === 'my_requests') {
      setActiveTab('hr_confirm')
    } else if (role === 'RECTOR' && activeTab === 'my_requests') {
      setActiveTab('rector_approvals')
    } else if (role === 'LECTURER') {
      setActiveTab('my_requests')
    }
  }, [role])

  const loadData = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const [balRes, reqRes, pendingRes] = await Promise.allSettled([
        authFetchJson('/api/v1/leave/balance/my'),
        authFetchJson('/api/v1/leave/requests/my'),
        role === 'DEAN' || role === 'HR_SPECIALIST' || role === 'RECTOR'
          ? authFetchJson('/api/v1/workflow/pending')
          : Promise.resolve({ data: [] }),
      ])

      if (balRes.status === 'fulfilled' && balRes.value?.data) {
        const b = balRes.value.data
        setBalance({
          remaining: Number(b.remaining ?? 0),
          carriedForward: Number(b.carriedForward ?? 0),
          used: Number(b.used ?? 0),
          pendingHold: Number(b.pendingHold ?? 0),
        })
      } else {
        setBalance({ remaining: 0, carriedForward: 0, used: 0, pendingHold: 0 })
      }

      if (reqRes.status === 'fulfilled' && Array.isArray(reqRes.value?.data)) {
        const mapped: LeaveItem[] = reqRes.value.data.map((r: any) => ({
          id: r.id,
          requester: r.employeeName || user?.fullName || 'Cá nhân',
          position: user?.title || 'CBGV',
          unit: user?.unitName || 'Đơn vị',
          type: LEAVE_TYPE_LABELS[r.leaveType] || r.leaveType || 'Nghỉ phép',
          from: r.startDate,
          to: r.endDate,
          days: Number(r.totalDays ?? 0),
          reason: r.reason || '',
          substitute: r.substituteEmployeeName || '—',
          substituteOk: true,
          status: mapBackendLeaveStatus(r.status),
          rawStatus: r.status,
        }))
        setRequests(mapped)
      } else {
        setRequests([])
        if (reqRes.status === 'rejected') {
          setLoadError(reqRes.reason?.message || 'Không thể tải danh sách đơn nghỉ phép.')
        }
      }

      if (pendingRes.status === 'fulfilled' && Array.isArray(pendingRes.value?.data)) {
        const mappedPending: PendingApprovalItem[] = pendingRes.value.data
          .filter((t: any) => t.module === 'LEAVE' || t.module === 'BUSINESS_TRIP')
          .map((t: any) => ({
            id: String(t.recordId || t.stepId).slice(0, 8).toUpperCase(),
            stepId: t.stepId,
            module: t.module,
            requesterCode: t.requesterCode || '—',
            requesterName: t.requesterName || 'Cán bộ',
            position: t.stepName || 'CBGV',
            unit: t.module === 'BUSINESS_TRIP' ? 'Công tác' : 'Nghỉ phép',
            type: t.module === 'BUSINESS_TRIP' ? 'Công tác' : 'Nghỉ phép',
            from: '—',
            to: '—',
            days: 0,
            reason: t.summary || 'Đề xuất phê duyệt',
            substitute: 'Theo hồ sơ đơn',
            submittedAt: formatVnDateTime(t.createdAt),
            status:
              role === 'HR_SPECIALIST'
                ? 'HR_PENDING'
                : role === 'RECTOR'
                ? 'RECTOR_PENDING'
                : 'DEAN_PENDING',
          }))
        if (role === 'DEAN') setDeanPending(mappedPending)
        if (role === 'HR_SPECIALIST') setHrPending(mappedPending)
        if (role === 'RECTOR') setRectorPending(mappedPending)
      }
    } catch (e: any) {
      setLoadError(e?.message || 'Lỗi kết nối máy chủ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [role])

  const handleCreated = async (newReq: LeaveItem) => {
    await loadData()
    setSuccessToast(
      `Đơn ${newReq.id.slice(0, 8).toUpperCase()} đã được gửi thành công và đang chuyển cấp phê duyệt.`
    )
    setTimeout(() => setSuccessToast(null), 6000)
  }

  const handleCancelMyRequest = async (id: string) => {
    try {
      setErrorToast(null)
      await authFetchJson(`/api/v1/leave/requests/${id}/cancel`, { method: 'POST', body: JSON.stringify({}) })
      await loadData()
      setSuccessToast('Đã hủy đơn xin nghỉ phép và hoàn trả số ngày tạm giữ.')
      setTimeout(() => setSuccessToast(null), 5000)
    } catch (e: any) {
      setErrorToast(e?.message || 'Không thể hủy đơn xin nghỉ phép.')
    }
  }

  const handleWorkflowStepAction = async (
    item: PendingApprovalItem,
    action: 'approve' | 'return',
    successMessage: string
  ) => {
    try {
      setActionStepId(item.stepId)
      setErrorToast(null)
      if (action === 'approve') {
        await authFetchJson(`/api/v1/workflow/steps/${item.stepId}/approve`, {
          method: 'POST',
          body: JSON.stringify({ comment: 'Đồng ý phê duyệt' }),
        })
      } else {
        const reason = window.prompt(`Nhập nội dung yêu cầu ${item.requesterName} bổ sung (tối thiểu 3 ký tự):`)
        if (!reason || reason.trim().length < 3) {
          if (reason !== null) {
            setErrorToast('Vui lòng nhập nội dung yêu cầu bổ sung tối thiểu 3 ký tự.')
          }
          return
        }
        await authFetchJson(`/api/v1/workflow/steps/${item.stepId}/return`, {
          method: 'POST',
          body: JSON.stringify({ reason: reason.trim() }),
        })
      }
      setDeanPending((prev) => prev.filter((x) => x.stepId !== item.stepId))
      setHrPending((prev) => prev.filter((x) => x.stepId !== item.stepId))
      setRectorPending((prev) => prev.filter((x) => x.stepId !== item.stepId))
      setSuccessToast(successMessage)
      setTimeout(() => setSuccessToast(null), 5000)
    } catch (e: any) {
      setErrorToast(e?.message || 'Thao tác phê duyệt thất bại.')
    } finally {
      setActionStepId(null)
    }
  }

  const handleDeanApprove = (item: PendingApprovalItem) =>
    handleWorkflowStepAction(
      item,
      'approve',
      `Đã phê duyệt đơn ${item.id} của ${item.requesterName}. Hồ sơ đã chuyển cấp tiếp theo.`
    )

  const handleDeanReject = (item: PendingApprovalItem) =>
    handleWorkflowStepAction(
      item,
      'return',
      `Đã gửi yêu cầu bổ sung thông tin tới ${item.requesterName} (${item.id}).`
    )

  const handleHrConfirm = (item: PendingApprovalItem) =>
    handleWorkflowStepAction(
      item,
      'approve',
      `Đã xác nhận & ghi nhận vào Sổ cái nghỉ phép cho ${item.requesterName} (${item.id}).`
    )

  const handleRectorApprove = (item: PendingApprovalItem) =>
    handleWorkflowStepAction(
      item,
      'approve',
      `Hiệu trưởng đã phê duyệt hồ sơ của ${item.requesterName} (${item.id}).`
    )

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Dynamic Header tailored to role */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-700 border border-brand-200">
              {role === 'LECTURER' && 'Sổ Phép Viên Chức'}
              {role === 'DEAN' && 'Phê Duyệt Cấp Khoa'}
              {role === 'HR_SPECIALIST' && 'Nghiệp Vụ Sổ Phép TCHC'}
              {role === 'RECTOR' && 'Ban Giám Hiệu Phê Duyệt'}
              {role === 'SYSTEM_ADMIN' && 'Giám Sát Workflow'}
            </span>
            <span className="text-xs text-muted">
              {role === 'LECTURER' && `${user?.fullName || 'ThS. Nguyễn Văn An'} · Khoa Kiến trúc`}
              {role === 'DEAN' && `PGS.TS. Trần Thị Bình · Trưởng Khoa Kiến trúc`}
              {role === 'HR_SPECIALIST' && `ThS. Lê Minh Cường · Phòng Tổ chức - Hành chính`}
              {role === 'RECTOR' && `GS.TS. Hoàng Đức Dũng · Hiệu trưởng`}
              {role === 'SYSTEM_ADMIN' && `KS. Phạm Quản Trị · Quản trị hệ thống`}
            </span>
          </div>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            {role === 'LECTURER' && 'Sổ Phép & Đăng Ký Nghỉ Cá Nhân'}
            {role === 'DEAN' && 'Quản Lý & Phê Duyệt Phép — Khoa Kiến Trúc'}
            {role === 'HR_SPECIALIST' && 'Trung Tâm Quản Lý Sổ Phép & Quyết Toán Nghỉ Toàn Trường'}
            {role === 'RECTOR' && 'Giám Sát Hiện Diện & Phê Duyệt Công Tác Ban Giám Hiệu'}
            {role === 'SYSTEM_ADMIN' && 'Giám Sát Động Cơ Quy Trình Nghỉ Phép (Workflow Engine)'}
          </h1>
          <p className="text-xs sm:text-sm text-muted">
            {role === 'LECTURER' && 'Theo dõi số dư ngày phép, đăng ký nghỉ bù/phép năm và theo dõi luồng duyệt điện tử'}
            {role === 'DEAN' && 'Thẩm định hồ sơ nghỉ phép, lịch dạy thay và cử công tác chuyên môn của CBGV Khoa Kiến trúc'}
            {role === 'HR_SPECIALIST' && 'Quyết toán trừ phép, tính công nghỉ không hưởng lương và lưu vết Sổ cái điện tử (Double-Entry Ledger)'}
            {role === 'RECTOR' && 'Phê duyệt các đoàn công tác nước ngoài, hội thảo quốc tế và đơn xin nghỉ của Trưởng đơn vị'}
            {role === 'SYSTEM_ADMIN' && 'Kiểm tra trạng thái máy trạng thái hữu hạn (FSM) và thời gian phản hồi quy trình (SLA)'}
          </p>
        </div>

        {/* Role-specific Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Action for Lecturer & Dean personal */}
          <Button
            variant="outline"
            onClick={() => {
              setModalType('trip')
              setModal(true)
            }}
          >
            <Plus size={15} /> Đăng ký công tác
          </Button>
          <Button
            onClick={() => {
              setModalType('leave')
              setModal(true)
            }}
          >
            <Plus size={15} /> Tạo đơn xin nghỉ phép
          </Button>

          {/* Action for HR */}
          {role === 'HR_SPECIALIST' && (
            <Button
              variant="outline"
              className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-300"
              onClick={() => {
                setSuccessToast('Đã xuất Báo cáo Tổng hợp Sổ phép toàn trường năm học 2025–2026 (Excel).')
                setTimeout(() => setSuccessToast(null), 4000)
              }}
            >
              <Download size={15} /> Xuất Sổ Phép Toàn Trường
            </Button>
          )}
        </div>
      </div>

      {successToast && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="text-xs sm:text-sm font-medium">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-600 hover:text-emerald-900">
            <X size={16} />
          </button>
        </div>
      )}

      {(errorToast || loadError) && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="text-rose-600 shrink-0" />
            <span className="text-xs sm:text-sm font-medium">{errorToast || loadError}</span>
          </div>
          <button
            onClick={() => {
              setErrorToast(null)
              setLoadError(null)
            }}
            className="text-rose-600 hover:text-rose-900"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Role-adaptive Tabs */}
      {role === 'DEAN' && (
        <Tabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'dept_approvals', label: 'Chờ Cấp Khoa Phê Duyệt', count: deanPending.length },
            { id: 'my_requests', label: 'Sổ Phép Cá Nhân Trưởng Khoa', count: requests.length },
            { id: 'dept_stats', label: 'Thống Kê Hiện Diện Khoa Kiến Trúc' },
          ]}
        />
      )}

      {role === 'HR_SPECIALIST' && (
        <Tabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'hr_confirm', label: 'Chờ TCHC Xác Nhận & Trừ Phép', count: hrPending.length },
            { id: 'ledger_all', label: 'Sổ Cái Nghỉ Phép Toàn Trường (Ledger)', count: 428 },
            { id: 'my_requests', label: 'Đơn Cá Nhân Chuyên Viên', count: requests.length },
          ]}
        />
      )}

      {role === 'RECTOR' && (
        <Tabs
          activeTab={activeTab}
          onChange={setActiveTab}
          tabs={[
            { id: 'rector_approvals', label: 'Đoàn Công Tác & Trưởng Đơn Vị Xin Nghỉ', count: rectorPending.length },
            { id: 'rector_overview', label: 'Báo Cáo Tỷ Lệ Vắng Mặt Toàn Trường' },
            { id: 'my_requests', label: 'Lịch Công Tác Của Hiệu Trưởng', count: requests.length },
          ]}
        />
      )}

      {/* VIEW 1: DEAN APPROVALS TAB */}
      {role === 'DEAN' && activeTab === 'dept_approvals' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <Users size={18} className="text-brand-600" />
                Hồ Sơ Nghỉ Phép & Công Tác Của CBGV Khoa Kiến Trúc
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Trưởng khoa kiểm tra tính hợp lệ về lịch giảng dạy thay trước khi chuyển Phòng TCHC
              </p>
            </div>
            <Badge tone="ochre">{deanPending.length} hồ sơ chờ duyệt</Badge>
          </div>

          <div className="space-y-4">
            {deanPending.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-line bg-white p-5 shadow-2xs hover:border-brand-300 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {item.id}
                      </span>
                      <Badge tone={item.type.includes('Công tác') ? 'info' : 'warning'}>{item.type}</Badge>
                      <span className="text-xs text-muted">{item.submittedAt}</span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <h4 className="text-base font-bold text-ink">{item.requesterName}</h4>
                      <span className="text-xs text-muted">({item.requesterCode}) · {item.position}</span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <p>
                        <strong className="text-slate-800">Thời gian nghỉ:</strong> {item.from} → {item.to} (
                        <span className="font-bold text-brand-700">{item.days} ngày</span>)
                      </p>
                      <p>
                        <strong className="text-slate-800">Lý do:</strong> {item.reason}
                      </p>
                      <p className="rounded-lg bg-emerald-50/80 border border-emerald-200 px-3 py-1.5 text-emerald-800 font-medium">
                        ✓ <strong>Bố trí dạy thay:</strong> {item.substitute}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleDeanApprove(item)}
                    >
                      <Check size={14} /> Duyệt chuyển TCHC
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-rose-600 hover:bg-rose-50 border-rose-200"
                      onClick={() => handleDeanReject(item)}
                    >
                      Yêu cầu bổ sung
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {deanPending.length === 0 && (
              <div className="py-12 text-center text-sm text-muted">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                Hiện tại không có hồ sơ nào của Khoa Kiến trúc cần phê duyệt.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* VIEW 2: HR CONFIRMATION TAB */}
      {role === 'HR_SPECIALIST' && activeTab === 'hr_confirm' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <FileCheck size={18} className="text-brand-600" />
                Hồ Sơ Đã Qua Cấp Khoa — Chờ Phòng TCHC Xác Nhận & Cập Nhật Sổ Lương
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Đối soát minh chứng, chốt số ngày trừ phép năm hoặc ghi nhận nghỉ không lương vào kỳ lương tháng 9/2026
              </p>
            </div>
            <Badge tone="ochre">{hrPending.length} hồ sơ chờ chốt</Badge>
          </div>

          <div className="space-y-4">
            {hrPending.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-line bg-white p-5 shadow-2xs hover:border-brand-300 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {item.id}
                      </span>
                      <span className="text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded">
                        {item.unit}
                      </span>
                      <Badge tone="success">Trưởng đơn vị đã ký duyệt</Badge>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <h4 className="text-base font-bold text-ink">{item.requesterName}</h4>
                      <span className="text-xs text-muted">({item.requesterCode}) · {item.position}</span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <p>
                        <strong className="text-slate-800">Loại phép:</strong> {item.type} ({item.days} ngày: {item.from} → {item.to})
                      </p>
                      <p>
                        <strong className="text-slate-800">Lý do:</strong> {item.reason}
                      </p>
                      <p className="text-slate-500">
                        <strong>Người thay thế:</strong> {item.substitute}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-brand-600 hover:bg-brand-700 text-white"
                      onClick={() => handleHrConfirm(item)}
                    >
                      <CheckCircle2 size={14} /> Chốt Trừ Sổ Phép
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSuccessToast(`Đã xuất trích lục quyết định nghỉ phép ${item.id} (PDF).`)
                        setTimeout(() => setSuccessToast(null), 4000)
                      }}
                    >
                      <FileText size={14} /> Trích lục PDF
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {hrPending.length === 0 && (
              <div className="py-12 text-center text-sm text-muted">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                Toàn bộ hồ sơ nghỉ phép đã được chốt và đồng bộ vào Bảng lương NĐ 85!
              </div>
            )}
          </div>
        </Card>
      )}

      {/* VIEW 3: HR LEDGER TAB */}
      {role === 'HR_SPECIALIST' && activeTab === 'ledger_all' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-emerald-600" />
                Sổ Cái Nghỉ Phép Toàn Trường (Double-Entry Leave Ledger 2026)
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Bảo toàn số dư phép nguyên tử, chống ghi đè đồng thời và tự động kết chuyển 31/03 hàng năm
              </p>
            </div>
            <div className="text-xs text-slate-500">
              Tổng quỹ phép: <strong className="text-ink">5.136 ngày</strong> · Đã dùng: <strong className="text-brand-600">642 ngày</strong>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-line text-slate-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Mã CBGV</th>
                  <th className="py-2.5 px-3">Họ và tên</th>
                  <th className="py-2.5 px-3">Đơn vị</th>
                  <th className="py-2.5 px-3">Tiêu chuẩn năm</th>
                  <th className="py-2.5 px-3">Chuyển năm trước</th>
                  <th className="py-2.5 px-3">Đã nghỉ</th>
                  <th className="py-2.5 px-3">Số dư khả dụng</th>
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-slate-700">
                <tr className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-mono font-medium">DAU260001</td>
                  <td className="py-2.5 px-3 font-semibold text-ink">PGS.TS. Trần Thị Bình</td>
                  <td className="py-2.5 px-3">Khoa Kiến trúc</td>
                  <td className="py-2.5 px-3">12 ngày</td>
                  <td className="py-2.5 px-3">3 ngày</td>
                  <td className="py-2.5 px-3">4.5 ngày</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-700">10.5 ngày</td>
                  <td className="py-2.5 px-3 text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs">Xem sổ chi tiết</Button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-mono font-medium">DAU260003</td>
                  <td className="py-2.5 px-3 font-semibold text-ink">ThS. Nguyễn Văn An</td>
                  <td className="py-2.5 px-3">Khoa Kiến trúc</td>
                  <td className="py-2.5 px-3">12 ngày</td>
                  <td className="py-2.5 px-3">2 ngày</td>
                  <td className="py-2.5 px-3">1.5 ngày</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-700">10.5 ngày</td>
                  <td className="py-2.5 px-3 text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs">Xem sổ chi tiết</Button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-mono font-medium">DAU260002</td>
                  <td className="py-2.5 px-3 font-semibold text-ink">TS. Phạm Văn Dũng</td>
                  <td className="py-2.5 px-3">Khoa Xây dựng</td>
                  <td className="py-2.5 px-3">12 ngày</td>
                  <td className="py-2.5 px-3">0 ngày</td>
                  <td className="py-2.5 px-3">3.0 ngày</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-700">9.0 ngày</td>
                  <td className="py-2.5 px-3 text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs">Xem sổ chi tiết</Button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-mono font-medium">DAU260008</td>
                  <td className="py-2.5 px-3 font-semibold text-ink">ThS. Lê Minh Cường</td>
                  <td className="py-2.5 px-3">Phòng TCHC</td>
                  <td className="py-2.5 px-3">12 ngày</td>
                  <td className="py-2.5 px-3">2.5 ngày</td>
                  <td className="py-2.5 px-3">2.0 ngày</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-700">12.5 ngày</td>
                  <td className="py-2.5 px-3 text-right">
                    <Button variant="ghost" size="sm" className="h-7 text-xs">Xem sổ chi tiết</Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* VIEW 4: RECTOR APPROVAL TAB */}
      {role === 'RECTOR' && activeTab === 'rector_approvals' && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div>
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <ShieldCheck size={18} className="text-brand-600" />
                Hồ Sơ Đoàn Ra Nước Ngoài & Đơn Xin Phép Lãnh Đạo Đơn Vị
              </h3>
              <p className="text-xs text-muted mt-0.5">
                Ký số quyết định cử công tác chuyên môn theo quy định quản lý viên chức đại học tự chủ
              </p>
            </div>
            <Badge tone="ochre">{rectorPending.length} hồ sơ chờ ký số</Badge>
          </div>

          <div className="space-y-4">
            {rectorPending.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-line bg-white p-5 shadow-2xs hover:border-brand-300 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {item.id}
                      </span>
                      <Badge tone="info">{item.type}</Badge>
                      <span className="text-xs text-muted">{item.submittedAt}</span>
                    </div>

                    <div className="flex items-baseline gap-2">
                      <h4 className="text-base font-bold text-ink">{item.requesterName}</h4>
                      <span className="text-xs text-muted">({item.requesterCode}) · {item.position} · {item.unit}</span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <p>
                        <strong className="text-slate-800">Thời gian công tác:</strong> {item.from} → {item.to} (
                        <span className="font-bold text-brand-700">{item.days} ngày</span>)
                      </p>
                      <p>
                        <strong className="text-slate-800">Nội dung công tác:</strong> {item.reason}
                      </p>
                      <p className="text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded inline-block">
                        <strong>Ủy quyền điều hành:</strong> {item.substitute}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-brand-600 hover:bg-brand-700 text-white"
                      onClick={() => handleRectorApprove(item)}
                    >
                      <ShieldCheck size={14} /> Ký số QĐ Cử Công Tác
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {rectorPending.length === 0 && (
              <div className="py-12 text-center text-sm text-muted">
                <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                Hiện không có hồ sơ đoàn công tác nào chờ Hiệu trưởng ký số.
              </div>
            )}
          </div>
        </Card>
      )}

      {/* VIEW 5: PERSONAL LEAVE VIEW (MY_REQUESTS) - FOR LECTURER & ALL PERSONAL USE */}
      {(role === 'LECTURER' || activeTab === 'my_requests') && (
        <div className="space-y-6">
          {/* Metric cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Số dư phép năm"
              value={balance.remaining.toFixed(1)}
              unit="/ 12 ngày"
              progress={balance.remaining / 12}
            />
            <Metric
              label="Phép chuyển năm trước"
              value={balance.carriedForward.toFixed(1)}
              unit="ngày"
              tag={<Badge tone="warning">Hết hạn 31/03</Badge>}
            />
            <Metric label="Đã sử dụng" value={balance.used.toFixed(1)} unit="ngày" />
            <Metric
              label="Đơn đang chờ duyệt"
              value={requests.filter((r) => r.status === 'approving' || r.status === 'submitted').length.toString()}
              unit="đơn"
              tag={
                <Badge tone="ochre">
                  <AlertTriangle size={11} /> Cần theo dõi
                </Badge>
              }
            />
          </div>

          {/* My requests list */}
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-ink">Lịch Sử Đơn Từ & Tiến Trình Phê Duyệt</h3>
                <p className="text-xs text-muted">Mỗi đơn từ đều được mã hóa và lưu trữ kiểm toán liên thông 4 bước</p>
              </div>
              {loading && (
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <Loader2 size={13} className="animate-spin text-brand-500" /> Đang đồng bộ...
                </span>
              )}
            </div>

            <div className="space-y-5">
              {requests.map((r) => (
                <div key={r.id} className="rounded-xl border border-line p-4 transition-all hover:border-brand-200">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[13px] font-medium text-slate-500">
                        {r.id.length > 12 ? r.id.substring(0, 8).toUpperCase() : r.id}
                      </span>
                      <Badge tone="info">{r.type}</Badge>
                      <span className="text-[13px] text-muted">
                        {r.from} → {r.to} · {r.days} ngày
                      </span>
                    </div>
                    {r.rawStatus === 'PENDING' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                        onClick={() => handleCancelMyRequest(r.id)}
                      >
                        Hủy đơn
                      </Button>
                    )}
                    {r.status === 'done' ? (
                      <Badge tone="success">Hoàn thành</Badge>
                    ) : r.status === 'rejected' ? (
                      <Badge tone="danger">{r.rawStatus === 'RETURNED' ? 'Yêu cầu bổ sung' : r.rawStatus === 'CANCELLED' ? 'Đã hủy' : 'Đã từ chối'}</Badge>
                    ) : (
                      <Badge tone="warning">Đang xử lý</Badge>
                    )}
                  </div>
                  <Stepper current={STEP_INDEX[r.status] ?? 0} />
                </div>
              ))}
              {requests.length === 0 && (
                <div className="py-10 text-center text-[13px] text-muted">
                  Bạn chưa có đơn xin nghỉ phép hay công tác nào.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Create Modal */}
      {modal && (
        <LeaveModal
          initialType={modalType}
          onClose={() => setModal(false)}
          onSuccess={(newReq) => {
            handleCreated(newReq)
            setModal(false)
          }}
        />
      )}
    </div>
  )
}

function Metric({
  label,
  value,
  unit,
  progress,
  tag,
}: {
  label: string
  value: string
  unit: string
  progress?: number
  tag?: React.ReactNode
}) {
  return (
    <Card className="p-5 transition-shadow duration-150 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07)]">
      <div className="mb-3 flex items-start justify-between">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        {tag}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[32px] font-bold leading-none text-ink">{value}</span>
        <span className="text-[13px] text-muted">{unit}</span>
      </div>
      {progress !== undefined && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
        </div>
      )}
    </Card>
  )
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <div
                className={cx(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                  done && 'bg-[#059669] text-white',
                  active && 'bg-brand-500 text-white ring-4 ring-brand-100',
                  !done && !active && 'border border-line bg-white text-slate-400',
                )}
              >
                {done ? <Check size={13} /> : i + 1}
              </div>
              <span className={cx('hidden text-[12px] sm:inline', active ? 'font-semibold text-ink' : 'text-muted')}>{s}</span>
            </div>
            {i < STEPS.length - 1 && <div className={cx('mx-2 h-px flex-1', i < current ? 'bg-[#059669]' : 'bg-line')} />}
          </div>
        )
      })}
    </div>
  )
}

function LeaveModal({
  initialType,
  onClose,
  onSuccess,
}: {
  initialType: 'leave' | 'trip'
  onClose: () => void
  onSuccess: (req: LeaveItem) => void
}) {
  const [leaveType, setLeaveType] = useState(initialType === 'trip' ? 'ACADEMIC' : 'ANNUAL')
  const [startDate, setStartDate] = useState(() => getVnDateStr(0))
  const [endDate, setEndDate] = useState(() => getVnDateStr(1))
  const [isHalfDay, setIsHalfDay] = useState(false)
  const [reason, setReason] = useState('')
  const [substitute, setSubstitute] = useState('ThS. Võ Hoàng Long — BM Kiến trúc công trình')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const calcDays = () => {
    if (isHalfDay) return 0.5
    const [sy, sm, sd] = startDate.split('-').map(Number)
    const [ey, em, ed] = endDate.split('-').map(Number)
    if (!sy || !sm || !sd || !ey || !em || !ed) return 1
    const d1 = Date.UTC(sy, sm - 1, sd)
    const d2 = Date.UTC(ey, em - 1, ed)
    if (d2 < d1) return 1
    const diff = Math.round((d2 - d1) / 86_400_000) + 1
    return diff > 0 ? diff : 1
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Vui lòng nhập lý do nghỉ phép (tối thiểu 5 ký tự)')
      return
    }

    const effectiveEndDate = isHalfDay ? startDate : endDate
    if (effectiveEndDate < startDate) {
      setError('Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu.')
      return
    }

    const totalDays = calcDays()
    setLoading(true)
    setError(null)

    try {
      const json = await authFetchJson('/api/v1/leave/requests', {
        method: 'POST',
        body: JSON.stringify({
          leaveType,
          startDate,
          endDate: effectiveEndDate,
          totalDays,
          reason: reason.trim(),
        }),
      })

      const created = json?.data
      const newRequest: LeaveItem = {
        id: created?.id || '',
        requester: created?.employeeName || 'Cá nhân',
        position: 'CBGV',
        unit: 'Đơn vị',
        type: LEAVE_TYPE_LABELS[leaveType] || leaveType,
        from: created?.startDate || startDate,
        to: created?.endDate || effectiveEndDate,
        days: Number(created?.totalDays ?? totalDays),
        reason: created?.reason || reason.trim(),
        substitute,
        substituteOk: true,
        status: mapBackendLeaveStatus(created?.status || 'PENDING'),
        rawStatus: created?.status || 'PENDING',
      }

      onSuccess(newRequest)
    } catch (err: any) {
      setError(err?.message || 'Có lỗi khi gửi đơn. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="text-[17px] font-semibold text-ink">
            {initialType === 'trip' ? 'Đăng ký chuyến công tác chuyên môn' : 'Tạo đơn xin nghỉ phép'}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <FormRow label="Loại đơn">
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            >
              <option value="ANNUAL">Nghỉ phép năm</option>
              <option value="UNPAID">Nghỉ việc riêng không hưởng lương</option>
              <option value="SICK">Nghỉ ốm / điều trị</option>
              <option value="ACADEMIC">Đi công tác chuyên môn / Hội thảo</option>
            </select>
          </FormRow>

          <div className="grid grid-cols-2 gap-4">
            <FormRow label="Từ ngày">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full rounded-lg border border-line px-3 py-2.5 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              />
            </FormRow>
            <FormRow label="Đến ngày">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isHalfDay}
                required
                className="w-full rounded-lg border border-line px-3 py-2.5 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 disabled:bg-slate-100"
              />
            </FormRow>
          </div>

          <label className="flex items-center gap-2 text-[13px] text-muted">
            <input
              type="checkbox"
              checked={isHalfDay}
              onChange={(e) => setIsHalfDay(e.target.checked)}
              className="h-4 w-4 rounded border-line accent-[#004b87]"
            />
            Nghỉ nửa ngày (0.5 ngày)
          </label>

          <FormRow label="Người dạy thay / bàn giao">
            <select
              value={substitute}
              onChange={(e) => setSubstitute(e.target.value)}
              className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            >
              <option>ThS. Võ Hoàng Long — BM Kiến trúc công trình</option>
              <option>ThS. Trịnh Lan — BM Quy hoạch</option>
              <option>TS. Nguyễn Hải — BM Kiến trúc công trình</option>
            </select>
          </FormRow>

          <FormRow label="Lý do">
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nêu rõ lý do nghỉ phép hoặc mục đích công tác…"
              className="w-full resize-none rounded-lg border border-line px-3 py-2.5 text-[14px] outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
              required
            />
          </FormRow>

          <FormRow label="Minh chứng đính kèm (nếu có)">
            <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-line bg-slate-50 py-5 text-center cursor-pointer hover:bg-slate-100/70 transition-colors">
              <Upload size={18} className="text-slate-400" />
              <span className="text-[13px] text-muted">Kéo thả tệp hoặc bấm để tải lên</span>
              <span className="font-mono text-[11px] text-slate-400">PDF, JPG · tối đa 5MB</span>
            </div>
          </FormRow>

          <div className="flex items-center justify-between border-t border-line pt-4">
            <span className="text-xs text-muted">
              Tổng số ngày đăng ký: <strong className="text-brand-600">{calcDays()} ngày</strong>
            </span>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={onClose} disabled={loading}>
                Hủy
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Đang gửi...
                  </>
                ) : (
                  <>
                    <CalendarClock size={16} /> Gửi đơn duyệt
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink">{label}</span>
      {children}
    </label>
  )
}
