import { useMemo, useState } from 'react'
import { ArrowRight, Search, Stamp, X } from 'lucide-react'
import { EMPLOYEES, type Employee } from '../data'
import { Avatar, Badge, Button, Card, StatusPill, cx } from './ui'

const UNITS = ['Tất cả đơn vị', 'Khoa Kiến trúc', 'Khoa Xây dựng', 'Khoa CNTT', 'Khoa Mỹ thuật ứng dụng', 'Phòng Đào tạo']
const DEGREES = ['Tất cả học vị', 'PGS.TS', 'TS', 'ThS', 'KS']

export function Employees() {
  const [q, setQ] = useState('')
  const [unit, setUnit] = useState(UNITS[0])
  const [degree, setDegree] = useState(DEGREES[0])
  const [selected, setSelected] = useState<Employee | null>(null)

  const rows = useMemo(
    () =>
      EMPLOYEES.filter(
        (e) =>
          (unit === UNITS[0] || e.unit === unit) &&
          (degree === DEGREES[0] || e.degree === degree) &&
          (q === '' || e.name.toLowerCase().includes(q.toLowerCase()) || e.code.toLowerCase().includes(q.toLowerCase())),
      ),
    [q, unit, degree],
  )

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold leading-tight text-ink">Danh bạ cán bộ giảng viên</h1>
        <p className="mt-1 text-[14px] text-muted">Tra cứu và quản lý hồ sơ nhân sự toàn trường.</p>
      </div>

      {/* Filter bar */}
      <Card className="mb-4 flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên hoặc mã CBGV…"
            className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-[13px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <Select value={unit} onChange={setUnit} options={UNITS} />
        <Select value={degree} onChange={setDegree} options={DEGREES} />
      </Card>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <Th>Mã CBGV</Th>
                <Th>Họ và tên</Th>
                <Th>Đơn vị & Chức vụ</Th>
                <Th>Kiêm nhiệm</Th>
                <Th>Liên hệ</Th>
                <Th>Trạng thái</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.code} className="border-b border-line transition-colors last:border-0 hover:bg-brand-50/40">
                  <Td>
                    <span className="font-mono text-[13px] text-slate-700">{e.code}</span>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <Avatar name={e.name} size={32} />
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-medium text-ink">{e.name}</span>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="text-[13px] font-medium text-ink">{e.unit}</div>
                    <div className="text-[12px] text-muted">{e.position}</div>
                  </Td>
                  <Td>
                    {e.concurrent ? <Badge tone="ochre">{e.concurrent}</Badge> : <span className="text-[12px] text-slate-300">—</span>}
                  </Td>
                  <Td>
                    <div className="font-mono text-[12px] text-slate-600">{e.email}</div>
                    <div className="font-mono text-[12px] text-slate-400">{e.phone}</div>
                  </Td>
                  <Td>
                    <StatusPill status={e.status} />
                  </Td>
                  <Td>
                    <button
                      onClick={() => setSelected(e)}
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-medium text-brand-600 transition-colors hover:border-brand-200 hover:bg-brand-50"
                    >
                      Xem hồ sơ <ArrowRight size={13} />
                    </button>
                  </Td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[13px] text-muted">
                    Không tìm thấy cán bộ phù hợp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && <Drawer employee={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function Drawer({ employee, onClose }: { employee: Employee; onClose: () => void }) {
  const [tab, setTab] = useState(0)
  const tabs = ['Sơ yếu lý lịch', 'Bổ nhiệm', 'Hợp đồng', 'Sổ phép']

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-[540px] flex-col bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideIn .2s ease-out' }}
      >
        <div className="relative bg-brand-500 px-6 pb-5 pt-6 text-white">
          <button onClick={onClose} className="absolute right-4 top-4 rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/10 p-1 ring-1 ring-white/20">
              <Avatar name={employee.name} size={64} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[19px] font-bold">{employee.name}</h2>
                <Stamp size={18} className="text-ochre-500" />
              </div>
              <p className="text-[13px] text-brand-100">
                {employee.position} · {employee.unit}
              </p>
              <p className="mt-1 font-mono text-[12px] text-brand-200">{employee.code}</p>
            </div>
          </div>
        </div>

        <div className="flex border-b border-line px-4">
          {tabs.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className={cx(
                'relative px-3 py-3 text-[13px] font-medium transition-colors',
                tab === i ? 'text-brand-600' : 'text-muted hover:text-ink',
              )}
            >
              {t}
              {tab === i && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-500" />}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 0 && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Item label="Email công tác" value={employee.email} mono />
              <Item label="Số điện thoại" value={employee.phone} mono />
              <Item label="Học vị" value={employee.degree} />
              <Item label="Đơn vị chính" value={employee.unit} />
              <Item label="Địa chỉ" value="566 Núi Thành, Hải Châu, Đà Nẵng" full />
            </dl>
          )}
          {tab === 1 && (
            <ol className="relative space-y-5 border-l border-line pl-5">
              {[
                { y: '2023', t: employee.position, d: 'QĐ số 214/QĐ-DAU' },
                { y: '2020', t: 'Giảng viên', d: 'QĐ số 118/QĐ-DAU' },
              ].map((e) => (
                <li key={e.y} className="relative">
                  <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500 ring-1 ring-brand-200" />
                  <div className="font-mono text-[12px] text-ochre-500">{e.y}</div>
                  <div className="text-[14px] font-semibold text-ink">{e.t}</div>
                  <div className="text-[12px] text-muted">{e.d}</div>
                  {employee.concurrent && e.y === '2023' && <Badge tone="ochre">{employee.concurrent}</Badge>}
                </li>
              ))}
            </ol>
          )}
          {tab === 2 && (
            <div className="space-y-4">
              <Item label="Loại hợp đồng" value="Hợp đồng không xác định thời hạn" />
              <Item label="Hệ số lương" value="4.98 (bậc 5/8)" mono />
              <Item label="Ngày hiệu lực" value="01/09/2023" mono />
              <Badge tone="success">Đang hiệu lực</Badge>
            </div>
          )}
          {tab === 3 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-line p-3">
                <span className="text-[13px] text-muted">Số dư phép năm 2026</span>
                <span className="text-[15px] font-bold text-ink">9.0 / 12 ngày</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-line p-3">
                <span className="text-[13px] text-muted">Đơn gần nhất</span>
                <Badge tone="success">Đã duyệt · 02/09</Badge>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Button>Chỉnh sửa hồ sơ</Button>
        </div>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(24px); opacity: .6 } to { transform: translateX(0); opacity: 1 } }`}</style>
    </div>
  )
}

function Item({ label, value, mono, full }: { label: string; value: string; mono?: boolean; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className={cx('text-[14px] font-medium text-ink', mono && 'font-mono text-[13px]')}>{value}</dd>
    </div>
  )
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
    >
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  )
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 font-semibold">{children}</th>
}
function Td({ children }: { children?: React.ReactNode }) {
  return <td className="px-4 py-3 align-middle">{children}</td>
}
