'use client'

import { useRouter } from 'next/navigation'
import { Login } from '../../components/Login'

export default function LoginPage() {
  const router = useRouter()
  return (
    <Login
      onLogin={() => router.push('/profile')}
      onBack={() => router.push('/')}
    />
  )
}
