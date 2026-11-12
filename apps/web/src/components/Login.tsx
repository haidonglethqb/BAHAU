'use client'

import { useState } from 'react'
import { ArrowLeft, Building2, Lock, Mail, ShieldCheck, UserCheck } from 'lucide-react'
import { type Role } from '../data'
import { Button } from './ui'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'

const DEV_SEED_ACCOUNTS: Array<{ label: string; email: string; uiRole: Role }> = [
  { label: 'Giảng viên (CBGV)', email: 'employee@dau.edu.vn', uiRole: 'cbgv' },
  { label: 'Trưởng đơn vị', email: 'unithead@dau.edu.vn', uiRole: 'truongkhoa' },
  { label: 'Phòng TCHC', email: 'hrspecialist@dau.edu.vn', uiRole: 'tchc' },
  { label: 'Hiệu trưởng', email: 'rector@dau.edu.vn', uiRole: 'hieutruong' },
  { label: 'Admin Hệ thống', email: 'admin@dau.edu.vn', uiRole: 'admin' },
]

function mapToUiRole(role?: string): Role {
  switch (role) {
    case 'DEAN':
      return 'truongkhoa'
    case 'HR_SPECIALIST':
      return 'tchc'
    case 'RECTOR':
      return 'hieutruong'
    case 'SYSTEM_ADMIN':
      return 'admin'
    default:
      return 'cbgv'
  }
}

export function Login({
  onLogin,
  onBack,
}: {
  onLogin?: (r: Role) => void
  onBack?: () => void
}) {
  const router = useRouter()
  const { login } = useAuth()
  const [remember, setRemember] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDevMode = process.env.NODE_ENV !== 'production'

  const handleSelectSeedEmail = (seedEmail: string) => {
    setEmail(seedEmail)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail || !password) {
      setError('Vui lòng nhập đầy đủ Email và Mật khẩu.')
      return
    }

    setLoading(true)
    try {
      const result = await login(trimmedEmail, password)
      if (!result.ok || !result.user) {
        setError(result.error || 'Email hoặc mật khẩu không chính xác.')
        return
      }

      if (onLogin) {
        onLogin(mapToUiRole(result.user.role))
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể kết nối tới máy chủ xác thực.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[45%_55%]">
      {/* Left — Brand Column */}
      <div className="relative hidden overflow-hidden bg-brand-500 lg:block select-none">
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Isometric architectural line-art */}
        <svg className="absolute bottom-0 left-1/2 w-[560px] -translate-x-1/2 text-brand-200/40" viewBox="0 0 400 300" fill="none">
          <g stroke="currentColor" strokeWidth="1.5">
            <path d="M60 220 L200 150 L340 220 L200 290 Z" />
            <path d="M100 200 L100 120 L200 70 L300 120 L300 200" />
            <path d="M100 120 L200 170 L300 120" />
            <path d="M200 170 L200 290" />
            <path d="M140 140 L140 95 M170 155 L170 110 M230 155 L230 110 M260 140 L260 95" />
            <path d="M200 70 L200 30 L240 50" />
          </g>
        </svg>
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
              <Building2 size={22} />
            </div>
            <div>
              <div className="text-[13px] font-medium text-brand-200">Trường Đại học Kiến trúc Đà Nẵng</div>
              <div className="text-[13px] text-white/60">Da Nang Architecture University</div>
            </div>
          </div>
          <div>
            <div className="mb-3 font-mono text-[12px] tracking-widest text-ochre-500 font-bold">
              HỆ THỐNG QUẢN TRỊ NHÂN SỰ
            </div>
            <h1 className="text-[52px] font-bold leading-none tracking-tight">BAHAU</h1>
            <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-brand-100">
              Nền tảng quản lý nhân sự & phân quyền nghiệp vụ chính thức cho toàn trường Đại học Kiến trúc Đà Nẵng.
            </p>
          </div>
          <div className="font-mono text-[13px] tracking-wide text-brand-200 flex items-center gap-2">
            <ShieldCheck size={16} />
            <span>Sáng tạo — Trách nhiệm — Nhân văn</span>
          </div>
        </div>
      </div>

      {/* Right — Form Column */}
      <div className="flex items-center justify-center bg-canvas px-6 py-12">
        <div className="w-full max-w-[440px]">
          {onBack ? (
            <button
              onClick={onBack}
              className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink cursor-pointer"
            >
              <ArrowLeft size={15} /> Về trang chủ
            </button>
          ) : (
            <button
              onClick={() => router.push('/')}
              className="mb-6 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink cursor-pointer"
            >
              <ArrowLeft size={15} /> Về trang chủ
            </button>
          )}

          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-500 text-white">
              <Building2 size={22} />
            </div>
            <span className="text-2xl font-bold text-brand-500">BAHAU</span>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-8 shadow-xs">
            <div className="mb-6">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 ring-1 ring-brand-200">
                <Building2 size={20} className="text-brand-500" />
              </div>
              <h2 className="text-[22px] font-bold text-ink">Đăng nhập tài khoản</h2>
              <p className="mt-1 text-[13px] text-muted">Sử dụng tài khoản công tác (@dau.edu.vn) để xác thực quyền hạn.</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <Field
                label="Email công tác"
                icon={<Mail size={16} />}
                placeholder="hoten@dau.edu.vn"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Field
                label="Mật khẩu"
                icon={<Lock size={16} />}
                placeholder="••••••••"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label className="flex cursor-pointer select-none items-center gap-2 text-[13px] text-muted">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-line accent-[#004b87]"
                />
                Ghi nhớ đăng nhập trên thiết bị này
              </label>
              <Button className="w-full" type="submit" loading={loading}>
                Đăng nhập
              </Button>
            </form>

            {isDevMode && (
              <div className="mt-7 border-t border-line pt-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                    TÀI KHOẢN SEED MÔI TRƯỜNG DEV
                  </span>
                  <span className="text-[10px] text-slate-400">Bấm để điền email</span>
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {DEV_SEED_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => handleSelectSeedEmail(acc.email)}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-left text-xs text-slate-700 transition hover:bg-brand-50 hover:border-brand-200 cursor-pointer"
                    >
                      <div className="truncate">
                        <span className="font-semibold text-slate-800">{acc.label}:</span>{' '}
                        <span className="text-muted">{acc.email}</span>
                      </div>
                      <span className="text-[10px] text-brand-600 font-medium shrink-0 flex items-center gap-0.5">
                        <UserCheck size={11} /> Điền email
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <p className="mt-6 text-center font-mono text-[11px] text-slate-400">© 2026 DAU · Phân quyền Hệ thống Nhân sự</p>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  icon,
  ...props
}: { label: string; icon: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{icon}</span>
        <input
          className="w-full rounded-lg border border-line bg-white py-2.5 pl-9 pr-3 text-[14px] text-ink outline-none transition-colors duration-150 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
          {...props}
        />
      </div>
    </label>
  )
}
