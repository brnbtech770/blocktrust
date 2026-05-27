// app/lib/show-toast.ts
// Notifications toast légères (sans dépendance externe)
// ============================================================

export type ToastType = 'success' | 'error' | 'warning'

const STYLES: Record<ToastType, string> = {
  success: 'border-[#10b981]/40 bg-[#10b981]/15 text-[#10b981]',
  error: 'border-red-500/40 bg-red-500/15 text-red-300',
  warning: 'border-[#f59e0b]/40 bg-[#f59e0b]/15 text-[#f59e0b]',
}

export function showToast(message: string, type: ToastType = 'success'): void {
  if (typeof document === 'undefined') return

  const el = document.createElement('div')
  el.setAttribute('role', 'status')
  el.className = [
    'fixed bottom-6 right-6 z-[100] max-w-sm rounded-xl border px-4 py-3 text-sm font-medium shadow-lg',
    'transition-opacity duration-300',
    STYLES[type],
  ].join(' ')
  el.textContent = message
  document.body.appendChild(el)

  window.setTimeout(() => {
    el.style.opacity = '0'
    window.setTimeout(() => el.remove(), 300)
  }, 3500)
}
