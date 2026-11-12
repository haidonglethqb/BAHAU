'use client'

import { AuthGuard } from '../../components/AuthGuard'
import { Leave } from '../../components/Leave'

export default function LeavePage() {
  return (
    <AuthGuard moduleName="Sổ phép năm">
      <Leave />
    </AuthGuard>
  )
}
