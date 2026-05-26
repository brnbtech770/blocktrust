import Link from 'next/link'

const PAGE_SIZE = 20

export { PAGE_SIZE }

export default function CertificatesPagination({
  page,
  total,
  searchParams,
}: {
  page: number
  total: number
  searchParams: Record<string, string | undefined>
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page), totalPages)

  function hrefFor(nextPage: number): string {
    const params = new URLSearchParams()
    if (searchParams.status) params.set('status', searchParams.status)
    if (searchParams.type) params.set('type', searchParams.type)
    if (searchParams.dateFrom) params.set('dateFrom', searchParams.dateFrom)
    if (searchParams.dateTo) params.set('dateTo', searchParams.dateTo)
    if (nextPage > 1) params.set('page', String(nextPage))
    const q = params.toString()
    return q ? `/admin/certificates?${q}` : '/admin/certificates'
  }

  const from = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
  const to = Math.min(safePage * PAGE_SIZE, total)

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p style={{ color: 'var(--bt-muted)' }}>
        {total === 0
          ? 'Aucun certificat'
          : `${from}–${to} sur ${total} certificat${total > 1 ? 's' : ''}`}
      </p>
      <div className="flex items-center gap-2">
        {safePage <= 1 ? (
          <span
            className="rounded-lg px-4 py-2 text-xs font-semibold opacity-40"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--bt-muted)' }}
          >
            Précédent
          </span>
        ) : (
          <Link
            href={hrefFor(safePage - 1)}
            className="rounded-lg px-4 py-2 text-xs font-semibold transition hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'white' }}
          >
            Précédent
          </Link>
        )}
        <span className="px-2 text-xs tabular-nums" style={{ color: 'var(--bt-muted)' }}>
          Page {safePage} / {totalPages}
        </span>
        {safePage >= totalPages ? (
          <span
            className="rounded-lg px-4 py-2 text-xs font-semibold opacity-40"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--bt-muted)' }}
          >
            Suivant
          </span>
        ) : (
          <Link
            href={hrefFor(safePage + 1)}
            className="rounded-lg px-4 py-2 text-xs font-semibold transition hover:bg-white/10"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'white' }}
          >
            Suivant
          </Link>
        )}
      </div>
    </div>
  )
}
