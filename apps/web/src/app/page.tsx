'use client'

import { useRouter } from 'next/navigation'
import { Landing } from '../components/Landing'
import { useAuth } from '../context/AuthContext'

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()

  const handleEnter = () => {
    if (isAuthenticated) {
      router.push('/dashboard')
    } else {
      router.push('/login')
    }
  }

  return <Landing onEnter={handleEnter} />
}
