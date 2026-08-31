'use client'

import { signOutToHome } from '@/lib/sign-out-client'
import { LogOut } from 'lucide-react'

export default function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => void signOutToHome()}
      className="flex w-full min-h-[44px] items-center gap-2 rounded-lg px-3 py-2.5 font-sans text-sm text-bt-cyan transition-all hover:bg-white/5 hover:text-white"
    >
      <LogOut size={16} aria-hidden />
      <span>Déconnexion</span>
    </button>
  )
}
