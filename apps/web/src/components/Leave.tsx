import { useState } from 'react'
import { AlertTriangle, CalendarClock, Check, Plus, Upload, X } from 'lucide-react'
import { MY_REQUESTS, type LeaveRequest } from '../data'
import { Badge, Button, Card, cx } from './ui'

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

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-ink">Sổ phép & Đăng ký công tác</h1>
          <p className="mt-1 text-[14px] text-muted">Năm học 2025–2026 · Cập nhật đến hôm nay</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setModal(true)}>
            <Plus size={16} /> Đăng ký công tác
          </Button>
          <Button onClick={() => setModal(true)}>
            <Plus size={16} /> Tạo đơn xin nghỉ phép
          </Button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Số dư phép năm" value="10.5" unit="/ 12 ngày" progress={10.5 / 12} />
        <Metric label="Phép chuyển năm trước" value="2.0" unit="ngày" tag={<Badge tone="warning">Hết hạn 31/03</Badge>} />
        <Metric label="Đã sử dụng" value="1.5" unit="ngày" />
        <Metric
          label="Đơn đang chờ duyệt"
          value="1"
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
        <h3 className="mb-5 text-[16px] font-semibold text-ink">Đơn từ của tôi</h3>
        <div className="space-y-5">
          {MY_REQUESTS.map((r) => (
            <div key={r.id} className="rounded-xl border border-line p-4">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[13px] font-medium text-slate-500">{r.id}</span>
                  <Badge tone="info">{r.type}</Badge>
                  <span className="text-[13px] text-muted">
                    {r.from} → {r.to} · {r.days} ngày
                  </span>
                </div>
                {r.status === 'done' ? <Badge tone="success">Hoàn thành</Badge> : <Badge tone="warning">Đang xử lý</Badge>}
              </div>
              <Stepper current={STEP_INDEX[r.status]} />
            </div>
          ))}
        </div>
      </Card>

      {modal && <LeaveModal onClose={() => setModal(false)} />}
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
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${progress * 100}%` }} />
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

function LeaveModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="text-[17px] font-semibold text-ink">Tạo đơn xin nghỉ phép</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <FormRow label="Loại đơn">
            <select className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200">
              <option>Nghỉ phép năm</option>
              <option>Nghỉ việc riêng</option>
              <option>Nghỉ ốm / thai sản</option>
              <option>Đi công tác chuyên môn</option>
            </select>
          </FormRow>
          <div className="grid grid-cols-2 gap-4">
            <FormRow label="Từ ngày">
              <input type="date" className="w-full rounded-lg border border-line px-3 py-2.5 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
            </FormRow>
            <FormRow label="Đến ngày">
              <input type="date" className="w-full rounded-lg border border-line px-3 py-2.5 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200" />
            </FormRow>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-muted">
            <input type="checkbox" className="h-4 w-4 rounded border-line accent-[#004b87]" />
            Nghỉ nửa ngày (0.5)
          </label>
          <FormRow label="Người dạy thay / bàn giao">
            <select className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[14px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200">
              <option>ThS. Võ Hoàng Long — BM Kiến trúc công trình</option>
              <option>ThS. Trịnh Lan — BM Quy hoạch</option>
            </select>
          </FormRow>
          <FormRow label="Lý do">
            <textarea
              rows={2}
              placeholder="Nêu rõ lý do nghỉ phép…"
              className="w-full resize-none rounded-lg border border-line px-3 py-2.5 text-[14px] outline-none placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
            />
          </FormRow>
          <FormRow label="Minh chứng đính kèm">
            <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-line bg-slate-50 py-6 text-center">
              <Upload size={20} className="text-slate-400" />
              <span className="text-[13px] text-muted">Kéo thả tệp hoặc bấm để tải lên</span>
              <span className="font-mono text-[11px] text-slate-400">PDF, JPG · tối đa 5MB</span>
            </div>
          </FormRow>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button onClick={onClose}>
            <CalendarClock size={16} /> Gửi đơn duyệt
          </Button>
        </div>
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
