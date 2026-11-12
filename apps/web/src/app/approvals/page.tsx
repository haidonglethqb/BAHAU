'use client'

import { Approvals } from '../../components/Approvals'
import { AuthGuard } from '../../components/AuthGuard'

export default function ApprovalsPage() {
  return (
    <AuthGuard
      allowedRoles={['DEAN', 'HR_SPECIALIST', 'RECTOR', 'SYSTEM_ADMIN']}
      moduleName="Hộp thư phê duyệt"
    >
      <Approvals />
    </AuthGuard>
  )
}
