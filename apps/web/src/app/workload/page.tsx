'use client'

import { AuthGuard } from '../../components/AuthGuard'
import { WorkloadView } from '../../components/WorkloadView'

export default function WorkloadPage() {
  return (
    <AuthGuard moduleName="Giờ chuẩn Studio">
      <WorkloadView />
    </AuthGuard>
  )
}
