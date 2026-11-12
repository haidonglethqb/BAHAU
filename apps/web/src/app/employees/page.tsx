'use client'

import { AuthGuard } from '../../components/AuthGuard'
import { Employees } from '../../components/Employees'

export default function EmployeesPage() {
  return (
    <AuthGuard
      allowedRoles={['DEAN', 'HR_SPECIALIST', 'RECTOR', 'SYSTEM_ADMIN']}
      moduleName="Danh bạ Cán bộ Giảng viên"
    >
      <Employees />
    </AuthGuard>
  )
}
