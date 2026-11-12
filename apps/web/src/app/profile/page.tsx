'use client'

import { AuthGuard } from '../../components/AuthGuard'
import { Profile } from '../../components/Profile'

export default function ProfilePage() {
  return (
    <AuthGuard moduleName="Hồ sơ & CV cá nhân">
      <Profile />
    </AuthGuard>
  )
}
