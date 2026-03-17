'use client'

import { signOut } from 'next-auth/react'

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-gray-800 rounded-lg transition"
    >
      <span>🚪</span> Déconnexion
    </button>
  )
}
