'use client'

import { useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell,
  Building2,
  ChevronDown,
  FileText,
  Inbox,
  LogOut,
  Network,
  Search,
  Signal,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { ROLES, type Role } from '../data'
import { Avatar, cx } from './ui'

export type Page = 'profile' | 'leave' | 'inbox' | 'org' | 'employees' | 'contracts'

const PAGE_TO_ROUTE: Record<Page, string> = {
  profile: '/profile',
  leave: '/leave',
  inbox: '/approvals',
  org: '/units',
  employees: '/employees',
  contracts: '/contracts',
}

const ROUTE_TO_PAGE: Record<string, Page> = {
  '/profile': 'profile',
  '/leave': 'leave',
  '/approvals': 'inbox',
  '/units': 'org',
  '/employees': 'employees',
  '/contracts': 'contracts',
}

const NAV: { group: string; items: { id: Page; label: string; icon: ReactNode }[] }[] = [
  {
    group: 'CÁ NHÂN',
    items: [
      { id: 'profile', label: 'Hồ sơ & CV', icon: <User size={18} /> },
      { id: 'leave', label: 'Sổ phép 2026', icon: <Wallet size={18} /> },
    ],
  },
  {
    group: 'QUẢN LÝ ĐƠN VỊ',
    items: [{ id: 'inbox', label: 'Hộp thư duyệt', icon: <Inbox size={18} /> }],
  },
  {
    group: 'QUẢN TRỊ NHÀ TRƯỜNG',
    items: [
      { id: 'org', label: 'Cây tổ chức', icon: <Network size={18} /> },
      { id: 'employees', label: 'Danh bạ CBGV', icon: <Users size={18} /> },
      { id: 'contracts', label: 'Hợp đồng lao động', icon: <FileText size={18} /> },
    ],
  },
]

export function Shell({
  role = 'cbgv',
  page,
  onNavigate,
  onRoleChange,
  onLogout,
  children,
}: {
  role?: Role
  page?: Page
  onNavigate?: (p: Page) => void
  onRoleChange?: (r: Role) => void
  onLogout?: () => void
  children: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  // Resolve active page: prioritize explicit page prop, fallback to matching pathname
  const activePage = page || ROUTE_TO_PAGE[pathname] || 'profile'

  const [currentRole, setCurrentRole] = useState<Role>(role)
  const activeRole = role || currentRole
  const me = ROLES.find((r) => r.id === activeRole) || ROLES[0]

  const handleNavClick = (id: Page) => {
    if (onNavigate) {
      onNavigate(id)
    } else {
      router.push(PAGE_TO_ROUTE[id] || '/')
    }
  }

  const handleRoleSelect = (r: Role) => {
    setCurrentRole(r)
    onRoleChange?.(r)
  }

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    } else {
      router.push('/')
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[260px_1fr] bg-canvas">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface md:flex select-none z-30">
        <div
          onClick={() => (onNavigate ? onNavigate('profile') : router.push('/'))}
          className="flex h-16 items-center gap-2.5 border-b border-line px-5 cursor-pointer hover:bg-slate-50/70 transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white shadow-xs">
            <Building2 size={18} />
          </div>
          <div className="leading-tight">
            <div className="text-[16px] font-bold text-brand-500 tracking-tight">BAHAU</div>
            <div className="font-mono text-[10px] tracking-wide text-slate-400">DAU HRMS · 2025–2026</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          {NAV.map((section) => (
            <div key={section.group} className="mb-6">
              <div className="mb-2 px-3 font-mono text-[10px] font-semibold tracking-wider text-slate-400">
                {section.group}
              </div>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = item.id === activePage
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={cx(
                        'flex w-full items-center gap-3 rounded-lg py-2 pl-3 pr-3 text-[14px] transition-all duration-150 ease-out text-left',
                        active
                          ? 'border-l-4 border-brand-500 bg-brand-50 pl-2 font-semibold text-brand-600 shadow-2xs'
                          : 'border-l-4 border-transparent font-medium text-muted hover:bg-slate-50 hover:text-ink',
                      )}
                    >
                      <span className={active ? 'text-brand-500' : 'text-slate-400'}>{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-muted">
            <Signal size={14} className="text-[#059669]" />
            <span className="font-mono">API 4000: Online · PostgreSQL 17: Connected</span>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-col">
        <Header
          me={me}
          onLogout={handleLogout}
          onRoleChange={handleRoleSelect}
        />
        <main className="flex-1 px-5 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  )
}

function Header({
  me,
  onLogout,
  onRoleChange,
}: {
  me: (typeof ROLES)[number]
  onLogout: () => void
  onRoleChange?: (r: Role) => void
}) {
  const [menu, setMenu] = useState(false)
  const [roleMenu, setRoleMenu] = useState(false)

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface/90 px-5 backdrop-blur lg:px-8 shadow-xs">
      {/* Unit context switcher */}
      <div className="relative">
        <button
          onClick={() => {
            setRoleMenu((v) => !v)
            setMenu(false)
          }}
          className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-[13px] font-medium text-ink transition-colors duration-150 hover:bg-slate-50"
        >
          <Building2 size={16} className="text-brand-500" />
          <span className="hidden sm:inline">{me.scope}</span>
          <span className="hidden rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-semibold text-brand-600 lg:inline">
            {me.title}
          </span>
          <ChevronDown size={15} className="text-slate-400" />
        </button>

        {roleMenu && onRoleChange && (
          <div className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-line bg-white p-2 shadow-xl z-50">
            <div className="px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Chuyển đổi vai trò & ngữ cảnh
            </div>
            <div className="mt-1 space-y-1">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    onRoleChange(r.id)
                    setRoleMenu(false)
                  }}
                  className={cx(
                    'flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
                    r.id === me.id ? 'bg-brand-50 font-semibold text-brand-600' : 'hover:bg-slate-50 text-ink',
                  )}
                >
                  <Avatar name={r.name} size={24} />
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="truncate">{r.label}</div>
                    <div className="truncate text-[11px] text-muted">{r.name} · {r.scope}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Command palette */}
      <div className="relative ml-1 hidden max-w-md flex-1 md:block">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          placeholder="Tìm nhân sự, đơn vị, đơn từ…"
          className="w-full rounded-lg border border-line bg-canvas py-2 pl-9 pr-16 text-[13px] outline-none transition-colors focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-200"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-line bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-slate-100">
          <Bell size={19} />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-white bg-[#DC2626]" />
        </button>

        <div className="relative">
          <button
            onClick={() => {
              setMenu((v) => !v)
              setRoleMenu(false)
            }}
            className="flex items-center gap-2.5 rounded-lg py-1.5 pl-1.5 pr-2 transition-colors hover:bg-slate-100"
          >
            <Avatar name={me.name} size={34} />
            <div className="hidden text-left leading-tight lg:block">
              <div className="text-[13px] font-semibold text-ink">{me.name}</div>
              <div className="text-[11px] text-muted">{me.title}</div>
            </div>
            <ChevronDown size={15} className="hidden text-slate-400 lg:block" />
          </button>
          {menu && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-line bg-white p-1.5 shadow-lg z-50">
              <button
                onClick={onLogout}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium text-[#DC2626] transition-colors hover:bg-[#FEF2F2]"
              >
                <LogOut size={16} /> Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
