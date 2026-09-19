'use client'

import { useState } from 'react'
import type { Role } from '../data'
import { Landing } from '../components/Landing'
import { Login } from '../components/Login'
import { Shell, type Page } from '../components/Shell'
import { Profile } from '../components/Profile'
import { Leave } from '../components/Leave'
import { Approvals } from '../components/Approvals'
import { OrgTree } from '../components/OrgTree'
import { Employees } from '../components/Employees'
import { Contracts } from '../components/Contracts'

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
      onRoleChange={setRole}
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
