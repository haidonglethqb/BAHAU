'use client'

import { AuthGuard } from '../../components/AuthGuard'
import { Contracts } from '../../components/Contracts'

export default function ContractsPage() {
  return (
    <AuthGuard
      allowedRoles={['HR_SPECIALIST', 'SYSTEM_ADMIN']}
      moduleName="Quản lý Hợp đồng lao động"
    >
      <Contracts />
    </AuthGuard>
  )
}
