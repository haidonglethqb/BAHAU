'use client'

import { useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Activity,
  Award,
  Banknote,
  BookMarked,
  BookOpen,
  Building2,
  CalendarCheck,
  ChevronDown,
  Compass,
  FileText,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  Lock,
  LogIn,
  LogOut,
  Menu,
  Network,
  Plane,
  ScrollText,
  Signal,
  Sparkles,
  TrendingUp,
  User,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../data'
import { Avatar, cx } from './ui'
import { NotificationDropdown } from './NotificationDropdown'
import { PayslipModal } from './PayslipModal'
import { ExecutiveResolutionsModal } from './ExecutiveResolutionsModal'

export interface NavItem {
  href: string
  label: string
  icon: ReactNode
  badge?: string
  allowedRoles?: string[]
}

export interface NavGroup {
  group: string
  items: NavItem[]
}

const ROLE_NAV_GROUPS: Record<string, NavGroup[]> = {
  LECTURER: [
    {
      group: 'KHÔNG GIAN NHÂN SỰ CÁ NHÂN',
      items: [
        { href: '/dashboard', label: 'Bàn làm việc cá nhân', icon: <LayoutDashboard size={18} /> },
        { href: '/attendance', label: 'Chấm công của tôi', icon: <CalendarCheck size={18} /> },
        { href: '/leave', label: 'Đơn xin nghỉ phép', icon: <Wallet size={18} /> },
        { href: '/payroll', label: 'Phiếu lương & BHXH', icon: <Banknote size={18} /> },
        { href: '/profile', label: 'Hồ sơ cá nhân', icon: <User size={18} /> },
      ],
    },
  ],
  HR_SPECIALIST: [
    {
      group: 'QUẢN LÝ NHÂN SỰ & NGÀY CÔNG',
      items: [
        { href: '/dashboard', label: 'Tổng quan Nhân sự', icon: <LayoutDashboard size={18} /> },
        { href: '/employees', label: 'Hồ sơ Nhân sự', icon: <Users size={18} /> },
        { href: '/contracts', label: 'Hợp đồng lao động', icon: <FileText size={18} /> },
        { href: '/attendance', label: 'Quản lý Chấm công', icon: <CalendarCheck size={18} /> },
        { href: '/leave', label: 'Duyệt phép & Sổ phép', icon: <Wallet size={18} /> },
      ],
    },
    {
      group: 'TIỀN LƯƠNG & BẢO HIỂM',
      items: [
        { href: '/payroll', label: 'Tính lương & BHXH', icon: <Banknote size={18} /> },
      ],
    },
  ],
  SYSTEM_ADMIN: [
    {
      group: 'ĐIỀU HÀNH & PHÊ DUYỆT',
      items: [
        { href: '/dashboard', label: 'Tổng quan & Quỹ lương', icon: <LayoutDashboard size={18} /> },
        { href: '/payroll', label: 'Phê duyệt Lương & BHXH', icon: <Banknote size={18} /> },
        { href: '/approvals', label: 'Hộp thư Phê duyệt', icon: <Inbox size={18} />, badge: 'Inbox' },
        { href: '/employees', label: 'Danh bạ Nhân sự', icon: <Users size={18} /> },
      ],
    },
    {
      group: 'QUẢN TRỊ HỆ THỐNG',
      items: [
        { href: '/admin/system', label: 'Hệ thống & Phân quyền', icon: <Activity size={18} />, badge: 'Admin' },
      ],
    },
  ],
}

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
  const { user, loading, isAuthenticated, login, logout, hasRole } = useAuth()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [showPayslip, setShowPayslip] = useState(false)
  const [showExecutive, setShowExecutive] = useState(false)

  const userRole = isAuthenticated && user ? user.role : null

  const handleQuickSwitchRole = async (email: string) => {
    setUserMenuOpen(false)
    await login(email, 'Admin@123456')
  }

  const filteredNavGroups = userRole
    ? ROLE_NAV_GROUPS[userRole] || ROLE_NAV_GROUPS.LECTURER
    : []

  const handleLogout = async () => {
    setUserMenuOpen(false)
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
          href={isAuthenticated ? '/dashboard' : '/'}
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

        {/* Navigation items - Filtered by Authenticated Role */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {loading ? (
            <div className="px-3 py-6 text-center text-xs text-muted">
              Đang tải phiên làm việc...
            </div>
          ) : filteredNavGroups.length === 0 ? (
            <div className="mx-1 rounded-xl border border-line bg-slate-50 p-4 text-center space-y-3">
              <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <Lock size={16} />
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Vui lòng đăng nhập tài khoản @dau.edu.vn để truy cập các phân hệ nội bộ.
              </p>
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition-colors"
              >
                <LogIn size={14} /> Đăng nhập
              </Link>
            </div>
          ) : (
            filteredNavGroups.map((group) => (
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
                                : item.badge === 'K8s'
                                ? 'bg-blue-100 text-blue-700 border border-blue-200'
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
            ))
          )}
        </nav>

        {/* System telemetry footer */}
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-muted border border-slate-100">
            <Signal size={13} className="text-emerald-600 shrink-0" />
            <span className="font-mono text-[10px] truncate">API 4000 · PostgreSQL 17</span>
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
              {filteredNavGroups.length === 0 ? (
                <div className="p-3 text-center">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white"
                  >
                    <LogIn size={14} /> Đăng nhập hệ thống
                  </Link>
                </div>
              ) : (
                filteredNavGroups.map((group) => (
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
                ))
              )}
            </nav>
            {isAuthenticated && (
              <div className="border-t border-line p-3">
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                >
                  <LogOut size={15} /> Đăng xuất
                </button>
              </div>
            )}
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
              className="p-1.5 rounded-lg border border-line text-slate-600 md:hidden hover:bg-slate-50 cursor-pointer"
              aria-label="Mở danh mục điều hướng"
            >
              <Menu size={18} />
            </button>

            {/* Official User Identity / Auth Badge */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] font-semibold text-ink shadow-2xs">
                <Building2 size={15} className="text-brand-500 shrink-0" />
                <span className="hidden sm:inline font-medium text-slate-700">{user.unitName || 'ĐH Kiến trúc Đà Nẵng'}</span>
                <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700 border border-brand-200">
                  {user.roleLabel}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-1.5 text-[12px] font-semibold text-muted shadow-2xs">
                <Lock size={14} className="text-slate-400 shrink-0" />
                <span>Chưa đăng nhập</span>
              </div>
            )}
          </div>

          {/* Quick Action Badges & User Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isAuthenticated && user ? (
              <>
                <div className="hidden lg:flex items-center gap-1.5">
                  <Link
                    href="/checkin"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 text-xs font-bold transition-colors shadow-2xs"
                  >
                    <CalendarCheck size={14} className="text-sky-600" />
                    <span>Trạm Check-in Kiosk</span>
                  </Link>

                  {hasRole('SYSTEM_ADMIN') && (
                    <Link
                      href="/admin/system"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold transition-colors shadow-2xs"
                    >
                      <Activity size={14} className="text-blue-600" />
                      <span>Control Center</span>
                    </Link>
                  )}

                  <button
                    onClick={() => setShowPayslip(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                  >
                    <Banknote size={14} className="text-emerald-700" />
                    <span>Phiếu lương</span>
                  </button>

                  {hasRole(['HR_SPECIALIST', 'RECTOR', 'SYSTEM_ADMIN']) && (
                    <button
                      onClick={() => setShowExecutive(true)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300 text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
                    >
                      <ScrollText size={14} className="text-amber-700" />
                      <span>QĐ NĐ 30</span>
                    </button>
                  )}
                </div>

                <NotificationDropdown />

                {/* User Identity Pill */}
                <div className="relative border-l border-line pl-2 sm:pl-3">
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-slate-100 cursor-pointer"
                  >
                    <Avatar name={user.fullName} size={32} />
                    <div className="hidden text-left leading-tight sm:block">
                      <div className="text-[13px] font-bold text-ink">{user.fullName}</div>
                      <div className="text-[10px] text-muted font-mono">{user.code || user.employeeCode || user.email}</div>
                    </div>
                    <ChevronDown size={14} className="hidden text-slate-400 sm:block" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-line bg-white p-1.5 shadow-xl z-50">
                      <div className="px-3 py-2 border-b border-line mb-1">
                        <p className="text-xs font-bold text-ink truncate">{user.fullName}</p>
                        <p className="text-[11px] text-muted truncate">{user.email}</p>
                        <span className="mt-1 inline-block rounded bg-brand-50 px-1.5 py-0.2 text-[10px] font-bold text-brand-700 border border-brand-200">
                          {user.roleLabel}
                        </span>
                      </div>
                      <div className="px-2 py-1 border-b border-line mb-1">
                        <p className="px-1 pb-1 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          Chuyển nhanh 3 Role cốt lõi
                        </p>
                        {[
                          { label: '1. Nhân sự / Giảng viên', email: 'employee@dau.edu.vn', code: 'LECTURER' },
                          { label: '2. Quản lý NS - Tiền lương', email: 'hrspecialist@dau.edu.vn', code: 'HR_SPECIALIST' },
                          { label: '3. Quản trị & Phê duyệt', email: 'admin@dau.edu.vn', code: 'SYSTEM_ADMIN' },
                        ].map((r) => (
                          <button
                            key={r.code}
                            type="button"
                            onClick={() => handleQuickSwitchRole(r.email)}
                            className={cx(
                              'flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11px] font-medium transition-colors cursor-pointer',
                              user.role === r.code
                                ? 'bg-brand-50 font-bold text-brand-700'
                                : 'text-slate-600 hover:bg-slate-50',
                            )}
                          >
                            <span>{r.label}</span>
                            {user.role === r.code && <span className="text-[9px] text-brand-600">Đang dùng</span>}
                          </button>
                        ))}
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
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition-colors"
              >
                <LogIn size={14} /> Đăng nhập
              </Link>
            )}
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      {/* Modals */}
      {isAuthenticated && showPayslip && <PayslipModal onClose={() => setShowPayslip(false)} />}
      {isAuthenticated && showExecutive && <ExecutiveResolutionsModal onClose={() => setShowExecutive(false)} />}
    </div>
  )
}
