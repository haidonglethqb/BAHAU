import {
  ArrowRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Inbox,
  Layers,
  Network,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'
import { Button } from './ui'

export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="min-h-screen bg-canvas">
      <TopBar onEnter={onEnter} />
      <Hero onEnter={onEnter} />
      <Stats />
      <Workspaces />
      <Features />
      <Showcase />
      <CTA onEnter={onEnter} />
      <Footer />
    </div>
  )
}

function TopBar({ onEnter }: { onEnter: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500 text-white">
            <Building2 size={18} />
          </div>
          <div className="leading-tight">
            <div className="text-[16px] font-bold text-brand-500">BAHAU</div>
            <div className="font-mono text-[10px] tracking-wide text-slate-400">DAU HRMS</div>
          </div>
        </div>
        <nav className="hidden items-center gap-7 text-[14px] font-medium text-muted md:flex">
          <a href="#workspaces" className="transition-colors hover:text-ink">
            Không gian làm việc
          </a>
          <a href="#features" className="transition-colors hover:text-ink">
            Tính năng
          </a>
          <a href="#showcase" className="transition-colors hover:text-ink">
            Giao diện
          </a>
        </nav>
        <Button size="sm" onClick={onEnter}>
          Đăng nhập <ArrowRight size={15} />
        </Button>
      </div>
    </header>
  )
}

function Hero({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-brand-500 text-white">
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }}
      />
      <svg className="absolute -right-20 bottom-0 hidden w-[640px] text-brand-200/25 lg:block" viewBox="0 0 400 300" fill="none">
        <g stroke="currentColor" strokeWidth="1.5">
          <path d="M60 220 L200 150 L340 220 L200 290 Z" />
          <path d="M100 200 L100 120 L200 70 L300 120 L300 200" />
          <path d="M100 120 L200 170 L300 120" />
          <path d="M200 170 L200 290" />
          <path d="M140 140 L140 95 M170 155 L170 110 M230 155 L230 110 M260 140 L260 95" />
          <path d="M200 70 L200 30 L240 50" />
        </g>
      </svg>

      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-mono text-[12px] tracking-wide text-brand-100">
            <Sparkles size={13} className="text-ochre-500" /> HỆ THỐNG QUẢN TRỊ NHÂN SỰ THÔNG MINH
          </span>
          <h1 className="mt-6 text-[44px] font-bold leading-[1.05] tracking-tight lg:text-[60px]">
            Quản trị nhân sự
            <br />
            toàn trường trên
            <br />
            <span className="text-ochre-500">một nền tảng.</span>
          </h1>
          <p className="mt-6 max-w-lg text-[16px] leading-relaxed text-brand-100">
            BAHAU hợp nhất hồ sơ cán bộ, quy trình duyệt đơn và điều hành cấp Ban Giám hiệu cho Trường Đại học Kiến trúc Đà Nẵng —
            minh bạch, chính xác và đúng phân cấp.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button variant="success" className="!bg-ochre-500 hover:!bg-ochre-700" onClick={onEnter}>
              Truy cập hệ thống <ArrowRight size={16} />
            </Button>
            <a
              href="#workspaces"
              className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/5 px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-white/10"
            >
              Tìm hiểu thêm
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-brand-100">
            {['Phân quyền 3 không gian', 'Chống tự phê duyệt', 'WCAG AA/AAA'].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-ochre-500" /> {t}
              </span>
            ))}
          </div>
        </div>

        {/* Floating dashboard preview card */}
        <div className="relative hidden lg:block">
          <div className="absolute inset-0 translate-x-6 translate-y-6 rounded-2xl bg-brand-700/40" />
          <div className="relative rounded-2xl border border-white/15 bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FECACA]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FDE68A]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#A7F3D0]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { l: 'Số dư phép năm', v: '10.5', u: '/12', bar: 0.87, c: '#004b87' },
                { l: 'Chờ phê duyệt', v: '3', u: 'đơn', bar: 0.4, c: '#d97706' },
                { l: 'Tổng CBGV', v: '486', u: '', bar: 1, c: '#059669' },
                { l: 'Đơn vị', v: '7', u: 'khoa/phòng', bar: 0.6, c: '#6B21A8' },
              ].map((m) => (
                <div key={m.l} className="rounded-xl border border-line p-3">
                  <div className="text-[11px] text-muted">{m.l}</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-[22px] font-bold text-ink">{m.v}</span>
                    <span className="text-[11px] text-muted">{m.u}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${m.bar * 100}%`, background: m.c }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-line p-3">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Hộp thư duyệt</div>
              {['ThS. Nguyễn Văn An', 'KS. Đặng Thu Hương'].map((n, i) => (
                <div key={n} className="flex items-center justify-between border-t border-line py-2 first:border-0">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-[10px] font-semibold text-white">
                      {n.split(' ').slice(-2).map((w) => w[0]).join('')}
                    </div>
                    <span className="text-[12px] font-medium text-ink">{n}</span>
                  </div>
                  <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${i === 0 ? 'border-[#FDE68A] bg-ochre-50 text-ochre-700' : 'border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46]'}`}>
                    {i === 0 ? 'Chờ duyệt' : 'Đã duyệt'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Stats() {
  const stats = [
    { v: '486', l: 'Cán bộ giảng viên' },
    { v: '7', l: 'Khoa & phòng ban' },
    { v: '12', l: 'Bộ môn trực thuộc' },
    { v: '99.9%', l: 'Thời gian hoạt động' },
  ]
  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-line px-5 lg:grid-cols-4 lg:px-8">
        {stats.map((s) => (
          <div key={s.l} className="px-4 py-8 text-center">
            <div className="text-[34px] font-bold text-brand-500">{s.v}</div>
            <div className="mt-1 text-[13px] text-muted">{s.l}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

function Workspaces() {
  const spaces = [
    {
      n: '01',
      icon: <Users size={22} />,
      title: 'Không gian Cá nhân',
      sub: '100% Cán bộ Giảng viên',
      desc: 'Tự phục vụ: xem lý lịch, nộp đơn nghỉ phép / công tác, theo dõi hạn mức số dư phép.',
      tone: 'brand',
    },
    {
      n: '02',
      icon: <Inbox size={22} />,
      title: 'Quản lý Đơn vị',
      sub: 'Trưởng khoa / Trưởng bộ môn',
      desc: 'Hộp thư phê duyệt, chống tự duyệt, chuyển đổi ngữ cảnh cho vai trò kiêm nhiệm.',
      tone: 'ochre',
    },
    {
      n: '03',
      icon: <Building2 size={22} />,
      title: 'Nhân sự & Ban Giám hiệu',
      sub: 'Điều hành toàn trường',
      desc: 'Cây tổ chức phân cấp, danh bạ toàn diện, vòng đời hợp đồng và sổ cái ngày phép.',
      tone: 'emerald',
    },
  ]
  return (
    <section id="workspaces" className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
      <SectionHead
        eyebrow="KIẾN TRÚC 3 KHÔNG GIAN"
        title="Một hệ thống, ba ngữ cảnh làm việc"
        desc="Giao diện tự thích ứng theo vai trò và phạm vi quản lý của bạn — không phải học nhiều công cụ."
      />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {spaces.map((s) => {
          const tones: Record<string, string> = {
            brand: 'bg-brand-50 text-brand-500',
            ochre: 'bg-ochre-50 text-ochre-700',
            emerald: 'bg-[#ECFDF5] text-[#065F46]',
          }
          return (
            <div
              key={s.n}
              className="group rounded-2xl border border-line bg-surface p-7 transition-all duration-150 hover:border-slate-300 hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.12)]"
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tones[s.tone]}`}>{s.icon}</div>
                <span className="font-mono text-[28px] font-bold text-slate-100 transition-colors group-hover:text-slate-200">
                  {s.n}
                </span>
              </div>
              <h3 className="mt-5 text-[19px] font-bold text-ink">{s.title}</h3>
              <div className="mt-0.5 font-mono text-[12px] text-ochre-500">{s.sub}</div>
              <p className="mt-3 text-[14px] leading-relaxed text-muted">{s.desc}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function Features() {
  const items = [
    { icon: <Network size={20} />, t: 'Cây tổ chức tương tác', d: 'Sơ đồ phân cấp toàn trường với badge màu theo cấp và bộ đếm nhân sự.' },
    { icon: <ShieldCheck size={20} />, t: 'Chống tự phê duyệt', d: 'Đơn của trưởng đơn vị tự động chuyển tiếp lên Ban Giám hiệu.' },
    { icon: <Layers size={20} />, t: 'Vai trò kiêm nhiệm', d: 'Chuyển đổi ngữ cảnh liền mạch giữa nhiều đơn vị quản lý.' },
    { icon: <CalendarCheck size={20} />, t: 'Sổ phép & hạn mức', d: 'Theo dõi số dư, phép chuyển năm, cảnh báo hết hạn và luồng duyệt.' },
    { icon: <Users size={20} />, t: 'Hồ sơ nhân sự đầy đủ', d: 'Lý lịch, lịch sử bổ nhiệm, hợp đồng và sổ phép trong một drawer.' },
    { icon: <ShieldCheck size={20} />, t: 'Chuẩn WCAG AA/AAA', d: 'Tương phản đạt chuẩn, focus rõ ràng, hỗ trợ dấu tiếng Việt.' },
  ]
  return (
    <section id="features" className="border-y border-line bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
        <SectionHead eyebrow="TÍNH NĂNG CỐT LÕI" title="Được thiết kế cho môi trường học thuật" desc="Chính xác về phân cấp, chặt chẽ về quy trình, tinh gọn theo phong cách Swiss." />
        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((f) => (
            <div key={f.t} className="flex gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-brand-50 text-brand-500">
                {f.icon}
              </div>
              <div>
                <h4 className="text-[15px] font-semibold text-ink">{f.t}</h4>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{f.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Showcase() {
  const steps = ['Đã nộp đơn', 'Trưởng khoa duyệt', 'Phòng TCHC xác nhận', 'Hoàn thành']
  return (
    <section id="showcase" className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHead
            align="left"
            eyebrow="LUỒNG PHÊ DUYỆT"
            title="Minh bạch từng bước, đúng phân cấp"
            desc="Mỗi đơn từ đi qua chuỗi duyệt rõ ràng — cán bộ luôn biết đơn của mình đang ở đâu."
          />
          <ul className="mt-8 space-y-3">
            {['Kiểm tra trùng lịch giảng dạy tự động', 'Chỉ định người dạy thay & xác nhận bàn giao', 'Từ chối bắt buộc nêu lý do', 'Thông báo tức thời tới người liên quan'].map(
              (t) => (
                <li key={t} className="flex items-center gap-3 text-[14px] text-ink">
                  <CheckCircle2 size={18} className="shrink-0 text-[#059669]" /> {t}
                </li>
              ),
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-6 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.15)]">
          <div className="mb-4 flex items-center justify-between">
            <span className="font-mono text-[13px] font-medium text-slate-500">DON2026-0148</span>
            <span className="rounded-md border border-[#FDE68A] bg-ochre-50 px-2 py-0.5 text-[11px] font-semibold text-ochre-700">
              Đang xử lý
            </span>
          </div>
          <div className="flex items-center">
            {steps.map((s, i) => {
              const done = i < 1
              const active = i === 1
              return (
                <div key={s} className="flex flex-1 items-center last:flex-none">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                        done
                          ? 'bg-[#059669] text-white'
                          : active
                          ? 'bg-brand-500 text-white ring-4 ring-brand-100'
                          : 'border border-line bg-white text-slate-400'
                      }`}
                    >
                      {done ? <CheckCircle2 size={14} /> : i + 1}
                    </div>
                  </div>
                  {i < steps.length - 1 && <div className={`mx-2 h-px flex-1 ${i < 1 ? 'bg-[#059669]' : 'bg-line'}`} />}
                </div>
              )
            })}
          </div>
          <div className="mt-2 grid grid-cols-4 text-center">
            {steps.map((s, i) => (
              <span key={s} className={`text-[10px] ${i === 1 ? 'font-semibold text-ink' : 'text-muted'}`}>
                {s}
              </span>
            ))}
          </div>
          <div className="mt-5 space-y-3 border-t border-line pt-5">
            <Row label="Người nộp" value="ThS. Nguyễn Văn An" />
            <Row label="Thời gian" value="22/09 → 23/09/2026 · 2 ngày" />
            <Row label="Người dạy thay" value="ThS. Võ Hoàng Long" ok />
            <div className="inline-flex items-center gap-2 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-1.5 text-[12px] font-medium text-[#065F46]">
              <CheckCircle2 size={14} /> Không có trùng lịch giảng dạy đã báo
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function CTA({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="relative overflow-hidden border-t border-line bg-brand-500 text-white">
      <div
        className="absolute inset-0 opacity-[0.10]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="relative mx-auto max-w-3xl px-5 py-20 text-center lg:px-8">
        <h2 className="text-[34px] font-bold leading-tight lg:text-[42px]">Sẵn sàng chuyển đổi quản trị nhân sự?</h2>
        <p className="mx-auto mt-4 max-w-xl text-[16px] text-brand-100">
          Đăng nhập bằng tài khoản công tác @dau.edu.vn hoặc dùng chế độ demo để trải nghiệm cả 5 vai trò.
        </p>
        <div className="mt-8 flex justify-center">
          <Button variant="success" className="!bg-ochre-500 hover:!bg-ochre-700" onClick={onEnter}>
            Truy cập hệ thống ngay <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-brand-700 text-brand-100">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-center sm:flex-row sm:text-left lg:px-8">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <Building2 size={16} className="text-white" />
          </div>
          <div>
            <div className="text-[14px] font-bold text-white">BAHAU</div>
            <div className="font-mono text-[11px] text-brand-200">Trường Đại học Kiến trúc Đà Nẵng</div>
          </div>
        </div>
        <div className="font-mono text-[12px] text-brand-200">Sáng tạo — Trách nhiệm — Nhân văn · © 2026 DAU</div>
      </div>
    </footer>
  )
}

function SectionHead({
  eyebrow,
  title,
  desc,
  align = 'center',
}: {
  eyebrow: string
  title: string
  desc: string
  align?: 'center' | 'left'
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-xl'}>
      <div className="font-mono text-[12px] font-semibold tracking-wider text-ochre-500">{eyebrow}</div>
      <h2 className="mt-3 text-[30px] font-bold leading-tight text-ink lg:text-[36px]">{title}</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">{desc}</p>
    </div>
  )
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-muted">{label}</span>
      <span className={`text-[13px] font-medium ${ok ? 'text-[#059669]' : 'text-ink'}`}>{value}</span>
    </div>
  )
}
