// lib/format-relative-fr.ts
// Équivalent léger de formatDistanceToNow (fr) — sans date-fns
// ============================================================

export function formatDistanceToNow(isoDate: string, nowMs: number = Date.now()): string {
  const t = new Date(isoDate).getTime()
  if (Number.isNaN(t)) return 'date inconnue'
  const diff = Math.max(0, nowMs - t)
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'il y a quelques secondes'
  const min = Math.floor(sec / 60)
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return `il y a ${d} j`
  const w = Math.floor(d / 7)
  if (w < 5) return `il y a ${w} sem`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `il y a ${mo} mois`
  const y = Math.floor(d / 365)
  return `il y a ${y} an${y > 1 ? 's' : ''}`
}
