'use client'

import { useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Banknote,
  BookOpen,
  Building2,
  CalendarCheck,
  ChevronDown,
  FileText,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Plane,
  ScrollText,
  Search,
  ShieldCheck,
  Signal,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth, ROLE_USER_MAP } from '../context/AuthContext'
import type { Role } from '../data'
import { Avatar, Badge, cx } from './ui'
import { NotificationDropdown } from './NotificationDropdown'
import { PayslipModal } from './PayslipModal'
import { ExecutiveResolutionsModal } from './ExecutiveResolutionsModal'

export interface NavItem {
  href: string
  label: string
  icon: ReactNode
  badge?: string
}

export interface NavGroup {
  group: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    group: 'TỔNG QUAN & ĐIỀU HÀNH',
    items: [
      { href: '/dashboard', label: 'Executive Dashboard', icon: <LayoutDashboard size={18} /> },
      { href: '/units', label: 'Cây tổ chức', icon: <Network size={18} /> },
    ],
  },
  {
    group: 'CÁ NHÂN & CÔNG TÁC',
    items: [
      { href: '/profile', label: 'Hồ sơ & CV', icon: <User size={18} /> },
      { href: '/leave', label: 'Sổ phép năm', icon: <Wallet size={18} /> },
      { href: '/attendance', label: 'Chấm công & Quẹt thẻ', icon: <CalendarCheck size={18} /> },
      { href: '/trips', label: 'Lệnh công tác', icon: <Plane size={18} /> },
    ],
  },
  {
    group: 'HỌC THUẬT & CHUYÊN MÔN',
    items: [
      { href: '/workload', label: 'Giờ chuẩn Studio', icon: <BookOpen size={18} /> },
      { href: '/training', label: 'Đào tạo & Chứng chỉ', icon: <GraduationCap size={18} /> },
      { href: '/kpi', label: 'Đánh giá KPI', icon: <TrendingUp size={18} /> },
    ],
  },
  {
    group: 'QUẢN TRỊ & HÀNH CHÍNH',
    items: [
      { href: '/employees', label: 'Danh bạ CBGV', icon: <Users size={18} /> },
      { href: '/contracts', label: 'Hợp đồng lao động', icon: <FileText size={18} /> },
      { href: '/approvals', label: 'Hộp thư phê duyệt', icon: <Inbox size={18} />, badge: 'Inbox' },
      { href: '/ai-assistant', label: 'AI Trợ lý Quy chế', icon: <Sparkles size={18} />, badge: 'AI' },
    ],
  },
]

export function Shell({
  children,
}: {
  children: ReactNode
  role?: Role
  page?: string
  onNavigate?: (p: any) => void
  onRoleChange?: (r: Role) => void
  onLogout?: () => void
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loginAsRole, logout } = useAuth()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [showPayslip, setShowPayslip] = useState(false)
  const [showExecutive, setShowExecutive] = useState(false)

  const currentUser = user || {
    id: 'usr-guest',
    email: 'cbgv@dau.edu.vn',
    fullName: 'Cán bộ Giảng viên DAU',
    role: 'LECTURER',
    roleLabel: 'Giảng viên',
    unitName: 'Khoa Kiến trúc',
    title: 'Giảng viên',
    code: 'DAU260003',
  }

  const handleRoleSelect = (roleKey: Role) => {
    loginAsRole(roleKey)
    setRoleMenuOpen(false)
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[260px_1fr] bg-canvas text-ink antialiased">
      {/* =========================================================================
          DESKTOP SIDEBAR
      ========================================================================= */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-surface md:flex select-none z-30">
        {/* Brand Banner */}
        <Link
          href="/dashboard"
          className="flex h-16 items-center gap-3 border-b border-line px-5 hover:bg-slate-50/70 transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white shadow-xs">
            <Building2 size={19} />
          </div>
          <div className="leading-tight">
            <div className="text-[15px] font-bold text-brand-600 tracking-tight flex items-center gap-1.5">
              <span>BAHAU</span>
              <span className="text-[9px] rounded bg-brand-50 text-brand-700 px-1 py-0.2 border border-brand-200">
                DAU
              </span>
            </div>
            <div className="font-mono text-[10px] text-muted tracking-wide">HRMS & ACADEMIC · 2026</div>
          </div>
        </Link>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.group}>
              <div className="mb-1.5 px-3 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {group.group}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cx(
                        'flex items-center justify-between rounded-lg py-2 px-3 text-[13px] transition-all duration-150 ease-out font-medium',
                        isActive
                          ? 'border-l-4 border-brand-500 bg-brand-50 font-bold text-brand-700 pl-2 shadow-2xs'
                          : 'border-l-4 border-transparent text-muted hover:bg-slate-50 hover:text-ink',
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className={isActive ? 'text-brand-600' : 'text-slate-400'}>{item.icon}</span>
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={cx(
                            'rounded-full px-1.5 py-0.2 text-[10px] font-mono font-semibold',
                            item.badge === 'AI'
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200',
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* System telemetry footer */}
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-muted border border-slate-100">
            <Signal size={13} className="text-emerald-600 shrink-0" />
            <span className="font-mono text-[10px] truncate">API 4000: OK · PostgreSQL 17</span>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          MOBILE DRAWER (SLIDE-OVER)
      ========================================================================= */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-ink/40 backdrop-blur-xs flex">
          <div className="w-72 max-w-[85vw] bg-surface h-full flex flex-col shadow-2xl">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
                  <Building2 size={16} />
                </div>
                <span className="font-bold text-brand-600 text-sm">BAHAU - DAU HRMS</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
              {NAV_GROUPS.map((group) => (
                <div key={group.group}>
                  <div className="mb-1 px-3 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {group.group}
                  </div>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = pathname === item.href
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={cx(
                            'flex items-center justify-between rounded-lg py-2 px-3 text-xs transition-colors',
                            isActive ? 'bg-brand-50 font-bold text-brand-700' : 'text-muted hover:bg-slate-50',
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </nav>
            <div className="border-t border-line p-3">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg"
              >
                <LogOut size={15} /> Đăng xuất
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* =========================================================================
          MAIN COLUMN
      ========================================================================= */}
      <div className="flex min-w-0 flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur lg:px-8 shadow-2xs">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg border border-line text-slate-600 md:hidden hover:bg-slate-50"
              aria-label="Mở danh mục điều hướng"
            >
              <Menu size={18} />
            </button>

            {/* Scope / Role Context Switcher */}
            <div className="relative">
              <button
                onClick={() => {
                  setRoleMenuOpen((v) => !v)
                  setUserMenuOpen(false)
                }}
                className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:bg-slate-50 shadow-2xs"
              >
                <Building2 size={15} className="text-brand-500 shrink-0" />
                <span className="hidden sm:inline font-medium text-slate-700">{currentUser.unitName || 'Đơn vị'}</span>
                <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-bold text-brand-700 border border-brand-200">
                  {currentUser.roleLabel}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {roleMenuOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-line bg-white p-2 shadow-xl z-50">
                  <div className="px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Chuyển đổi vai trò thẩm định (Demo)
                  </div>
                  <div className="mt-1 space-y-1">
                    {(Object.keys(ROLE_USER_MAP) as Role[]).map((rKey) => {
                      const rUser = ROLE_USER_MAP[rKey]
                      const isCurrent = currentUser.roleLabel === rUser.roleLabel
                      return (
                        <button
                          key={rKey}
                          onClick={() => handleRoleSelect(rKey)}
                          className={cx(
                            'flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12px] transition-colors',
                            isCurrent ? 'bg-brand-50 font-bold text-brand-700' : 'hover:bg-slate-50 text-ink',
                          )}
                        >
                          <Avatar name={rUser.fullName} size={26} />
                          <div className="min-w-0 flex-1 leading-tight">
                            <div className="truncate font-semibold">{rUser.roleLabel}</div>
                            <div className="truncate text-[11px] text-muted">
                              {rUser.fullName} · {rUser.unitName}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Action Badges & User Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Actions */}
            <div className="hidden lg:flex items-center gap-1.5">
              <button
                onClick={() => setShowPayslip(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                <Banknote size={14} className="text-emerald-700" />
                <span>Phiếu lương</span>
              </button>
              <button
                onClick={() => setShowExecutive(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                <ScrollText size={14} className="text-amber-700" />
                <span>QĐ NĐ 30</span>
              </button>
            </div>

            {/* Notification Bell Dropdown */}
            <NotificationDropdown />

            {/* User Identity Pill */}
            <div className="relative border-l border-line pl-2 sm:pl-3">
              <button
                onClick={() => {
                  setUserMenuOpen((v) => !v)
                  setRoleMenuOpen(false)
                }}
                className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-slate-100 cursor-pointer"
              >
                <Avatar name={currentUser.fullName} size={32} />
                <div className="hidden text-left leading-tight sm:block">
                  <div className="text-[13px] font-bold text-ink">{currentUser.fullName}</div>
                  <div className="text-[10px] text-muted font-mono">{currentUser.code || 'DAU260003'}</div>
                </div>
                <ChevronDown size={14} className="hidden text-slate-400 sm:block" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-line bg-white p-1.5 shadow-xl z-50">
                  <div className="px-3 py-2 border-b border-line mb-1">
                    <p className="text-xs font-bold text-ink truncate">{currentUser.fullName}</p>
                    <p className="text-[11px] text-muted truncate">{currentUser.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <User size={15} /> Hồ sơ cá nhân
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  >
                    <LogOut size={15} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      {/* Modals */}
      {showPayslip && <PayslipModal onClose={() => setShowPayslip(false)} />}
      {showExecutive && <ExecutiveResolutionsModal onClose={() => setShowExecutive(false)} />}
    </div>
  )
}
