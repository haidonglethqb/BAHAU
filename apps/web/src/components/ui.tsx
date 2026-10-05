import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export function cx(...c: (string | false | undefined | null)[]) {
  return c.filter(Boolean).join(' ')
}

export const initials = (name: string) =>
  name
    .replace(/^(PGS\.TS\.|GS\.TS\.|TS\.|ThS\.|KS\.|CN\.)\s*/i, '')
    .split(' ')
    .slice(-2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

export function Avatar({
  name,
  size = 36,
  className,
}: {
  name: string
  size?: number
  className?: string
}) {
  return (
    <div
      className={cx(
        'flex shrink-0 items-center justify-center rounded-full bg-brand-500 font-semibold text-white shadow-xs select-none',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
      aria-hidden
    >
      {initials(name)}
    </div>
  )
}

const STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  active: { label: 'Đang công tác', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: '#059669' },
  leave: { label: 'Đang nghỉ phép', cls: 'bg-amber-50 text-amber-800 border-amber-200', dot: '#d97706' },
  terminated: { label: 'Đã nghỉ việc', cls: 'bg-rose-50 text-rose-800 border-rose-200', dot: '#dc2626' },
  probation: { label: 'Đang thử việc', cls: 'bg-blue-50 text-blue-800 border-blue-200', dot: '#2563eb' },
  pending: { label: 'Chờ xử lý', cls: 'bg-amber-50 text-amber-800 border-amber-200', dot: '#d97706' },
}

export function StatusPill({ status }: { status: keyof typeof STATUS | string }) {
  const s = STATUS[status] || STATUS.active
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', s.cls)}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  )
}

export function Badge({
  children,
  tone = 'info',
  className,
}: {
  children: ReactNode
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'ochre' | 'brand'
  className?: string
}) {
  const tones = {
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    ochre: 'bg-amber-50 text-amber-900 border-amber-300 font-semibold',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    brand: 'bg-brand-50 text-brand-700 border-brand-200',
  }
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-tight', tones[tone], className)}>
      {children}
    </span>
  )
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  ...props
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'success' | 'danger-outline' | 'warning-outline' | 'danger'
  size?: 'md' | 'sm' | 'lg' | 'icon'
  loading?: boolean
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variants = {
    primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700 border-transparent shadow-xs',
    secondary: 'bg-slate-100 text-slate-800 hover:bg-slate-200 border-slate-200',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 border-transparent shadow-xs',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 border-transparent shadow-xs',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-transparent',
    outline: 'bg-white text-slate-700 hover:bg-slate-50 border-line shadow-2xs',
    'danger-outline': 'bg-white text-rose-600 hover:bg-rose-50 border-rose-200',
    'warning-outline': 'bg-white text-amber-800 hover:bg-amber-50 border-amber-200',
  }

  const sizes = {
    md: 'px-4 py-2 text-[14px]',
    sm: 'px-3 py-1.5 text-[12px]',
    lg: 'px-5 py-2.5 text-[15px]',
    icon: 'h-9 w-9 p-0',
  }

  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-all duration-150 ease-out cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20 focus-visible:ring-offset-1',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        sizes[size],
        variants[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={15} className="animate-spin text-current shrink-0" />}
      {children}
    </button>
  )
}

export function Card({
  children,
  className,
  ...props
}: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx('rounded-xl border border-line bg-surface shadow-2xs transition-shadow', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('flex flex-col space-y-1.5 p-6 border-b border-line', className)}>{children}</div>
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cx('text-base font-bold leading-none tracking-tight text-ink', className)}>{children}</h3>
}

export function CardDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx('text-xs text-muted', className)}>{children}</p>
}

export function CardContent({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('p-6', className)}>{children}</div>
}

export function StatCard({
  title,
  value,
  subvalue,
  icon,
  trend,
  className,
}: {
  title: string
  value: string | number
  subvalue?: ReactNode
  icon: ReactNode
  trend?: { label: string; tone?: 'success' | 'danger' | 'warning' | 'neutral' }
  className?: string
}) {
  return (
    <Card className={cx('p-5 hover:border-slate-300 transition-colors', className)}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 border border-brand-100">
          {icon}
        </div>
      </div>
      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="text-2xl lg:text-3xl font-extrabold tracking-tight text-ink font-mono">{value}</span>
        {trend && (
          <Badge tone={trend.tone === 'success' ? 'success' : trend.tone === 'danger' ? 'danger' : 'neutral'}>
            {trend.label}
          </Badge>
        )}
      </div>
      {subvalue && <div className="mt-2 text-xs text-muted">{subvalue}</div>}
    </Card>
  )
}

export function Tabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  className,
}: {
  tabs: { id: T; label: string; count?: number; icon?: ReactNode }[]
  activeTab: T
  onChange: (id: T) => void
  className?: string
}) {
  return (
    <div className={cx('flex items-center space-x-1 border-b border-line overflow-x-auto', className)}>
      {tabs.map((tab) => {
        const active = tab.id === activeTab
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={cx(
              'flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px transition-all cursor-pointer whitespace-nowrap',
              active
                ? 'border-brand-500 text-brand-600 font-bold'
                : 'border-transparent text-muted hover:text-ink hover:border-slate-300',
            )}
          >
            {tab.icon && <span className={active ? 'text-brand-500' : 'text-slate-400'}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cx(
                  'rounded-full px-2 py-0.5 text-[10px] font-mono font-bold',
                  active ? 'bg-brand-50 text-brand-600 border border-brand-200' : 'bg-slate-100 text-slate-600',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
