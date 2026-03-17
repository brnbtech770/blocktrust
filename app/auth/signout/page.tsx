'use client'

import { signOut } from 'next-auth/react'
import { useEffect } from 'react'

export default function SignOutPage() {
  useEffect(() => {
    signOut({ callbackUrl: '/' })
  }, [])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl mb-4">👋</div>
        <p className="text-white text-xl">Déconnexion en cours...</p>
      </div>
    </div>
  )
}
