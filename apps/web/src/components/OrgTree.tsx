import { useState } from 'react'
import { ChevronDown, ChevronRight, Users } from 'lucide-react'
import { ORG, type OrgNode } from '../data'
import { Avatar, Card, cx } from './ui'

const LEVEL: Record<OrgNode['level'], { label: string; badge: string }> = {
  bgh: { label: 'Ban Giám hiệu', badge: 'bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]' },
  khoa: { label: 'Khoa Đào tạo', badge: 'bg-brand-50 text-brand-600 border-brand-200' },
  phong: { label: 'Phòng Chức năng', badge: 'bg-ochre-50 text-ochre-700 border-[#FDE68A]' },
  bomon: { label: 'Bộ môn trực thuộc', badge: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]' },
  vien: { label: 'Viện / Trung tâm', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
}

export function OrgTree() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-ink">Cây tổ chức toàn trường</h1>
          <p className="mt-1 text-[14px] text-muted">Sơ đồ phân cấp đơn vị · 486 CBGV · Năm học 2025–2026</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.values(LEVEL).map((l) => (
            <span key={l.label} className={cx('rounded-md border px-2 py-0.5 text-[11px] font-semibold', l.badge)}>
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <Node node={ORG} depth={0} />
    </div>
  )
}

function Node({ node, depth }: { node: OrgNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1)
  const hasChildren = !!node.children?.length
  const l = LEVEL[node.level]

  return (
    <div className={depth > 0 ? 'ml-4 border-l border-line pl-5 sm:ml-6' : ''}>
      <div className="relative py-2">
        {depth > 0 && <span className="absolute -left-5 top-1/2 h-px w-5 bg-line" />}
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] transition-all duration-150 hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07)]">
          {hasChildren ? (
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink"
            >
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="w-6 shrink-0" />
          )}

          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 font-mono text-[12px] font-semibold text-slate-600">
            {node.code}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-[14px] font-semibold text-ink">{node.name}</span>
              <span className={cx('rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', l.badge)}>{l.label}</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
              <Avatar name={node.manager} size={18} />
              {node.manager}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[12px] font-semibold text-brand-600">
              <Users size={13} /> {node.staff} CBGV
            </span>
            {hasChildren && !open && (
              <span className="hidden rounded-full border border-line px-2 py-1 text-[11px] font-medium text-muted sm:inline">
                + {node.children!.length} đơn vị
              </span>
            )}
          </div>
        </div>
      </div>

      {open && hasChildren && <div>{node.children!.map((c) => <Node key={c.code} node={c} depth={depth + 1} />)}</div>}
    </div>
  )
}
