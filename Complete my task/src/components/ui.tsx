import type { ReactNode } from 'react'

export function cx(...c: (string | false | undefined)[]) {
  return c.filter(Boolean).join(' ')
}

const initials = (name: string) =>
  name
    .replace(/^(PGS\.TS\.|GS\.TS\.|TS\.|ThS\.|KS\.)\s*/i, '')
    .split(' ')
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-500 font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  active: { label: 'Đang công tác', cls: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]', dot: '#059669' },
  leave: { label: 'Đang nghỉ phép', cls: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]', dot: '#D97706' },
  terminated: { label: 'Đã nghỉ việc', cls: 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]', dot: '#DC2626' },
}

export function StatusPill({ status }: { status: keyof typeof STATUS }) {
  const s = STATUS[status]
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium', s.cls)}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  )
}

export function Badge({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'ochre' }) {
  const tones = {
    info: 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]',
    success: 'bg-[#ECFDF5] text-[#065F46] border-[#A7F3D0]',
    warning: 'bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]',
    danger: 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]',
    ochre: 'bg-ochre-50 text-ochre-700 border-[#FDE68A]',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  }
  return <span className={cx('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold', tones[tone])}>{children}</span>
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: {
  children: ReactNode
  variant?: 'primary' | 'ghost' | 'outline' | 'success' | 'danger-outline' | 'warning-outline'
  size?: 'md' | 'sm'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 border-transparent',
    success: 'bg-[#059669] text-white hover:bg-[#047857] border-transparent',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 border-transparent',
    outline: 'bg-white text-slate-700 hover:bg-slate-50 border-line',
    'danger-outline': 'bg-white text-[#DC2626] hover:bg-[#FEF2F2] border-[#FECACA]',
    'warning-outline': 'bg-white text-[#92400E] hover:bg-[#FFFBEB] border-[#FDE68A]',
  }
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 focus-visible:ring-offset-1',
        size === 'md' ? 'px-4 py-2.5 text-[14px]' : 'px-3 py-1.5 text-[13px]',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx('rounded-xl border border-line bg-surface shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]', className)}>{children}</div>
  )
}
