import { describe, expect, it } from 'vitest'
import { buildBisNotificationSubject } from '@/emails/BisNotificationEmail'
import {
  bisNotificationAuditNewValue,
  resolveBisSenderDisplayName,
} from '@/lib/bis-email-notify'
import { formatTruncatedContentHash } from '@/lib/bis-content-hash'
import { hashAuditEmail } from '@/lib/security-audit'

describe('bis-email-notify', () => {
  it('résout le nom affiché de l’expéditeur', () => {
    expect(resolveBisSenderDisplayName('Jim Acoca', 'jim@example.com')).toBe('Jim Acoca')
    expect(resolveBisSenderDisplayName(null, 'jimacoca@gmail.com')).toBe('Jimacoca')
  })

  it('construit le sujet email BIS', () => {
    expect(buildBisNotificationSubject('Jim Acoca')).toBe(
      'Jim Acoca a signé une interaction vérifiable',
    )
  })

  it('tronque le hash SHA-256 pour affichage email', () => {
    const hash = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456'
    expect(formatTruncatedContentHash(hash)).toBe('a1b2c3d4...3456')
  })

  it('n’écrit pas l’email destinataire en clair dans l’AuditLog', () => {
    const recipientEmail = 'destinataire@example.com'
    const payload = bisNotificationAuditNewValue({
      signatureId: 'sig_test',
      recipientEmail,
      success: true,
    })
    expect(payload).not.toHaveProperty('recipientEmail')
    expect(JSON.stringify(payload)).not.toContain(recipientEmail)
    expect(payload.recipientEmailHash).toBe(hashAuditEmail(recipientEmail))
    expect(payload.recipientEmailHash).toMatch(/^[a-f0-9]{64}$/)
    expect(payload.bisId).toBe('sig_test')
    expect(payload.success).toBe(true)
  })
})

describe('bis-email-notify', () => {
  it('résout le nom affiché de l’expéditeur', () => {
    expect(resolveBisSenderDisplayName('Jim Acoca', 'jim@example.com')).toBe('Jim Acoca')
    expect(resolveBisSenderDisplayName(null, 'jimacoca@gmail.com')).toBe('Jimacoca')
  })

  it('construit le sujet email BIS', () => {
    expect(buildBisNotificationSubject('Jim Acoca')).toBe(
      'Jim Acoca a signé une interaction vérifiable',
    )
  })

  it('tronque le hash SHA-256 pour affichage email', () => {
    const hash = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456'
    expect(formatTruncatedContentHash(hash)).toBe('a1b2c3d4...3456')
  })
})
