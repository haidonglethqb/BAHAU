'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowRight, Loader2, RefreshCw, Search, Stamp, X } from 'lucide-react'
import { Avatar, Badge, Button, Card, StatusPill, cx } from './ui'

interface ApiEmployee {
  id: string
  employeeCode: string
  fullName: string
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  workEmail: string
  phoneNumber?: string | null
  academicTitle: 'NONE' | 'ASSOCIATE_PROFESSOR' | 'PROFESSOR'
  academicDegree: 'BACHELOR' | 'MASTER' | 'DOCTOR'
  employmentStatus: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'RETIRED'
  hireDate: string
  primaryUnitName?: string | null
  primaryPositionName?: string | null
}

interface EmployeeEventSummary {
  id: string
  eventType: string
  decisionNumber?: string | null
  effectiveDate: string
  toUnitName?: string | null
  toPositionName?: string | null
}

interface EmployeeContractSummary {
  id: string
  contractNumber: string
  contractType: string
  effectiveDate: string
  salaryCoefficient: number
  status: string
}

const DEGREE_OPTIONS: Array<{ value: 'ALL' | ApiEmployee['academicDegree']; label: string }> = [
  { value: 'ALL', label: 'Tất cả học vị' },
  { value: 'DOCTOR', label: 'Tiến sĩ (TS)' },
  { value: 'MASTER', label: 'Thạc sĩ (ThS)' },
  { value: 'BACHELOR', label: 'Cử nhân / Kỹ sư / KTS' },
]

const DEGREE_LABELS: Record<ApiEmployee['academicDegree'], string> = {
  DOCTOR: 'Tiến sĩ',
  MASTER: 'Thạc sĩ',
  BACHELOR: 'Cử nhân / Kỹ sư',
}

const TITLE_LABELS: Record<ApiEmployee['academicTitle'], string> = {
  PROFESSOR: 'Giáo sư',
  ASSOCIATE_PROFESSOR: 'Phó Giáo sư',
  NONE: '',
}

function mapUiStatus(status: ApiEmployee['employmentStatus']): 'active' | 'on_leave' | 'pending' {
  if (status === 'ON_LEAVE') return 'on_leave'
  if (status === 'RESIGNED' || status === 'RETIRED') return 'pending'
  return 'active'
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('bahau_session_id')
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export function Employees() {
  const [data, setData] = useState<ApiEmployee[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [unit, setUnit] = useState('Tất cả đơn vị')
  const [degree, setDegree] = useState<'ALL' | ApiEmployee['academicDegree']>('ALL')
  const [selected, setSelected] = useState<ApiEmployee | null>(null)

  const loadEmployees = useCallback(async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch('/api/v1/employees?page=1&pageSize=100', {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || json?.success === false) {
        setData([])
        setErrorMsg(json?.error?.message || `Không thể tải danh sách cán bộ (HTTP ${res.status}).`)
        return
      }
      setData(Array.isArray(json?.data) ? json.data : [])
    } catch (err) {
      setData([])
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi kết nối máy chủ khi tải danh bạ nhân sự.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEmployees()
  }, [loadEmployees])

  const unitOptions = useMemo(() => {
    const names = Array.from(
      new Set(data.map((e) => e.primaryUnitName).filter((name): name is string => Boolean(name))),
    )
    return ['Tất cả đơn vị', ...names]
  }, [data])

  const rows = useMemo(
    () =>
      data.filter(
        (e) =>
          (unit === 'Tất cả đơn vị' || e.primaryUnitName === unit) &&
          (degree === 'ALL' || e.academicDegree === degree) &&
          (q === '' ||
            e.fullName.toLowerCase().includes(q.toLowerCase()) ||
            e.employeeCode.toLowerCase().includes(q.toLowerCase()) ||
            e.workEmail.toLowerCase().includes(q.toLowerCase())),
      ),
    [data, q, unit, degree],
  )

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-ink">Danh bạ cán bộ giảng viên</h1>
          <p className="mt-1 text-[14px] text-muted">Tra cứu và quản lý hồ sơ nhân sự toàn trường.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadEmployees} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Làm mới
        </Button>
      </div>

      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-800">
          <AlertCircle size={16} className="shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter bar */}
      <Card className="mb-4 flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên, mã CBGV hoặc email…"
            className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-3 text-[13px] outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        >
          {unitOptions.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <select
          value={degree}
          onChange={(e) => setDegree(e.target.value as 'ALL' | ApiEmployee['academicDegree'])}
          className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        >
          {DEGREE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
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
                <Th>Học hàm / Học vị</Th>
                <Th>Liên hệ</Th>
                <Th>Trạng thái</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[13px] text-muted">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 size={15} className="animate-spin text-brand-500" /> Đang tải dữ liệu nhân sự...
                    </span>
                  </td>
                </tr>
              ) : (
                <>
                  {rows.map((e) => {
                    const degreeLabel = DEGREE_LABELS[e.academicDegree] || e.academicDegree
                    const titleLabel = TITLE_LABELS[e.academicTitle]
                    return (
                      <tr key={e.id} className="border-b border-line transition-colors last:border-0 hover:bg-brand-50/40">
                        <Td>
                          <span className="font-mono text-[13px] text-slate-700">{e.employeeCode}</span>
                        </Td>
                        <Td>
                          <div className="flex items-center gap-2.5">
                            <Avatar name={e.fullName} size={32} />
                            <Link
                              href={`/employees/${e.id}`}
                              className="text-[13px] font-medium text-ink hover:text-brand-600 hover:underline"
                            >
                              {e.fullName}
                            </Link>
                          </div>
                        </Td>
                        <Td>
                          <div className="text-[13px] font-medium text-ink">{e.primaryUnitName || '—'}</div>
                          <div className="text-[12px] text-muted">{e.primaryPositionName || 'Giảng viên'}</div>
                        </Td>
                        <Td>
                          <div className="flex flex-wrap gap-1">
                            {titleLabel && <Badge tone="ochre">{titleLabel}</Badge>}
                            <Badge tone="neutral">{degreeLabel}</Badge>
                          </div>
                        </Td>
                        <Td>
                          <div className="font-mono text-[12px] text-slate-600">{e.workEmail}</div>
                          <div className="font-mono text-[12px] text-slate-400">{e.phoneNumber || '—'}</div>
                        </Td>
                        <Td>
                          <StatusPill status={mapUiStatus(e.employmentStatus)} />
                        </Td>
                        <Td>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setSelected(e)}
                              className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-line px-2.5 py-1.5 text-[12px] font-medium text-brand-600 transition-colors hover:border-brand-200 hover:bg-brand-50"
                            >
                              Xem nhanh
                            </button>
                            <Link
                              href={`/employees/${e.id}`}
                              className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg bg-brand-50 px-2.5 py-1.5 text-[12px] font-medium text-brand-700 transition-colors hover:bg-brand-100"
                            >
                              Hồ sơ <ArrowRight size={13} />
                            </Link>
                          </div>
                        </Td>
                      </tr>
                    )
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[13px] text-muted">
                        Không tìm thấy cán bộ phù hợp bộ lọc.
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && <Drawer employee={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

function Drawer({ employee, onClose }: { employee: ApiEmployee; onClose: () => void }) {
  const [tab, setTab] = useState(0)
  const [events, setEvents] = useState<EmployeeEventSummary[]>([])
  const [contracts, setContracts] = useState<EmployeeContractSummary[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const tabs = ['Sơ yếu lý lịch', 'Biến động công tác', 'Hợp đồng']

  useEffect(() => {
    let active = true
    const loadDetails = async () => {
      setDetailLoading(true)
      setDetailError(null)
      try {
        const [evRes, ctRes] = await Promise.all([
          fetch(`/api/v1/employees/${employee.id}/events`, { credentials: 'include', headers: getAuthHeaders() }),
          fetch(`/api/v1/contracts?employeeId=${employee.id}&pageSize=20`, { credentials: 'include', headers: getAuthHeaders() }),
        ])
        const evJson = await evRes.json().catch(() => null)
        const ctJson = await ctRes.json().catch(() => null)
        if (!active) return
        if (evRes.ok && Array.isArray(evJson?.data)) setEvents(evJson.data)
        if (ctRes.ok && Array.isArray(ctJson?.data)) setContracts(ctJson.data)
      } catch {
        if (active) setDetailError('Không thể tải chi tiết bổ nhiệm / hợp đồng.')
      } finally {
        if (active) setDetailLoading(false)
      }
    }
    loadDetails()
    return () => {
      active = false
    }
  }, [employee.id])

  const degreeText = [TITLE_LABELS[employee.academicTitle], DEGREE_LABELS[employee.academicDegree]].filter(Boolean).join(' · ')

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-[540px] flex-col bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideIn .2s ease-out' }}
      >
        <div className="relative bg-brand-500 px-6 pb-5 pt-6 text-white">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-4">
            <div className="rounded-2xl bg-white/10 p-1 ring-1 ring-white/20">
              <Avatar name={employee.fullName} size={64} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[19px] font-bold">{employee.fullName}</h2>
                <Stamp size={18} className="text-ochre-500" />
              </div>
              <p className="text-[13px] text-brand-100">
                {employee.primaryPositionName || 'Giảng viên'} · {employee.primaryUnitName || '—'}
              </p>
              <p className="mt-1 font-mono text-[12px] text-brand-200">{employee.employeeCode}</p>
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
          {detailError && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {detailError}
            </div>
          )}

          {tab === 0 && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
              <Item label="Email công tác" value={employee.workEmail} mono />
              <Item label="Số điện thoại" value={employee.phoneNumber || 'Chưa cập nhật'} mono />
              <Item label="Học hàm / Học vị" value={degreeText || employee.academicDegree} />
              <Item label="Đơn vị chính" value={employee.primaryUnitName || '—'} />
              <Item label="Ngày tuyển dụng" value={employee.hireDate} mono />
              <Item label="Trạng thái" value={employee.employmentStatus} />
            </dl>
          )}
          {tab === 1 && (
            detailLoading ? (
              <p className="text-xs text-muted">Đang tải lịch sử biến động...</p>
            ) : events.length === 0 ? (
              <p className="text-xs text-muted">Chưa có bản ghi biến động công tác.</p>
            ) : (
              <ol className="relative space-y-5 border-l border-line pl-5">
                {events.map((ev) => (
                  <li key={ev.id} className="relative">
                    <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500 ring-1 ring-brand-200" />
                    <div className="font-mono text-[12px] text-ochre-500">{ev.effectiveDate}</div>
                    <div className="text-[14px] font-semibold text-ink">{ev.eventType}</div>
                    <div className="text-[12px] text-muted">
                      {ev.decisionNumber ? `QĐ: ${ev.decisionNumber}` : 'Không có số QĐ'}
                      {ev.toUnitName ? ` · ${ev.toUnitName}` : ''}
                      {ev.toPositionName ? ` (${ev.toPositionName})` : ''}
                    </div>
                  </li>
                ))}
              </ol>
            )
          )}
          {tab === 2 && (
            detailLoading ? (
              <p className="text-xs text-muted">Đang tải hợp đồng...</p>
            ) : contracts.length === 0 ? (
              <p className="text-xs text-muted">Chưa có dữ liệu hợp đồng lao động (hoặc không có quyền xem).</p>
            ) : (
              <div className="space-y-3">
                {contracts.map((c) => (
                  <div key={c.id} className="rounded-lg border border-line p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-ink">{c.contractNumber}</span>
                      <Badge tone={c.status === 'ACTIVE' ? 'success' : 'neutral'}>{c.status}</Badge>
                    </div>
                    <div className="text-xs text-muted">
                      Loại: {c.contractType} · Hệ số: {Number(c.salaryCoefficient).toFixed(2)} · Hiệu lực: {c.effectiveDate}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
          <Link
            href={`/employees/${employee.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Xem &amp; Chỉnh sửa hồ sơ <ArrowRight size={14} />
          </Link>
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

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-4 py-3 font-semibold">{children}</th>
}
function Td({ children }: { children?: React.ReactNode }) {
  return <td className="px-4 py-3 align-middle">{children}</td>
}
