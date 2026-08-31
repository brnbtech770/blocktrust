'use client'

import { useEffect } from 'react'
import { LogOut } from 'lucide-react'
import { signOutToHome } from '@/lib/sign-out-client'

export default function SignOutPage() {
  useEffect(() => {
    void signOutToHome()
  }, [])
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-4 flex justify-center text-white/70">
          <LogOut className="h-10 w-10" aria-hidden />
        </div>
        <p className="text-white text-xl">Déconnexion en cours...</p>
      </div>
    </div>
  )
}
