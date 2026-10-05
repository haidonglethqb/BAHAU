'use client'

import { useState } from 'react'
import { ArrowLeft, Building2, Lock, Mail, ShieldCheck } from 'lucide-react'
import { ROLES, type Role } from '../data'
import { Button } from './ui'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'

export function Login({
  onLogin,
  onBack,
}: {
  onLogin?: (r: Role) => void
  onBack?: () => void
}) {
  const router = useRouter()
  const { loginAsRole } = useAuth()
  const [remember, setRemember] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRoleSelect = (roleKey: Role) => {
    loginAsRole(roleKey)
    if (onLogin) {
      onLogin(roleKey)
    } else {
      router.push('/dashboard')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Map email or default to cbgv
    let matchedRole: Role = 'cbgv'
    if (email.includes('rector') || email.includes('dung.hd')) matchedRole = 'hieutruong'
    else if (email.includes('hr') || email.includes('cuong.lm') || email.includes('tchc')) matchedRole = 'tchc'
    else if (email.includes('admin') || email.includes('quantri')) matchedRole = 'admin'
    else if (email.includes('dean') || email.includes('binh.tt') || email.includes('truongkhoa')) matchedRole = 'truongkhoa'

    loginAsRole(matchedRole)
    setTimeout(() => {
      setLoading(false)
      if (onLogin) {
        onLogin(matchedRole)
      } else {
        router.push('/dashboard')
      }
    }, 400)
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
              Nền tảng quản lý nhân sự thông minh cho toàn trường — từ hồ sơ cá nhân đến điều hành cấp Ban Giám hiệu.
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
        <div className="w-full max-w-[420px]">
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
              <h2 className="text-[22px] font-bold text-ink">Đăng nhập hệ thống</h2>
              <p className="mt-1 text-[13px] text-muted">Sử dụng tài khoản công tác (@dau.edu.vn) để tiếp tục.</p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <Field
                label="Email công tác"
                icon={<Mail size={16} />}
                placeholder="hoten@dau.edu.vn"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Field
                label="Mật khẩu"
                icon={<Lock size={16} />}
                placeholder="••••••••"
                type="password"
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

            <div className="mt-7 border-t border-line pt-5">
              <div className="mb-3 font-mono text-[10px] font-bold uppercase tracking-wider text-muted">
                DEMO — ĐĂNG NHẬP NHANH THEO VAI TRÒ
              </div>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleRoleSelect(r.id)}
                    className="rounded-full border border-line bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 transition-colors duration-150 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600 cursor-pointer shadow-2xs"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="mt-6 text-center font-mono text-[11px] text-slate-400">© 2026 DAU · Năm học 2025–2026</p>
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
