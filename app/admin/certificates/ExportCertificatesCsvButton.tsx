'use client'

import { Download } from 'lucide-react'

export type CertificateCsvRow = {
  id: string
  publicId: string | null
  entityEmail: string
  userEmail: string | null
  status: string
  blockchainStatus: string | null
  issuedAt: string
  txHash: string | null
}

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export default function ExportCertificatesCsvButton({
  rows,
}: {
  rows: CertificateCsvRow[]
}) {
  function exportCertificatesCsv() {
    const header = [
      'id',
      'publicId',
      'entity',
      'userEmail',
      'status',
      'blockchainStatus',
      'issuedAt',
      'txHash',
    ]
    const lines = rows.map((c) =>
      [
        c.id,
        c.publicId ?? '',
        c.entityEmail,
        c.userEmail ?? '',
        c.status,
        c.blockchainStatus ?? '',
        c.issuedAt,
        c.txHash ?? '',
      ]
        .map((v) => escapeCsv(String(v)))
        .join(','),
    )
    const csv = [header.join(','), ...lines].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `blocktrust-certificates-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      type="button"
      onClick={exportCertificatesCsv}
      className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5"
    >
      <Download className="h-3.5 w-3.5" aria-hidden />
      Exporter CSV
    </button>
  )
}
