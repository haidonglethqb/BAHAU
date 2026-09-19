import { Award, Briefcase, Mail, MapPin, Phone, ShieldCheck } from 'lucide-react'
import { ROLES, type Role } from '../data'
import { Avatar, Badge, Card } from './ui'

export function Profile({ role }: { role: Role }) {
  const me = ROLES.find((r) => r.id === role)!

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold leading-tight text-ink">Hồ sơ cá nhân</h1>
        <p className="mt-1 text-[14px] text-muted">Sơ yếu lý lịch và thông tin công tác của bạn tại DAU.</p>
      </div>

      <Card className="mb-6 overflow-hidden">
        <div className="h-20 bg-brand-500" />
        <div className="flex flex-col gap-4 px-6 pb-6 sm:flex-row sm:items-end">
          <div className="-mt-10 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-line">
            <Avatar name={me.name} size={80} />
          </div>
          <div className="flex-1 pb-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[20px] font-bold text-ink">{me.name}</h2>
              <ShieldCheck size={18} className="text-brand-500" />
            </div>
            <p className="text-[14px] text-muted">
              {me.title} · {me.scope}
            </p>
          </div>
          <div className="flex gap-2 pb-1">
            <Badge tone="success">Đang công tác</Badge>
            <Badge tone="neutral">DAU260003</Badge>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <h3 className="mb-4 text-[16px] font-semibold text-ink">Sơ yếu lý lịch & Liên hệ</h3>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <Info icon={<Mail size={16} />} label="Email công tác" value="an.nv@dau.edu.vn" mono />
            <Info icon={<Phone size={16} />} label="Số điện thoại" value="0905 336 699" mono />
            <Info icon={<Briefcase size={16} />} label="Đơn vị chính" value="BM Kiến trúc công trình" />
            <Info icon={<Award size={16} />} label="Học vị / Học hàm" value="Thạc sĩ Kiến trúc" />
            <Info icon={<MapPin size={16} />} label="Địa chỉ" value="566 Núi Thành, Hải Châu, Đà Nẵng" />
            <Info icon={<Briefcase size={16} />} label="Ngày vào trường" value="01/09/2019" mono />
          </dl>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-[16px] font-semibold text-ink">Lịch sử bổ nhiệm</h3>
          <ol className="relative space-y-5 border-l border-line pl-5">
            {[
              { y: '2024', t: 'Giảng viên chính thức', d: 'QĐ số 214/QĐ-DAU' },
              { y: '2021', t: 'Giảng viên hợp đồng', d: 'QĐ số 118/QĐ-DAU' },
              { y: '2019', t: 'Trợ giảng', d: 'Tuyển dụng đợt 2' },
            ].map((e) => (
              <li key={e.y} className="relative">
                <span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500 ring-1 ring-brand-200" />
                <div className="font-mono text-[12px] text-ochre-500">{e.y}</div>
                <div className="text-[14px] font-semibold text-ink">{e.t}</div>
                <div className="text-[12px] text-muted">{e.d}</div>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  )
}

function Info({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div>
        <dt className="text-[12px] text-muted">{label}</dt>
        <dd className={`text-[14px] font-medium text-ink ${mono ? 'font-mono' : ''}`}>{value}</dd>
      </div>
    </div>
  )
}
