/**
 * © 2026 BRNB TECH — BLOCKTRUST™
 * Page publique de vérification BIS — /verify/bis/[id]
 */
import Link from 'next/link'
import {
  AlertTriangle,
  Clock,
  ExternalLink,
  FileSignature,
  ShieldCheck,
  ShieldX,
} from 'lucide-react'
import type { Metadata } from 'next'
import { prisma } from '@/app/lib/db'
import { Logo } from '@/app/components/ui/Logo'
import BlockTrustBadge from '@/app/components/ui/BlockTrustBadge'
import {
  computeBisDisplayLevel,
  verifyBisSignature,
} from '@/lib/bis-sign'
import { getBisLevelLabel } from '@/lib/bis-access'
import { computeTrustEngineScore } from '@/lib/trust-engine'
import { getTrustScoreColor, getTrustScoreLabel } from '@/lib/trustscore'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Vérification BIS — BLOCKTRUST™`,
    description: `Vérification de la signature d'interaction BIS ${id.slice(0, 8)}…`,
  }
}

const BIS_LEVEL_COLORS: Record<number, string> = {
  0: '#E05252',
  1: '#6b7280',
  2: '#00d4ff',
  3: '#10b981',
  4: '#BDA76B',
}

import { getBisInteractionLabel } from '@/lib/bis-interaction-labels'
import { BisDocumentIntegrityCheck } from '@/app/components/bis/BisDocumentIntegrityCheck'

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export default async function BisVerifyPage({ params }: PageProps) {
  const { id } = await params

  const record = await prisma.interactionSignature.findUnique({
    where: { id },
    include: {
      senderCert: {
        include: {
          entity: {
            include: {
              user: {
                select: {
                  name: true,
                  kycStatus: true,
                  trustScore: true,
                },
              },
            },
          },
        },
      },
      sender: { select: { name: true } },
    },
  })

  if (!record) {
    return (
      <Shell>
        <ResultHeader
          level={0}
          valid={false}
          title="Signature introuvable"
          subtitle="Cette signature BIS n'existe pas ou a été supprimée."
        />
      </Shell>
    )
  }

  const crypto = await verifyBisSignature(record.signature)
  const expired = record.expiresAt.getTime() < Date.now()
  const valid = crypto.valid && !expired

  if (valid && !record.verified) {
    await prisma.interactionSignature
      .update({
        where: { id: record.id },
        data: { verified: true, verifiedAt: new Date() },
      })
      .catch((err) => console.error('[bis page] mark verified', err))
  }

  const trustEngine = await computeTrustEngineScore(record.senderCertId).catch(
    () => null,
  )
  const trustScore = trustEngine?.globalScore ?? record.senderCert.entity.user.trustScore ?? 0

  const bisLevel = computeBisDisplayLevel({
    valid,
    certificateStatus: record.senderCert.status,
    interactionType: record.interactionType,
    verified: valid || record.verified,
    senderKycVerified: record.senderCert.entity.user.kycStatus === 'VERIFIED',
  })

  const levelColor = BIS_LEVEL_COLORS[bisLevel] ?? '#6b7280'
  const levelLabel = getBisLevelLabel(bisLevel)
  const senderName =
    record.sender.name ?? record.senderCert.entity.user.name ?? record.senderEmail
  const polygonUrl = record.senderCert.polygonExplorerUrl
  const polygonAnchored = Boolean(
    record.polygonTxHash ?? record.senderCert.polygonTxHash,
  )
  const certRevoked = record.senderCert.status === 'REVOKED'

  return (
    <Shell>
      <ResultHeader
        level={bisLevel}
        valid={valid}
        title={valid ? levelLabel : expired ? 'Signature expirée' : (crypto.reason ?? 'Signature invalide')}
        subtitle={
          valid
            ? `Interaction ${getBisInteractionLabel(record.interactionType)} signée cryptographiquement`
            : 'La vérification cryptographique a échoué ou le certificat n\'est plus valide.'
        }
        levelColor={levelColor}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-[#0d1f3c] p-6">
          <BlockTrustBadge size={180} tagline={polygonAnchored ? 'on-chain' : 'preview'} />
          <p className="text-center font-syne text-sm font-semibold text-white">{senderName}</p>
          <p className="font-mono text-xs text-white/50">{record.senderEmail}</p>
          <div
            className="mt-2 rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              backgroundColor: `${getTrustScoreColor(trustScore)}20`,
              color: getTrustScoreColor(trustScore),
            }}
          >
            TrustScore {trustScore} — {getTrustScoreLabel(trustScore)}
          </div>
        </div>

        <div className="space-y-4">
          <DetailCard title="Niveau BIS">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full font-syne text-lg font-bold"
                style={{ backgroundColor: `${levelColor}22`, color: levelColor }}
              >
                {bisLevel}
              </span>
              <div>
                <p className="font-semibold" style={{ color: levelColor }}>
                  {levelLabel}
                </p>
                <p className="text-sm text-white/50">
                  {valid ? (
                    <span className="inline-flex items-center gap-1 text-emerald-400">
                      <ShieldCheck className="h-4 w-4" aria-hidden />
                      Signature valide
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-400">
                      <ShieldX className="h-4 w-4" aria-hidden />
                      Non valide
                    </span>
                  )}
                </p>
              </div>
            </div>
          </DetailCard>

          <DetailCard title="Détails de l'interaction">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <DetailRow label="Expéditeur" value={record.senderEmail} />
              <DetailRow label="Destinataire" value={record.recipientEmail} />
              <DetailRow
                label="Type"
                value={getBisInteractionLabel(record.interactionType)}
              />
              <DetailRow label="Contexte" value={record.contextLabel ?? '—'} />
              <DetailRow label="Signé le" value={formatDate(record.createdAt.toISOString())} />
              <DetailRow label="Expire le" value={formatDate(record.expiresAt.toISOString())} />
              <DetailRow
                label="Statut certificat"
                value={certRevoked ? 'Révoqué' : 'Actif'}
                valueClass={certRevoked ? 'text-red-400' : 'text-emerald-400'}
              />
              <DetailRow
                label="Hash contenu (SHA-256)"
                value={record.contentHash}
                mono
                className="sm:col-span-2"
              />
            </dl>
          </DetailCard>

          {record.contentHash ? (
            <BisDocumentIntegrityCheck
              expectedHash={record.contentHash}
              signedAtIso={record.createdAt.toISOString()}
            />
          ) : null}

          {polygonAnchored && polygonUrl ? (
            <DetailCard title="Ancrage blockchain">
              <a
                href={polygonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-bt-cyan hover:underline"
              >
                Voir sur PolygonScan
                <ExternalLink className="h-4 w-4" aria-hidden />
              </a>
            </DetailCard>
          ) : null}

          {!valid && expired ? (
            <div className="flex items-start gap-3 rounded-lg border border-orange-500/30 bg-orange-500/10 p-4 text-sm text-orange-200">
              <Clock className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <p>Cette signature a expiré le {formatDate(record.expiresAt.toISOString())}.</p>
            </div>
          ) : null}

          {!valid && certRevoked ? (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <p>Le certificat de l&apos;expéditeur a été révoqué depuis la signature.</p>
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-white/30">
        BLOCKTRUST™ Interaction Signature (BIS) — le contenu de l&apos;interaction n&apos;est jamais
        stocké, seul son empreinte SHA-256 est signée.
      </p>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo size="sm" withText={false} />
          </Link>
          <span className="inline-flex items-center gap-2 font-syne text-xs uppercase tracking-widest text-bt-cyan">
            <FileSignature className="h-4 w-4" aria-hidden />
            Vérification BIS
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-10">{children}</main>
    </div>
  )
}

function ResultHeader({
  level,
  valid,
  title,
  subtitle,
  levelColor = '#E05252',
}: {
  level: number
  valid: boolean
  title: string
  subtitle: string
  levelColor?: string
}) {
  return (
    <div
      className="rounded-xl border p-6"
      style={{
        borderColor: `${levelColor}44`,
        backgroundColor: `${levelColor}11`,
      }}
    >
      <div className="flex items-start gap-4">
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-syne text-xl font-bold"
          style={{ backgroundColor: `${levelColor}33`, color: levelColor }}
        >
          {level}
        </span>
        <div>
          <h1 className="font-syne text-2xl font-bold" style={{ color: levelColor }}>
            {title}
          </h1>
          <p className="mt-1 text-white/60">{subtitle}</p>
          {valid ? (
            <p className="mt-2 text-xs uppercase tracking-widest text-emerald-400">
              BIS niveau {level} — vérifié
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function DetailCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1f3c] p-5">
      <h2 className="mb-4 font-syne text-sm font-semibold uppercase tracking-widest text-white/70">
        {title}
      </h2>
      {children}
    </div>
  )
}

function DetailRow({
  label,
  value,
  mono,
  valueClass,
  className,
}: {
  label: string
  value: string
  mono?: boolean
  valueClass?: string
  className?: string
}) {
  return (
    <div className={className}>
      <dt className="text-xs uppercase tracking-wider text-white/40">{label}</dt>
      <dd
        className={`mt-0.5 break-all ${mono ? 'font-mono text-xs' : ''} ${valueClass ?? 'text-white/90'}`}
      >
        {value}
      </dd>
    </div>
  )
}
