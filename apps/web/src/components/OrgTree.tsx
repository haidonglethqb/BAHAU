'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, Building2, ChevronDown, ChevronRight, Loader2, RefreshCw } from 'lucide-react'
import apiClient from '../services/api-client'
import { Avatar, cx } from './ui'

export interface UnitTreeNode {
  id: string
  code: string
  name: string
  unitType: 'BOARD' | 'FACULTY' | 'DEPARTMENT' | 'DIVISION' | 'CENTER' | string
  parentId: string | null
  managerEmployeeId: string | null
  managerName?: string | null
  isActive: boolean
  orderIndex: number
  children?: UnitTreeNode[]
}

const LEVEL: Record<string, { label: string; badge: string }> = {
  BOARD: { label: 'Ban Giám hiệu', badge: 'bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]' },
  FACULTY: { label: 'Khoa Đào tạo', badge: 'bg-brand-50 text-brand-600 border-brand-200' },
  DEPARTMENT: { label: 'Phòng Chức năng', badge: 'bg-ochre-50 text-ochre-700 border-[#FDE68A]' },
  DIVISION: { label: 'Bộ môn trực thuộc', badge: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]' },
  CENTER: { label: 'Viện / Trung tâm', badge: 'bg-slate-100 text-slate-600 border-slate-200' },
}

function countTreeNodes(nodes: UnitTreeNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countTreeNodes(node.children || []), 0)
}

export function OrgTree() {
  const [tree, setTree] = useState<UnitTreeNode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTree = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiClient.units.getTree()
      if (res.ok && Array.isArray(res.data)) {
        setTree(res.data)
      } else {
        setTree([])
        setError(res.error || 'Không thể tải sơ đồ cơ cấu tổ chức.')
      }
    } catch (err: any) {
      setTree([])
      setError(err?.message || 'Lỗi kết nối khi tải cây tổ chức.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTree()
  }, [loadTree])

  const totalUnits = useMemo(() => countTreeNodes(tree), [tree])

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold leading-tight text-ink">Cây tổ chức toàn trường</h1>
          <p className="mt-1 text-[14px] text-muted">
            Sơ đồ phân cấp đơn vị trực thuộc · {loading ? 'Đang tải...' : `${totalUnits} đơn vị đang hoạt động`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.values(LEVEL).map((l) => (
            <span key={l.label} className={cx('rounded-md border px-2 py-0.5 text-[11px] font-semibold', l.badge)}>
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-surface py-16 text-center">
          <Loader2 size={28} className="animate-spin text-brand-500" />
          <p className="mt-3 text-xs text-muted">Đang tải dữ liệu sơ đồ tổ chức từ hệ thống...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center">
          <AlertCircle size={24} className="mx-auto text-rose-600" />
          <p className="mt-2 text-sm font-semibold text-rose-800">{error}</p>
          <button
            type="button"
            onClick={loadTree}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-rose-700 border border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer"
          >
            <RefreshCw size={13} /> Thử lại
          </button>
        </div>
      ) : tree.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-12 text-center">
          <Building2 size={28} className="mx-auto text-slate-400" />
          <p className="mt-3 text-sm font-medium text-ink">Chưa có dữ liệu đơn vị tổ chức</p>
          <p className="mt-1 text-xs text-muted">Cơ cấu đơn vị của trường sẽ hiển thị tại đây khi được khởi tạo.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tree.map((root) => (
            <Node key={root.id} node={root} depth={0} />
          ))}
        </div>
      )}
    </div>
  )
}

function Node({ node, depth }: { node: UnitTreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1)
  const hasChildren = Boolean(node.children?.length)
  const levelMeta = LEVEL[node.unitType] || {
    label: node.unitType,
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
  }
  const managerDisplay = node.managerName || 'Chưa phân công trưởng đơn vị'

  return (
    <div className={depth > 0 ? 'ml-4 border-l border-line pl-5 sm:ml-6' : ''}>
      <div className="relative py-2">
        {depth > 0 && <span className="absolute -left-5 top-1/2 h-px w-5 bg-line" />}
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] transition-all duration-150 hover:border-slate-300 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.07)]">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-ink cursor-pointer"
              aria-label={open ? 'Thu gọn đơn vị trực thuộc' : 'Mở rộng đơn vị trực thuộc'}
            >
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="w-6 shrink-0" />
          )}

          <span className="flex h-10 min-w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 px-2 font-mono text-[11px] font-semibold text-slate-600">
            {node.code}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-[14px] font-semibold text-ink">{node.name}</span>
              <span className={cx('rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', levelMeta.badge)}>
                {levelMeta.label}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
              <Avatar name={managerDisplay} size={18} />
              <span>{managerDisplay}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {hasChildren && (
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-600">
                {node.children!.length} đơn vị trực thuộc
              </span>
            )}
          </div>
        </div>
      </div>

      {open && hasChildren && (
        <div>
          {node.children!.map((c) => (
            <Node key={c.id} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
