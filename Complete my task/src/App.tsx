import { useState } from 'react'
import { FileText } from 'lucide-react'
import type { Role } from './data'
import { EMPLOYEES } from './data'
import { Landing } from './components/Landing'
import { Login } from './components/Login'
import { Shell, type Page } from './components/Shell'
import { Profile } from './components/Profile'
import { Leave } from './components/Leave'
import { Approvals } from './components/Approvals'
import { OrgTree } from './components/OrgTree'
import { Employees } from './components/Employees'
import { Badge, Card } from './components/ui'

export default function App() {
  const [view, setView] = useState<'landing' | 'login'>('landing')
  const [role, setRole] = useState<Role | null>(null)
  const [page, setPage] = useState<Page>('profile')

  if (!role) {
    if (view === 'landing') return <Landing onEnter={() => setView('login')} />
    return <Login onLogin={(r) => setRole(r)} onBack={() => setView('landing')} />
  }

  return (
    <Shell
      role={role}
      page={page}
      onNavigate={setPage}
      onLogout={() => {
        setRole(null)
        setView('landing')
      }}
    >
      {page === 'profile' && <Profile role={role} />}
      {page === 'leave' && <Leave />}
      {page === 'inbox' && <Approvals />}
      {page === 'org' && <OrgTree />}
      {page === 'employees' && <Employees />}
      {page === 'contracts' && <Contracts />}
    </Shell>
  )
}

function Contracts() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="text-[26px] font-bold leading-tight text-ink">Quản lý hợp đồng lao động</h1>
        <p className="mt-1 text-[14px] text-muted">Vòng đời hợp đồng và sổ cái ngày phép tập trung toàn trường.</p>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-line bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Mã CBGV</th>
                <th className="px-4 py-3">Cán bộ</th>
                <th className="px-4 py-3">Loại hợp đồng</th>
                <th className="px-4 py-3">Hệ số lương</th>
                <th className="px-4 py-3">Hiệu lực</th>
              </tr>
            </thead>
            <tbody>
              {EMPLOYEES.slice(0, 6).map((e, i) => (
                <tr key={e.code} className="border-b border-line last:border-0 hover:bg-brand-50/40">
                  <td className="px-4 py-3 font-mono text-[13px] text-slate-700">{e.code}</td>
                  <td className="px-4 py-3 text-[13px] font-medium text-ink">{e.name}</td>
                  <td className="px-4 py-3 text-[13px] text-muted">
                    <div className="flex items-center gap-2">
                      <FileText size={14} className="text-slate-400" />
                      {i % 2 === 0 ? 'Không xác định thời hạn' : 'Xác định thời hạn 36 tháng'}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[13px] text-ink">{(3.66 + i * 0.33).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={i % 3 === 2 ? 'warning' : 'success'}>{i % 3 === 2 ? 'Sắp đáo hạn' : 'Đang hiệu lực'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
