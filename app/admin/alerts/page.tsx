// app/admin/alerts/page.tsx
// Redirection vers la page fusionnée alertes + surveillance
// ============================================================

import { redirect } from 'next/navigation'

export default function AdminAlertsRedirectPage() {
  redirect('/admin/ai-alerts')
}
