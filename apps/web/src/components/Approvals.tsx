'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Info, Loader2, RotateCcw, ShieldAlert, UserCheck, X } from 'lucide-react'
import { Avatar, Badge, Button, Card } from './ui'

interface PendingWorkflowTask {
  stepId: string
  instanceId: string
  module: string
  recordId: string
  requesterName: string
  requesterCode: string
  stepName: string
  stepIndex: number
  summary: string
  createdAt: string
}

const MODULE_LABELS: Record<string, string> = {
  LEAVE: 'Nghỉ phép',
  BUSINESS_TRIP: 'Công tác',
  ATTENDANCE_ADJUST: 'Giải trình công',
  ATTENDANCE_ADJUSTMENT: 'Giải trình công',
  TRAINING: 'Đào tạo & Bồi dưỡng',
  CONTRACT: 'Hợp đồng',
  SALARY_INCREMENT: 'Nâng bậc lương',
}

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('bahau_session_id')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

function formatVnDateTime(iso: string): string {
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

export function Approvals() {
  const [queue, setQueue] = useState<PendingWorkflowTask[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [dialogTarget, setDialogTarget] = useState<{ task: PendingWorkflowTask; mode: 'reject' | 'return' } | null>(null)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' | 'warning' } | null>(null)

  const loadPending = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const res = await fetch('/api/v1/workflow/pending', {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error?.message || `Không thể tải danh sách chờ duyệt (HTTP ${res.status}).`)
      }
      setQueue(Array.isArray(json?.data) ? json.data : [])
    } catch (e: any) {
      setQueue([])
      setLoadError(e?.message || 'Lỗi kết nối khi tải danh sách phê duyệt.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPending()
  }, [])

  const handleApprove = async (task: PendingWorkflowTask) => {
    try {
      setActionId(task.stepId)
      const res = await fetch(`/api/v1/workflow/steps/${task.stepId}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ comment: 'Đồng ý phê duyệt' }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || json?.success === false) {
        const errCode = json?.error?.code ? `[${json.error.code}] ` : ''
        throw new Error(`${errCode}${json?.error?.message || `Không thể phê duyệt (HTTP ${res.status}).`}`)
      }
      setQueue((q) => q.filter((item) => item.stepId !== task.stepId))
      setToast({
        tone: 'success',
        message: `Đã phê duyệt thành công hồ sơ của ${task.requesterName}.`,
      })
      setTimeout(() => setToast(null), 5000)
    } catch (e: any) {
      setToast({
        tone: 'danger',
        message: e?.message || 'Có lỗi khi phê duyệt đơn.',
      })
    } finally {
      setActionId(null)
    }
  }

  const handleActionWithReason = async (task: PendingWorkflowTask, mode: 'reject' | 'return', reason: string) => {
    const trimmed = reason.trim()
    if (trimmed.length < 3) {
      setToast({ tone: 'danger', message: 'Vui lòng nhập lý do tối thiểu 3 ký tự.' })
      return
    }
    try {
      setActionId(task.stepId)
      const endpoint =
        mode === 'reject'
          ? `/api/v1/workflow/steps/${task.stepId}/reject`
          : `/api/v1/workflow/steps/${task.stepId}/return`
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: trimmed }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || json?.success === false) {
        const errCode = json?.error?.code ? `[${json.error.code}] ` : ''
        throw new Error(
          `${errCode}${json?.error?.message || `Thao tác thất bại (HTTP ${res.status}).`}`
        )
      }
      setQueue((q) => q.filter((item) => item.stepId !== task.stepId))
      setDialogTarget(null)
      setToast({
        tone: mode === 'reject' ? 'danger' : 'warning',
        message:
          mode === 'reject'
            ? `Đã từ chối đơn của ${task.requesterName} kèm lý do phản hồi cho cán bộ.`
            : `Đã yêu cầu ${task.requesterName} bổ sung / chỉnh sửa thông tin hồ sơ.`,
      })
      setTimeout(() => setToast(null), 5000)
    } catch (e: any) {
      setToast({
        tone: 'danger',
        message: e?.message || (mode === 'reject' ? 'Có lỗi khi từ chối đơn.' : 'Có lỗi khi yêu cầu bổ sung.'),
      })
    } finally {
      setActionId(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-ink">Hộp thư phê duyệt</h1>
          <p className="mt-1 text-[14px] text-muted">Đơn từ của cán bộ trong đơn vị đang chờ bạn xử lý.</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 size={15} className="animate-spin text-brand-500" />}
          <Badge tone="warning">
            <ShieldAlert size={12} /> {queue.length} bước cần xử lý
          </Badge>
        </div>
      </div>

      {toast && (
        <div
          className={`mb-5 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-[13px] font-medium ${
            toast.tone === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : toast.tone === 'warning'
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.tone === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : toast.tone === 'warning' ? (
              <RotateCcw size={16} className="text-amber-600 shrink-0" />
            ) : (
              <X size={16} className="text-rose-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="hover:opacity-75">
            <X size={15} />
          </button>
        </div>
      )}

      {/* Anti-self-approval banner */}
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] px-4 py-3">
        <Info size={18} className="mt-0.5 shrink-0 text-[#1E40AF]" />
        <p className="text-[13px] leading-relaxed text-[#1E40AF]">
          <strong className="font-semibold">Quy tắc chống tự phê duyệt:</strong> Đơn của chính bạn sẽ tự động
          chuyển tiếp lên cấp thẩm quyền cao hơn phê duyệt và không hiển thị trong hàng đợi này.
        </p>
      </div>

      {loadError ? (
        <Card className="flex flex-col items-center gap-3 py-12 text-center border-rose-200 bg-rose-50/40">
          <ShieldAlert size={30} className="text-rose-600" />
          <p className="text-[15px] font-semibold text-rose-900">Không thể tải hộp thư phê duyệt</p>
          <p className="text-[13px] text-rose-700 max-w-md">{loadError}</p>
          <Button variant="outline" onClick={loadPending}>
            Thử tải lại
          </Button>
        </Card>
      ) : loading ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <Loader2 size={28} className="animate-spin text-brand-500" />
          <p className="text-[14px] text-muted">Đang tải danh sách đơn chờ duyệt...</p>
        </Card>
      ) : queue.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <CheckCircle2 size={32} className="text-[#059669]" />
          <p className="text-[15px] font-semibold text-ink">Đã xử lý xong tất cả đơn từ</p>
          <p className="text-[13px] text-muted">Không còn đơn nào chờ phê duyệt trong đơn vị.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {queue.map((r) => (
            <Card key={r.stepId} className="p-5 transition-shadow duration-150 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={r.requesterName} size={44} />
                  <div>
                    <div className="text-[15px] font-semibold text-ink">{r.requesterName}</div>
                    <div className="text-[13px] text-muted">
                      Mã CBGV: {r.requesterCode || '—'} · Bước {r.stepIndex + 1}: {r.stepName}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-slate-500">{r.recordId.slice(0, 8)}</span>
                  <Badge tone="warning">Chờ bạn phê duyệt</Badge>
                </div>
              </div>

              <div className="my-4 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-3">
                <Field
                  icon={<CalendarDays size={15} />}
                  label="Phân hệ & Ngày gửi"
                  value={MODULE_LABELS[r.module] || r.module}
                  sub={formatVnDateTime(r.createdAt)}
                />
                <Field icon={<Info size={15} />} label="Nội dung đề xuất" value={r.summary || 'Đề xuất phê duyệt'} />
                <Field
                  icon={<UserCheck size={15} />}
                  label="Thẩm quyền xử lý"
                  value={r.stepName}
                  sub={`Hồ sơ #${r.recordId.slice(0, 8)}`}
                />
              </div>

              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                <Button
                  variant="success"
                  disabled={actionId === r.stepId}
                  onClick={() => handleApprove(r)}
                >
                  {actionId === r.stepId ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Phê duyệt
                </Button>
                <Button
                  variant="danger-outline"
                  disabled={actionId === r.stepId}
                  onClick={() => setDialogTarget({ task: r, mode: 'reject' })}
                >
                  <X size={16} /> Từ chối
                </Button>
                <Button
                  variant="warning-outline"
                  disabled={actionId === r.stepId}
                  onClick={() => setDialogTarget({ task: r, mode: 'return' })}
                >
                  <RotateCcw size={15} /> Yêu cầu bổ sung
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {dialogTarget && (
        <ActionReasonDialog
          task={dialogTarget.task}
          mode={dialogTarget.mode}
          isSubmitting={actionId === dialogTarget.task.stepId}
          onClose={() => setDialogTarget(null)}
          onConfirm={(reason) => handleActionWithReason(dialogTarget.task, dialogTarget.mode, reason)}
        />
      )}
    </div>
  )
}

function Field({
  icon,
  label,
  value,
  sub,
  subTone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  subTone?: 'ok' | 'warn'
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {icon} {label}
      </div>
      <div className="text-[13px] font-medium text-ink">{value}</div>
      {sub && (
        <div className={`text-[12px] ${subTone === 'ok' ? 'text-[#059669]' : subTone === 'warn' ? 'text-[#D97706]' : 'text-muted'}`}>
          {sub}
        </div>
      )}
    </div>
  )
}

function ActionReasonDialog({
  task,
  mode,
  isSubmitting,
  onClose,
  onConfirm,
}: {
  task: PendingWorkflowTask
  mode: 'reject' | 'return'
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const isReject = mode === 'reject'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 border-b border-line px-6 py-4">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
              isReject ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {isReject ? <X size={18} /> : <RotateCcw size={18} />}
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-ink">
              {isReject ? `Từ chối đơn #${task.recordId.slice(0, 8)}` : `Yêu cầu bổ sung hồ sơ #${task.recordId.slice(0, 8)}`}
            </h3>
            <p className="text-[12px] text-muted">Của {task.requesterName}</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <label className="mb-1.5 block text-[13px] font-medium text-ink">
            {isReject ? 'Lý do từ chối (tối thiểu 3 ký tự)' : 'Nội dung cần bổ sung / chỉnh sửa (tối thiểu 3 ký tự)'}
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              isReject
                ? 'Nêu rõ lý do từ chối để cán bộ nắm thông tin…'
                : 'Nêu rõ thông tin hoặc minh chứng cần cán bộ bổ sung…'
            }
            className={`w-full resize-none rounded-lg border border-line px-3 py-2.5 text-[14px] outline-none placeholder:text-slate-400 focus:ring-2 ${
              isReject ? 'focus:border-[#DC2626] focus:ring-[#FECACA]' : 'focus:border-amber-500 focus:ring-amber-200'
            }`}
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            variant="success"
            className={isReject ? '!bg-[#DC2626] hover:!bg-[#B91C1C]' : '!bg-amber-600 hover:!bg-amber-700'}
            disabled={reason.trim().length < 3 || isSubmitting}
            onClick={() => onConfirm(reason)}
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {isReject ? 'Xác nhận từ chối' : 'Gửi yêu cầu bổ sung'}
          </Button>
        </div>
      </div>
    </div>
  )
}
