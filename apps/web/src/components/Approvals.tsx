'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Info, Loader2, ShieldAlert, UserCheck, X } from 'lucide-react'
import { PENDING, type LeaveRequest } from '../data'
import { Avatar, Badge, Button, Card } from './ui'
import apiClient from '../services/api-client'

export function Approvals() {
  const [queue, setQueue] = useState<LeaveRequest[]>(PENDING)
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState<LeaveRequest | null>(null)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'danger' } | null>(null)

  const loadPending = async () => {
    try {
      setLoading(true)
      const tasks = await apiClient.workflow.getPending()
      if (tasks && tasks.length > 0) {
        setQueue(tasks)
      }
    } catch (e) {
      console.warn('[Approvals] Fallback to mock data', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPending()
  }, [])

  const handleApprove = async (r: LeaveRequest) => {
    try {
      setActionId(r.id)
      await apiClient.workflow.approveStep(r.id, 'Trưởng khoa đồng ý phê duyệt')
      setQueue((q) => q.filter((item) => item.id !== r.id))
      setToast({
        tone: 'success',
        message: `Đã phê duyệt thành công đơn của ${r.requester}. Đơn đã chuyển tiếp phòng TCHC xử lý.`,
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

  const handleRejectConfirm = async (r: LeaveRequest, reason: string) => {
    try {
      setActionId(r.id)
      await apiClient.workflow.rejectStep(r.id, reason)
      setQueue((q) => q.filter((item) => item.id !== r.id))
      setRejecting(null)
      setToast({
        tone: 'danger',
        message: `Đã từ chối đơn của ${r.requester} kèm lý do phản hồi cho cán bộ.`,
      })
      setTimeout(() => setToast(null), 5000)
    } catch (e: any) {
      setToast({
        tone: 'danger',
        message: e?.message || 'Có lỗi khi từ chối đơn.',
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
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.tone === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
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
          <strong className="font-semibold">Quy tắc chống tự phê duyệt:</strong> Đơn của chính bạn (Trưởng khoa) đã được tự động
          chuyển tiếp lên Ban Giám hiệu phê duyệt và không hiển thị trong hàng đợi này.
        </p>
      </div>

      {queue.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <CheckCircle2 size={32} className="text-[#059669]" />
          <p className="text-[15px] font-semibold text-ink">Đã xử lý xong tất cả đơn từ</p>
          <p className="text-[13px] text-muted">Không còn đơn nào chờ phê duyệt trong đơn vị.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {queue.map((r) => (
            <Card key={r.id} className="p-5 transition-shadow duration-150 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={r.requester} size={44} />
                  <div>
                    <div className="text-[15px] font-semibold text-ink">{r.requester}</div>
                    <div className="text-[13px] text-muted">
                      {r.position} · {r.unit}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-slate-500">{r.id}</span>
                  <Badge tone="warning">Chờ bạn phê duyệt</Badge>
                </div>
              </div>

              <div className="my-4 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-3">
                <Field icon={<CalendarDays size={15} />} label="Thời gian" value={`${r.from} → ${r.to}`} sub={`${r.days} ngày · ${r.type}`} />
                <Field icon={<Info size={15} />} label="Lý do" value={r.reason} />
                <Field
                  icon={<UserCheck size={15} />}
                  label="Người dạy thay"
                  value={r.substitute}
                  sub={r.substituteOk ? 'Đã đồng ý bàn giao' : 'Chưa xác nhận'}
                  subTone={r.substituteOk ? 'ok' : 'warn'}
                />
              </div>

              {/* Conflict check */}
              <div className="mb-4 inline-flex items-center gap-2 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-1.5 text-[12px] font-medium text-[#065F46]">
                <CheckCircle2 size={14} /> Không có trùng lịch giảng dạy đã báo
              </div>

              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                <Button
                  variant="success"
                  disabled={actionId === r.id}
                  onClick={() => handleApprove(r)}
                >
                  {actionId === r.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Phê duyệt
                </Button>
                <Button
                  variant="danger-outline"
                  disabled={actionId === r.id}
                  onClick={() => setRejecting(r)}
                >
                  <X size={16} /> Từ chối
                </Button>
                <Button
                  variant="warning-outline"
                  disabled={actionId === r.id}
                  onClick={() => handleApprove(r)}
                >
                  Yêu cầu bổ sung
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {rejecting && (
        <RejectDialog
          request={rejecting}
          isSubmitting={actionId === rejecting.id}
          onClose={() => setRejecting(null)}
          onConfirm={(reason) => handleRejectConfirm(rejecting, reason)}
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

function RejectDialog({
  request,
  isSubmitting,
  onClose,
  onConfirm,
}: {
  request: LeaveRequest
  isSubmitting?: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 border-b border-line px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FEF2F2] text-[#DC2626]">
            <X size={18} />
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-ink">Từ chối đơn {request.id}</h3>
            <p className="text-[12px] text-muted">Của {request.requester}</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <label className="mb-1.5 block text-[13px] font-medium text-ink">Lý do từ chối (bắt buộc)</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nêu rõ lý do để cán bộ điều chỉnh…"
            className="w-full resize-none rounded-lg border border-line px-3 py-2.5 text-[14px] outline-none placeholder:text-slate-400 focus:border-[#DC2626] focus:ring-2 focus:ring-[#FECACA]"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button
            variant="success"
            className="!bg-[#DC2626] hover:!bg-[#B91C1C]"
            disabled={!reason.trim() || isSubmitting}
            onClick={() => onConfirm(reason)}
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
            Xác nhận từ chối
          </Button>
        </div>
      </div>
    </div>
  )
}
