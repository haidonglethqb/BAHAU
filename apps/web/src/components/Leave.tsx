'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, AlertTriangle, CalendarClock, Check, CheckCircle2, Loader2, Plus, Upload, X } from 'lucide-react'
import { MY_REQUESTS, type LeaveRequest } from '../data'
import { Badge, Button, Card, cx } from './ui'
import apiClient from '../services/api-client'

const STEPS = ['Đã nộp đơn', 'Trưởng khoa duyệt', 'Phòng TCHC xác nhận', 'Hoàn thành']
const STEP_INDEX: Record<LeaveRequest['status'], number> = {
  submitted: 0,
  approving: 1,
  confirming: 2,
  done: 3,
  rejected: 1,
}

export function Leave() {
  const [modal, setModal] = useState(false)
  const [modalType, setModalType] = useState<'leave' | 'trip'>('leave')
  const [requests, setRequests] = useState<LeaveRequest[]>(MY_REQUESTS)
  const [balance, setBalance] = useState({
    remaining: 10.5,
    carriedForward: 2.0,
    used: 1.5,
    pendingHold: 1,
  })
  const [loading, setLoading] = useState(false)
  const [successToast, setSuccessToast] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const [b, r] = await Promise.all([
        apiClient.leave.getMyBalance(),
        apiClient.leave.getMyRequests(),
      ])
      if (b) {
        setBalance({
          remaining: b.remaining ?? 10.5,
          carriedForward: b.carriedForward ?? 2.0,
          used: b.used ?? 1.5,
          pendingHold: b.pendingHold ?? 1,
        })
      }
      if (r && r.length > 0) {
        setRequests(r)
      }
    } catch (e) {
      console.warn('[Leave] Using mock data due to connection', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreated = (newReq: LeaveRequest) => {
    setRequests((prev) => [newReq, ...prev])
    setBalance((prev) => ({
      ...prev,
      used: prev.used + newReq.days,
      remaining: Math.max(0, prev.remaining - newReq.days),
    }))
    setSuccessToast(`Đơn ${newReq.id} đã được gửi thành công và đang chuyển Trưởng khoa phê duyệt.`)
    setTimeout(() => setSuccessToast(null), 6000)
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-ink">Sổ phép & Đăng ký công tác</h1>
          <p className="mt-1 text-[14px] text-muted">Năm học 2025–2026 · Cập nhật trực tiếp từ hệ thống</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setModalType('trip')
              setModal(true)
            }}
          >
            <Plus size={16} /> Đăng ký công tác
          </Button>
          <Button
            onClick={() => {
              setModalType('leave')
              setModal(true)
            }}
          >
            <Plus size={16} /> Tạo đơn xin nghỉ phép
          </Button>
        </div>
      </div>

      {successToast && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span className="text-[13px] font-medium">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-emerald-600 hover:text-emerald-900">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Metric cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      {/* My requests */}
      <Card className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-ink">Đơn từ của tôi</h3>
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
                {r.status === 'done' ? (
                  <Badge tone="success">Hoàn thành</Badge>
                ) : r.status === 'rejected' ? (
                  <Badge tone="danger">Đã từ chối</Badge>
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
  onSuccess: (req: LeaveRequest) => void
}) {
  const [leaveType, setLeaveType] = useState(initialType === 'trip' ? 'ACADEMIC' : 'ANNUAL')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0])
  const [isHalfDay, setIsHalfDay] = useState(false)
  const [reason, setReason] = useState('')
  const [substitute, setSubstitute] = useState('ThS. Võ Hoàng Long — BM Kiến trúc công trình')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const calcDays = () => {
    if (isHalfDay) return 0.5
    const d1 = new Date(startDate).getTime()
    const d2 = new Date(endDate).getTime()
    if (isNaN(d1) || isNaN(d2) || d2 < d1) return 1
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1
    return diff > 0 ? diff : 1
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reason.trim() || reason.length < 5) {
      setError('Vui lòng nhập lý do nghỉ phép (tối thiểu 5 ký tự)')
      return
    }

    const totalDays = calcDays()
    setLoading(true)
    setError(null)

    try {
      const apiRes = await apiClient.leave.createRequest({
        leaveType,
        startDate,
        endDate: isHalfDay ? startDate : endDate,
        totalDays,
        reason,
      })

      const typeLabel =
        leaveType === 'ANNUAL'
          ? 'Nghỉ phép năm'
          : leaveType === 'SICK'
          ? 'Nghỉ ốm'
          : leaveType === 'ACADEMIC'
          ? 'Đi công tác'
          : 'Nghỉ việc riêng'

      const newRequest: LeaveRequest = {
        id: apiRes.ok && apiRes.data?.id ? String(apiRes.data.id).substring(0, 12).toUpperCase() : `DON2026-${Math.floor(1000 + Math.random() * 9000)}`,
        requester: 'ThS. Nguyễn Văn An',
        position: 'Giảng viên',
        unit: 'Khoa Kiến trúc',
        type: typeLabel,
        from: startDate,
        to: isHalfDay ? startDate : endDate,
        days: totalDays,
        reason,
        substitute,
        substituteOk: true,
        status: 'approving',
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
