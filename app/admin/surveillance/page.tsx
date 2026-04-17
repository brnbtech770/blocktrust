// app/admin/surveillance/page.tsx
// Dashboard Surveillance IA (admin)
// ============================================================

import { requireAdminPage } from '@/app/lib/require-admin-page'
import SurveillanceDashboard from '@/app/admin/surveillance/SurveillanceDashboard'

export default async function AdminSurveillancePage() {
  await requireAdminPage()
  return <SurveillanceDashboard />
}
