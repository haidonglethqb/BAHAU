'use client'

import { AuthGuard } from '../../components/AuthGuard'
import { OrgTree } from '../../components/OrgTree'

export default function UnitsPage() {
  return (
    <AuthGuard
      allowedRoles={['DEAN', 'HR_SPECIALIST', 'RECTOR', 'SYSTEM_ADMIN']}
      moduleName="Cây tổ chức toàn trường"
    >
      <OrgTree />
    </AuthGuard>
  )
}
