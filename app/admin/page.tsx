// app/admin/page.tsx
// Racine admin → tableau de bord
// ============================================================

import { redirect } from 'next/navigation'

export default function AdminPage() {
  redirect('/admin/dashboard')
}
