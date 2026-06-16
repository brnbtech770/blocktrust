// app/admin/certificates/[id]/page.tsx
// Détail d'un certificat avec actions admin
// ============================================================

import { prisma } from '@/app/lib/db'
import { requireAdminPage } from '@/app/lib/require-admin-page'
import { notFound } from 'next/navigation'
import CertificateActions from '@/app/components/admin/CertificateActions'
import { getCertificateLevelDisplayLabel } from '@/lib/validationLevelDisplay'
import { resolveEffectivePlan } from '@/lib/plan-features'
import { formatCertificateLabel } from '@/lib/format-certificate-label'

export default async function AdminCertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdminPage()

  const { id } = await params

  const certificate = await prisma.certificate.findUnique({
    where: { id },
    include: {
      entity: {
        select: {
          id: true,
          entityType: true,
          legalName: true,
          tradeName: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          siret: true,
          website: true,
          description: true,
          kycStatus: true,
          validationLevel: true,
          user: {
            select: {
              email: true,
              subscription: { select: { plan: true, status: true } },
            },
          },
        },
      },
      verifications: {
        take: 10,
        orderBy: { verifiedAt: 'desc' },
      },
    },
  })

  if (!certificate) {
    notFound()
  }

  const getEntityName = () => {
    if (certificate.entity.entityType === 'INDIVIDUAL') {
      return `${certificate.entity.firstName || ''} ${certificate.entity.lastName || ''}`.trim() || certificate.entity.email
    }
    return certificate.entity.legalName || certificate.entity.tradeName || certificate.entity.email
  }

  const cardCls =
    'rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-gold/30'
  const labelCls = 'text-sm'
  const labelStyle = { color: 'var(--bt-muted)' }

  const ownerPlan = resolveEffectivePlan({
    subscription: certificate.entity.user?.subscription,
    email: certificate.entity.user?.email,
  })
  const levelLabel = getCertificateLevelDisplayLabel(certificate.level, ownerPlan)

  const certDisplay = formatCertificateLabel({
    id: certificate.id,
    publicId: certificate.publicId,
    entity: certificate.entity,
    displayName: getEntityName(),
  })

  return (
    <div>
      <div className="mb-8">
        <a href="/admin/certificates" className="mb-4 inline-block hover:underline" style={{ color: 'var(--bt-cyan)' }}>
          ← Retour à la liste
        </a>
        <p
          style={{ color: 'var(--bt-muted)', fontFamily: 'var(--font-mono-bt), monospace' }}
          title={certDisplay.fullCode}
        >
          Badge : {certDisplay.label}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className={cardCls}>
          <h2 className="font-syne mb-4 text-xl font-bold tracking-tight text-white">Informations entité</h2>
          <div className="space-y-3">
            <div><p className={labelCls} style={labelStyle}>Nom</p><p className="text-white">{getEntityName()}</p></div>
            <div><p className={labelCls} style={labelStyle}>Type</p><p className="text-white">{certificate.entity.entityType === 'INDIVIDUAL' ? 'Particulier' : 'Entreprise'}</p></div>
            <div><p className={labelCls} style={labelStyle}>Email</p><p className="text-white">{certificate.entity.email}</p></div>
            {certificate.entity.siret && <div><p className={labelCls} style={labelStyle}>SIRET</p><p className="text-white">{certificate.entity.siret}</p></div>}
            {certificate.entity.website && <div><p className={labelCls} style={labelStyle}>Site web</p><p className="text-white">{certificate.entity.website}</p></div>}
          </div>
        </div>

        <div className={cardCls}>
          <h2 className="font-syne mb-4 text-xl font-bold tracking-tight text-white">Informations certificat</h2>
          <div className="space-y-3">
            <div>
              <p className={labelCls} style={labelStyle}>Statut</p>
              <span
                className="px-3 py-1 rounded-full text-xs font-bold inline-block border"
                style={
                  certificate.status === 'PENDING' ? { background: 'rgba(189,167,107,0.15)', color: 'var(--bt-gold)', borderColor: 'rgba(189,167,107,0.3)' }
                  : certificate.status === 'ACTIVE' ? { background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)', borderColor: 'rgba(0,212,255,0.3)' }
                  : certificate.status === 'SUSPENDED' ? { background: 'rgba(232,148,58,0.15)', color: 'var(--bt-warn)', borderColor: 'rgba(232,148,58,0.3)' }
                  : { background: 'rgba(224,82,82,0.15)', color: 'var(--bt-danger)', borderColor: 'rgba(224,82,82,0.3)' }
                }
              >
                {certificate.status}
              </span>
            </div>
            <div><p className={labelCls} style={labelStyle}>Niveau</p><p className="text-white">{levelLabel}</p></div>
            <div><p className={labelCls} style={labelStyle}>Date d'émission</p><p className="text-white">{new Date(certificate.issuedAt).toLocaleDateString('fr-FR')}</p></div>
            {certificate.revokedAt && <div><p className={labelCls} style={labelStyle}>Date de révocation</p><p className="text-white">{new Date(certificate.revokedAt).toLocaleDateString('fr-FR')}</p></div>}
            {certificate.revocationReason && <div><p className={labelCls} style={labelStyle}>Raison de révocation</p><p className="text-white">{certificate.revocationReason}</p></div>}
            <div><p className={labelCls} style={labelStyle}>Vérifications</p><p className="text-white">{certificate.verificationCount}</p></div>
          </div>
        </div>
      </div>

      <div className={cardCls}>
        <h2 className="font-syne mb-4 text-xl font-bold tracking-tight text-white">Actions</h2>
        <CertificateActions certificateId={certificate.id} currentStatus={certificate.status} />
      </div>
    </div>
  )
}
