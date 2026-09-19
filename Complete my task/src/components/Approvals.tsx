import { useState } from 'react'
import { CalendarDays, CheckCircle2, Info, ShieldAlert, UserCheck, X } from 'lucide-react'
import { PENDING, type LeaveRequest } from '../data'
import { Avatar, Badge, Button, Card } from './ui'

export function Approvals() {
  const [queue, setQueue] = useState(PENDING)
  const [rejecting, setRejecting] = useState<LeaveRequest | null>(null)

  const act = (id: string) => setQueue((q) => q.filter((r) => r.id !== id))

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-ink">Hộp thư phê duyệt</h1>
          <p className="mt-1 text-[14px] text-muted">Đơn từ của cán bộ trong đơn vị đang chờ bạn xử lý.</p>
        </div>
        <Badge tone="warning">
          <ShieldAlert size={12} /> {queue.length} bước cần xử lý
        </Badge>
      </div>

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
          <p className="text-[13px] text-muted">Không còn đơn nào chờ phê duyệt.</p>
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
                <Button variant="success" onClick={() => act(r.id)}>
                  <CheckCircle2 size={16} /> Phê duyệt
                </Button>
                <Button variant="danger-outline" onClick={() => setRejecting(r)}>
                  <X size={16} /> Từ chối
                </Button>
                <Button variant="warning-outline" onClick={() => act(r.id)}>
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
          onClose={() => setRejecting(null)}
          onConfirm={() => {
            act(rejecting.id)
            setRejecting(null)
          }}
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

function RejectDialog({ request, onClose, onConfirm }: { request: LeaveRequest; onClose: () => void; onConfirm: () => void }) {
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
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="success" className="!bg-[#DC2626] hover:!bg-[#B91C1C]" disabled={!reason.trim()} onClick={onConfirm}>
            Xác nhận từ chối
          </Button>
        </div>
      </div>
    </div>
  )
}
